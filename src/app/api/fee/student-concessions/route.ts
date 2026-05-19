import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { Decimal } from '@prisma/client/runtime/library';
import { generateInstallments } from '@/lib/fee-installment-gen';
import { computeDiscount, applyDiscountToInstallments } from '@/lib/fee-concession';

const FREQ_COUNT: Record<string, number> = {
  ONE_TIME: 1, ANNUAL: 1, HALF_YEARLY: 2, QUARTERLY: 4, BI_MONTHLY: 6, MONTHLY: 12,
};

export async function GET(_req: NextRequest) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const concessions = await db.studentConcession.findMany({
      where: {
        assignment: { tenantId: session.user.tenantId },
      },
      include: {
        concessionTemplate: true,
        assignment: {
          include: {
            student: { select: { id: true, name: true } },
            academicYear: { select: { id: true, label: true } },
            feeAccount: { select: { id: true, gradeId: true } },
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    const gradeIds = concessions
      .map(c => c.assignment.feeAccount?.gradeId)
      .filter(Boolean) as string[];

    const grades = gradeIds.length
      ? await db.grade.findMany({ where: { id: { in: [...new Set(gradeIds)] } }, select: { id: true, name: true } })
      : [];
    const gradeMap = Object.fromEntries(grades.map(g => [g.id, g.name]));

    const rows = concessions.map(c => ({
      id: c.id,
      assignmentId: c.assignmentId,
      studentId: c.assignment.student.id,
      studentName: c.assignment.student.name,
      grade: gradeMap[c.assignment.feeAccount?.gradeId ?? ''] ?? '—',
      academicYear: c.assignment.academicYear.label,
      concessionName: c.concessionTemplate.name,
      type: c.concessionTemplate.type,
      value: Number(c.concessionTemplate.value),
      maxAmount: c.concessionTemplate.maxAmount ? Number(c.concessionTemplate.maxAmount) : null,
    }));

    return ok(rows);
  } catch (e) {
    console.error('[GET /api/fee/student-concessions]', e);
    return err((e as Error).message ?? 'Internal server error', 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const { id } = await req.json();
    if (!id) return err('id is required');

    // Fetch full concession details before deletion to enable recalculation
    const con = await db.studentConcession.findFirst({
      where: { id, assignment: { tenantId: session.user.tenantId } },
      include: {
        assignment: {
          include: {
            feePlan: {
              include: {
                items: { orderBy: { displayOrder: 'asc' } },
                customSchedule: { include: { installments: { orderBy: { displayOrder: 'asc' } } } },
                academicYear: true,
              },
            },
            feeAccount: true,
          },
        },
      },
    });
    if (!con) return err('Not found', 404);

    const { assignment } = con;
    const account = assignment.feeAccount;

    await db.$transaction(async (tx) => {
      await tx.studentConcession.delete({ where: { id } });

      // Re-fetch remaining concessions after deletion
      const remaining = await tx.studentConcession.findMany({
        where: { assignmentId: assignment.id },
        include: { concessionTemplate: true },
      });

      if (!account || account.isLocked) return;

      const plan = assignment.feePlan;
      const settings = await tx.tenantFeeSettings.findUnique({ where: { tenantId: session.user.tenantId } });

      const zero = new Decimal(0);
      const grossTotal = plan.customSchedule?.installments?.length
        ? plan.items.reduce((sum, item) => sum.add(item.amount), zero)
        : plan.items.reduce((sum, item) => sum.add(item.amount.mul(FREQ_COUNT[item.frequency] ?? 1)), zero);

      const templates = remaining.map(r => r.concessionTemplate);
      const discount = computeDiscount(grossTotal, templates);
      const netTotal = grossTotal.sub(discount).toDecimalPlaces(2);

      // Regenerate PENDING installments with updated amounts
      await tx.feeInstallment.deleteMany({ where: { feeAccountId: account.id, status: 'PENDING' } });
      const rawInstallments = generateInstallments(plan, settings, account.id);
      const scaledInstallments = applyDiscountToInstallments(rawInstallments, grossTotal, discount);
      if (scaledInstallments.length > 0) {
        await tx.feeInstallment.createMany({ data: scaledInstallments });
      }

      const paidSoFar = new Decimal(account.totalPaid);
      const newBalance = netTotal.sub(paidSoFar).toDecimalPlaces(2);
      await tx.feeAccount.update({
        where: { id: account.id },
        data: {
          totalDue: netTotal,
          balance: newBalance.lt(zero) ? zero : newBalance,
          status: newBalance.lte(zero) ? 'PAID' : 'PENDING',
        },
      });
    });

    return ok({ success: true });
  } catch (e) {
    console.error('[DELETE /api/fee/student-concessions]', e);
    return err((e as Error).message ?? 'Internal server error', 500);
  }
}

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { Decimal } from '@prisma/client/runtime/library';
import { generateInstallments } from '@/lib/fee-installment-gen';
import { computeDiscount, applyDiscountToInstallments } from '@/lib/fee-concession';

const FREQ_COUNT: Record<string, number> = {
  ONE_TIME: 1, ANNUAL: 1, HALF_YEARLY: 2, QUARTERLY: 4, BI_MONTHLY: 6, MONTHLY: 12,
};

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const assignment = await db.studentFeeAssignment.findFirst({
      where: { id: params.id, tenantId: session.user.tenantId },
      include: {
        student: { select: { id: true, name: true } },
        feePlan: {
          include: {
            items: { include: { component: true }, orderBy: { displayOrder: 'asc' } },
            customSchedule: { include: { installments: { orderBy: { displayOrder: 'asc' } } } },
          },
        },
        studentCategory: true,
        concessions: { include: { concessionTemplate: true } },
        feeAccount: { include: { installments: { orderBy: { dueDate: 'asc' } } } },
      },
    });
    if (!assignment) return err('Not found', 404);
    return ok(assignment);
  } catch (e) {
    console.error('[GET /api/fee/assign/[id]]', e);
    return err((e as Error).message ?? 'Internal server error', 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const assignment = await db.studentFeeAssignment.findFirst({
      where: { id: params.id, tenantId: session.user.tenantId },
      include: {
        feePlan: {
          include: {
            items: { orderBy: { displayOrder: 'asc' } },
            customSchedule: { include: { installments: { orderBy: { displayOrder: 'asc' } } } },
            academicYear: true,
          },
        },
        concessions: { include: { concessionTemplate: true } },
        feeAccount: true,
      },
    });
    if (!assignment) return err('Not found', 404);
    if (!assignment.feeAccount) return err('No fee account found for this assignment', 400);

    const body = await req.json();
    const { action } = body;

    if (action === 'lock') {
      const updated = await db.feeAccount.update({
        where: { id: assignment.feeAccount.id },
        data: { isLocked: true, lockedAt: new Date(), lockedBy: session.user.id },
      });
      return ok(updated);
    }

    if (action === 'unlock') {
      const updated = await db.feeAccount.update({
        where: { id: assignment.feeAccount.id },
        data: { isLocked: false, lockedAt: null, lockedBy: null },
      });
      return ok(updated);
    }

    if (action === 'recalculate') {
      if (assignment.feeAccount.isLocked)
        return err('Fee account is locked — unlock before recalculating', 400);

      const plan = assignment.feePlan;
      const settings = await db.tenantFeeSettings.findUnique({ where: { tenantId: session.user.tenantId } });

      // Correct gross total: sum(amount × frequency_count) for frequency plans,
      // or sum(amount) for custom-schedule plans (custom schedule splits the total, not per-item)
      const zero = new Decimal(0);
      const grossTotal = plan.customSchedule?.installments?.length
        ? plan.items.reduce((sum, item) => sum.add(item.amount), zero)
        : plan.items.reduce((sum, item) => sum.add(item.amount.mul(FREQ_COUNT[item.frequency] ?? 1)), zero);

      // Apply concessions from the current assignment
      const templates = assignment.concessions.map((c) => c.concessionTemplate);
      const discount = computeDiscount(grossTotal, templates);
      const netTotal = grossTotal.sub(discount).toDecimalPlaces(2);

      const result = await db.$transaction(async (tx) => {
        await tx.feeInstallment.deleteMany({
          where: { feeAccountId: assignment.feeAccount!.id, status: 'PENDING' },
        });

        const rawInstallments = generateInstallments(plan, settings, assignment.feeAccount!.id);
        const installments = applyDiscountToInstallments(rawInstallments, grossTotal, discount);
        if (installments.length > 0) {
          await tx.feeInstallment.createMany({ data: installments });
        }

        const paidSoFar = new Decimal(assignment.feeAccount!.totalPaid);
        const newBalance = netTotal.sub(paidSoFar).toDecimalPlaces(2);
        return tx.feeAccount.update({
          where: { id: assignment.feeAccount!.id },
          data: {
            totalDue: netTotal,
            balance: newBalance.lt(0) ? zero : newBalance,
            status: newBalance.lte(0) ? 'PAID' : 'PENDING',
          },
          include: { installments: { orderBy: { dueDate: 'asc' } } },
        });
      });
      return ok(result);
    }

    if (assignment.feeAccount.isLocked)
      return err('Fee account is locked — unlock before modifying', 400);

    const updated = await db.studentFeeAssignment.update({
      where: { id: params.id },
      data: {
        ...(body.feePlanId && { feePlanId: body.feePlanId }),
        ...(body.studentCategoryId !== undefined && { studentCategoryId: body.studentCategoryId ?? null }),
      },
      include: {
        feePlan: { select: { id: true, name: true } },
        studentCategory: { select: { id: true, name: true } },
        feeAccount: true,
      },
    });
    return ok(updated);
  } catch (e) {
    console.error('[PATCH /api/fee/assign/[id]]', e);
    return err((e as Error).message ?? 'Internal server error', 500);
  }
}

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { Decimal } from '@prisma/client/runtime/library';
import { generateInstallments } from '@/lib/fee-installment-gen';

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const academicYearId = req.nextUrl.searchParams.get('academicYearId') ?? undefined;

    const assignments = await db.studentFeeAssignment.findMany({
      where: {
        tenantId: session.user.tenantId,
        ...(academicYearId && { academicYearId }),
      },
      include: {
        student: { select: { id: true, name: true } },
        feePlan: { select: { id: true, name: true } },
        studentCategory: { select: { id: true, name: true } },
        feeAccount: { select: { id: true, totalDue: true, totalPaid: true, balance: true, status: true } },
        concessions: { include: { concessionTemplate: true } },
      },
      orderBy: { assignedAt: 'desc' },
    });
    return ok(assignments);
  } catch (e) {
    console.error('[GET /api/fee/assign]', e);
    return err((e as Error).message ?? 'Internal server error', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const body = await req.json();
    const { studentId, feePlanId, academicYearId, studentCategoryId, concessionIds } = body;

    if (!studentId || !feePlanId || !academicYearId)
      return err('studentId, feePlanId, and academicYearId are required');

    const student = await db.student.findFirst({
      where: { id: studentId, tenantId: session.user.tenantId },
      select: { id: true, gradeId: true },
    });
    if (!student) return err('Student not found', 404);

    const plan = await db.feePlan.findFirst({
      where: { id: feePlanId, tenantId: session.user.tenantId },
      include: {
        items: { orderBy: { displayOrder: 'asc' } },
        customSchedule: { include: { installments: { orderBy: { displayOrder: 'asc' } } } },
        academicYear: true,
      },
    });
    if (!plan) return err('Fee plan not found', 404);

    const existingAssignment = await db.studentFeeAssignment.findFirst({
      where: { studentId, academicYearId },
    });
    if (existingAssignment) return err('Student already has a fee assignment for this academic year', 409);

    const settings = await db.tenantFeeSettings.findUnique({ where: { tenantId: session.user.tenantId } });

    const result = await db.$transaction(async (tx) => {
      const assignment = await tx.studentFeeAssignment.create({
        data: {
          tenantId: session.user.tenantId,
          studentId,
          feePlanId,
          academicYearId,
          studentCategoryId: studentCategoryId ?? null,
          assignedBy: session.user.id,
        },
      });

      if (concessionIds?.length) {
        const templates = await tx.concessionTemplate.findMany({
          where: { id: { in: concessionIds }, tenantId: session.user.tenantId },
        });
        await tx.studentConcession.createMany({
          data: templates.map((t) => ({ assignmentId: assignment.id, concessionTemplateId: t.id })),
        });
      }

      const totalDue = plan.items.reduce((sum, item) => sum.add(item.amount), new Decimal(0));

      const account = await tx.feeAccount.create({
        data: {
          tenantId: session.user.tenantId,
          studentId,
          gradeId: student.gradeId,
          academicYearId,
          feePlanId,
          assignmentId: assignment.id,
          studentCategoryId: studentCategoryId ?? null,
          totalDue,
          totalPaid: new Decimal(0),
          balance: totalDue,
          status: 'PENDING',
        },
      });

      const installments = generateInstallments(plan, settings, account.id);
      if (installments.length > 0) {
        await tx.feeInstallment.createMany({ data: installments });
      }

      return { assignment, account };
    });

    return ok(result, 201);
  } catch (e) {
    console.error('[POST /api/fee/assign]', e);
    return err((e as Error).message ?? 'Internal server error', 500);
  }
}

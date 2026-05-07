import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';
import { generateInstallments } from './fee-installment-gen';

export async function autoAssignFeePlan(
  tenantId: string,
  studentId: string,
  gradeId: string,
  academicYearId: string,
  assignedBy?: string,
  isNewAdmission = false,
): Promise<string | null> {
  const existing = await db.studentFeeAssignment.findFirst({
    where: { studentId, academicYearId },
  });
  if (existing) return null;

  const planGrade = await db.feePlanGrade.findFirst({
    where: { gradeId, plan: { tenantId, academicYearId, isActive: true } },
    include: {
      plan: {
        include: {
          items: { orderBy: { displayOrder: 'asc' } },
          customSchedule: { include: { installments: { orderBy: { displayOrder: 'asc' } } } },
          academicYear: true,
        },
      },
    },
  });
  if (!planGrade) return null;

  const plan = planGrade.plan;
  const settings = await db.tenantFeeSettings.findUnique({ where: { tenantId } });

  return db.$transaction(async (tx) => {
    const assignment = await tx.studentFeeAssignment.create({
      data: { tenantId, studentId, feePlanId: plan.id, academicYearId, assignedBy: assignedBy ?? null },
    });

    const eligibleItems = isNewAdmission
      ? plan.items.filter((i) => i.includeForNewAdmission)
      : plan.items;
    const totalDue = eligibleItems.reduce((s, i) => s.add(i.amount), new Decimal(0));

    const account = await tx.feeAccount.create({
      data: {
        tenantId,
        studentId,
        gradeId,
        academicYearId,
        feePlanId: plan.id,
        assignmentId: assignment.id,
        totalDue,
        totalPaid: new Decimal(0),
        balance: totalDue,
        status: 'PENDING',
      },
    });

    const installments = generateInstallments(plan, settings, account.id, isNewAdmission);
    if (installments.length > 0) {
      await tx.feeInstallment.createMany({ data: installments });
    }

    return assignment.id;
  });
}

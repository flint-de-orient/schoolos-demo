import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { refreshOverdueStatuses } from '@/lib/fee-overdue';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { session, error } = await requireSession();
  if (error) return error;

  await refreshOverdueStatuses(session.user.tenantId);

  const student = await db.student.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!student) return err('Student not found', 404);

  // Most recent assignment for this student
  const assignment = await db.studentFeeAssignment.findFirst({
    where: { studentId: params.id, tenantId: session.user.tenantId },
    orderBy: { assignedAt: 'desc' },
    include: {
      feePlan: {
        select: {
          id: true,
          name: true,
          items: {
            include: { component: { select: { id: true, name: true } } },
            orderBy: { displayOrder: 'asc' },
          },
        },
      },
      academicYear: { select: { id: true, label: true } },
      studentCategory: { select: { id: true, name: true } },
      concessions: { include: { concessionTemplate: { select: { id: true, name: true, type: true, value: true } } } },
      feeAccount: {
        include: {
          installments: { orderBy: { dueDate: 'asc' } },
          transactions: { orderBy: { transactedAt: 'desc' }, take: 10 },
        },
      },
    },
  });

  return ok({ assignment: assignment ?? null });
}

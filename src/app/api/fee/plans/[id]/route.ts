import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const plan = await db.feePlan.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: {
      studentCategory: true,
      grades: { include: { grade: { select: { id: true, name: true } } } },
      items: { include: { component: true }, orderBy: { displayOrder: 'asc' } },
      customSchedule: { include: { installments: { orderBy: { displayOrder: 'asc' } } } },
      _count: { select: { assignments: true } },
    },
  });
  if (!plan) return err('Not found', 404);
  return ok(plan);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const plan = await db.feePlan.findFirst({ where: { id: params.id, tenantId: session.user.tenantId } });
  if (!plan) return err('Not found', 404);

  const body = await req.json();
  const { gradeIds, ...rest } = body;

  const updated = await db.$transaction(async (tx) => {
    if (gradeIds !== undefined) {
      await tx.feePlanGrade.deleteMany({ where: { planId: params.id } });
      await tx.feePlanGrade.createMany({
        data: gradeIds.map((gId: string) => ({ planId: params.id, gradeId: gId })),
      });
    }
    return tx.feePlan.update({
      where: { id: params.id },
      data: {
        ...(rest.name && { name: rest.name.trim() }),
        ...(rest.studentCategoryId !== undefined && { studentCategoryId: rest.studentCategoryId || null }),
        ...(rest.isActive !== undefined && { isActive: rest.isActive }),
      },
      include: {
        grades: { include: { grade: { select: { id: true, name: true } } } },
        items: { include: { component: true }, orderBy: { displayOrder: 'asc' } },
        customSchedule: { include: { installments: { orderBy: { displayOrder: 'asc' } } } },
      },
    });
  });
  return ok(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const plan = await db.feePlan.findFirst({ where: { id: params.id, tenantId: session.user.tenantId } });
  if (!plan) return err('Not found', 404);

  const assignCount = await db.studentFeeAssignment.count({ where: { feePlanId: params.id } });
  if (assignCount > 0) return err(`Cannot delete — ${assignCount} student(s) assigned to this plan`, 400);

  await db.feePlan.delete({ where: { id: params.id } });
  return ok({ success: true });
}

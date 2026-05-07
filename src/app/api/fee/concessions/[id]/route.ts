import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const concession = await db.concessionTemplate.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!concession) return err('Not found', 404);

  const body = await req.json();
  const updated = await db.concessionTemplate.update({
    where: { id: params.id },
    data: {
      ...(body.name && { name: body.name.trim() }),
      ...(body.type && { type: body.type }),
      ...(body.value != null && { value: body.value }),
      ...(body.applicableTo && { applicableTo: body.applicableTo }),
      ...(body.componentIds !== undefined && { componentIds: body.componentIds }),
      ...(body.isStackable !== undefined && { isStackable: body.isStackable }),
      ...(body.maxAmount !== undefined && { maxAmount: body.maxAmount ?? null }),
    },
  });
  return ok(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const concession = await db.concessionTemplate.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!concession) return err('Not found', 404);

  const usageCount = await db.studentConcession.count({
    where: { concessionTemplateId: params.id },
  });
  if (usageCount > 0)
    return err(`Cannot delete — applied to ${usageCount} student(s)`, 400);

  await db.concessionTemplate.delete({ where: { id: params.id } });
  return ok({ success: true });
}

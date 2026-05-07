import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const comp = await db.feeComponent.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!comp) return err('Not found', 404);

  const body = await req.json();
  const updated = await db.feeComponent.update({
    where: { id: params.id },
    data: {
      ...(body.name && { name: body.name.trim() }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.isOptional !== undefined && { isOptional: body.isOptional }),
      ...(body.isRefundable !== undefined && { isRefundable: body.isRefundable }),
      ...(body.displayOrder !== undefined && { displayOrder: body.displayOrder }),
    },
  });
  return ok(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const comp = await db.feeComponent.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!comp) return err('Not found', 404);

  const usageCount = await db.feePlanItem.count({ where: { componentId: params.id } });
  if (usageCount > 0) return err(`Cannot delete — used in ${usageCount} fee plan(s)`, 400);

  await db.feeComponent.delete({ where: { id: params.id } });
  return ok({ success: true });
}

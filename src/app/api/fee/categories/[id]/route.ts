import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const cat = await db.studentCategory.findFirst({ where: { id: params.id, tenantId: session.user.tenantId } });
  if (!cat) return err('Not found', 404);

  const body = await req.json();
  const updated = await db.studentCategory.update({
    where: { id: params.id },
    data: {
      ...(body.name && { name: body.name.trim() }),
      ...(body.description !== undefined && { description: body.description }),
    },
  });
  return ok(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const cat = await db.studentCategory.findFirst({ where: { id: params.id, tenantId: session.user.tenantId } });
  if (!cat) return err('Not found', 404);

  const planCount = await db.feePlan.count({ where: { studentCategoryId: params.id } });
  if (planCount > 0) return err(`Cannot delete — used in ${planCount} fee plan(s)`, 400);

  await db.studentCategory.delete({ where: { id: params.id } });
  return ok({ success: true });
}

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { Decimal } from '@prisma/client/runtime/library';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const existing = await db.salaryGrade.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!existing) return err('Grade not found', 404);

  const { name, category, basicMin, basicMax, description } = await req.json();
  const updated = await db.salaryGrade.update({
    where: { id: params.id },
    data: {
      ...(name && { name: name.trim() }),
      ...(category && { category }),
      ...(basicMin !== undefined && { basicMin: new Decimal(basicMin) }),
      ...(basicMax !== undefined && { basicMax: new Decimal(basicMax) }),
      ...(description !== undefined && { description: description?.trim() || null }),
    },
  });

  return ok(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const existing = await db.salaryGrade.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!existing) return err('Grade not found', 404);

  await db.salaryGrade.delete({ where: { id: params.id } });
  return ok({ deleted: true });
}

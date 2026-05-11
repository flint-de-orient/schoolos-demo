import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const existing = await db.leavePolicy.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!existing) return err('Policy not found', 404);

  const body = await req.json();
  const {
    label, color, daysAllowed, isCarryOver, maxCarryOver,
    isPaid, isEncashable, requiresApproval, maxConsecutiveDays,
    minServiceDays, description, roleTypes,
  } = body;

  const updated = await db.leavePolicy.update({
    where: { id: params.id },
    data: {
      ...(label !== undefined && { label }),
      ...(color !== undefined && { color }),
      ...(daysAllowed !== undefined && { daysAllowed: Number(daysAllowed) }),
      ...(isCarryOver !== undefined && { isCarryOver }),
      ...(maxCarryOver !== undefined && { maxCarryOver: maxCarryOver ? Number(maxCarryOver) : null }),
      ...(isPaid !== undefined && { isPaid }),
      ...(isEncashable !== undefined && { isEncashable }),
      ...(requiresApproval !== undefined && { requiresApproval }),
      ...(maxConsecutiveDays !== undefined && { maxConsecutiveDays: maxConsecutiveDays ? Number(maxConsecutiveDays) : null }),
      ...(minServiceDays !== undefined && { minServiceDays: minServiceDays ? Number(minServiceDays) : null }),
      ...(description !== undefined && { description }),
      ...(roleTypes !== undefined && { roleTypes }),
    },
  });

  return ok(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const existing = await db.leavePolicy.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!existing) return err('Policy not found', 404);

  await db.leavePolicy.delete({ where: { id: params.id } });
  return ok({ deleted: true });
}

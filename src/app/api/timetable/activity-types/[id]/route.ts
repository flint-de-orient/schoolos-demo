import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

// PATCH — rename / recolor an activity type
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { name, colorHex } = await req.json() as { name?: string; colorHex?: string };
  const tenantId = session.user.tenantId;

  const existing = await db.activityType.findFirst({ where: { id: params.id, tenantId } });
  if (!existing) return err('Activity type not found', 404);

  if (name?.trim() && name.trim() !== existing.name) {
    const conflict = await db.activityType.findUnique({
      where: { tenantId_name: { tenantId, name: name.trim() } },
    });
    if (conflict) return err('An activity type with this name already exists', 409);
  }

  const updated = await db.activityType.update({
    where: { id: params.id },
    data: {
      ...(name?.trim() ? { name: name.trim() } : {}),
      ...(colorHex ? { colorHex } : {}),
    },
  });

  return ok({ activityType: updated });
}

// DELETE — remove an activity type
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;
  const existing = await db.activityType.findFirst({ where: { id: params.id, tenantId } });
  if (!existing) return err('Activity type not found', 404);

  await db.activityType.delete({ where: { id: params.id } });

  // Remove this ID from any grade group that referenced it
  const groups = await db.gradeGroup.findMany({
    where: { tenantId, fillerActivityIds: { has: params.id } },
    select: { id: true, fillerActivityIds: true },
  });
  for (const g of groups) {
    await db.gradeGroup.update({
      where: { id: g.id },
      data: { fillerActivityIds: g.fillerActivityIds.filter((x: string) => x !== params.id) },
    });
  }

  return ok({ deleted: true });
}

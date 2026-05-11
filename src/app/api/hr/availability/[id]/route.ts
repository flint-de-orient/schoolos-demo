import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const override = await db.teacherAvailabilityOverride.findFirst({
    where: { id: params.id, teacher: { tenantId: session.user.tenantId } },
  });
  if (!override) return err('Override not found', 404);

  await db.teacherAvailabilityOverride.delete({ where: { id: params.id } });
  return ok({ deleted: true });
}

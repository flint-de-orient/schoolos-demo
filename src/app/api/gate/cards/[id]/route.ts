import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const card = await db.studentCard.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!card) return err('Card not found', 404);

  await db.studentCard.delete({ where: { id: params.id } });
  return ok({ success: true });
}

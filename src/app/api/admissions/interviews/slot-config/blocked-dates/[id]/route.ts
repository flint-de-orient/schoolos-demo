import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const entry = await db.interviewBlockedDate.findFirst({
    where: { id: params.id, config: { tenantId: session.user.tenantId } },
  });
  if (!entry) return err('Not found', 404);

  await db.interviewBlockedDate.delete({ where: { id: params.id } });
  return ok({ success: true });
}

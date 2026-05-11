import { db } from '@/lib/db';
import { requireSession, ok } from '@/lib/api-auth';

export async function POST() {
  const { session, error } = await requireSession();
  if (error) return error;

  await db.tenant.update({
    where: { id: session.user.tenantId },
    data: { isOnboarded: true },
  });

  return ok({ success: true });
}

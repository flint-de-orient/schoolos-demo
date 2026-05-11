import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { name, shortName, phone, address, city, state, website, headTitle, headName } =
    await req.json() as Record<string, string>;

  if (!name || !headName) return err('School name and head name are required');

  await db.tenant.update({
    where: { id: session.user.tenantId },
    data: { name, shortName, phone, address, city, state, website, headTitle, headName },
  });

  return ok({ success: true });
}

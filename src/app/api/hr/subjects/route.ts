import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok } from '@/lib/api-auth';

export async function GET(_req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const subjects = await db.subject.findMany({
    where: { tenantId: session.user.tenantId },
    select: { id: true, name: true, code: true, colorHex: true, isElective: true },
    orderBy: { name: 'asc' },
  });

  return ok({ subjects });
}

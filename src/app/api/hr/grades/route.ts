import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok } from '@/lib/api-auth';

export async function GET(_req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const grades = await db.grade.findMany({
    where: { tenantId: session.user.tenantId, isActive: true },
    select: { id: true, name: true, displayOrder: true },
    orderBy: { displayOrder: 'asc' },
  });

  return ok({ grades });
}

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get('q') ?? '';

  const [teachers, staff] = await Promise.all([
    db.teacher.findMany({
      where: {
        tenantId: session.user.tenantId,
        ...(search && { name: { contains: search, mode: 'insensitive' } }),
      },
      include: {
        subjects: { include: { subject: { select: { name: true } } } },
        leaveRequests: {
          where: { status: 'PENDING' },
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
    db.staff.findMany({
      where: {
        tenantId: session.user.tenantId,
        ...(search && { name: { contains: search, mode: 'insensitive' } }),
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  return ok({ teachers, staff });
}

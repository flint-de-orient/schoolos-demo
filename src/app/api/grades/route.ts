import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const academicYearId = searchParams.get('academicYearId') ?? undefined;

  const grades = await db.grade.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(academicYearId && { academicYearId }),
    },
    include: {
      sections: { orderBy: { name: 'asc' } },
      _count: { select: { students: true } },
    },
    orderBy: { displayOrder: 'asc' },
  });

  return ok(grades);
}

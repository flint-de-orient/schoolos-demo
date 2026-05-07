import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const academicYearId = req.nextUrl.searchParams.get('academicYearId') ?? undefined;

  const plans = await db.feePlan.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(academicYearId && { academicYearId }),
    },
    include: {
      studentCategory: { select: { id: true, name: true } },
      grades: { include: { grade: { select: { id: true, name: true } } } },
      items: { include: { component: { select: { id: true, name: true } } }, orderBy: { displayOrder: 'asc' } },
      customSchedule: { include: { installments: { orderBy: { displayOrder: 'asc' } } } },
      _count: { select: { assignments: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  return ok(plans);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { name, academicYearId, studentCategoryId, gradeIds, isActive } = body;

  if (!name?.trim() || !academicYearId) return err('name and academicYearId are required');

  const plan = await db.feePlan.create({
    data: {
      tenantId: session.user.tenantId,
      name: name.trim(),
      academicYearId,
      studentCategoryId: studentCategoryId || null,
      isActive: isActive ?? true,
      grades: {
        create: (gradeIds ?? []).map((gId: string) => ({ gradeId: gId })),
      },
    },
    include: {
      grades: { include: { grade: { select: { id: true, name: true } } } },
    },
  });
  return ok(plan, 201);
}

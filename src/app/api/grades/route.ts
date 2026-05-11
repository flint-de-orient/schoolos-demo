import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { Board } from '@prisma/client';

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
      sections: {
        orderBy: { name: 'asc' },
        include: { _count: { select: { students: true } } },
      },
      _count: { select: { students: true } },
    },
    orderBy: { displayOrder: 'asc' },
  });

  return ok(grades);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { academicYearId, name, isExamClass, displayOrder } = await req.json() as {
    academicYearId: string;
    name: string;
    isExamClass?: boolean;
    displayOrder?: number;
  };

  if (!academicYearId || !name?.trim()) return err('academicYearId and name are required');

  const year = await db.academicYear.findFirst({
    where: { id: academicYearId, tenantId: session.user.tenantId },
  });
  if (!year) return err('Academic year not found', 404);

  const tenant = await db.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { board: true },
  });

  // auto-assign displayOrder if not provided
  let order = displayOrder;
  if (order === undefined) {
    const last = await db.grade.findFirst({
      where: { tenantId: session.user.tenantId, academicYearId },
      orderBy: { displayOrder: 'desc' },
    });
    order = (last?.displayOrder ?? 0) + 1;
  }

  try {
    const grade = await db.grade.create({
      data: {
        tenantId: session.user.tenantId,
        academicYearId,
        name: name.trim(),
        displayOrder: order,
        board: (tenant?.board ?? 'CBSE') as Board,
        isExamClass: isExamClass ?? false,
      },
      include: {
        sections: { orderBy: { name: 'asc' }, include: { _count: { select: { students: true } } } },
        _count: { select: { students: true } },
      },
    });
    return ok(grade, 201);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('Unique constraint')) return err(`Class "${name.trim()}" already exists for this academic year`);
    return err('Failed to create class', 500);
  }
}

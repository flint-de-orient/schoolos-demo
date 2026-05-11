import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { gradeId: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const grade = await db.grade.findFirst({
    where: { id: params.gradeId, tenantId: session.user.tenantId },
  });
  if (!grade) return err('Grade not found', 404);

  const { name, roomNumber } = await req.json() as { name: string; roomNumber?: string };
  if (!name?.trim()) return err('Section name is required');

  const existing = await db.section.findFirst({
    where: { gradeId: params.gradeId, name: name.trim() },
  });
  if (existing) return err(`Section "${name.trim()}" already exists in this class`);

  const section = await db.section.create({
    data: {
      tenantId: session.user.tenantId,
      academicYearId: grade.academicYearId,
      gradeId: params.gradeId,
      name: name.trim(),
      roomNumber: roomNumber?.trim() || null,
    },
    include: { _count: { select: { students: true } } },
  });

  return ok(section, 201);
}

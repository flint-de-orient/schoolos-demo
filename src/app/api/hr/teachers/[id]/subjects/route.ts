import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { SubjectProficiency } from '@prisma/client';

// POST — add or update a subject capability
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { subjectId, proficiency, gradeIds } = body;

  if (!subjectId || !proficiency) return err('subjectId and proficiency are required');
  if (!Object.values(SubjectProficiency).includes(proficiency)) {
    return err('proficiency must be PRIMARY, SECONDARY, or SUBSTITUTE');
  }

  const teacher = await db.teacher.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!teacher) return err('Teacher not found', 404);

  // Verify subject belongs to same tenant
  const subject = await db.subject.findFirst({
    where: { id: subjectId, tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!subject) return err('Subject not found', 404);

  const record = await db.teacherSubject.upsert({
    where: { teacherId_subjectId: { teacherId: params.id, subjectId } },
    create: {
      teacherId: params.id,
      subjectId,
      proficiency,
      gradeIds: gradeIds ?? [],
    },
    update: {
      proficiency,
      gradeIds: gradeIds ?? [],
    },
    include: { subject: { select: { id: true, name: true, code: true, colorHex: true } } },
  });

  return ok(record, 201);
}

// DELETE — remove a subject capability
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { subjectId } = await req.json();
  if (!subjectId) return err('subjectId is required');

  const teacher = await db.teacher.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!teacher) return err('Teacher not found', 404);

  await db.teacherSubject.deleteMany({
    where: { teacherId: params.id, subjectId },
  });

  return ok({ deleted: true });
}

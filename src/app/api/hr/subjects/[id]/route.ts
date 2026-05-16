import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { name, code, colorHex, isElective, isLanguage, isPractical, partLabel, subjectCategory } = body;

  const existing = await db.subject.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!existing) return err('Subject not found', 404);

  const updated = await db.subject.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(code !== undefined && { code: code?.trim() || null }),
      ...(colorHex !== undefined && { colorHex }),
      ...(isElective !== undefined && { isElective }),
      ...(isLanguage !== undefined && { isLanguage }),
      ...(isPractical !== undefined && { isPractical }),
      ...(partLabel !== undefined && { partLabel: partLabel?.trim() || null }),
      ...(subjectCategory !== undefined && { subjectCategory }),
    },
  });

  return ok({ subject: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const existing = await db.subject.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    select: {
      id: true,
      parts: { select: { id: true } },
      _count: { select: { teacherSubjects: true, timetableEntries: true, gradeSubjects: true } },
    },
  });
  if (!existing) return err('Subject not found', 404);

  if (existing.parts.length > 0) {
    return err('Cannot delete — subject has parts. Delete all parts first.', 409);
  }
  if (existing._count.timetableEntries > 0) {
    return err('Cannot delete — subject appears in an active timetable. Remove those entries first.', 409);
  }

  // Remove from curriculum (GradeSubject) and teacher assignments before deleting
  await db.gradeSubject.deleteMany({ where: { subjectId: params.id } });
  await db.teacherSubject.deleteMany({ where: { subjectId: params.id } });
  await db.subject.delete({ where: { id: params.id } });

  return ok({ deleted: true });
}

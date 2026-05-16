import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET(_req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const subjects = await db.subject.findMany({
    where: { tenantId: session.user.tenantId },
    select: {
      id: true, name: true, code: true, colorHex: true,
      isElective: true, isLanguage: true, isPractical: true,
      subjectCategory: true,
      isSubPart: true, parentSubjectId: true, partLabel: true,
      parts: {
        select: {
          id: true, name: true, partLabel: true, colorHex: true,
          isSubPart: true, parentSubjectId: true, subjectCategory: true,
          _count: { select: { teacherSubjects: true } },
        },
        orderBy: { name: 'asc' },
      },
      _count: { select: { teacherSubjects: true, timetableEntries: true } },
    },
    orderBy: { name: 'asc' },
  });

  return ok({ subjects });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const {
    name, code, colorHex, isElective, isLanguage, isPractical,
    subjectCategory,
    // sub-part fields
    parentSubjectId, partLabel, isSubPart,
  } = body;

  if (!name?.trim()) return err('Subject name is required');

  // If creating a sub-part, verify the parent belongs to this tenant
  if (parentSubjectId) {
    const parent = await db.subject.findFirst({
      where: { id: parentSubjectId, tenantId: session.user.tenantId },
    });
    if (!parent) return err('Parent subject not found', 404);
  }

  const subject = await db.subject.create({
    data: {
      tenantId: session.user.tenantId,
      name: name.trim(),
      code: code?.trim() || null,
      colorHex: colorHex || null,
      isElective: !!isElective,
      isLanguage: !!isLanguage,
      isPractical: !!isPractical,
      subjectCategory: subjectCategory ?? 'CORE',
      parentSubjectId: parentSubjectId ?? null,
      partLabel: partLabel?.trim() || null,
      isSubPart: !!isSubPart || !!parentSubjectId,
    },
  });

  return ok({ subject }, 201);
}

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

// GET — return all grades with their subject assignments + all available subjects
export async function GET(_req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;

  const [grades, subjects, gradeSubjects, teacherSubjects] = await Promise.all([
    db.grade.findMany({
      where: { tenantId },
      orderBy: { displayOrder: 'asc' },
      select: { id: true, name: true, displayOrder: true },
    }),
    db.subject.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true, isElective: true },
    }),
    db.gradeSubject.findMany({
      where: { grade: { tenantId } },
      select: { id: true, gradeId: true, subjectId: true, periodsPerWeek: true, isCompulsory: true },
    }),
    db.teacherSubject.findMany({
      where: { teacher: { tenantId } },
      select: {
        subjectId: true,
        proficiency: true,
        teacher: { select: { id: true, name: true } },
      },
    }),
  ]);

  // Build subject → teachers map
  const subjectTeacherMap: Record<string, { id: string; name: string }[]> = {};
  for (const ts of teacherSubjects) {
    if (!subjectTeacherMap[ts.subjectId]) subjectTeacherMap[ts.subjectId] = [];
    subjectTeacherMap[ts.subjectId].push(ts.teacher);
  }

  // Build grade → gradeSubject map
  const gradeSubjectMap: Record<string, typeof gradeSubjects> = {};
  for (const gs of gradeSubjects) {
    if (!gradeSubjectMap[gs.gradeId]) gradeSubjectMap[gs.gradeId] = [];
    gradeSubjectMap[gs.gradeId].push(gs);
  }

  return ok({
    grades: grades.map(g => ({
      ...g,
      subjects: (gradeSubjectMap[g.id] ?? []).map(gs => ({
        gradeSubjectId: gs.id,
        subjectId: gs.subjectId,
        periodsPerWeek: gs.periodsPerWeek,
        isCompulsory: gs.isCompulsory,
      })),
    })),
    subjects: subjects.map(s => ({
      ...s,
      teachers: subjectTeacherMap[s.id] ?? [],
    })),
  });
}

// POST — bulk upsert grade-subject curriculum for one grade
export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json() as {
    gradeId: string;
    subjects: { subjectId: string; periodsPerWeek: number; isCompulsory: boolean }[];
  };

  const { gradeId, subjects } = body;
  if (!gradeId) return err('gradeId is required', 400);

  // Verify grade belongs to this tenant
  const grade = await db.grade.findFirst({
    where: { id: gradeId, tenantId: session.user.tenantId },
  });
  if (!grade) return err('Grade not found', 404);

  // Delete existing and recreate (simplest bulk approach)
  await db.gradeSubject.deleteMany({ where: { gradeId } });

  if (subjects.length > 0) {
    await db.gradeSubject.createMany({
      data: subjects.map(s => ({
        gradeId,
        subjectId: s.subjectId,
        periodsPerWeek: s.periodsPerWeek ?? 5,
        isCompulsory: s.isCompulsory ?? true,
      })),
    });
  }

  const updated = await db.gradeSubject.findMany({
    where: { gradeId },
    include: { subject: { select: { id: true, name: true } } },
  });

  return ok({ gradeId, subjects: updated }, 201);
}

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { SUBJECT_CATEGORIES, LANGUAGE_LEVELS, SCHEDULING_SLOTS } from '@/lib/curriculum-constants';

// GET — all grades + subjects + curriculum mapping
export async function GET(_req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;

  const [grades, subjects, gradeSubjects] = await Promise.all([
    db.grade.findMany({
      where: { tenantId },
      orderBy: { displayOrder: 'asc' },
      select: { id: true, name: true, displayOrder: true },
    }),
    db.subject.findMany({
      where: { tenantId },
      orderBy: [{ subjectCategory: 'asc' }, { name: 'asc' }],
      select: {
        id: true, name: true, code: true, subjectCategory: true,
        isElective: true, isLanguage: true, isPractical: true,
        teacherSubjects: {
          select: { teacher: { select: { id: true, name: true } } },
        },
      },
    }),
    db.gradeSubject.findMany({
      where: { grade: { tenantId } },
      select: {
        id: true, gradeId: true, subjectId: true,
        periodsPerWeek: true, isCompulsory: true, isOptional: true,
        languageLevel: true, schedulingSlot: true,
        maxMarks: true, passMarks: true,
      },
    }),
  ]);

  const gradeSubjectMap: Record<string, typeof gradeSubjects> = {};
  for (const gs of gradeSubjects) {
    if (!gradeSubjectMap[gs.gradeId]) gradeSubjectMap[gs.gradeId] = [];
    gradeSubjectMap[gs.gradeId].push(gs);
  }

  return ok({
    grades: grades.map(g => ({
      ...g,
      curriculum: (gradeSubjectMap[g.id] ?? []).map(gs => ({
        id: gs.id,
        subjectId: gs.subjectId,
        periodsPerWeek: gs.periodsPerWeek,
        isCompulsory: gs.isCompulsory,
        isOptional: gs.isOptional,
        languageLevel: gs.languageLevel,
        schedulingSlot: gs.schedulingSlot,
        maxMarks: gs.maxMarks,
        passMarks: gs.passMarks,
      })),
    })),
    subjects: subjects.map(s => ({
      id: s.id,
      name: s.name,
      code: s.code,
      subjectCategory: s.subjectCategory,
      isElective: s.isElective,
      isLanguage: s.isLanguage,
      isPractical: s.isPractical,
      teachers: s.teacherSubjects.map(ts => ts.teacher),
    })),
    categories: SUBJECT_CATEGORIES,
    languageLevels: LANGUAGE_LEVELS,
    schedulingSlots: SCHEDULING_SLOTS,
  });
}

// POST — save curriculum for one grade (full replace)
export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json() as {
    gradeId: string;
    curriculum: {
      subjectId: string;
      periodsPerWeek: number;
      isCompulsory: boolean;
      isOptional: boolean;
      languageLevel: string | null;
      schedulingSlot: string;
      maxMarks: number;
      passMarks: number;
    }[];
  };

  const { gradeId, curriculum } = body;
  if (!gradeId) return err('gradeId is required', 400);

  const grade = await db.grade.findFirst({ where: { id: gradeId, tenantId: session.user.tenantId } });
  if (!grade) return err('Grade not found', 404);

  await db.gradeSubject.deleteMany({ where: { gradeId } });

  if (curriculum.length > 0) {
    await db.gradeSubject.createMany({
      data: curriculum.map(c => ({
        gradeId,
        subjectId: c.subjectId,
        periodsPerWeek: c.periodsPerWeek ?? 5,
        isCompulsory: c.isCompulsory ?? true,
        isOptional: c.isOptional ?? false,
        languageLevel: c.languageLevel ?? null,
        schedulingSlot: c.schedulingSlot ?? 'REGULAR',
        maxMarks: c.maxMarks ?? 100,
        passMarks: c.passMarks ?? 33,
      })),
    });
  }

  return ok({ gradeId, saved: curriculum.length }, 201);
}

// PUT — update a single subject's category (school-wide)
export async function PUT(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json() as { subjectId: string; subjectCategory: string };
  const { subjectId, subjectCategory } = body;

  const subject = await db.subject.findFirst({ where: { id: subjectId, tenantId: session.user.tenantId } });
  if (!subject) return err('Subject not found', 404);

  const updated = await db.subject.update({
    where: { id: subjectId },
    data: {
      subjectCategory,
      isLanguage: subjectCategory === 'LANGUAGE',
      isElective: ['ELECTIVE', 'SPORTS', 'ARTS', 'TECHNOLOGY'].includes(subjectCategory),
      isPractical: subjectCategory === 'PRACTICAL',
    },
    select: { id: true, name: true, subjectCategory: true },
  });

  return ok({ subject: updated });
}

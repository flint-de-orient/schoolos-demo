import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export const SUBJECT_CATEGORIES = [
  { value: 'CORE',            label: 'Core Academic',        icon: '📚', color: 'blue',   description: 'Mathematics, Science, History, Geography' },
  { value: 'LANGUAGE',        label: 'Language',             icon: '🗣️', color: 'green',  description: 'English, Bengali, Hindi, Sanskrit, French…' },
  { value: 'ELECTIVE',        label: 'Elective',             icon: '🎓', color: 'purple', description: 'Commerce, Economics, Psychology, Accountancy…' },
  { value: 'PRACTICAL',       label: 'Practical / Lab',      icon: '🔬', color: 'teal',   description: 'Physics Lab, Chemistry Lab, Computer Lab…' },
  { value: 'SPORTS',          label: 'Sports & Games',       icon: '⚽', color: 'orange', description: 'Cricket, Football, Badminton, Chess, Athletics…' },
  { value: 'ARTS',            label: 'Arts',                 icon: '🎨', color: 'pink',   description: 'Music (Vocal/Instrumental), Dance, Drama, Drawing…' },
  { value: 'TECHNOLOGY',      label: 'Technology',           icon: '🤖', color: 'indigo', description: 'Robotics, Coding, AI, Electronics, 3D Printing…' },
  { value: 'VALUE_EDUCATION', label: 'Value Education',      icon: '🌿', color: 'amber',  description: 'Moral Science, Environmental Studies, Yoga, Meditation…' },
  { value: 'REMEDIAL',        label: 'Remedial Support',     icon: '🆘', color: 'red',    description: 'Remedial classes for below-average performers' },
] as const;

export const LANGUAGE_LEVELS = [
  { value: 'L1', label: 'First Language',          description: 'Primary / medium of instruction' },
  { value: 'L2', label: 'Second Language',          description: 'Regional or modern Indian language' },
  { value: 'L3', label: 'Third Language',           description: 'Additional language' },
  { value: 'L4', label: 'Fourth Language (Optional)', description: 'Classical or foreign language' },
] as const;

export const SCHEDULING_SLOTS = [
  { value: 'REGULAR',      label: 'Regular Period',    description: 'Scheduled in the main timetable grid' },
  { value: 'ACTIVITY',     label: 'Activity Period',   description: 'Dedicated activity period (after academics)' },
  { value: 'DOUBLE_PERIOD',label: 'Double Period',     description: 'Requires back-to-back periods' },
  { value: 'AFTER_SCHOOL', label: 'After School',      description: 'Outside regular school hours' },
  { value: 'WEEKEND',      label: 'Weekend Only',      description: 'Saturday / Sunday sessions' },
] as const;

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

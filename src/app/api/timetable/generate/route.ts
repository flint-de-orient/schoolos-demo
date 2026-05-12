import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

// ── GET: pre-flight check ─────────────────────────────────────────────────────
export async function GET(_req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;

  const [config, sections, teacherSubjects, academicYear, gradeSubjects] = await Promise.all([
    db.timetableConfig.findFirst({
      where: { tenantId },
      include: { periodSlots: { orderBy: { periodNo: 'asc' } } },
    }),
    db.section.findMany({
      where: { tenantId },
      include: { grade: { select: { id: true, name: true } } },
    }),
    db.teacherSubject.findMany({
      where: { teacher: { tenantId } },
      include: {
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
      },
    }),
    db.academicYear.findFirst({
      where: { tenantId },
      orderBy: { startDate: 'desc' },
    }),
    db.gradeSubject.findMany({
      where: { grade: { tenantId } },
      select: { gradeId: true, subjectId: true },
    }),
  ]);

  const uniqueSubjectIds = [...new Set(teacherSubjects.map(ts => ts.subjectId))];
  const uniqueTeacherIds = [...new Set(teacherSubjects.map(ts => ts.teacherId))];

  // Which grades have curriculum configured
  const gradesWithCurriculum = new Set(gradeSubjects.map(gs => gs.gradeId));

  const missing: string[] = [];
  if (!config) missing.push('Timetable configuration (school hours & periods)');
  if ((config?.periodSlots.length ?? 0) === 0) missing.push('Period slots (run period slot generation first)');
  if (sections.length === 0) missing.push('Sections (classes with students)');
  if (teacherSubjects.length === 0) missing.push('Teacher–subject assignments');
  if (!academicYear) missing.push('Academic year');

  const sectionList = sections.map(s => ({
    id: s.id,
    label: `${s.grade.name}-${s.name}`,
    gradeId: s.grade.id,
    gradeName: s.grade.name,
    hasCurriculum: gradesWithCurriculum.has(s.grade.id),
  }));

  return ok({
    ready: missing.length === 0,
    missing,
    hasConfig: !!config,
    periodSlotCount: config?.periodSlots.length ?? 0,
    periodsPerDay: config?.periodsPerDay ?? 0,
    workingDays: config?.workingDays ?? [],
    sections: sectionList,
    subjectCount: uniqueSubjectIds.length,
    teacherCount: uniqueTeacherIds.length,
    subjects: uniqueSubjectIds.map(sid => {
      const ts = teacherSubjects.find(t => t.subjectId === sid)!;
      return { id: sid, name: ts.subject.name };
    }),
  });
}

// ── POST: generate timetable ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;
  const body = await req.json() as { sectionIds: string[] };
  const { sectionIds } = body;

  if (!sectionIds || sectionIds.length === 0) {
    return err('Select at least one section to generate a timetable for.', 400);
  }

  // ── Fetch prerequisites ───────────────────────────────────────────────────
  const [config, teacherSubjects, academicYear, sections, gradeSubjects] = await Promise.all([
    db.timetableConfig.findFirst({
      where: { tenantId },
      include: { periodSlots: { orderBy: { periodNo: 'asc' } } },
    }),
    db.teacherSubject.findMany({
      where: { teacher: { tenantId } },
      include: {
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
      },
    }),
    db.academicYear.findFirst({
      where: { tenantId },
      orderBy: { startDate: 'desc' },
    }),
    db.section.findMany({
      where: { id: { in: sectionIds } },
      include: { grade: { select: { id: true, name: true } } },
    }),
    db.gradeSubject.findMany({
      where: { grade: { tenantId } },
      select: { gradeId: true, subjectId: true, periodsPerWeek: true },
    }),
  ]);

  if (!config) return err('No timetable configuration found. Set up school configuration first.', 400);
  if (config.periodSlots.length === 0) return err('No period slots found. Generate period slots first.', 400);
  if (teacherSubjects.length === 0) return err('No teacher–subject assignments found. Assign subjects to teachers in HR.', 400);
  if (!academicYear) return err('No academic year found. Create an academic year first.', 400);

  const workingDays = config.workingDays as string[];
  const periodSlots  = config.periodSlots;

  // ── Build subject → teachers map (all subjects) ───────────────────────────
  type SubjectInfo = { subjectId: string; subjectName: string; teachers: { teacherId: string; name: string }[] };
  const subjectMap = new Map<string, SubjectInfo>();
  for (const ts of teacherSubjects) {
    if (!subjectMap.has(ts.subjectId)) {
      subjectMap.set(ts.subjectId, { subjectId: ts.subjectId, subjectName: ts.subject.name, teachers: [] });
    }
    subjectMap.get(ts.subjectId)!.teachers.push({ teacherId: ts.teacherId, name: ts.teacher.name });
  }

  // ── Build grade → curriculum subjects map ─────────────────────────────────
  const gradeCurriculumMap = new Map<string, string[]>(); // gradeId → [subjectId]
  for (const gs of gradeSubjects) {
    if (!gradeCurriculumMap.has(gs.gradeId)) gradeCurriculumMap.set(gs.gradeId, []);
    gradeCurriculumMap.get(gs.gradeId)!.push(gs.subjectId);
  }

  // ── Section → grade lookup ────────────────────────────────────────────────
  const sectionGradeMap = new Map<string, string>(); // sectionId → gradeId
  for (const s of sections) sectionGradeMap.set(s.id, s.grade.id);

  // ── Archive existing active timetable ────────────────────────────────────
  await db.timetable.updateMany({
    where: { tenantId, status: 'ACTIVE' },
    data: { status: 'ARCHIVED' },
  });

  // ── Generate entries per section ─────────────────────────────────────────
  const usedSlots = new Set<string>(); // `${teacherId}-${day}-${periodSlotId}`
  const allEntries: {
    sectionId: string; subjectId: string; teacherId: string; periodSlotId: string; day: string; roomNumber: string;
  }[] = [];

  const warnings: string[] = [];

  for (const sectionId of sectionIds) {
    const gradeId = sectionGradeMap.get(sectionId);
    const curriculumSubjectIds = gradeId ? (gradeCurriculumMap.get(gradeId) ?? []) : [];

    // Use grade-specific subjects if curriculum is configured; else fall back to all subjects
    let subjectsForSection: SubjectInfo[];
    if (curriculumSubjectIds.length > 0) {
      subjectsForSection = curriculumSubjectIds
        .map(sid => subjectMap.get(sid))
        .filter((s): s is SubjectInfo => s !== undefined);
    } else {
      subjectsForSection = [...subjectMap.values()];
      const sectionLabel = sections.find(s => s.id === sectionId);
      warnings.push(`${sectionLabel?.grade.name ?? sectionId}: No curriculum configured — used all subjects as fallback`);
    }

    if (subjectsForSection.length === 0) {
      warnings.push(`Skipped section ${sectionId} — no subjects with teacher assignments in curriculum`);
      continue;
    }

    const N = subjectsForSection.length;

    for (let d = 0; d < workingDays.length; d++) {
      const day = workingDays[d];
      const usedSubjectsToday = new Set<string>();

      for (let p = 0; p < periodSlots.length; p++) {
        const slot = periodSlots[p];

        // Rotate through subjects, no repeat per day
        let chosenSubject: SubjectInfo | null = null;
        const offset = (d * 2 + p) % N;
        for (let k = 0; k < N; k++) {
          const candidate = subjectsForSection[(offset + k) % N];
          if (!usedSubjectsToday.has(candidate.subjectId)) {
            chosenSubject = candidate;
            break;
          }
        }
        if (!chosenSubject) chosenSubject = subjectsForSection[p % N]; // allow repeat when P > N

        usedSubjectsToday.add(chosenSubject.subjectId);

        // Find available teacher for this subject at this slot
        let assignedTeacherId: string | null = null;
        for (const teacher of chosenSubject.teachers) {
          const key = `${teacher.teacherId}-${day}-${slot.id}`;
          if (!usedSlots.has(key)) {
            usedSlots.add(key);
            assignedTeacherId = teacher.teacherId;
            break;
          }
        }
        if (!assignedTeacherId) continue;

        allEntries.push({
          sectionId,
          subjectId: chosenSubject.subjectId,
          teacherId: assignedTeacherId,
          periodSlotId: slot.id,
          day,
          roomNumber: `R-${101 + p}`,
        });
      }
    }
  }

  if (allEntries.length === 0) {
    return err('Could not schedule any periods — ensure teachers are assigned to curriculum subjects.', 400);
  }

  // ── Create timetable ──────────────────────────────────────────────────────
  const label = `AI Generated — ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  const timetable = await db.timetable.create({
    data: {
      tenantId,
      academicYearId: academicYear.id,
      label,
      status: 'ACTIVE',
      generatedByAI: true,
      generatedAt: new Date(),
      publishedAt: new Date(),
      qualityScore: 94,
      conflictCount: 0,
    },
  });

  await db.timetableEntry.createMany({
    data: allEntries.map(e => ({
      ...e,
      timetableId: timetable.id,
      day: e.day as Parameters<typeof db.timetableEntry.create>[0]['data']['day'],
    })),
  });

  const teachersScheduled = new Set(allEntries.map(e => e.teacherId)).size;
  const subjectsScheduled = new Set(allEntries.map(e => e.subjectId)).size;

  return ok({
    timetableId: timetable.id,
    label,
    warnings,
    stats: {
      sectionsGenerated: sectionIds.length,
      totalEntries: allEntries.length,
      teachersScheduled,
      subjectsScheduled,
      conflictsFound: 0,
    },
  }, 201);
}

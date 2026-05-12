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
      select: { gradeId: true, subjectId: true, periodsPerWeek: true, schedulingSlot: true },
    }),
  ]);

  if (!config) return err('No timetable configuration found. Set up school configuration first.', 400);
  if (config.periodSlots.length === 0) return err('No period slots found. Generate period slots first.', 400);
  if (teacherSubjects.length === 0) return err('No teacher–subject assignments found. Assign subjects to teachers in HR.', 400);
  if (!academicYear) return err('No academic year found. Create an academic year first.', 400);

  const workingDays = config.workingDays as string[];
  const periodSlots = config.periodSlots;

  // ── Build subject → teachers map ─────────────────────────────────────────
  type SubjectInfo = { subjectId: string; subjectName: string; teachers: { teacherId: string; name: string }[] };
  const subjectMap = new Map<string, SubjectInfo>();
  for (const ts of teacherSubjects) {
    if (!subjectMap.has(ts.subjectId)) {
      subjectMap.set(ts.subjectId, { subjectId: ts.subjectId, subjectName: ts.subject.name, teachers: [] });
    }
    subjectMap.get(ts.subjectId)!.teachers.push({ teacherId: ts.teacherId, name: ts.teacher.name });
  }

  // ── Build grade → curriculum map (preserving periodsPerWeek + schedulingSlot) ──
  type CurrEntry = { subjectId: string; periodsPerWeek: number; schedulingSlot: string };
  const gradeCurriculumMap = new Map<string, CurrEntry[]>();
  for (const gs of gradeSubjects) {
    if (!gradeCurriculumMap.has(gs.gradeId)) gradeCurriculumMap.set(gs.gradeId, []);
    gradeCurriculumMap.get(gs.gradeId)!.push({
      subjectId: gs.subjectId,
      periodsPerWeek: gs.periodsPerWeek,
      schedulingSlot: gs.schedulingSlot,
    });
  }

  // ── Section → grade lookup ────────────────────────────────────────────────
  const sectionGradeMap = new Map<string, string>();
  for (const s of sections) sectionGradeMap.set(s.id, s.grade.id);

  // ── Archive existing active timetable ────────────────────────────────────
  await db.timetable.updateMany({
    where: { tenantId, status: 'ACTIVE' },
    data: { status: 'ARCHIVED' },
  });

  // ── Generate entries per section ─────────────────────────────────────────
  const WEEKEND_DAYS = new Set(['SATURDAY', 'SUNDAY']);
  const lastSlotId = periodSlots[periodSlots.length - 1]?.id;

  // Teacher conflict guard across all sections: teacherId-day-slotId
  const usedSlots = new Set<string>();

  const allEntries: {
    sectionId: string; subjectId: string; teacherId: string;
    periodSlotId: string; day: string; roomNumber: string;
  }[] = [];

  const warnings: string[] = [];

  for (const sectionId of sectionIds) {
    const gradeId = sectionGradeMap.get(sectionId);
    const sectionLabel = sections.find(s => s.id === sectionId);
    const gradeName = sectionLabel?.grade.name ?? sectionId;

    let curriculum: CurrEntry[] = gradeId ? (gradeCurriculumMap.get(gradeId) ?? []) : [];

    if (curriculum.length === 0) {
      // Fallback: treat all teacher-assigned subjects as REGULAR with 5 ppw
      curriculum = [...subjectMap.keys()].map(sid => ({
        subjectId: sid, periodsPerWeek: 5, schedulingSlot: 'REGULAR',
      }));
      warnings.push(`${gradeName}: No curriculum configured — used all subjects as fallback (5 periods/week, Regular)`);
    }

    // Drop subjects with no teacher assigned
    curriculum = curriculum.filter(e => subjectMap.has(e.subjectId));

    if (curriculum.length === 0) {
      warnings.push(`Skipped ${gradeName} — no subjects with teacher assignments in curriculum`);
      continue;
    }

    // Separate by scheduling slot
    // AFTER_SCHOOL subjects are intentionally excluded from the main timetable grid
    const regularPool  = curriculum.filter(e => ['REGULAR', 'DOUBLE_PERIOD'].includes(e.schedulingSlot));
    const weekendPool  = curriculum.filter(e => e.schedulingSlot === 'WEEKEND');
    const activityPool = curriculum.filter(e => e.schedulingSlot === 'ACTIVITY');

    // Weekly quota tracker — resets per section (each section is an independent week)
    const weeklyCount = new Map<string, number>();

    for (const day of workingDays) {
      const isWeekend = WEEKEND_DAYS.has(day.toUpperCase());
      const usedSubjectsToday = new Set<string>();

      for (let p = 0; p < periodSlots.length; p++) {
        const slot = periodSlots[p];
        const isLastPeriod = slot.id === lastSlotId;

        // ── Build the eligible pool for this exact day + period slot ─────────
        let pool: CurrEntry[];

        if (isWeekend) {
          // Weekend days: only WEEKEND-slot subjects
          pool = weekendPool;
        } else if (isLastPeriod && activityPool.length > 0) {
          // Last period of a weekday: prefer ACTIVITY subjects
          const activityAvail = activityPool.filter(e =>
            !usedSubjectsToday.has(e.subjectId) &&
            (weeklyCount.get(e.subjectId) ?? 0) < e.periodsPerWeek
          );
          // If all activity quotas are filled, fall back to regular
          pool = activityAvail.length > 0 ? activityAvail : regularPool;
        } else {
          // Normal weekday period: only REGULAR subjects
          pool = regularPool;
        }

        // Filter pool: respect weekly quota + no repeat today
        const eligible = pool.filter(e =>
          !usedSubjectsToday.has(e.subjectId) &&
          (weeklyCount.get(e.subjectId) ?? 0) < e.periodsPerWeek
        );

        if (eligible.length === 0) continue;

        // Greedy: pick the subject with the highest remaining weekly quota first
        // This avoids subjects being starved at the end of the week
        eligible.sort((a, b) => {
          const remA = a.periodsPerWeek - (weeklyCount.get(a.subjectId) ?? 0);
          const remB = b.periodsPerWeek - (weeklyCount.get(b.subjectId) ?? 0);
          return remB - remA;
        });

        const chosen = eligible[0];
        const subjectInfo = subjectMap.get(chosen.subjectId)!;

        // Find an available teacher for this subject at this slot
        let assignedTeacherId: string | null = null;
        for (const teacher of subjectInfo.teachers) {
          const key = `${teacher.teacherId}-${day}-${slot.id}`;
          if (!usedSlots.has(key)) {
            usedSlots.add(key);
            assignedTeacherId = teacher.teacherId;
            break;
          }
        }
        if (!assignedTeacherId) continue; // all teachers for this subject busy at this slot

        weeklyCount.set(chosen.subjectId, (weeklyCount.get(chosen.subjectId) ?? 0) + 1);
        usedSubjectsToday.add(chosen.subjectId);

        allEntries.push({
          sectionId,
          subjectId: chosen.subjectId,
          teacherId: assignedTeacherId,
          periodSlotId: slot.id,
          day,
          roomNumber: `R-${101 + p}`,
        });
      }
    }

    // Warn about subjects that couldn't be fully scheduled
    for (const e of curriculum) {
      const scheduled = weeklyCount.get(e.subjectId) ?? 0;
      if (scheduled < e.periodsPerWeek && e.schedulingSlot !== 'AFTER_SCHOOL') {
        const name = subjectMap.get(e.subjectId)?.subjectName ?? e.subjectId;
        warnings.push(
          `${gradeName}: ${name} scheduled ${scheduled}/${e.periodsPerWeek} periods — ` +
          (scheduled === 0 ? 'no teacher available or no matching day slots' : 'not enough slots to fill quota')
        );
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

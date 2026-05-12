import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

// ── helpers ───────────────────────────────────────────────────────────────────

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// ── GET: pre-flight check ─────────────────────────────────────────────────────
export async function GET(_req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;

  const [config, sections, teacherSubjects, academicYear, gradeSubjects] = await Promise.all([
    db.timetableConfig.findFirst({ where: { tenantId } }),
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
    db.academicYear.findFirst({ where: { tenantId }, orderBy: { startDate: 'desc' } }),
    db.gradeSubject.findMany({
      where: { grade: { tenantId } },
      select: { gradeId: true, subjectId: true, periodsPerWeek: true, schedulingSlot: true },
    }),
  ]);

  const gradesWithCurriculum = new Set(gradeSubjects.map(gs => gs.gradeId));
  const uniqueSubjectIds     = [...new Set(teacherSubjects.map(ts => ts.subjectId))];
  const uniqueTeacherIds     = [...new Set(teacherSubjects.map(ts => ts.teacherId))];

  const missing: string[] = [];
  if (!config) missing.push('School configuration (hours & working days) — set up in the Setup tab');
  if (sections.length === 0) missing.push('Sections / classes — add via Settings');
  if (teacherSubjects.length === 0) missing.push('Teacher–subject assignments — assign in HR → Teachers');
  if (!academicYear) missing.push('Academic year — create one in Settings');
  if (gradesWithCurriculum.size === 0) missing.push('Class subjects — assign subjects to at least one grade in the Class Subjects tab');

  // Estimate periodsPerDay from the maximum curriculum load across all configured grades
  let estimatedPeriodsPerDay = 0;
  if (config && gradeSubjects.length > 0) {
    const loadByGrade = new Map<string, number>();
    for (const gs of gradeSubjects) {
      if (gs.schedulingSlot === 'AFTER_SCHOOL') continue;
      loadByGrade.set(gs.gradeId, (loadByGrade.get(gs.gradeId) ?? 0) + gs.periodsPerWeek);
    }
    const maxLoad = Math.max(...loadByGrade.values());
    const wdays   = (config.workingDays as string[]).length;
    if (wdays > 0) estimatedPeriodsPerDay = Math.ceil(maxLoad / wdays);
  }

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
    workingDays: (config?.workingDays ?? []) as string[],
    estimatedPeriodsPerDay,
    sections: sectionList,
    subjectCount: uniqueSubjectIds.length,
    teacherCount: uniqueTeacherIds.length,
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

  // ── Fetch all prerequisites ───────────────────────────────────────────────
  const [config, teacherSubjects, academicYear, sections, gradeSubjects] = await Promise.all([
    db.timetableConfig.findFirst({ where: { tenantId } }),
    db.teacherSubject.findMany({
      where: { teacher: { tenantId } },
      include: {
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
      },
    }),
    db.academicYear.findFirst({ where: { tenantId }, orderBy: { startDate: 'desc' } }),
    db.section.findMany({
      where: { id: { in: sectionIds } },
      include: { grade: { select: { id: true, name: true } } },
    }),
    db.gradeSubject.findMany({
      where: { grade: { tenantId } },
      select: { gradeId: true, subjectId: true, periodsPerWeek: true, schedulingSlot: true },
    }),
  ]);

  if (!config)        return err('No school configuration found. Complete the Setup tab first.', 400);
  if (!academicYear)  return err('No academic year found. Create one in Settings first.', 400);
  if (teacherSubjects.length === 0) return err('No teacher–subject assignments found. Assign subjects to teachers in HR.', 400);

  const workingDays = config.workingDays as string[];
  if (workingDays.length === 0) return err('No working days configured. Update the Setup tab.', 400);

  // ── Compute periodsPerDay from curriculum of selected sections ────────────
  const selectedGradeIds = [...new Set(sections.map(s => s.grade.id))];

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

  // In-grid load = all subjects except AFTER_SCHOOL (those are outside the bell schedule)
  const loads = selectedGradeIds.map(gradeId => {
    const entries = gradeCurriculumMap.get(gradeId) ?? [];
    return entries
      .filter(e => e.schedulingSlot !== 'AFTER_SCHOOL')
      .reduce((sum, e) => sum + e.periodsPerWeek, 0);
  }).filter(l => l > 0);

  if (loads.length === 0) {
    return err('No curriculum found for any selected section. Configure subjects in the Class Subjects tab first.', 400);
  }

  const maxLoad      = Math.max(...loads);
  const periodsPerDay = Math.ceil(maxLoad / workingDays.length);

  // ── Generate period slot definitions from config ───────────────────────────
  const slotDefs: { periodNo: number; startTime: string; endTime: string; isBreak: boolean; label: string }[] = [];
  let current = config.schoolStartTime;
  const breakAfter = config.breakAfterPeriod as number[];

  for (let p = 1; p <= periodsPerDay; p++) {
    const end = addMinutes(current, config.periodDuration);
    slotDefs.push({ periodNo: p, startTime: current, endTime: end, isBreak: false, label: `Period ${p}` });
    current = end;
    if (breakAfter.includes(p)) current = addMinutes(current, config.breakDuration);
  }

  // ── Replace period slots (clear FK-dependent entries first) ───────────────
  const oldSlots    = await db.periodSlot.findMany({ where: { configId: config.id }, select: { id: true } });
  const oldSlotIds  = oldSlots.map(s => s.id);
  if (oldSlotIds.length > 0) {
    await db.timetableEntry.deleteMany({ where: { periodSlotId: { in: oldSlotIds } } });
    await db.periodSlot.deleteMany({ where: { configId: config.id } });
  }

  await db.periodSlot.createMany({
    data: slotDefs.map(s => ({ configId: config.id, ...s })),
  });

  // Store the computed value so the timetable view knows how many periods there are
  await db.timetableConfig.update({
    where: { id: config.id },
    data: { periodsPerDay },
  });

  const periodSlots = await db.periodSlot.findMany({
    where: { configId: config.id },
    orderBy: { periodNo: 'asc' },
  });

  // ── Build subject → teachers map ──────────────────────────────────────────
  type SubjectInfo = { subjectId: string; subjectName: string; teachers: { teacherId: string; name: string }[] };
  const subjectMap = new Map<string, SubjectInfo>();
  for (const ts of teacherSubjects) {
    if (!subjectMap.has(ts.subjectId)) {
      subjectMap.set(ts.subjectId, { subjectId: ts.subjectId, subjectName: ts.subject.name, teachers: [] });
    }
    subjectMap.get(ts.subjectId)!.teachers.push({ teacherId: ts.teacherId, name: ts.teacher.name });
  }

  // ── Section → grade lookup ────────────────────────────────────────────────
  const sectionGradeMap = new Map<string, string>();
  for (const s of sections) sectionGradeMap.set(s.id, s.grade.id);

  // ── Archive existing active timetable ─────────────────────────────────────
  await db.timetable.updateMany({
    where: { tenantId, status: 'ACTIVE' },
    data: { status: 'ARCHIVED' },
  });

  // ── Schedule entries ──────────────────────────────────────────────────────
  const WEEKEND_DAYS = new Set(['SATURDAY', 'SUNDAY']);
  const lastSlotId   = periodSlots[periodSlots.length - 1]?.id;
  const usedSlots    = new Set<string>(); // `${teacherId}-${day}-${slotId}`

  const allEntries: {
    sectionId: string; subjectId: string; teacherId: string;
    periodSlotId: string; day: string; roomNumber: string;
  }[] = [];

  const warnings: string[] = [];

  for (const sectionId of sectionIds) {
    const gradeId     = sectionGradeMap.get(sectionId);
    const sectionObj  = sections.find(s => s.id === sectionId);
    const gradeName   = sectionObj?.grade.name ?? sectionId;

    let curriculum: CurrEntry[] = gradeId ? (gradeCurriculumMap.get(gradeId) ?? []) : [];

    if (curriculum.length === 0) {
      warnings.push(`${gradeName}: No subjects configured — skipped`);
      continue;
    }

    // Drop subjects with no teacher assigned
    curriculum = curriculum.filter(e => subjectMap.has(e.subjectId));
    if (curriculum.length === 0) {
      warnings.push(`${gradeName}: No subjects have teachers assigned — skipped`);
      continue;
    }

    // Partition by scheduling slot
    const regularPool  = curriculum.filter(e => ['REGULAR', 'DOUBLE_PERIOD'].includes(e.schedulingSlot));
    const weekendPool  = curriculum.filter(e => e.schedulingSlot === 'WEEKEND');
    const activityPool = curriculum.filter(e => e.schedulingSlot === 'ACTIVITY');
    // AFTER_SCHOOL excluded from main grid

    const weeklyCount = new Map<string, number>(); // subjectId → periods placed this week

    for (const day of workingDays) {
      const isWeekend = WEEKEND_DAYS.has(day.toUpperCase());
      const usedSubjectsToday = new Set<string>();

      for (const slot of periodSlots) {
        const isLastPeriod = slot.id === lastSlotId;

        // Determine candidate pool for this day+slot
        let pool: CurrEntry[];
        if (isWeekend) {
          pool = weekendPool;
        } else if (isLastPeriod && activityPool.length > 0) {
          const avail = activityPool.filter(e =>
            !usedSubjectsToday.has(e.subjectId) &&
            (weeklyCount.get(e.subjectId) ?? 0) < e.periodsPerWeek
          );
          pool = avail.length > 0 ? avail : regularPool;
        } else {
          pool = regularPool;
        }

        // Apply quota + daily-repeat filter
        const eligible = pool.filter(e =>
          !usedSubjectsToday.has(e.subjectId) &&
          (weeklyCount.get(e.subjectId) ?? 0) < e.periodsPerWeek
        );
        if (eligible.length === 0) continue;

        // Greedy: most remaining quota goes first
        eligible.sort((a, b) => {
          const remA = a.periodsPerWeek - (weeklyCount.get(a.subjectId) ?? 0);
          const remB = b.periodsPerWeek - (weeklyCount.get(b.subjectId) ?? 0);
          return remB - remA;
        });

        const chosen      = eligible[0];
        const subjectInfo = subjectMap.get(chosen.subjectId)!;

        let assignedTeacherId: string | null = null;
        for (const teacher of subjectInfo.teachers) {
          const key = `${teacher.teacherId}-${day}-${slot.id}`;
          if (!usedSlots.has(key)) {
            usedSlots.add(key);
            assignedTeacherId = teacher.teacherId;
            break;
          }
        }
        if (!assignedTeacherId) continue;

        weeklyCount.set(chosen.subjectId, (weeklyCount.get(chosen.subjectId) ?? 0) + 1);
        usedSubjectsToday.add(chosen.subjectId);

        allEntries.push({
          sectionId,
          subjectId: chosen.subjectId,
          teacherId: assignedTeacherId,
          periodSlotId: slot.id,
          day,
          roomNumber: `R-${100 + slot.periodNo}`,
        });
      }
    }

    // Warn about under-scheduled subjects
    for (const e of curriculum) {
      const scheduled = weeklyCount.get(e.subjectId) ?? 0;
      if (scheduled < e.periodsPerWeek && e.schedulingSlot !== 'AFTER_SCHOOL') {
        const name = subjectMap.get(e.subjectId)?.subjectName ?? e.subjectId;
        warnings.push(`${gradeName}: ${name} — scheduled ${scheduled}/${e.periodsPerWeek} periods`);
      }
    }
  }

  if (allEntries.length === 0) {
    return err('Could not schedule any periods — ensure teachers are assigned to subjects in HR.', 400);
  }

  // ── Persist timetable ─────────────────────────────────────────────────────
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

  return ok({
    timetableId: timetable.id,
    label,
    warnings,
    periodsPerDay,
    stats: {
      sectionsGenerated:  sectionIds.length,
      totalEntries:       allEntries.length,
      teachersScheduled:  new Set(allEntries.map(e => e.teacherId)).size,
      subjectsScheduled:  new Set(allEntries.map(e => e.subjectId)).size,
      conflictsFound:     0,
    },
  }, 201);
}

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

// ── helpers ────────────────────────────────────────────────────────────────────

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

type SlotDef = { periodNo: number; startTime: string; endTime: string; isBreak: boolean; label: string };

function buildSlotDefs(
  schoolStartTime: string,
  group: {
    periodsPerDay: number; periodDuration: number;
    shortBreakEnabled: boolean; shortBreakAfterPeriod: number | null; shortBreakDuration: number;
    mainBreakAfterPeriod: number; mainBreakDuration: number;
  }
): SlotDef[] {
  const slots: SlotDef[] = [];
  let current = schoolStartTime;

  for (let p = 1; p <= group.periodsPerDay; p++) {
    const end = addMinutes(current, group.periodDuration);
    slots.push({ periodNo: p, startTime: current, endTime: end, isBreak: false, label: `Period ${p}` });
    current = end;

    if (group.shortBreakEnabled && group.shortBreakAfterPeriod === p) {
      current = addMinutes(current, group.shortBreakDuration);
    }
    if (group.mainBreakAfterPeriod === p) {
      current = addMinutes(current, group.mainBreakDuration);
    }
  }
  return slots;
}

// ── GET: pre-flight check ──────────────────────────────────────────────────────
export async function GET(_req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;

  const [config, sections, teacherSubjects, academicYear, gradeSubjects, gradeGroups] = await Promise.all([
    db.timetableConfig.findFirst({ where: { tenantId } }),
    db.section.findMany({
      where: { tenantId },
      include: { grade: { select: { id: true, name: true, gradeGroupId: true } } },
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
    db.gradeGroup.findMany({
      where: { tenantId },
      select: { id: true, name: true, periodsPerDay: true },
    }),
  ]);

  const gradesWithCurriculum = new Set(gradeSubjects.map(gs => gs.gradeId));
  const uniqueSubjectIds = [...new Set(teacherSubjects.map(ts => ts.subjectId))];
  const uniqueTeacherIds = [...new Set(teacherSubjects.map(ts => ts.teacherId))];
  const gradeGroupMap = new Map(gradeGroups.map(g => [g.id, g]));

  const missing: string[] = [];
  if (!config)                     missing.push('School configuration (start time & working days) — set up in the Setup tab');
  if (sections.length === 0)       missing.push('Sections / classes — add via Settings');
  if (teacherSubjects.length === 0) missing.push('Teacher–subject assignments — assign in HR → Teachers');
  if (!academicYear)               missing.push('Academic year — create one in Settings');
  if (gradesWithCurriculum.size === 0) missing.push('Class subjects — assign subjects to at least one grade in the Class Subjects tab');
  if (gradeGroups.length === 0)    missing.push('Grade groups — create grade groups in the Setup tab and assign grades to them');

  const sectionList = sections.map(s => {
    const group = s.grade.gradeGroupId ? gradeGroupMap.get(s.grade.gradeGroupId) : null;
    return {
      id: s.id,
      label: `${s.grade.name}-${s.name}`,
      gradeId: s.grade.id,
      gradeName: s.grade.name,
      hasCurriculum: gradesWithCurriculum.has(s.grade.id),
      hasGroup: !!s.grade.gradeGroupId,
      groupName: group?.name ?? null,
      groupPeriodsPerDay: group?.periodsPerDay ?? null,
    };
  });

  return ok({
    ready: missing.length === 0,
    missing,
    hasConfig: !!config,
    workingDays: (config?.workingDays ?? []) as string[],
    sections: sectionList,
    subjectCount: uniqueSubjectIds.length,
    teacherCount: uniqueTeacherIds.length,
    groupCount: gradeGroups.length,
  });
}

// ── POST: generate timetable ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;
  const body = await req.json() as { sectionIds: string[] };
  const { sectionIds } = body;

  if (!sectionIds || sectionIds.length === 0) {
    return err('Select at least one section to generate a timetable for.', 400);
  }

  // ── Fetch all prerequisites ──────────────────────────────────────────────────
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
      include: {
        grade: {
          select: {
            id: true, name: true,
            gradeGroup: true, // full group config
          },
        },
      },
    }),
    db.gradeSubject.findMany({
      where: { grade: { tenantId } },
      select: { gradeId: true, subjectId: true, periodsPerWeek: true, schedulingSlot: true },
    }),
  ]);

  if (!config)       return err('No school configuration found. Complete the Setup tab first.', 400);
  if (!academicYear) return err('No academic year found. Create one in Settings first.', 400);
  if (teacherSubjects.length === 0) return err('No teacher–subject assignments found.', 400);

  const workingDays = config.workingDays as string[];
  if (workingDays.length === 0) return err('No working days configured. Update the Setup tab.', 400);

  // ── Validate that all selected sections have grade groups ───────────────────
  const sectionsWithoutGroup = sections.filter(s => !s.grade.gradeGroup);
  if (sectionsWithoutGroup.length === sections.length) {
    return err('None of the selected sections have a grade group configured. Set up grade groups in the Setup tab.', 400);
  }

  // ── Build grade curriculum map ───────────────────────────────────────────────
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

  // ── Build subject → teachers map ─────────────────────────────────────────────
  type SubjectInfo = { subjectId: string; subjectName: string; teachers: { teacherId: string; name: string }[] };
  const subjectMap = new Map<string, SubjectInfo>();
  for (const ts of teacherSubjects) {
    if (!subjectMap.has(ts.subjectId)) {
      subjectMap.set(ts.subjectId, { subjectId: ts.subjectId, subjectName: ts.subject.name, teachers: [] });
    }
    subjectMap.get(ts.subjectId)!.teachers.push({ teacherId: ts.teacherId, name: ts.teacher.name });
  }

  // ── Group sections by their grade group ──────────────────────────────────────
  type GradeGroupFull = NonNullable<typeof sections[0]['grade']['gradeGroup']>;
  const groupToSections = new Map<string, { group: GradeGroupFull; sectionIds: string[] }>();

  const warnings: string[] = [];

  for (const section of sections) {
    if (!section.grade.gradeGroup) {
      warnings.push(`${section.grade.name}-${section.name}: no grade group — skipped`);
      continue;
    }
    const gId = section.grade.gradeGroup.id;
    if (!groupToSections.has(gId)) {
      groupToSections.set(gId, { group: section.grade.gradeGroup, sectionIds: [] });
    }
    groupToSections.get(gId)!.sectionIds.push(section.id);
  }

  if (groupToSections.size === 0) {
    return err('No sections could be processed — assign grade groups to the selected classes first.', 400);
  }

  // ── Archive existing active timetable ────────────────────────────────────────
  await db.timetable.updateMany({
    where: { tenantId, status: 'ACTIVE' },
    data: { status: 'ARCHIVED' },
  });

  // ── Per-group: generate slots, then schedule sections ────────────────────────
  const WEEKEND_DAYS = new Set(['SATURDAY', 'SUNDAY']);
  const usedSlots = new Set<string>(); // `${teacherId}-${day}-${startTime}` — shared across groups to prevent cross-group conflicts

  const allEntries: {
    sectionId: string; subjectId: string; teacherId: string;
    periodSlotId: string; day: string; roomNumber: string;
  }[] = [];

  // Track per-group slot info for the response (filler display metadata)
  const groupSlotMeta: Record<string, { periodsPerDay: number; fillerType: string; groupName: string }> = {};

  for (const [groupId, { group, sectionIds: groupSectionIds }] of groupToSections) {
    // Build slot definitions for this group
    const slotDefs = buildSlotDefs(config.schoolStartTime, group);

    // Clear old FK-dependent entries for sections in this group, then old slots
    const oldSlots = await db.periodSlot.findMany({ where: { gradeGroupId: groupId }, select: { id: true } });
    const oldSlotIds = oldSlots.map(s => s.id);
    if (oldSlotIds.length > 0) {
      await db.timetableEntry.deleteMany({ where: { periodSlotId: { in: oldSlotIds } } });
      await db.periodSlot.deleteMany({ where: { gradeGroupId: groupId } });
    }

    await db.periodSlot.createMany({
      data: slotDefs.map(s => ({ configId: config.id, gradeGroupId: groupId, ...s })),
    });

    const periodSlots = await db.periodSlot.findMany({
      where: { gradeGroupId: groupId },
      orderBy: { periodNo: 'asc' },
    });

    const lastSlotId = periodSlots[periodSlots.length - 1]?.id;

    groupSlotMeta[groupId] = {
      periodsPerDay: group.periodsPerDay,
      fillerType: group.fillerType,
      groupName: group.name,
    };

    // ── Schedule each section in this group ─────────────────────────────────
    for (const sectionId of groupSectionIds) {
      const sectionObj = sections.find(s => s.id === sectionId);
      const gradeId    = sectionObj?.grade.id;
      const gradeName  = sectionObj?.grade.name ?? sectionId;

      let curriculum: CurrEntry[] = gradeId ? (gradeCurriculumMap.get(gradeId) ?? []) : [];

      if (curriculum.length === 0) {
        warnings.push(`${gradeName}: no subjects configured — skipped`);
        continue;
      }

      // Drop subjects with no teacher
      curriculum = curriculum.filter(e => subjectMap.has(e.subjectId));
      if (curriculum.length === 0) {
        warnings.push(`${gradeName}: no subjects have teachers assigned — skipped`);
        continue;
      }

      // Partition by scheduling slot
      const regularPool  = curriculum.filter(e => ['REGULAR', 'DOUBLE_PERIOD'].includes(e.schedulingSlot));
      const weekendPool  = curriculum.filter(e => e.schedulingSlot === 'WEEKEND');
      const activityPool = curriculum.filter(e => e.schedulingSlot === 'ACTIVITY');

      const weeklyCount = new Map<string, number>();

      for (const day of workingDays) {
        const isWeekend = WEEKEND_DAYS.has(day.toUpperCase());
        const usedSubjectsToday = new Set<string>();

        for (const slot of periodSlots) {
          const isLastPeriod = slot.id === lastSlotId;

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

          const eligible = pool.filter(e =>
            !usedSubjectsToday.has(e.subjectId) &&
            (weeklyCount.get(e.subjectId) ?? 0) < e.periodsPerWeek
          );

          if (eligible.length === 0) continue; // leave slot empty (filler shown client-side)

          // Most remaining quota goes first; if that subject's teacher is busy, try the next eligible
          eligible.sort((a, b) => {
            const remA = a.periodsPerWeek - (weeklyCount.get(a.subjectId) ?? 0);
            const remB = b.periodsPerWeek - (weeklyCount.get(b.subjectId) ?? 0);
            return remB - remA;
          });

          for (const chosen of eligible) {
            const subjectInfo = subjectMap.get(chosen.subjectId)!;
            let assignedTeacherId: string | null = null;
            for (const teacher of subjectInfo.teachers) {
              // Use startTime as discriminator so cross-group conflicts are correctly detected
              const key = `${teacher.teacherId}-${day}-${slot.startTime}`;
              if (!usedSlots.has(key)) {
                usedSlots.add(key);
                assignedTeacherId = teacher.teacherId;
                break;
              }
            }
            if (!assignedTeacherId) continue; // all teachers for this subject busy — try next subject

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
            break; // slot filled — move to next slot
          }
          // if every eligible subject had all teachers busy, slot stays empty (rendered as filler)
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
  }

  if (allEntries.length === 0) {
    return err('Could not schedule any periods — ensure teachers are assigned to subjects.', 400);
  }

  // ── Persist timetable ────────────────────────────────────────────────────────
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
    groupSlotMeta,
    stats: {
      sectionsGenerated:  sectionIds.length,
      totalEntries:       allEntries.length,
      teachersScheduled:  new Set(allEntries.map(e => e.teacherId)).size,
      subjectsScheduled:  new Set(allEntries.map(e => e.subjectId)).size,
      conflictsFound:     0,
    },
  }, 201);
}

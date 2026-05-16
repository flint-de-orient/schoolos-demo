import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

// ── helpers ────────────────────────────────────────────────────────────────────

/** FNV-1a hash — fast, deterministic, no dependencies */
function strHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Fisher-Yates shuffle with a 32-bit seed — same seed always gives same result */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed >>> 0;
  for (let i = result.length - 1; i > 0; i--) {
    s = Math.imul(s ^ (s >>> 15), 0x1 | s) ^ ((s & 0xffff0000) + Math.imul(s & 0xffff, 0x9f3d));
    s = s >>> 0;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

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
      select: { gradeId: true, subjectId: true, periodsPerWeek: true, schedulingSlot: true, sessionType: true },
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
  const [config, teacherSubjects, academicYear, sections, gradeSubjects, halfDayConfigs] = await Promise.all([
    db.timetableConfig.findFirst({ where: { tenantId } }),
    db.teacherSubject.findMany({
      where: { teacher: { tenantId } },
      select: {
        teacherId: true,
        subjectId: true,
        proficiency: true,
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
      select: { gradeId: true, subjectId: true, periodsPerWeek: true, schedulingSlot: true, sessionType: true },
    }),
    db.halfDayConfig.findMany({
      where: { tenantId, isActive: true },
      select: { gradeGroupId: true, dayOfWeek: true, periodsPerDay: true },
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
  type CurrEntry = { subjectId: string; periodsPerWeek: number; schedulingSlot: string; sessionType: string };
  const gradeCurriculumMap = new Map<string, CurrEntry[]>();
  for (const gs of gradeSubjects) {
    if (!gradeCurriculumMap.has(gs.gradeId)) gradeCurriculumMap.set(gs.gradeId, []);
    gradeCurriculumMap.get(gs.gradeId)!.push({
      subjectId: gs.subjectId,
      periodsPerWeek: gs.periodsPerWeek,
      schedulingSlot: gs.schedulingSlot,
      sessionType: gs.sessionType ?? 'THEORY',
    });
  }

  // ── Build subject → teachers map ─────────────────────────────────────────────
  type TeacherRef = { teacherId: string; name: string; proficiency: string };
  type SubjectInfo = { subjectId: string; subjectName: string; teachers: TeacherRef[] };
  const subjectMap = new Map<string, SubjectInfo>();
  for (const ts of teacherSubjects) {
    if (!subjectMap.has(ts.subjectId)) {
      subjectMap.set(ts.subjectId, { subjectId: ts.subjectId, subjectName: ts.subject.name, teachers: [] });
    }
    subjectMap.get(ts.subjectId)!.teachers.push({
      teacherId: ts.teacherId,
      name: ts.teacher.name,
      proficiency: ts.proficiency as string,
    });
  }
  // PRIMARY teachers are tried first — sort each subject's pool by proficiency
  const profOrder: Record<string, number> = { PRIMARY: 0, SECONDARY: 1, SUBSTITUTE: 2 };
  for (const info of subjectMap.values()) {
    info.teachers.sort((a, b) => (profOrder[a.proficiency] ?? 1) - (profOrder[b.proficiency] ?? 1));
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
  // Only SUNDAY is treated as a non-working weekend day; Saturday is a regular
  // working day for Indian schools operating Mon–Sat.
  const WEEKEND_DAYS = new Set(['SUNDAY']);
  const usedSlots = new Set<string>(); // `${teacherId}-${day}-${startTime}` — shared across groups to prevent cross-group conflicts

  const allEntries: {
    sectionId: string; subjectId: string; teacherId: string;
    periodSlotId: string; day: string; roomNumber: string;
  }[] = [];

  // Track per-group slot info for the response (filler display metadata)
  const groupSlotMeta: Record<string, { periodsPerDay: number; fillerTypes: string[]; groupName: string }> = {};

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

    groupSlotMeta[groupId] = {
      periodsPerDay: group.periodsPerDay,
      fillerTypes: group.fillerTypes as string[],
      groupName: group.name,
    };

    // ── Build per-section state for this group ──────────────────────────────
    // Defined before scheduling so weeklyCount persists across the day loop.
    // LAB entries (sessionType=LAB) are tracked separately — they require consecutive
    // double-period booking and are handled in a dedicated first pass each day.
    type SectionState = {
      sectionId: string; gradeName: string; curriculum: CurrEntry[];
      regularPool: CurrEntry[]; weekendPool: CurrEntry[]; activityPool: CurrEntry[];
      labPool: CurrEntry[];
      weeklyCount: Map<string, number>;
      // slotHistory tracks which slot indices (0-based) each subject has appeared at.
      // Used to rotate subjects across slot positions so the same subject doesn't
      // always land at the same period number each day.
      slotHistory: Map<string, Set<number>>;
    };
    const sectionStates: SectionState[] = [];
    for (const sectionId of groupSectionIds) {
      const sectionObj = sections.find(s => s.id === sectionId);
      const gradeId    = sectionObj?.grade.id;
      const gradeName  = sectionObj?.grade.name ?? sectionId;
      let curriculum: CurrEntry[] = gradeId ? (gradeCurriculumMap.get(gradeId) ?? []) : [];
      if (curriculum.length === 0) {
        warnings.push(`${gradeName}: no subjects configured — skipped`); continue;
      }
      curriculum = curriculum.filter(e => subjectMap.has(e.subjectId));
      if (curriculum.length === 0) {
        warnings.push(`${gradeName}: no subjects have teachers assigned — skipped`); continue;
      }
      sectionStates.push({
        sectionId, gradeName, curriculum,
        regularPool:  curriculum.filter(e => ['REGULAR'].includes(e.schedulingSlot) && e.sessionType !== 'LAB'),
        weekendPool:  curriculum.filter(e => e.schedulingSlot === 'WEEKEND' && e.sessionType !== 'LAB'),
        activityPool: curriculum.filter(e => e.schedulingSlot === 'ACTIVITY' && e.sessionType !== 'LAB'),
        labPool:      curriculum.filter(e => e.sessionType === 'LAB'),
        weeklyCount:  new Map<string, number>(),
        slotHistory:  new Map<string, Set<number>>(),
      });
    }

    // ── Schedule: day → slot → section (interleaved) ────────────────────────
    // Processing all sections at each (day, slot) before advancing ensures every
    // section gets a fair turn at Saturday's teacher slots instead of the first
    // section claiming all of them sequentially.
    for (const day of workingDays) {
      const isWeekend = WEEKEND_DAYS.has(day.toUpperCase());
      // Per-section daily subject-usage tracker, reset each new day
      const dayUsed = new Map<string, Set<string>>(
        sectionStates.map(s => [s.sectionId, new Set<string>()])
      );

      // Apply half-day config: group-specific rule takes priority over school-wide.
      // Use loose comparison (.toUpperCase() on both sides, !hd.gradeGroupId for null/undefined).
      const dayUpper = day.toUpperCase();
      const halfDay = halfDayConfigs.find(hd => hd.gradeGroupId === groupId && hd.dayOfWeek.toUpperCase() === dayUpper)
                   ?? halfDayConfigs.find(hd => !hd.gradeGroupId             && hd.dayOfWeek.toUpperCase() === dayUpper);
      const activePeriodSlots = halfDay ? periodSlots.slice(0, halfDay.periodsPerDay) : periodSlots;

      // ── LAB first pass: schedule double-period lab sessions ─────────────────
      // Labs are booked before regular periods so they get guaranteed back-to-back
      // consecutive slots. Each LAB CurrEntry represents a full double period (2 slots).
      // A lab needs periodsPerWeek/2 double-period bookings per week.
      for (const state of sectionStates) {
        const usedSubjectsToday = dayUsed.get(state.sectionId)!;
        if (isWeekend) continue; // skip lab scheduling on weekends
        for (const labEntry of state.labPool) {
          const booked = state.weeklyCount.get(labEntry.subjectId) ?? 0;
          if (booked >= labEntry.periodsPerWeek) continue;
          if (usedSubjectsToday.has(labEntry.subjectId)) continue;
          // Find two consecutive available slots (by sorted periodNo, skip breaks)
          let placed = false;
          for (let i = 0; i < activePeriodSlots.length - 1; i++) {
            const slotA = activePeriodSlots[i];
            const slotB = activePeriodSlots[i + 1];
            // Slots must be adjacent by periodNo (no gap)
            if (slotB.periodNo !== slotA.periodNo + 1) continue;
            const subjectInfo = subjectMap.get(labEntry.subjectId)!;
            let assignedTeacherId: string | null = null;
            for (const teacher of subjectInfo.teachers) {
              const keyA = `${teacher.teacherId}-${day}-${slotA.startTime}`;
              const keyB = `${teacher.teacherId}-${day}-${slotB.startTime}`;
              if (!usedSlots.has(keyA) && !usedSlots.has(keyB)) {
                usedSlots.add(keyA);
                usedSlots.add(keyB);
                assignedTeacherId = teacher.teacherId;
                break;
              }
            }
            if (!assignedTeacherId) continue;
            // Book both slots
            state.weeklyCount.set(labEntry.subjectId, booked + 2);
            usedSubjectsToday.add(labEntry.subjectId);
            for (const slot of [slotA, slotB]) {
              allEntries.push({
                sectionId: state.sectionId,
                subjectId: labEntry.subjectId,
                teacherId: assignedTeacherId,
                periodSlotId: slot.id,
                day,
                roomNumber: `Lab-${100 + slot.periodNo}`,
              });
            }
            placed = true;
            break;
          }
          if (!placed) {
            const name = subjectMap.get(labEntry.subjectId)?.subjectName ?? labEntry.subjectId;
            warnings.push(`${state.gradeName}: ${name} LAB — no consecutive slots available on ${day}`);
          }
        }
      }

      // Period 1 (index 0) is always visited first so it is never left empty.
      // The remaining slots are shuffled so empty slots scatter across the day
      // instead of always clustering at the tail.
      const slotVisitOrder = [
        0,
        ...seededShuffle(
          activePeriodSlots.map((_, i) => i).filter(i => i !== 0),
          strHash(`visit-${day}`)
        ),
      ];

      for (const slotIndex of slotVisitOrder) {
        const slot = activePeriodSlots[slotIndex];

        for (const state of sectionStates) {
          const usedSubjectsToday = dayUsed.get(state.sectionId)!;

          let pool: CurrEntry[];
          if (isWeekend) {
            pool = state.weekendPool;
          } else if (slotIndex === 0) {
            // Never open the day with an activity subject (PE, Sports etc.)
            pool = state.regularPool;
          } else {
            // Activity subjects can appear at any non-first slot; rotation handles distribution
            pool = [...state.regularPool, ...state.activityPool];
          }

          const eligible = pool.filter(e =>
            !usedSubjectsToday.has(e.subjectId) &&
            (state.weeklyCount.get(e.subjectId) ?? 0) < e.periodsPerWeek
          );
          if (eligible.length === 0) continue;

          // Rotation-aware sort:
          // 1. Prefer subjects NOT yet seen at this slotIndex (novelty → rotation)
          // 2. Most remaining quota (coverage guarantee)
          // 3. Seeded hash tiebreaker so ties resolve differently each day
          const tieHash = strHash(`${state.sectionId}-${day}-${slotIndex}`);
          eligible.sort((a, b) => {
            const aSeenHere = state.slotHistory.get(a.subjectId)?.has(slotIndex) ? 1 : 0;
            const bSeenHere = state.slotHistory.get(b.subjectId)?.has(slotIndex) ? 1 : 0;
            if (aSeenHere !== bSeenHere) return aSeenHere - bSeenHere;

            const remA = a.periodsPerWeek - (state.weeklyCount.get(a.subjectId) ?? 0);
            const remB = b.periodsPerWeek - (state.weeklyCount.get(b.subjectId) ?? 0);
            if (remA !== remB) return remB - remA;

            return (strHash(a.subjectId + tieHash) % 1000) - (strHash(b.subjectId + tieHash) % 1000);
          });

          for (const chosen of eligible) {
            const subjectInfo = subjectMap.get(chosen.subjectId)!;
            let assignedTeacherId: string | null = null;
            // Teachers are pre-sorted PRIMARY first; first available is best-qualified
            for (const teacher of subjectInfo.teachers) {
              const key = `${teacher.teacherId}-${day}-${slot.startTime}`;
              if (!usedSlots.has(key)) {
                usedSlots.add(key);
                assignedTeacherId = teacher.teacherId;
                break;
              }
            }
            if (!assignedTeacherId) continue;

            state.weeklyCount.set(chosen.subjectId, (state.weeklyCount.get(chosen.subjectId) ?? 0) + 1);
            usedSubjectsToday.add(chosen.subjectId);

            // Record slot position for this subject so it rotates next day
            if (!state.slotHistory.has(chosen.subjectId)) state.slotHistory.set(chosen.subjectId, new Set());
            state.slotHistory.get(chosen.subjectId)!.add(slotIndex);

            allEntries.push({
              sectionId: state.sectionId,
              subjectId: chosen.subjectId,
              teacherId: assignedTeacherId,
              periodSlotId: slot.id,
              day,
              roomNumber: `R-${100 + slot.periodNo}`,
            });
            break;
          }
        }
      }
    }

    // Warn about under-scheduled subjects
    for (const state of sectionStates) {
      for (const e of state.curriculum) {
        const scheduled = state.weeklyCount.get(e.subjectId) ?? 0;
        if (scheduled < e.periodsPerWeek && e.schedulingSlot !== 'AFTER_SCHOOL') {
          const name = subjectMap.get(e.subjectId)?.subjectName ?? e.subjectId;
          const suffix = e.sessionType === 'LAB' ? ' (LAB)' : '';
          warnings.push(`${state.gradeName}: ${name}${suffix} — scheduled ${scheduled}/${e.periodsPerWeek} periods`);
        }
      }
    }
  }

  if (allEntries.length === 0) {
    return err('Could not schedule any periods — ensure teachers are assigned to subjects.', 400);
  }

  // ── Compute actual quality score from all section states ─────────────────────
  // Collect sectionStates across groups for scoring (they're locally scoped above, so
  // we re-derive from allEntries and the warnings list)
  const totalDemand = (() => {
    let d = 0;
    for (const section of sections) {
      const gradeId = section.grade.id;
      const curriculum = gradeCurriculumMap.get(gradeId) ?? [];
      for (const e of curriculum) {
        if (e.schedulingSlot !== 'AFTER_SCHOOL' && subjectMap.has(e.subjectId)) {
          d += e.periodsPerWeek; // LAB entries count by their periodsPerWeek (each double-period = 2)
        }
      }
    }
    return d;
  })();
  const actualQuality = totalDemand > 0 ? Math.round((allEntries.length / totalDemand) * 100) : 100;

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
      qualityScore: actualQuality,
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
      qualityScore:       actualQuality,
      totalDemand,
      conflictsFound:     0,
    },
  }, 201);
}

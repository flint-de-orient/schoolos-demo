import { db } from '@/lib/db';
import { anthropic, SONNET } from '@/lib/anthropic';
import { DayOfWeek, TimetableStatus } from '@prisma/client';

export interface TimetableEntry {
  day: DayOfWeek;
  periodNo: number;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  roomNumber?: string;
}

export interface GenerationResult {
  success: boolean;
  timetableId?: string;
  entries?: TimetableEntry[];
  qualityScore?: number;
  conflictsFound?: number;
  tokensUsed?: number;
  error?: string;
}

interface TeacherData {
  id: string;
  name: string;
  type: string;
  maxPeriodsDay: number;
  maxPeriodsWeek: number;
  subjects: { subjectId: string; subjectName: string; proficiency: string; gradeIds: string[] }[];
  availableDays: string[];
}

interface SectionData {
  id: string;
  name: string;
  gradeName: string;
  gradeId: string;
  requiredSubjects: { subjectId: string; subjectName: string; periodsPerWeek: number }[];
}

interface PeriodSlotData {
  id: string;
  periodNo: number;
  startTime: string;
  endTime: string;
}

export async function generateTimetableWithAI(
  tenantId: string,
  academicYearId: string,
  label: string
): Promise<GenerationResult> {
  // ── 1. Load all required data ──────────────────────────────
  const [teachers, sections, config, periodSlots, gradeSubjects] = await Promise.all([
    db.teacher.findMany({
      where: { tenantId, isActive: true, deletedAt: null },
      include: {
        subjects: { include: { subject: { select: { id: true, name: true } } } },
        availabilities: { where: { isAvailable: true } },
      },
    }),
    db.section.findMany({
      where: { tenantId, academicYearId },
      include: {
        grade: { select: { id: true, name: true, displayOrder: true } },
      },
      orderBy: { grade: { displayOrder: 'asc' } },
    }),
    db.timetableConfig.findUnique({ where: { tenantId } }),
    db.periodSlot.findMany({
      where: { config: { tenantId }, isBreak: false },
      orderBy: { periodNo: 'asc' },
    }),
    db.gradeSubject.findMany({
      where: { grade: { tenantId, academicYearId } },
      include: { subject: { select: { id: true, name: true } } },
    }),
  ]);

  if (!config) {
    return { success: false, error: 'Timetable config not found. Please configure period slots first.' };
  }

  if (teachers.length === 0) {
    return { success: false, error: 'No active teachers found. Please add teachers first.' };
  }

  if (sections.length === 0) {
    return { success: false, error: 'No sections found for this academic year.' };
  }

  const workingDays = config.workingDays as DayOfWeek[];

  // ── 2. Build structured data for prompt ───────────────────
  const teacherData: TeacherData[] = teachers.map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type,
    maxPeriodsDay: t.maxPeriodsDay,
    maxPeriodsWeek: t.maxPeriodsWeek,
    subjects: t.subjects.map((s) => ({
      subjectId: s.subjectId,
      subjectName: s.subject.name,
      proficiency: s.proficiency,
      gradeIds: s.gradeIds,
    })),
    availableDays:
      t.type === 'FULL_TIME'
        ? workingDays
        : t.availabilities.map((a) => a.day),
  }));

  const gradeSubjectMap = new Map<string, { subjectId: string; subjectName: string; periodsPerWeek: number }[]>();
  for (const gs of gradeSubjects) {
    const existing = gradeSubjectMap.get(gs.gradeId) ?? [];
    existing.push({ subjectId: gs.subjectId, subjectName: gs.subject.name, periodsPerWeek: gs.periodsPerWeek });
    gradeSubjectMap.set(gs.gradeId, existing);
  }

  const sectionData: SectionData[] = sections.map((s) => {
    const g = s.grade as { id: string; name: string; displayOrder: number };
    return {
      id: s.id,
      name: `${g.name}-${s.name}`,
      gradeName: g.name,
      gradeId: g.id,
      requiredSubjects: gradeSubjectMap.get(g.id) ?? [],
    };
  });

  const slotData: PeriodSlotData[] = periodSlots.map((p) => ({
    id: p.id,
    periodNo: p.periodNo,
    startTime: p.startTime,
    endTime: p.endTime,
  }));

  // ── 3. Build the AI prompt ─────────────────────────────────
  const systemPrompt = `You are an expert school timetable scheduler for Indian schools.
Your task is to generate a complete, conflict-free weekly school timetable.

STRICT RULES:
1. No teacher can be assigned to two different sections at the same period on the same day.
2. No section can have two subjects at the same period on the same day.
3. Each section must receive EXACTLY the required number of periods per subject per week.
4. Part-time teachers (PART_TIME) are only available on their listed availableDays.
5. Each teacher must not exceed maxPeriodsDay periods on any single day.
6. No subject should appear more than 2 times on the same day for the same section.
7. Double periods of the same subject are allowed only once per week per section.

QUALITY TARGETS:
- Spread subjects evenly across the week (avoid clustering)
- Balance teacher workload across days
- Keep Math and Science in morning periods (periods 1-4) where possible`;

  const userPrompt = `Generate a complete weekly timetable for the school.

WORKING DAYS: ${workingDays.join(', ')}
PERIODS PER DAY: ${slotData.map((s) => `Period ${s.periodNo} (${s.startTime}-${s.endTime})`).join(', ')}

TEACHERS (${teacherData.length}):
${teacherData
  .map(
    (t) =>
      `ID:${t.id} | ${t.name} | ${t.type} | MaxDay:${t.maxPeriodsDay} | AvailDays:${t.availableDays.join(',')} | Subjects:${t.subjects.map((s) => `${s.subjectName}(${s.proficiency})`).join(', ')}`
  )
  .join('\n')}

SECTIONS AND REQUIRED SUBJECTS (${sectionData.length} sections):
${sectionData
  .map(
    (s) =>
      `ID:${s.id} | ${s.name} | Subjects: ${s.requiredSubjects.map((r) => `${r.subjectName}(${r.periodsPerWeek}pw)`).join(', ')}`
  )
  .join('\n')}

Generate ALL timetable entries for ALL sections and ALL working days. Each entry must have: day, periodNo, sectionId, subjectId, teacherId.`;

  // ── 4. Call Claude with tool_use for structured output ──────
  let rawEntries: TimetableEntry[] = [];
  let qualityScore = 0;
  let tokensUsed = 0;

  try {
    const response = await anthropic.messages.create({
      model: SONNET,
      max_tokens: 8192,
      system: systemPrompt,
      tools: [
        {
          name: 'submit_timetable',
          description: 'Submit the complete generated timetable',
          input_schema: {
            type: 'object' as const,
            properties: {
              entries: {
                type: 'array',
                description: 'All timetable entries',
                items: {
                  type: 'object',
                  properties: {
                    day: { type: 'string', enum: workingDays },
                    periodNo: { type: 'integer', minimum: 1, maximum: 8 },
                    sectionId: { type: 'string' },
                    subjectId: { type: 'string' },
                    teacherId: { type: 'string' },
                  },
                  required: ['day', 'periodNo', 'sectionId', 'subjectId', 'teacherId'],
                },
              },
              qualityScore: {
                type: 'integer',
                description: 'Quality score 0-100 based on constraint satisfaction',
                minimum: 0,
                maximum: 100,
              },
              notes: { type: 'string', description: 'Any notes about conflicts or trade-offs' },
            },
            required: ['entries', 'qualityScore'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'submit_timetable' },
      messages: [{ role: 'user', content: userPrompt }],
    });

    tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

    const toolUse = response.content.find((b) => b.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      return { success: false, error: 'AI did not return a valid timetable response.' };
    }

    const result = toolUse.input as { entries: TimetableEntry[]; qualityScore: number };
    rawEntries = result.entries;
    qualityScore = result.qualityScore;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: `AI generation failed: ${msg}` };
  }

  // ── 5. Validate entries ────────────────────────────────────
  const { conflicts, cleanEntries } = validateAndClean(rawEntries, workingDays);

  // ── 6. Save to DB ──────────────────────────────────────────
  // Map periodNo → periodSlotId
  const slotMap = new Map(slotData.map((s) => [s.periodNo, s.id]));

  const validEntriesWithSlots = cleanEntries.filter((e) => slotMap.has(e.periodNo));

  // Archive existing active timetable
  await db.timetable.updateMany({
    where: { tenantId, status: TimetableStatus.ACTIVE },
    data: { status: TimetableStatus.ARCHIVED },
  });

  const timetable = await db.timetable.create({
    data: {
      tenantId,
      academicYearId,
      label,
      status: TimetableStatus.ACTIVE,
      qualityScore,
      conflictCount: conflicts,
      generatedByAI: true,
      publishedAt: new Date(),
      entries: {
        create: validEntriesWithSlots.map((e) => ({
          sectionId: e.sectionId,
          subjectId: e.subjectId,
          teacherId: e.teacherId,
          periodSlotId: slotMap.get(e.periodNo)!,
          day: e.day,
        })),
      },
    },
  });

  // Save AI usage log
  await db.aIUsageLog.create({
    data: {
      tenantId,
      module: 'timetable',
      model: SONNET,
      promptTokens: tokensUsed,
      completionTokens: 0,
      cost: (tokensUsed / 1_000_000) * 3,
    },
  });

  return {
    success: true,
    timetableId: timetable.id,
    entries: validEntriesWithSlots,
    qualityScore,
    conflictsFound: conflicts,
    tokensUsed,
  };
}

function validateAndClean(
  entries: TimetableEntry[],
  workingDays: DayOfWeek[]
): { conflicts: number; cleanEntries: TimetableEntry[] } {
  // Key: "day-periodNo-teacherId" or "day-periodNo-sectionId"
  const teacherSlots = new Set<string>();
  const sectionSlots = new Set<string>();
  const clean: TimetableEntry[] = [];
  let conflicts = 0;

  for (const e of entries) {
    if (!workingDays.includes(e.day)) continue;
    const tKey = `${e.day}-${e.periodNo}-T-${e.teacherId}`;
    const sKey = `${e.day}-${e.periodNo}-S-${e.sectionId}`;
    if (teacherSlots.has(tKey) || sectionSlots.has(sKey)) {
      conflicts++;
      continue;
    }
    teacherSlots.add(tKey);
    sectionSlots.add(sKey);
    clean.push(e);
  }

  return { conflicts, cleanEntries: clean };
}

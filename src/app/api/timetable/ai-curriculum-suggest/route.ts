import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { anthropic, HAIKU } from '@/lib/anthropic';

const SCHEDULING_SLOT_HINT: Record<string, string> = {
  CORE: 'REGULAR', LANGUAGE: 'REGULAR', ELECTIVE: 'REGULAR',
  PRACTICAL: 'REGULAR', SPORTS: 'ACTIVITY', ARTS: 'ACTIVITY',
  TECHNOLOGY: 'REGULAR', VALUE_EDUCATION: 'ACTIVITY',
  REMEDIAL: 'REGULAR', ENRICHMENT: 'ACTIVITY',
};

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json() as {
    gradeId: string;
    subjects: { id: string; name: string; subjectCategory: string; hasTeacher: boolean; partLabel?: string | null }[];
  };

  const { gradeId, subjects } = body;
  if (!gradeId || !subjects?.length) return err('gradeId and subjects are required');

  // Fetch grade and tenant board
  const [grade, tenant] = await Promise.all([
    db.grade.findFirst({
      where: { id: gradeId, tenantId: session.user.tenantId },
      select: { name: true, displayOrder: true },
    }),
    db.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { board: true },
    }),
  ]);

  if (!grade) return err('Grade not found', 404);

  const board = tenant?.board ?? 'CBSE';
  const gradeName = grade.name;

  // Only suggest for subjects that have teachers
  const schedulable = subjects.filter(s => s.hasTeacher);
  if (schedulable.length === 0) return err('No subjects with teachers found', 400);

  const subjectList = schedulable.map(s =>
    `- id: "${s.id}", name: "${s.name}", category: ${s.subjectCategory}${s.partLabel ? `, partLabel: "${s.partLabel}"` : ''}`
  ).join('\n');

  const prompt = `You are a school timetable expert for Indian ${board} board schools.
Suggest an optimal weekly period allocation for each subject for ${gradeName}.

Subjects to schedule:
${subjectList}

Rules:
- LANGUAGE subjects: 5–8 periods/week, schedulingSlot: REGULAR
- CORE subjects (Maths, Science, Social): 5–7 periods/week, REGULAR
- PRACTICAL / TECHNOLOGY: 3–5 theory + possibly a lab (hasLabSession: true, labPeriodsPerWeek: 2 or 4)
- SPORTS / ARTS / ENRICHMENT / VALUE_EDUCATION: 2–3 periods/week, schedulingSlot: ACTIVITY
- ELECTIVE / REMEDIAL: 2–4 periods/week
- Subject parts (partLabel set): divide parent subject's total periods proportionally
- Total periods across all subjects should be 32–40/week for a full school day
- isCompulsory: true for CORE, LANGUAGE; false for ELECTIVE, ENRICHMENT
- maxPerDay: 1 for most; 2 only if the subject genuinely needs daily double exposure (e.g. intensive languages)

Return ONLY a raw JSON object (no markdown, no code fences):
{
  "suggestions": [
    {
      "subjectId": "<id from list above>",
      "include": true,
      "periodsPerWeek": 6,
      "schedulingSlot": "REGULAR",
      "isCompulsory": true,
      "maxPerDay": 1,
      "hasLabSession": false,
      "labPeriodsPerWeek": 0
    }
  ]
}`;

  try {
    const response = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';
    // Strip markdown code fences if Claude wraps in them
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    if (!cleaned) throw new Error('Empty response from AI');
    const parsed = JSON.parse(cleaned) as {
      suggestions: {
        subjectId: string;
        include: boolean;
        periodsPerWeek: number;
        schedulingSlot: string;
        isCompulsory: boolean;
        maxPerDay: number;
        hasLabSession: boolean;
        labPeriodsPerWeek: number;
      }[];
    };

    return ok({ suggestions: parsed.suggestions, gradeName, board });
  } catch (e) {
    console.error('[ai-curriculum-suggest] Anthropic call failed:', e);
    // Graceful degradation: fall back to category-based defaults
    const FALLBACK_PPW: Record<string, number> = {
      LANGUAGE: 6, CORE: 5, ELECTIVE: 3, PRACTICAL: 3,
      SPORTS: 2, ARTS: 2, TECHNOLOGY: 3, VALUE_EDUCATION: 1, REMEDIAL: 2, ENRICHMENT: 1,
    };
    const suggestions = schedulable.map(s => ({
      subjectId: s.id,
      include: true,
      periodsPerWeek: FALLBACK_PPW[s.subjectCategory] ?? 4,
      schedulingSlot: SCHEDULING_SLOT_HINT[s.subjectCategory] ?? 'REGULAR',
      isCompulsory: ['CORE', 'LANGUAGE'].includes(s.subjectCategory),
      maxPerDay: 1,
      hasLabSession: false,
      labPeriodsPerWeek: 0,
    }));
    const errMsg = e instanceof Error ? e.message : 'AI unavailable';
    return ok({ suggestions, gradeName, board, fallback: true, fallbackReason: errMsg });
  }
}

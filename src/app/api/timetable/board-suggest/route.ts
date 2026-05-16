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

const FALLBACK_PPW: Record<string, number> = {
  LANGUAGE: 6, CORE: 5, ELECTIVE: 3, PRACTICAL: 3,
  SPORTS: 2, ARTS: 2, TECHNOLOGY: 3, VALUE_EDUCATION: 1, REMEDIAL: 2, ENRICHMENT: 1,
};

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json() as {
    gradeId: string;
    subjects: { id: string; name: string; subjectCategory: string; partLabel?: string | null }[];
  };

  const { gradeId, subjects } = body;
  if (!gradeId || !subjects?.length) return err('gradeId and subjects are required');

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

  const subjectList = subjects.map(s =>
    `- id: "${s.id}", name: "${s.name}", category: ${s.subjectCategory}${s.partLabel ? `, part: "${s.partLabel}"` : ''}`
  ).join('\n');

  const prompt = `You are an expert on the official ${board} board curriculum for Indian schools.

For ${gradeName} under the ${board} board, return the official prescribed subject allocation for each subject listed below.

School's configured subjects:
${subjectList}

Instructions:
- Match each school subject to the official ${board} board subject for ${gradeName}
- Set periodsPerWeek based on the official ${board} timetable guidelines for that grade
- isCompulsory: true if the board mandates the subject, false if optional/elective
- schedulingSlot: "REGULAR" for academic subjects, "ACTIVITY" for PE/arts/value ed
- hasLabSession: true only for Science/Computer practicals that require a separate lab period
- labPeriodsPerWeek: 2 or 4 for lab subjects, 0 otherwise
- maxPerDay: 1 for most subjects, 2 only for intensive language subjects
- include: false if the subject has no clear match in the official ${board} ${gradeName} curriculum

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
    console.error('[board-suggest] AI call failed:', e);
    const suggestions = subjects.map(s => ({
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

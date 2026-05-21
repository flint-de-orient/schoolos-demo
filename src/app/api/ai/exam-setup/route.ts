import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { gradeIds, academicYearId } = body as { gradeIds: string[]; academicYearId: string };
  if (!gradeIds?.length || !academicYearId) return err('gradeIds and academicYearId are required');

  const [tenant, ay] = await Promise.all([
    db.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { board: true, name: true },
    }),
    db.academicYear.findFirst({
      where: { id: academicYearId, tenantId: session.user.tenantId },
      select: { id: true, label: true },
    }),
  ]);
  if (!tenant) return err('Tenant not found', 404);
  if (!ay) return err('Academic year not found', 404);

  const grades = await db.grade.findMany({
    where: { id: { in: gradeIds }, tenantId: session.user.tenantId },
    select: { id: true, name: true, displayOrder: true },
    orderBy: { displayOrder: 'asc' },
  });

  // Collect unique subjects across selected grades
  const gradeSubjects = await db.gradeSubject.findMany({
    where: { gradeId: { in: gradeIds } },
    include: { subject: { select: { id: true, name: true } } },
    orderBy: { subject: { name: 'asc' } },
  });
  const subjectMap = new Map<string, { id: string; name: string }>();
  for (const gs of gradeSubjects) {
    if (!subjectMap.has(gs.subjectId)) {
      subjectMap.set(gs.subjectId, { id: gs.subjectId, name: gs.subject.name });
    }
  }
  const subjects = [...subjectMap.values()];
  if (subjects.length === 0) return err('No subjects found for selected grades. Set up the curriculum (Timetable → Curriculum) first.');

  const classNames = grades.map((g) => g.name).join(', ');
  const prompt = buildPrompt(tenant.board, classNames, ay.label, subjects);

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Extract JSON — try code-fenced block first, then bare object
    const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonStr = fenced ? fenced[1] : rawText.match(/(\{[\s\S]*\})/)?.[1];
    if (!jsonStr) return err('AI returned an unexpected format. Please try again.');

    const scheme = JSON.parse(jsonStr);

    // Validate that all subjectIds in scheme exist in our subjects list
    const validIds = new Set(subjects.map((s) => s.id));
    for (const term of scheme.terms ?? []) {
      for (const sc of term.subjectConfigs ?? []) {
        if (!validIds.has(sc.subjectId)) {
          // Attempt fuzzy fix by name matching
          const match = subjects.find(
            (s) => s.name.toLowerCase() === (sc.subjectName ?? '').toLowerCase()
          );
          if (match) sc.subjectId = match.id;
        }
      }
    }

    return ok({
      scheme,
      grades: grades.map((g) => ({ id: g.id, name: g.name })),
      subjects,
    });
  } catch (e) {
    console.error('[ai/exam-setup] error:', e);
    return err('AI generation failed. Please try again.', 500);
  }
}

function buildPrompt(
  board: string,
  classNames: string,
  academicYear: string,
  subjects: { id: string; name: string }[]
) {
  const subjectList = subjects
    .map((s) => `  - subjectId: "${s.id}", name: "${s.name}"`)
    .join('\n');

  return `You are an expert in Indian school board assessment design. Generate a complete, production-ready assessment scheme for:

Board: ${board}
Classes: ${classNames}
Academic Year: ${academicYear}

Subjects available (use EXACT subjectId values):
${subjectList}

OUTPUT FORMAT — return ONLY a JSON object with this structure (no markdown, no explanation):

{
  "schemeName": "<board-specific name, e.g. 'CISCE ICSE Assessment Scheme 2025-26'>",
  "description": "<one sentence describing the evaluation approach>",
  "passCriteria": { "perSubject": <number>, "aggregate": <number> },
  "gradingBands": [
    { "label": "A+", "minPct": 90, "description": "Outstanding" },
    { "label": "A",  "minPct": 80, "description": "Excellent" },
    { "label": "B+", "minPct": 70, "description": "Very Good" },
    { "label": "B",  "minPct": 60, "description": "Good" },
    { "label": "C+", "minPct": 50, "description": "Above Average" },
    { "label": "C",  "minPct": 40, "description": "Average" },
    { "label": "D",  "minPct": 33, "description": "Pass" },
    { "label": "F",  "minPct": 0,  "description": "Fail" }
  ],
  "terms": [
    {
      "sequence": 1,
      "name": "<term name>",
      "type": "<UNIT_TEST|HALF_YEARLY|ANNUAL|PRE_BOARD|BOARD_EXAM|PROJECT|INTERNAL>",
      "weightPct": <number — all terms must sum to 100>,
      "isBoardConducted": <boolean>,
      "subjectConfigs": [
        {
          "subjectId": "<exact id from list above>",
          "subjectName": "<name>",
          "components": [
            { "name": "<Theory|Practical|Oral|Project|Written|Viva|Internal|Assignment>", "maxMarks": <number>, "passMarks": <number> }
          ]
        }
      ]
    }
  ]
}

RULES:
1. weightPct values MUST sum to exactly 100.
2. Include ALL subjects in EVERY term's subjectConfigs.
3. Use subjectId values EXACTLY as provided — never invent new ones.
4. passMarks = ceil(33% of maxMarks) for CISCE/CBSE; 35% for WBBSE.
5. passCriteria.perSubject = 33 for CISCE/CBSE, 35 for WBBSE.

SUBJECT-COMPONENT RULES (apply per subject name):
- Physics / Chemistry / Biology / Science: Theory (70) + Practical (30)
- English / Hindi / Bengali / any Language: Theory (80) + Oral (20)
- Mathematics: Theory (100)
- Computer Science / Computer Applications / Information Technology: Theory (50) + Practical (50)
- Geography: Theory (80) + Project (20)
- Physical Education / Art / Music: Practical (100)
- Economics / History / Civics / Commerce / Accountancy / Business Studies: Theory (100)
- Any other subject: Theory (100)
For Internal Assessment / Formative terms: all subjects use Project (50) + Assignment (50) or Internal (100).

TERM STRUCTURE BY BOARD AND LEVEL:
- CISCE, Classes I–VIII: Term1=Half Yearly Examination (30%, HALF_YEARLY), Term2=Annual Examination (70%, ANNUAL)
- CISCE ICSE, Classes IX–X: Term1=Internal Assessment (20%, INTERNAL, isBoardConducted=false), Term2=Annual Board Examination (80%, BOARD_EXAM, isBoardConducted=true)
- CISCE ISC, Classes XI–XII: Term1=Internal Assessment (20%, INTERNAL), Term2=Annual ISC Examination (80%, BOARD_EXAM, isBoardConducted=true)
- CBSE, Classes I–VIII: Term1=Periodic Test 1 (10%, UNIT_TEST), Term2=Periodic Test 2 (10%, UNIT_TEST), Term3=Half Yearly (30%, HALF_YEARLY), Term4=Annual (50%, ANNUAL)
- CBSE, Classes IX–X: Term1=PT1 (10%, UNIT_TEST), Term2=PT2 (10%, UNIT_TEST), Term3=Pre-Board (30%, PRE_BOARD), Term4=Board Exam (50%, BOARD_EXAM, isBoardConducted=true)
- WBBSE, Classes I–VIII: Term1=Unit Test 1 (20%, UNIT_TEST), Term2=Mid-Year Examination (30%, HALF_YEARLY), Term3=Annual Examination (50%, ANNUAL)
- WBBSE, Classes IX–X: Term1=Internal (20%, INTERNAL), Term2=Board Examination (80%, BOARD_EXAM, isBoardConducted=true)
- OTHER: Term1=Half Yearly (40%, HALF_YEARLY), Term2=Annual (60%, ANNUAL)

Determine the appropriate term structure based on board="${board}" and classes="${classNames}". If classes span both primary and secondary levels, use the secondary structure.

Return ONLY the JSON object.`;
}

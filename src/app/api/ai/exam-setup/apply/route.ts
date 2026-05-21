import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

type ComponentDef = { name: string; maxMarks: number; passMarks: number };
type GradingBand = { label: string; minPct: number; description: string };
type PassCriteria = { perSubject: number; aggregate: number };

interface GeneratedSubjectConfig {
  subjectId: string;
  subjectName: string;
  components: ComponentDef[];
}

interface GeneratedTerm {
  sequence: number;
  name: string;
  type: string;
  weightPct: number;
  isBoardConducted: boolean;
  subjectConfigs: GeneratedSubjectConfig[];
}

interface GeneratedScheme {
  schemeName: string;
  description?: string;
  passCriteria: PassCriteria;
  gradingBands: GradingBand[];
  terms: GeneratedTerm[];
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { scheme, gradeIds, academicYearId } = body as {
    scheme: GeneratedScheme;
    gradeIds: string[];
    academicYearId: string;
  };

  if (!scheme || !gradeIds?.length || !academicYearId) {
    return err('scheme, gradeIds and academicYearId are required');
  }

  const tenantId = session.user.tenantId;

  // Verify academic year belongs to tenant
  const ay = await db.academicYear.findFirst({
    where: { id: academicYearId, tenantId },
  });
  if (!ay) return err('Academic year not found', 404);

  // Validate all subjectIds are real subjects in this tenant's grades
  const allSubjectIds = [
    ...new Set(
      scheme.terms.flatMap((t) => t.subjectConfigs.map((sc) => sc.subjectId))
    ),
  ];
  const validSubjects = await db.subject.findMany({
    where: { id: { in: allSubjectIds }, tenantId },
    select: { id: true },
  });
  const validIds = new Set(validSubjects.map((s) => s.id));
  const invalidIds = allSubjectIds.filter((id) => !validIds.has(id));
  if (invalidIds.length > 0) {
    return err(`Invalid subjectIds: ${invalidIds.join(', ')}. Re-generate the scheme.`);
  }

  const result = await db.$transaction(async (tx) => {
    const newScheme = await tx.assessmentScheme.create({
      data: {
        tenantId,
        name: scheme.schemeName,
        description: scheme.description ?? null,
        academicYearId,
        appliedGradeIds: gradeIds,
        gradingConfig: scheme.gradingBands as unknown as import('@prisma/client').Prisma.InputJsonValue,
        passCriteria: scheme.passCriteria as unknown as import('@prisma/client').Prisma.InputJsonValue,
        isPublished: false,
      },
    });

    for (const term of scheme.terms) {
      const newTerm = await tx.assessmentTerm.create({
        data: {
          schemeId: newScheme.id,
          sequence: term.sequence,
          name: term.name,
          type: term.type ?? 'UNIT_TEST',
          weightPct: term.weightPct,
          isBoardConducted: term.isBoardConducted ?? false,
        },
      });

      for (const sc of term.subjectConfigs) {
        if (!validIds.has(sc.subjectId)) continue;
        await tx.termSubjectConfig.create({
          data: {
            termId: newTerm.id,
            subjectId: sc.subjectId,
            components: sc.components as unknown as import('@prisma/client').Prisma.InputJsonValue,
          },
        });
      }
    }

    return newScheme;
  });

  return ok({ schemeId: result.id, schemeName: result.name }, 201);
}

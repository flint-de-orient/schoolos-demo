import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

type P = { params: { id: string } };

interface Component { name: string; type: string; maxMarks: number; passMark: number }
interface GradeConfig { grade: string; min: number; max: number }
interface PassCriteria { perSubject: number; aggregate: number }

function applyGrade(mark: number, config: GradeConfig[]): string {
  for (const g of config) {
    if (mark >= g.min && mark <= g.max) return g.grade;
  }
  return 'F';
}

export async function GET(req: NextRequest, { params }: P) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const gradeId = searchParams.get('gradeId');
  if (!gradeId) return err('gradeId required');

  const scheme = await db.assessmentScheme.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: {
      terms: {
        orderBy: { sequence: 'asc' },
        include: { overrides: true },
      },
      subjectPatterns: true,
    },
  });
  if (!scheme) return err('Not found', 404);

  // Verify grade is in scheme
  if (!scheme.appliedGradeIds.includes(gradeId)) {
    return err('Grade is not part of this scheme');
  }

  const gradingConfig = scheme.gradingConfig as unknown as GradeConfig[];
  const passCriteria = scheme.passCriteria as unknown as PassCriteria;

  // Get subjects for this grade (from GradeSubject)
  const gradeSubjects = await db.gradeSubject.findMany({
    where: { gradeId, sessionType: 'THEORY' },
    include: { subject: { select: { id: true, name: true } } },
    orderBy: { subject: { name: 'asc' } },
  });

  const subjects = gradeSubjects.map(gs => gs.subject);

  // Get students
  const students = await db.student.findMany({
    where: { gradeId, tenantId: session.user.tenantId, isActive: true, deletedAt: null },
    select: { id: true, name: true, rollNo: true, admissionNo: true },
    orderBy: { name: 'asc' },
  });

  if (students.length === 0 || subjects.length === 0) {
    return ok({ students: [], subjects, scheme });
  }

  // Narrow scheme to non-null for use inside closures
  const safeScheme = scheme;

  // Get all mark entries for all linked exam schedules
  const examScheduleIds = safeScheme.terms
    .filter(t => t.examScheduleId)
    .map(t => t.examScheduleId as string);

  const markEntries =
    examScheduleIds.length > 0
      ? await db.markEntry.findMany({
          where: {
            examScheduleId: { in: examScheduleIds },
            studentId: { in: students.map(s => s.id) },
          },
          select: {
            examScheduleId: true,
            studentId: true,
            subjectId: true,
            componentName: true,
            marksObtained: true,
            isAbsent: true,
          },
        })
      : [];

  // Build lookup: examScheduleId → studentId → subjectId → componentName → marks
  const markLookup = new Map<
    string,
    Map<string, Map<string, Map<string, { marks: number | null; isAbsent: boolean }>>>
  >();
  for (const entry of markEntries) {
    if (!markLookup.has(entry.examScheduleId)) markLookup.set(entry.examScheduleId, new Map());
    const byStudent = markLookup.get(entry.examScheduleId)!;
    if (!byStudent.has(entry.studentId)) byStudent.set(entry.studentId, new Map());
    const bySubject = byStudent.get(entry.studentId)!;
    if (!bySubject.has(entry.subjectId)) bySubject.set(entry.subjectId, new Map());
    bySubject.get(entry.subjectId)!.set(entry.componentName, {
      marks: entry.marksObtained,
      isAbsent: entry.isAbsent,
    });
  }

  // Helper: get components for a subject in a term
  function getComponents(term: (typeof safeScheme.terms)[0], subjectId: string): Component[] {
    // Check term-level override first
    const override = term.overrides.find(o => o.subjectId === subjectId);
    if (override) return override.components as unknown as Component[];

    // Then subject-specific pattern
    const subjectPattern = safeScheme.subjectPatterns.find(p => p.subjectId === subjectId);
    if (subjectPattern) return subjectPattern.components as unknown as Component[];

    // Then default pattern (subjectId = null)
    const defaultPattern = safeScheme.subjectPatterns.find(p => p.subjectId === null);
    if (defaultPattern) return defaultPattern.components as unknown as Component[];

    // Fallback
    return [{ name: 'Theory', type: 'THEORY', maxMarks: 100, passMark: 33 }];
  }

  // Compute results per student
  const results = students.map(student => {
    const subjectResults: Record<
      string,
      {
        termBreakdown: {
          termName: string;
          obtained: number;
          maxMarks: number;
          weightedContrib: number;
        }[];
        finalMark: number;
        grade: string;
        passed: boolean;
      }
    > = {};

    let totalFinal = 0;
    let allPassed = true;

    for (const subject of subjects) {
      const termBreakdown: {
        termName: string;
        obtained: number;
        maxMarks: number;
        weightedContrib: number;
      }[] = [];
      let finalMark = 0;

      for (const term of safeScheme.terms) {
        const components = getComponents(term, subject.id);
        const termMaxMarks = components.reduce((s, c) => s + c.maxMarks, 0);

        let termObtained = 0;
        let anyAbsent = false;

        for (const comp of components) {
          const entry = term.examScheduleId
            ? markLookup
                .get(term.examScheduleId)
                ?.get(student.id)
                ?.get(subject.id)
                ?.get(comp.name)
            : undefined;

          if (entry?.isAbsent) {
            anyAbsent = true;
            break;
          }
          termObtained += entry?.marks ?? 0;
        }

        if (anyAbsent) termObtained = 0;

        const weightedContrib =
          termMaxMarks > 0 ? (termObtained / termMaxMarks) * term.weightPct : 0;

        finalMark += weightedContrib;
        termBreakdown.push({
          termName: term.name,
          obtained: termObtained,
          maxMarks: termMaxMarks,
          weightedContrib: Math.round(weightedContrib * 10) / 10,
        });
      }

      finalMark = Math.round(finalMark * 10) / 10;
      const passed = finalMark >= passCriteria.perSubject;
      if (!passed) allPassed = false;
      totalFinal += finalMark;

      subjectResults[subject.id] = {
        termBreakdown,
        finalMark,
        grade: applyGrade(finalMark, gradingConfig),
        passed,
      };
    }

    const aggregate =
      subjects.length > 0 ? Math.round((totalFinal / subjects.length) * 10) / 10 : 0;
    const overallPassed = allPassed && aggregate >= passCriteria.aggregate;

    return {
      student,
      subjectResults,
      aggregate,
      overallGrade: applyGrade(aggregate, gradingConfig),
      passed: overallPassed,
    };
  });

  // Sort by aggregate desc
  results.sort((a, b) => b.aggregate - a.aggregate);

  return ok({ results, subjects, scheme: safeScheme });
}

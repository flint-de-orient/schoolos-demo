import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

type P = { params: { id: string } };

type ComponentDef = { name: string; maxMarks: number; passMarks: number };
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
        include: {
          subjectConfigs: true,
        },
      },
    },
  });
  if (!scheme) return err('Not found', 404);

  if (!scheme.appliedGradeIds.includes(gradeId)) {
    return err('Grade is not part of this scheme');
  }

  const gradingConfig = scheme.gradingConfig as unknown as GradeConfig[];
  const passCriteria = scheme.passCriteria as unknown as PassCriteria;

  const gradeSubjects = await db.gradeSubject.findMany({
    where: { gradeId, sessionType: 'THEORY' },
    include: { subject: { select: { id: true, name: true } } },
    orderBy: { subject: { name: 'asc' } },
  });
  const subjects = gradeSubjects.map(gs => gs.subject);

  const students = await db.student.findMany({
    where: { gradeId, tenantId: session.user.tenantId, isActive: true, deletedAt: null },
    select: { id: true, name: true, rollNo: true, admissionNo: true },
    orderBy: { name: 'asc' },
  });

  if (students.length === 0 || subjects.length === 0) {
    return ok({ students: [], subjects, scheme });
  }

  const examScheduleIds = scheme.terms
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

  type TermWithConfigs = (typeof scheme.terms)[0];

  function getComponents(term: TermWithConfigs, subjectId: string): ComponentDef[] {
    const cfg = term.subjectConfigs.find(c => c.subjectId === subjectId);
    if (cfg) {
      const comps = (cfg.components as ComponentDef[]).filter(c => c.maxMarks > 0);
      if (comps.length > 0) return comps;
    }
    return [{ name: 'Theory', maxMarks: 100, passMarks: 33 }];
  }

  const results = students.map(student => {
    const subjectResults: Record<
      string,
      {
        termBreakdown: { termName: string; obtained: number; maxMarks: number; weightedContrib: number }[];
        finalMark: number;
        grade: string;
        passed: boolean;
      }
    > = {};

    let totalFinal = 0;
    let allPassed = true;

    for (const subject of subjects) {
      const termBreakdown: { termName: string; obtained: number; maxMarks: number; weightedContrib: number }[] = [];
      let finalMark = 0;

      for (const term of scheme.terms) {
        const components = getComponents(term, subject.id);
        const termMaxMarks = components.reduce((s, c) => s + c.maxMarks, 0);

        let termObtained = 0;
        let anyAbsent = false;

        for (const comp of components) {
          const entry = term.examScheduleId
            ? markLookup.get(term.examScheduleId)?.get(student.id)?.get(subject.id)?.get(comp.name)
            : undefined;
          if (entry?.isAbsent) { anyAbsent = true; break; }
          termObtained += entry?.marks ?? 0;
        }

        if (anyAbsent) termObtained = 0;
        const weightedContrib = termMaxMarks > 0 ? (termObtained / termMaxMarks) * term.weightPct : 0;
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

    const aggregate = subjects.length > 0 ? Math.round((totalFinal / subjects.length) * 10) / 10 : 0;
    const overallPassed = allPassed && aggregate >= passCriteria.aggregate;

    return { student, subjectResults, aggregate, overallGrade: applyGrade(aggregate, gradingConfig), passed: overallPassed };
  });

  results.sort((a, b) => b.aggregate - a.aggregate);
  return ok({ results, subjects, scheme });
}

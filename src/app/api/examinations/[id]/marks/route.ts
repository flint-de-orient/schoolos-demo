import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

type Params = { params: { id: string } };

type ComponentDef = { name: string; maxMarks: number; passMarks: number };

export async function GET(req: NextRequest, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const gradeId = searchParams.get('gradeId');
  if (!gradeId) return err('gradeId query param is required');

  const schedule = await db.examSchedule.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!schedule) return err('Not found', 404);

  // ── 1. Determine subjects + components ────────────────────────────────────

  // Check if this exam is linked to an AssessmentTerm that has subject configs
  const linkedTerm = await db.assessmentTerm.findFirst({
    where: { examScheduleId: params.id },
    include: {
      subjectConfigs: {
        include: { subject: { select: { id: true, name: true } } },
        orderBy: { subject: { name: 'asc' } },
      },
    },
  });

  // Gather the grade's subjects (for filtering term configs to relevant ones)
  const gradeSubjectRows = await db.gradeSubject.findMany({
    where: { gradeId },
    select: { subjectId: true, maxMarks: true, passMarks: true },
  });
  const gradeSubjectIds = new Set(gradeSubjectRows.map((gs) => gs.subjectId));

  type SubjectWithComponents = {
    id: string;
    name: string;
    maxMarks: number;
    components: ComponentDef[];
  };

  let subjects: SubjectWithComponents[];

  if (linkedTerm && linkedTerm.subjectConfigs.length > 0) {
    // Use term's TermSubjectConfig, filtered to this grade's subjects
    subjects = linkedTerm.subjectConfigs
      .filter((cfg) => gradeSubjectIds.has(cfg.subjectId))
      .map((cfg) => {
        const comps = (cfg.components as ComponentDef[]).filter(
          (c) => c.maxMarks > 0
        );
        const totalMax = comps.reduce((s, c) => s + c.maxMarks, 0);
        return {
          id: cfg.subjectId,
          name: cfg.subject.name,
          maxMarks: totalMax || 100,
          components: comps.length > 0 ? comps : [{ name: 'Theory', maxMarks: totalMax || 100, passMarks: 33 }],
        };
      });
  } else {
    // Fallback 1: ExamScheduleItems
    const examItems = await db.examScheduleItem.findMany({
      where: { examScheduleId: params.id, gradeId },
      orderBy: { examDate: 'asc' },
    });

    if (examItems.length > 0) {
      const subjectIds = [...new Set(examItems.map((i) => i.subjectId))];
      const subjectRows = await db.subject.findMany({
        where: { id: { in: subjectIds } },
        select: { id: true, name: true },
      });
      const subjectMap = new Map(subjectRows.map((s) => [s.id, s]));
      const maxMarksMap = new Map<string, number>();
      const passMarksMap = new Map<string, number>();
      for (const item of examItems) {
        const ex = maxMarksMap.get(item.subjectId) ?? 0;
        if (item.maxMarks > ex) {
          maxMarksMap.set(item.subjectId, item.maxMarks);
          passMarksMap.set(item.subjectId, item.passMarks);
        }
      }
      subjects = subjectIds.map((sid) => {
        const mm = maxMarksMap.get(sid) ?? 100;
        const pm = passMarksMap.get(sid) ?? 33;
        return {
          id: sid,
          name: subjectMap.get(sid)?.name ?? sid,
          maxMarks: mm,
          components: [{ name: 'Theory', maxMarks: mm, passMarks: pm }],
        };
      });
    } else {
      // Fallback 2: GradeSubject curriculum
      const gs = await db.gradeSubject.findMany({
        where: { gradeId, sessionType: 'THEORY' },
        include: { subject: { select: { id: true, name: true } } },
        orderBy: { subject: { name: 'asc' } },
      });
      subjects = gs.map((row) => ({
        id: row.subject.id,
        name: row.subject.name,
        maxMarks: row.maxMarks,
        components: [{ name: 'Theory', maxMarks: row.maxMarks, passMarks: row.passMarks }],
      }));
    }
  }

  // ── 2. Students ───────────────────────────────────────────────────────────

  const studentRows = await db.student.findMany({
    where: { tenantId: session.user.tenantId, gradeId, isActive: true, deletedAt: null },
    select: { id: true, name: true, rollNo: true, admissionNo: true },
    orderBy: { name: 'asc' },
  });
  const studentIds = studentRows.map((s) => s.id);
  const subjectIds = subjects.map((s) => s.id);

  // ── 3. Existing mark entries ───────────────────────────────────────────────

  const entries = await db.markEntry.findMany({
    where: {
      examScheduleId: params.id,
      studentId: { in: studentIds },
      subjectId: { in: subjectIds },
    },
    select: { id: true, studentId: true, subjectId: true, componentName: true, marksObtained: true, isAbsent: true },
  });

  // marks[studentId][subjectId][componentName]
  type MarkCell = { id: string; marksObtained: number | null; isAbsent: boolean };
  const marksByStudent = new Map<string, Record<string, Record<string, MarkCell>>>();

  for (const entry of entries) {
    if (!marksByStudent.has(entry.studentId)) marksByStudent.set(entry.studentId, {});
    const bySub = marksByStudent.get(entry.studentId)!;
    if (!bySub[entry.subjectId]) bySub[entry.subjectId] = {};
    bySub[entry.subjectId][entry.componentName] = {
      id: entry.id,
      marksObtained: entry.marksObtained,
      isAbsent: entry.isAbsent,
    };
  }

  const students = studentRows.map((s) => ({
    id: s.id,
    name: s.name,
    rollNo: s.rollNo,
    admissionNo: s.admissionNo,
    marks: marksByStudent.get(s.id) ?? {},
  }));

  return ok({ students, subjects, linkedTermId: linkedTerm?.id ?? null });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const schedule = await db.examSchedule.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!schedule) return err('Not found', 404);

  const body = await req.json();
  const { entries } = body as {
    entries: {
      studentId: string;
      subjectId: string;
      componentName: string;
      marksObtained?: number | null;
      isAbsent?: boolean;
    }[];
  };

  if (!Array.isArray(entries) || entries.length === 0) {
    return err('entries array is required');
  }

  const tenantId = session.user.tenantId;
  const now = new Date();

  await Promise.all(
    entries.map((entry) =>
      db.markEntry.upsert({
        where: {
          examScheduleId_studentId_subjectId_componentName: {
            examScheduleId: params.id,
            studentId: entry.studentId,
            subjectId: entry.subjectId,
            componentName: entry.componentName ?? 'Theory',
          },
        },
        create: {
          tenantId,
          examScheduleId: params.id,
          studentId: entry.studentId,
          subjectId: entry.subjectId,
          componentName: entry.componentName ?? 'Theory',
          marksObtained: entry.marksObtained ?? null,
          isAbsent: entry.isAbsent ?? false,
          enteredAt: now,
        },
        update: {
          marksObtained: entry.marksObtained ?? null,
          isAbsent: entry.isAbsent ?? false,
          updatedAt: now,
        },
      })
    )
  );

  return ok({ saved: entries.length });
}

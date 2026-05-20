import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

type Params = { params: { id: string } };

export async function GET(
  req: NextRequest,
  { params }: Params
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const gradeId = searchParams.get('gradeId');
  if (!gradeId) return err('gradeId query param is required');

  // Verify exam schedule belongs to tenant
  const schedule = await db.examSchedule.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!schedule) return err('Not found', 404);

  // 1. Fetch ExamScheduleItems for this exam + gradeId → subject list with maxMarks
  //    (ExamScheduleItem has no Prisma relation to Subject, so we join manually)
  const examItems = await db.examScheduleItem.findMany({
    where: { examScheduleId: params.id, gradeId },
    orderBy: { examDate: 'asc' },
  });

  const subjectIds = [...new Set(examItems.map((i) => i.subjectId))];
  const subjectRows = await db.subject.findMany({
    where: { id: { in: subjectIds } },
    select: { id: true, name: true },
  });
  const subjectMap = new Map(subjectRows.map((s) => [s.id, s]));

  // One entry per unique subject (use max maxMarks if duplicated across items)
  const subjectMaxMarks = new Map<string, number>();
  for (const item of examItems) {
    const existing = subjectMaxMarks.get(item.subjectId) ?? 0;
    if (item.maxMarks > existing) subjectMaxMarks.set(item.subjectId, item.maxMarks);
  }

  const subjects = subjectIds.map((sid) => ({
    id: sid,
    name: subjectMap.get(sid)?.name ?? sid,
    maxMarks: subjectMaxMarks.get(sid) ?? 100,
  }));

  // 2. Fetch active students in that grade
  const studentRows = await db.student.findMany({
    where: {
      tenantId: session.user.tenantId,
      gradeId,
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      rollNo: true,
      admissionNo: true,
    },
    orderBy: { name: 'asc' },
  });

  const studentIds = studentRows.map((s) => s.id);

  // 3. Fetch existing MarkEntries for this exam + those students
  const entries = await db.markEntry.findMany({
    where: {
      examScheduleId: params.id,
      studentId: { in: studentIds },
    },
    select: {
      id: true,
      studentId: true,
      subjectId: true,
      marksObtained: true,
      isAbsent: true,
    },
  });

  // 4. Build per-student marks map
  type MarkCell = { id: string; marksObtained: number | null; isAbsent: boolean };
  type MarksMap = Record<string, MarkCell>;

  const marksByStudent = new Map<string, MarksMap>();
  for (const entry of entries) {
    if (!marksByStudent.has(entry.studentId)) {
      marksByStudent.set(entry.studentId, {});
    }
    marksByStudent.get(entry.studentId)![entry.subjectId] = {
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

  return ok({ students, subjects });
}

export async function POST(
  req: NextRequest,
  { params }: Params
) {
  const { session, error } = await requireSession();
  if (error) return error;

  // Verify exam schedule belongs to tenant
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
          examScheduleId_studentId_subjectId: {
            examScheduleId: params.id,
            studentId: entry.studentId,
            subjectId: entry.subjectId,
          },
        },
        create: {
          tenantId,
          examScheduleId: params.id,
          studentId: entry.studentId,
          subjectId: entry.subjectId,
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

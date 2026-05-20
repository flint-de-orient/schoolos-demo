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
  const gradeId = searchParams.get('gradeId') ?? undefined;

  // Verify the exam schedule belongs to the tenant
  const schedule = await db.examSchedule.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!schedule) return err('Not found', 404);

  const items = await db.examScheduleItem.findMany({
    where: {
      examScheduleId: params.id,
      ...(gradeId && { gradeId }),
    },
    include: {
      grade: { select: { id: true, name: true } },
    },
    orderBy: { examDate: 'asc' },
  });

  // Enrich with subject names (no Prisma relation on ExamScheduleItem → Subject)
  const subjectIds = [...new Set(items.map((i) => i.subjectId))];
  const subjectRows = await db.subject.findMany({
    where: { id: { in: subjectIds } },
    select: { id: true, name: true },
  });
  const subjectMap = new Map(subjectRows.map((s) => [s.id, s]));

  const enriched = items.map((item) => ({
    ...item,
    subject: subjectMap.get(item.subjectId) ?? { id: item.subjectId, name: '' },
  }));

  return ok(enriched);
}

export async function POST(
  req: NextRequest,
  { params }: Params
) {
  const { session, error } = await requireSession();
  if (error) return error;

  // Verify the exam schedule belongs to the tenant
  const schedule = await db.examSchedule.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!schedule) return err('Not found', 404);

  const body = await req.json();
  const {
    gradeId,
    subjectId,
    examDate,
    startTime,
    endTime,
    maxMarks,
    passMarks,
    venue,
  } = body;

  if (!gradeId) return err('gradeId is required');
  if (!subjectId) return err('subjectId is required');
  if (!examDate) return err('examDate is required');

  const item = await db.examScheduleItem.create({
    data: {
      examScheduleId: params.id,
      gradeId,
      subjectId,
      examDate: new Date(examDate),
      startTime: startTime ?? '',
      endTime: endTime ?? '',
      maxMarks: maxMarks ?? 100,
      passMarks: passMarks ?? 33,
      venue: venue ?? null,
    },
    include: {
      grade: { select: { id: true, name: true } },
    },
  });

  // Enrich with subject name
  const subjectRow = await db.subject.findUnique({
    where: { id: subjectId },
    select: { id: true, name: true },
  });

  return ok(
    { ...item, subject: subjectRow ?? { id: subjectId, name: '' } },
    201
  );
}

export async function DELETE(
  req: NextRequest,
  { params }: Params
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const itemId = searchParams.get('itemId');
  if (!itemId) return err('itemId query param is required');

  // Verify the parent schedule belongs to the tenant
  const schedule = await db.examSchedule.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!schedule) return err('Not found', 404);

  // Confirm item belongs to this schedule
  const item = await db.examScheduleItem.findFirst({
    where: { id: itemId, examScheduleId: params.id },
    select: { id: true },
  });
  if (!item) return err('Item not found', 404);

  await db.examScheduleItem.delete({ where: { id: itemId } });

  return ok({ success: true });
}

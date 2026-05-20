import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET(_req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const schedules = await db.examSchedule.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      academicYear: { select: { id: true, label: true } },
      _count: { select: { markEntries: true, hallTickets: true, items: true } },
    },
    orderBy: { startDate: 'desc' },
  });

  return ok(schedules);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const {
    name,
    academicYearId,
    startDate,
    endDate,
    gradeBands,
    isPreBoard,
    isBoardExam,
    semesterNo,
  } = body;

  if (!name) return err('name is required');
  if (!academicYearId) return err('academicYearId is required');

  const schedule = await db.examSchedule.create({
    data: {
      tenantId: session.user.tenantId,
      name,
      academicYearId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      gradeBands: gradeBands ?? [],
      isPreBoard: isPreBoard ?? false,
      isBoardExam: isBoardExam ?? false,
      semesterNo: semesterNo ?? null,
    },
    include: {
      academicYear: { select: { id: true, label: true } },
      _count: { select: { markEntries: true, hallTickets: true, items: true } },
    },
  });

  return ok(schedule, 201);
}

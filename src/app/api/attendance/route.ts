import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { AttendanceStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const date = searchParams.get('date');
  const sectionId = searchParams.get('sectionId') ?? undefined;

  let targetDate = date ? new Date(date) : new Date();
  targetDate.setHours(0, 0, 0, 0);

  const tenantId = session.user.tenantId;

  // Fetch sessions for the requested date
  let sessions = await db.attendanceSession.findMany({
    where: { tenantId, date: targetDate, ...(sectionId && { sectionId }) },
    include: {
      section: { include: { grade: { select: { name: true, displayOrder: true } } } },
      records: {
        include: {
          student: { select: { id: true, name: true, rollNo: true, admissionNo: true } },
        },
      },
    },
    orderBy: { section: { grade: { displayOrder: 'asc' } } },
  });

  // If no sessions for today, fall back to the most recent date that has data
  let isLive = true;
  if (sessions.length === 0 && !date) {
    isLive = false;
    const latest = await db.attendanceSession.findFirst({
      where: { tenantId },
      orderBy: { date: 'desc' },
      select: { date: true },
    });
    if (latest) {
      targetDate = latest.date;
      sessions = await db.attendanceSession.findMany({
        where: { tenantId, date: targetDate, ...(sectionId && { sectionId }) },
        include: {
          section: { include: { grade: { select: { name: true, displayOrder: true } } } },
          records: {
            include: {
              student: { select: { id: true, name: true, rollNo: true, admissionNo: true } },
            },
          },
        },
        orderBy: { section: { grade: { displayOrder: 'asc' } } },
      });
    }
  }

  // School-wide summary
  const summary = sessions.reduce(
    (acc, s) => {
      const present = s.records.filter((r) => r.status === 'PRESENT').length;
      const total = s.records.length;
      acc.present += present;
      acc.absent += total - present;
      acc.total += total;
      return acc;
    },
    { present: 0, absent: 0, total: 0, percent: 0 }
  );
  if (summary.total > 0) {
    summary.percent = Math.round((summary.present / summary.total) * 100);
  }

  return ok({
    date: targetDate.toISOString().split('T')[0],
    isLive,
    sessions,
    summary,
  });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { sectionId, date, teacherId, records } = body;

  if (!sectionId || !date || !Array.isArray(records)) {
    return err('sectionId, date and records array are required');
  }

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const attendanceSession = await db.attendanceSession.upsert({
    where: { sectionId_date_periodNo: { sectionId, date: targetDate, periodNo: 0 } },
    update: { markedAt: new Date() },
    create: {
      tenantId: session.user.tenantId,
      sectionId,
      teacherId: teacherId ?? session.user.id,
      date: targetDate,
      periodNo: 0,
      markedAt: new Date(),
    },
  });

  const ops = records.map((r: { studentId: string; status: string; reason?: string }) =>
    db.attendanceRecord.upsert({
      where: { sessionId_studentId: { sessionId: attendanceSession.id, studentId: r.studentId } },
      update: { status: r.status as AttendanceStatus, reason: r.reason },
      create: {
        sessionId: attendanceSession.id,
        studentId: r.studentId,
        status: r.status as AttendanceStatus,
        reason: r.reason,
      },
    })
  );

  await db.$transaction(ops);

  const studentIds = records.map((r: { studentId: string }) => r.studentId);
  await Promise.all(
    studentIds.map(async (studentId: string) => {
      const total = await db.attendanceRecord.count({ where: { studentId } });
      const present = await db.attendanceRecord.count({
        where: { studentId, status: { in: ['PRESENT', 'LATE'] } },
      });
      await db.student.update({
        where: { id: studentId },
        data: { attendancePercent: total > 0 ? Math.round((present / total) * 100) : 100 },
      });
    })
  );

  return ok({ sessionId: attendanceSession.id, recorded: records.length });
}

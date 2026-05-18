import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { AttendanceStatus } from '@prisma/client';
import { notifyAbsent, notifyLowAttendance } from '@/lib/notifications';

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
        select: {
          id: true,
          studentId: true,
          status: true,
          source: true,
          reason: true,
          parentNotified: true,
          markedAt: true,
          student: { select: { id: true, name: true, rollNo: true, admissionNo: true } },
        },
        orderBy: { markedAt: 'asc' },
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
            select: {
              id: true,
              studentId: true,
              status: true,
              source: true,
              reason: true,
              parentNotified: true,
              markedAt: true,
              student: { select: { id: true, name: true, rollNo: true, admissionNo: true } },
            },
            orderBy: { markedAt: 'asc' },
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

  // Capture previous percentages before update (for threshold detection)
  const prevStudents = await db.student.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, attendancePercent: true },
  });
  const prevPctMap = Object.fromEntries(prevStudents.map(s => [s.id, s.attendancePercent ?? 100]));

  const updatedStudents = await Promise.all(
    studentIds.map(async (studentId: string) => {
      const total = await db.attendanceRecord.count({ where: { studentId } });
      const present = await db.attendanceRecord.count({
        where: { studentId, status: { in: ['PRESENT', 'LATE'] } },
      });
      const newPct = total > 0 ? Math.round((present / total) * 100) : 100;
      await db.student.update({
        where: { id: studentId },
        data: { attendancePercent: newPct },
      });
      return { studentId, newPct };
    })
  );
  const newPctMap = Object.fromEntries(updatedStudents.map(s => [s.studentId, s.newPct]));

  // Build record-id map for parentNotified updates
  const sessionRecords = await db.attendanceRecord.findMany({
    where: { sessionId: attendanceSession.id },
    select: { id: true, studentId: true },
  });
  const recordIdMap = Object.fromEntries(sessionRecords.map(r => [r.studentId, r.id]));

  // Fire WhatsApp notifications for absent students (non-blocking)
  const absentRecords = records.filter((r: { studentId: string; status: string }) => r.status === 'ABSENT');
  if (absentRecords.length > 0) {
    const dateStr = targetDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    Promise.all(
      absentRecords.map(async (r: { studentId: string }) => {
        const student = await db.student.findUnique({
          where: { id: r.studentId },
          include: {
            section: { include: { grade: { select: { name: true } } } },
            parents: {
              where: { isPrimary: true },
              take: 1,
              include: { parent: { select: { phone: true, fatherName: true, motherName: true, guardianName: true } } },
            },
          },
        });
        if (!student) return;
        const sp = student.parents[0];
        if (!sp?.parent?.phone) return;
        const p = sp.parent;
        const parentName = p.fatherName ?? p.motherName ?? p.guardianName ?? 'Parent';
        const className = `${student.section.grade.name} - ${student.section.name}`;

        try {
          await notifyAbsent(session.user.tenantId, sp.parent.phone, parentName, student.name, className, dateStr);
          // Mark notification sent
          const recordId = recordIdMap[r.studentId];
          if (recordId) {
            await db.attendanceRecord.update({ where: { id: recordId }, data: { parentNotified: true } });
          }
        } catch {
          // Notification failure — do not fail the request
        }

        // 75% threshold alert: only fire when student crosses below threshold this save
        const prevPct = prevPctMap[r.studentId] ?? 100;
        const newPct  = newPctMap[r.studentId]  ?? 100;
        if (prevPct > 75 && newPct <= 75) {
          try {
            await notifyLowAttendance(session.user.tenantId, sp.parent.phone, parentName, student.name, className, newPct);
          } catch {
            // non-blocking
          }
        }
      })
    ).catch(() => { /* non-blocking */ });
  }

  // Expire the AI insights cache so next load regenerates with fresh data
  db.attendanceInsight.updateMany({
    where: { tenantId: session.user.tenantId },
    data: { expiresAt: new Date() },
  }).catch(() => {});

  return ok({ sessionId: attendanceSession.id, recorded: records.length });
}

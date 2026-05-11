import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const dateStr = searchParams.get('date');
  const date = dateStr ? new Date(dateStr) : new Date();

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const [events, gateAttendanceRecords] = await Promise.all([
    db.gateEvent.findMany({
      where: {
        tenantId: session.user.tenantId,
        timestamp: { gte: start, lte: end },
      },
      include: {
        student: {
          select: {
            id: true, name: true, admissionNo: true,
            grade: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
        gateDevice: { select: { label: true, location: true, deviceType: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 200,
    }),
    // Attendance records marked via gate today
    db.attendanceRecord.findMany({
      where: {
        source: { in: ['GATE_RFID', 'GATE_FACE'] },
        session: {
          tenantId: session.user.tenantId,
          date: { gte: start, lte: end },
        },
      },
      select: { studentId: true, status: true, source: true },
    }),
  ]);

  // Build a map: studentId → attendance status (for quick lookup)
  const attendanceMap = new Map<string, string>();
  for (const r of gateAttendanceRecords) {
    attendanceMap.set(r.studentId, r.status);
  }

  // Enrich events with attendance status
  const enrichedEvents = events.map(e => ({
    ...e,
    attendanceStatus: e.studentId ? (attendanceMap.get(e.studentId) ?? null) : null,
  }));

  // Who is currently inside (last event = ENTRY)
  const studentLastEvent = new Map<string, string>();
  for (const e of [...events].reverse()) {
    if (e.studentId) studentLastEvent.set(e.studentId, e.type);
  }
  const insideCount = [...studentLastEvent.values()].filter(t => t === 'ENTRY').length;

  return ok({
    events: enrichedEvents,
    insideCount,
    date: start.toISOString(),
    attendanceSummary: {
      total: gateAttendanceRecords.length,
      present: gateAttendanceRecords.filter(r => r.status === 'PRESENT').length,
      late: gateAttendanceRecords.filter(r => r.status === 'LATE').length,
    },
  });
}

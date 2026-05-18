import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

// GET /api/attendance/report?sectionId=&month=1-12&year=2026
// Returns per-student day-by-day attendance for the given month + summary
export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const sectionId = searchParams.get('sectionId');
  const month = parseInt(searchParams.get('month') ?? '0');
  const year = parseInt(searchParams.get('year') ?? '0');

  if (!sectionId || !month || !year) return err('sectionId, month and year are required');

  const tenantId = session.user.tenantId;

  const from = new Date(year, month - 1, 1);
  const to   = new Date(year, month, 0, 23, 59, 59); // last day of month

  const sessions = await db.attendanceSession.findMany({
    where: { tenantId, sectionId, date: { gte: from, lte: to } },
    include: {
      records: {
        include: {
          student: { select: { id: true, name: true, rollNo: true, admissionNo: true } },
        },
      },
    },
    orderBy: { date: 'asc' },
  });

  // Unique working days
  const workingDays = sessions.map(s => s.date.toISOString().split('T')[0]);

  // Holidays in range
  const holidays = await db.holiday.findMany({
    where: { tenantId, date: { gte: from, lte: to } },
    select: { date: true, name: true },
  });
  const holidayDates = new Set(holidays.map(h => h.date.toISOString().split('T')[0]));

  // Build student map: studentId → { name, rollNo, days: { date: status } }
  const studentMap: Record<string, {
    id: string; name: string; rollNo: string | null; admissionNo: string;
    days: Record<string, string>;
    present: number; absent: number; late: number; halfDay: number;
  }> = {};

  for (const s of sessions) {
    const dateKey = s.date.toISOString().split('T')[0];
    for (const r of s.records) {
      if (!studentMap[r.student.id]) {
        studentMap[r.student.id] = {
          id: r.student.id,
          name: r.student.name,
          rollNo: r.student.rollNo,
          admissionNo: r.student.admissionNo,
          days: {},
          present: 0, absent: 0, late: 0, halfDay: 0,
        };
      }
      studentMap[r.student.id].days[dateKey] = r.status;
      if (r.status === 'PRESENT')  studentMap[r.student.id].present  += 1;
      if (r.status === 'ABSENT')   studentMap[r.student.id].absent   += 1;
      if (r.status === 'LATE')     studentMap[r.student.id].late     += 1;
      if (r.status === 'HALF_DAY') studentMap[r.student.id].halfDay  += 1;
    }
  }

  const students = Object.values(studentMap).sort((a, b) =>
    (a.rollNo ?? a.admissionNo).localeCompare(b.rollNo ?? b.admissionNo, undefined, { numeric: true })
  );

  const totalWorkingDays = workingDays.filter(d => !holidayDates.has(d)).length;

  return ok({
    month,
    year,
    sectionId,
    totalWorkingDays,
    workingDays,
    holidays: holidays.map(h => ({ date: h.date.toISOString().split('T')[0], name: h.name })),
    students,
  });
}

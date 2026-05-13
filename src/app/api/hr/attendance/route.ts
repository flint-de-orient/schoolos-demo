import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { StaffAttendanceStatus } from '@prisma/client';

// GET /api/hr/attendance?date=YYYY-MM-DD
// Returns all teachers + staff with attendance status for the date.
// Teachers on approved leave are auto-marked ON_LEAVE.
export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const dateStr = req.nextUrl.searchParams.get('date');
  if (!dateStr) return err('date query param required (YYYY-MM-DD)');

  const date = new Date(dateStr);
  date.setUTCHours(0, 0, 0, 0);

  const tenantId = session.user.tenantId;

  const [teachers, staff, existingRecords, approvedLeaves] = await Promise.all([
    db.teacher.findMany({
      where: { tenantId, isActive: true, deletedAt: null },
      select: { id: true, name: true, designation: true, department: true, type: true },
      orderBy: { name: 'asc' },
    }),
    db.staff.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, name: true, designation: true, department: true },
      orderBy: { name: 'asc' },
    }),
    db.staffAttendance.findMany({
      where: { tenantId, date },
    }),
    db.leaveRequest.findMany({
      where: {
        tenantId,
        status: 'APPROVED',
        fromDate: { lte: date },
        toDate: { gte: date },
      },
      select: { teacherId: true, staffId: true },
    }),
  ]);

  const leaveTeacherIds = new Set(approvedLeaves.map((l) => l.teacherId).filter(Boolean));
  const leaveStaffIds = new Set(approvedLeaves.map((l) => l.staffId).filter(Boolean));

  const recordByTeacher = new Map(existingRecords.filter((r) => r.teacherId).map((r) => [r.teacherId!, r]));
  const recordByStaff = new Map(existingRecords.filter((r) => r.staffId).map((r) => [r.staffId!, r]));

  const teacherRows = teachers.map((t) => {
    const rec = recordByTeacher.get(t.id);
    const onLeave = leaveTeacherIds.has(t.id);
    return {
      id: rec?.id ?? null,
      personId: t.id,
      personType: 'teacher' as const,
      name: t.name,
      designation: t.designation,
      department: t.department,
      teacherType: t.type,
      status: rec?.status ?? (onLeave ? 'ON_LEAVE' : 'PRESENT'),
      checkIn: rec?.checkIn ?? null,
      checkOut: rec?.checkOut ?? null,
      remarks: rec?.remarks ?? null,
      onLeave,
      saved: !!rec,
    };
  });

  const staffRows = staff.map((s) => {
    const rec = recordByStaff.get(s.id);
    const onLeave = leaveStaffIds.has(s.id);
    return {
      id: rec?.id ?? null,
      personId: s.id,
      personType: 'staff' as const,
      name: s.name,
      designation: s.designation,
      department: s.department,
      teacherType: null,
      status: rec?.status ?? (onLeave ? 'ON_LEAVE' : 'PRESENT'),
      checkIn: rec?.checkIn ?? null,
      checkOut: rec?.checkOut ?? null,
      remarks: rec?.remarks ?? null,
      onLeave,
      saved: !!rec,
    };
  });

  return ok({ date: dateStr, rows: [...teacherRows, ...staffRows] });
}

// POST /api/hr/attendance
// Body: { date: 'YYYY-MM-DD', records: [{ personId, personType, status, checkIn?, checkOut?, remarks? }] }
export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { date: dateStr, records } = body;

  if (!dateStr || !Array.isArray(records)) return err('date and records array required');

  const date = new Date(dateStr);
  date.setUTCHours(0, 0, 0, 0);

  const tenantId = session.user.tenantId;

  const ops = records.map((r: {
    personId: string;
    personType: 'teacher' | 'staff';
    status: StaffAttendanceStatus;
    checkIn?: string;
    checkOut?: string;
    remarks?: string;
  }) => {
    const isTeacher = r.personType === 'teacher';
    const where = isTeacher
      ? { teacherId_date: { teacherId: r.personId, date } }
      : { staffId_date: { staffId: r.personId, date } };
    const data = {
      tenantId,
      date,
      status: r.status,
      checkIn: r.checkIn ?? null,
      checkOut: r.checkOut ?? null,
      remarks: r.remarks ?? null,
      ...(isTeacher ? { teacherId: r.personId } : { staffId: r.personId }),
    };
    return db.staffAttendance.upsert({ where, update: data, create: data });
  });

  await Promise.all(ops);

  return ok({ saved: ops.length });
}

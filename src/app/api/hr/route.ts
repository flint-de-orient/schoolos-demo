import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { TeacherType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get('q') ?? '';
  const tenantId = session.user.tenantId;

  // Current academic session: April 1 of current/previous year → March 31 next year
  const now = new Date();
  const sessionYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const sessionStart = new Date(sessionYear, 3, 1);  // April 1
  const sessionEnd   = new Date(sessionYear + 1, 3, 1); // April 1 next year (exclusive)

  const [teachers, staff, approvedLeaves] = await Promise.all([
    db.teacher.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(search && { name: { contains: search, mode: 'insensitive' } }),
      },
      include: {
        subjects: { include: { subject: { select: { name: true } } } },
        leaveRequests: {
          where: { status: 'PENDING' },
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
    db.staff.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(search && { name: { contains: search, mode: 'insensitive' } }),
      },
      orderBy: { name: 'asc' },
    }),
    // Approved leave days for this academic session — for real leave balance
    db.leaveRequest.findMany({
      where: {
        tenantId,
        status: 'APPROVED',
        fromDate: { gte: sessionStart },
        toDate:   { lt:  sessionEnd },
      },
      select: { teacherId: true, staffId: true, days: true },
    }),
  ]);

  // Build approved-days maps
  const teacherDays = new Map<string, number>();
  const staffDays   = new Map<string, number>();
  for (const l of approvedLeaves) {
    if (l.teacherId) teacherDays.set(l.teacherId, (teacherDays.get(l.teacherId) ?? 0) + (l.days ?? 0));
    if (l.staffId)   staffDays.set(l.staffId,     (staffDays.get(l.staffId)     ?? 0) + (l.days ?? 0));
  }

  // Attach approvedLeaveDays so client can compute real balance against policies
  const teachersWithLeave = teachers.map(t => ({
    ...t,
    approvedLeaveDays: teacherDays.get(t.id) ?? 0,
  }));
  const staffWithLeave = staff.map(s => ({
    ...s,
    approvedLeaveDays: staffDays.get(s.id) ?? 0,
  }));

  return ok({ teachers: teachersWithLeave, staff: staffWithLeave });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { name, designation, department, phone, email, qualification, salary, joiningDate, isTeacher, employmentType } = body;

  if (!name || !designation) return err('name and designation are required');

  const tenantId = session.user.tenantId;
  const ts = Date.now().toString().slice(-6);

  if (isTeacher) {
    const teacher = await db.teacher.create({
      data: {
        tenantId,
        employeeCode: `TCH${ts}`,
        name: name.trim(),
        designation: designation.trim(),
        department: department ?? null,
        phone: phone ?? null,
        email: email ?? null,
        qualification: qualification ?? null,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        type: employmentType === 'PART_TIME' ? TeacherType.PART_TIME : TeacherType.FULL_TIME,
        isActive: true,
      },
    });
    return ok(teacher, 201);
  } else {
    const staff = await db.staff.create({
      data: {
        tenantId,
        employeeCode: `STF${ts}`,
        name: name.trim(),
        designation: designation.trim(),
        department: department ?? null,
        phone: phone ?? null,
        email: email ?? null,
        salary: salary ? new Decimal(salary) : null,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        isActive: true,
      },
    });
    return ok(staff, 201);
  }
}

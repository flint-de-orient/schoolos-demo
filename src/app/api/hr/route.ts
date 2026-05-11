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

  const [teachers, staff] = await Promise.all([
    db.teacher.findMany({
      where: {
        tenantId: session.user.tenantId,
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
        tenantId: session.user.tenantId,
        isActive: true,
        ...(search && { name: { contains: search, mode: 'insensitive' } }),
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  return ok({ teachers, staff });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { name, designation, department, phone, email, qualification, salary, joiningDate, isTeacher } = body;

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
        type: TeacherType.FULL_TIME,
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

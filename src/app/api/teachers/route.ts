import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { TeacherType, Gender } from '@prisma/client';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get('q') ?? '';
  const type = searchParams.get('type') as TeacherType | null;
  const subjectId = searchParams.get('subjectId') ?? undefined;
  const available = searchParams.get('available');

  const where = {
    tenantId: session.user.tenantId,
    isActive: true,
    deletedAt: null,
    ...(type && { type }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { employeeCode: { contains: search, mode: 'insensitive' as const } },
        { designation: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
    ...(subjectId && {
      subjects: { some: { subjectId } },
    }),
  };

  const teachers = await db.teacher.findMany({
    where,
    include: {
      subjects: { include: { subject: { select: { id: true, name: true, colorHex: true } } } },
      classTeacherOf: { select: { id: true, name: true, grade: { select: { name: true } } } },
      availabilities: true,
      leaveRequests: {
        where: { status: 'APPROVED', fromDate: { lte: new Date() }, toDate: { gte: new Date() } },
        take: 1,
      },
    },
    orderBy: { name: 'asc' },
  });

  // If ?available=date (YYYY-MM-DD), filter out teachers on leave that day
  if (available) {
    const date = new Date(available);
    const dayOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][date.getDay()];

    const filtered = teachers.filter((t) => {
      const onLeave = t.leaveRequests.length > 0;
      if (onLeave) return false;
      if (t.type === 'FULL_TIME') return true;
      return t.availabilities.some((a) => a.day === dayOfWeek && a.isAvailable);
    });

    return ok({ data: filtered, total: filtered.length });
  }

  return ok({ data: teachers, total: teachers.length });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const {
    employeeCode, name, type, designation, department, qualification,
    phone, email, joiningDate, gender, maxPeriodsDay, maxPeriodsWeek,
    subjects, availabilities,
  } = body;

  if (!employeeCode || !name || !type) {
    return err('employeeCode, name and type are required');
  }

  const existing = await db.teacher.findUnique({
    where: { tenantId_employeeCode: { tenantId: session.user.tenantId, employeeCode } },
  });
  if (existing) return err('Employee code already exists', 409);

  const teacher = await db.teacher.create({
    data: {
      tenantId: session.user.tenantId,
      employeeCode,
      name,
      type: type as TeacherType,
      designation,
      department,
      qualification,
      phone,
      email,
      gender: gender as Gender | undefined,
      joiningDate: joiningDate ? new Date(joiningDate) : undefined,
      maxPeriodsDay: maxPeriodsDay ?? 6,
      maxPeriodsWeek: maxPeriodsWeek ?? 30,
      subjects: subjects
        ? {
            create: subjects.map((s: { subjectId: string; proficiency: string; gradeIds: string[] }) => ({
              subjectId: s.subjectId,
              proficiency: s.proficiency as import('@prisma/client').SubjectProficiency,
              gradeIds: s.gradeIds ?? [],
            })),
          }
        : undefined,
      availabilities: availabilities
        ? {
            create: availabilities.map((a: { day: string; startTime: string; endTime: string }) => ({
              day: a.day as import('@prisma/client').DayOfWeek,
              startTime: a.startTime,
              endTime: a.endTime,
            })),
          }
        : undefined,
    },
    include: { subjects: true, availabilities: true },
  });

  return ok(teacher, 201);
}

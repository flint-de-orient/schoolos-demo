import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { Gender, BloodGroup } from '@prisma/client';
import { autoAssignFeePlan } from '@/lib/fee-auto-assign';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get('q') ?? '';
  const gradeId = searchParams.get('gradeId') ?? undefined;
  const sectionId = searchParams.get('sectionId') ?? undefined;
  const academicYearId = searchParams.get('academicYearId') ?? undefined;
  const includeInactive = searchParams.get('includeInactive') === 'true';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.min(100, Number(searchParams.get('limit') ?? 50));

  // Default to the tenant's current academic year
  let resolvedYearId = academicYearId;
  if (!resolvedYearId) {
    const currentYear = await db.academicYear.findFirst({
      where: { tenantId: session.user.tenantId, isCurrent: true },
      select: { id: true },
    });
    resolvedYearId = currentYear?.id;
  }

  const where = {
    tenantId: session.user.tenantId,
    deletedAt: null,
    ...(includeInactive ? {} : { isActive: true }),
    ...(gradeId && { gradeId }),
    ...(sectionId && { sectionId }),
    ...(resolvedYearId && { grade: { academicYearId: resolvedYearId } }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { admissionNo: { contains: search, mode: 'insensitive' as const } },
        { rollNo: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [total, students] = await Promise.all([
    db.student.count({ where }),
    db.student.findMany({
      where,
      include: {
        grade: { select: { name: true, academicYearId: true } },
        section: { select: { name: true } },
        feeAccount: { select: { status: true, balance: true } },
        parents: {
          include: { parent: { select: { fatherName: true, motherName: true, phone: true } } },
          where: { isPrimary: true },
          take: 1,
        },
      },
      orderBy: [{ grade: { displayOrder: 'asc' } }, { name: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return ok({ data: students, total, page, limit });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const {
    admissionNo, name, dateOfBirth, gender, gradeId, sectionId,
    house, admissionDate, rollNo, address, city, state, pincode,
    religion, category, bloodGroup, aadharNo, previousSchool,
  } = body;

  if (!admissionNo || !name || !gradeId || !sectionId || !admissionDate) {
    return err('admissionNo, name, gradeId, sectionId and admissionDate are required');
  }

  const existing = await db.student.findUnique({
    where: { tenantId_admissionNo: { tenantId: session.user.tenantId, admissionNo } },
  });
  if (existing) return err('Admission number already exists', 409);

  const student = await db.student.create({
    data: {
      tenantId: session.user.tenantId,
      admissionNo,
      name,
      rollNo,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      gender: (gender || undefined) as Gender | undefined,
      bloodGroup: (bloodGroup || undefined) as BloodGroup | undefined,
      gradeId,
      sectionId,
      house,
      admissionDate: new Date(admissionDate),
      address,
      city,
      state,
      pincode,
      religion,
      category,
      aadharNo,
      previousSchool,
    },
    include: {
      grade: { select: { name: true, academicYearId: true } },
      section: { select: { name: true } },
    },
  });

  // Auto-assign fee plan — non-fatal: student is created regardless
  if (student.grade.academicYearId) {
    try {
      await autoAssignFeePlan(
        session.user.tenantId,
        student.id,
        gradeId,
        student.grade.academicYearId,
        session.user.id,
        true,
      );
    } catch (e) {
      console.error('[autoAssignFeePlan] failed for student', student.id, e);
    }
  }

  return ok(student, 201);
}

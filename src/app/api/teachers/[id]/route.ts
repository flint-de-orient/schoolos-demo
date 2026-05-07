import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const teacher = await db.teacher.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, deletedAt: null },
    include: {
      subjects: { include: { subject: true } },
      availabilities: true,
      availabilityOverrides: { where: { date: { gte: new Date() } } },
      classTeacherOf: { include: { grade: true } },
      leaveRequests: { orderBy: { createdAt: 'desc' }, take: 10 },
      appraisals: { orderBy: { createdAt: 'desc' }, take: 3 },
    },
  });

  if (!teacher) return err('Teacher not found', 404);
  return ok(teacher);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const teacher = await db.teacher.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, deletedAt: null },
  });
  if (!teacher) return err('Teacher not found', 404);

  const updated = await db.teacher.update({
    where: { id: params.id },
    data: {
      name: body.name,
      designation: body.designation,
      department: body.department,
      qualification: body.qualification,
      phone: body.phone,
      email: body.email,
      maxPeriodsDay: body.maxPeriodsDay,
      maxPeriodsWeek: body.maxPeriodsWeek,
      isActive: body.isActive,
    },
  });

  return ok(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const teacher = await db.teacher.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, deletedAt: null },
  });
  if (!teacher) return err('Teacher not found', 404);

  await db.teacher.update({
    where: { id: params.id },
    data: { deletedAt: new Date(), isActive: false },
  });

  return ok({ success: true });
}

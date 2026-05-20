import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

type Params = { params: { id: string } };

export async function GET(
  _req: NextRequest,
  { params }: Params
) {
  const { session, error } = await requireSession();
  if (error) return error;

  // Verify exam schedule belongs to tenant
  const schedule = await db.examSchedule.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!schedule) return err('Not found', 404);

  const tickets = await db.hallTicket.findMany({
    where: { examScheduleId: params.id, tenantId: session.user.tenantId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          admissionNo: true,
          rollNo: true,
          grade: { select: { name: true } },
          section: { select: { name: true } },
        },
      },
    },
    orderBy: { rollNo: 'asc' },
  });

  return ok(tickets);
}

export async function POST(
  req: NextRequest,
  { params }: Params
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;

  // Verify exam schedule belongs to tenant
  const schedule = await db.examSchedule.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true },
  });
  if (!schedule) return err('Not found', 404);

  const body = await req.json();
  const { gradeIds, examCentre } = body as {
    gradeIds: string[];
    examCentre?: string;
  };

  if (!Array.isArray(gradeIds) || gradeIds.length === 0) {
    return err('gradeIds array is required');
  }

  // Fetch active students for the given grades
  const students = await db.student.findMany({
    where: {
      tenantId,
      gradeId: { in: gradeIds },
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      rollNo: true,
      admissionNo: true,
    },
    orderBy: { name: 'asc' },
  });

  if (students.length === 0) {
    return ok({ generated: 0 });
  }

  // Upsert a HallTicket for each student
  await Promise.all(
    students.map((student) =>
      db.hallTicket.upsert({
        where: {
          examScheduleId_studentId: {
            examScheduleId: params.id,
            studentId: student.id,
          },
        },
        create: {
          tenantId,
          examScheduleId: params.id,
          studentId: student.id,
          rollNo: student.rollNo ?? student.admissionNo,
          examCentre: examCentre ?? null,
          generatedAt: new Date(),
        },
        update: {
          examCentre: examCentre ?? null,
          generatedAt: new Date(),
        },
      })
    )
  );

  return ok({ generated: students.length });
}

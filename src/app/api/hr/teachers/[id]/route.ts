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
      subjects: {
        include: { subject: { select: { id: true, name: true, code: true, colorHex: true } } },
        orderBy: { proficiency: 'asc' },
      },
      availabilities: { orderBy: [{ day: 'asc' }, { startTime: 'asc' }] },
    },
  });

  if (!teacher) return err('Teacher not found', 404);
  return ok({ teacher });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { maxPeriodsDay, maxPeriodsWeek, type, designation, department, phone, email, qualification } = body;

  const existing = await db.teacher.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return err('Teacher not found', 404);

  const updated = await db.teacher.update({
    where: { id: params.id },
    data: {
      ...(maxPeriodsDay !== undefined && { maxPeriodsDay: Number(maxPeriodsDay) }),
      ...(maxPeriodsWeek !== undefined && { maxPeriodsWeek: Number(maxPeriodsWeek) }),
      ...(type !== undefined && { type }),
      ...(designation !== undefined && { designation }),
      ...(department !== undefined && { department }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(qualification !== undefined && { qualification }),
    },
    select: { id: true, maxPeriodsDay: true, maxPeriodsWeek: true, type: true },
  });

  return ok(updated);
}

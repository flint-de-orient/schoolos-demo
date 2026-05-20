import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

type Params = { params: { id: string } };

const VALID_STATUSES = ['SCHEDULED', 'ONGOING', 'RESULTS_DECLARED'] as const;

export async function GET(
  _req: NextRequest,
  { params }: Params
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const schedule = await db.examSchedule.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: {
      academicYear: { select: { id: true, label: true } },
      items: {
        include: { grade: { select: { id: true, name: true } } },
        orderBy: { examDate: 'asc' },
      },
      _count: { select: { markEntries: true, hallTickets: true } },
    },
  });

  if (!schedule) return err('Not found', 404);

  return ok(schedule);
}

export async function PATCH(
  req: NextRequest,
  { params }: Params
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const existing = await db.examSchedule.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!existing) return err('Not found', 404);

  const body = await req.json();
  const { status } = body;

  if (!VALID_STATUSES.includes(status)) {
    return err(
      `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
    );
  }

  const updated = await db.examSchedule.update({
    where: { id: params.id },
    data: { status },
  });

  return ok(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: Params
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const schedule = await db.examSchedule.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: { _count: { select: { markEntries: true } } },
  });

  if (!schedule) return err('Not found', 404);

  if (schedule._count.markEntries > 0) {
    return err('Cannot delete — mark entries exist', 400);
  }

  await db.examSchedule.delete({ where: { id: params.id } });

  return ok({ success: true });
}

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

// POST /api/timetable/[id]/activate
// Promotes a DRAFT timetable to ACTIVE and archives the current ACTIVE one.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;
  const { id } = params;

  const target = await db.timetable.findFirst({
    where: { id, tenantId },
    select: { id: true, status: true, label: true },
  });

  if (!target) return err('Timetable not found', 404);
  if (target.status === 'ACTIVE') return ok({ message: 'Already active', timetable: target });
  if (target.status === 'ARCHIVED') return err('Cannot activate an archived timetable', 400);

  await db.$transaction([
    // Archive existing active timetable(s)
    db.timetable.updateMany({
      where: { tenantId, status: 'ACTIVE' },
      data: { status: 'ARCHIVED' },
    }),
    // Promote draft to active
    db.timetable.update({
      where: { id },
      data: { status: 'ACTIVE', publishedAt: new Date() },
    }),
  ]);

  return ok({ activated: true, timetableId: id, label: target.label });
}

// DELETE /api/timetable/[id]
// Deletes a timetable and all its entries. Works for DRAFT and ACTIVE.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;
  const { id } = params;

  const target = await db.timetable.findFirst({
    where: { id, tenantId },
    select: { id: true, status: true },
  });

  if (!target) return err('Timetable not found', 404);

  await db.$transaction([
    db.timetableEntry.deleteMany({ where: { timetableId: id } }),
    db.substitution.deleteMany({ where: { timetableId: id } }),
    db.teacherWorkloadSnapshot.deleteMany({ where: { timetableId: id } }),
    db.timetable.delete({ where: { id } }),
  ]);

  return ok({ deleted: true, timetableId: id });
}

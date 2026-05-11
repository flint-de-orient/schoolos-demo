import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { DayOfWeek } from '@prisma/client';

// PUT — replace all availability slots for a given day
// Body: { day: DayOfWeek, slots: { startTime: string, endTime: string }[] }
// Passing slots: [] clears the day (marks fully unavailable)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { day, slots } = body;

  if (!day || !Object.values(DayOfWeek).includes(day)) return err('Valid day is required');
  if (!Array.isArray(slots)) return err('slots must be an array');

  const teacher = await db.teacher.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!teacher) return err('Teacher not found', 404);

  // Delete existing slots for this day then recreate
  await db.teacherAvailability.deleteMany({ where: { teacherId: params.id, day } });

  if (slots.length > 0) {
    await db.teacherAvailability.createMany({
      data: slots.map((s: { startTime: string; endTime: string }) => ({
        teacherId: params.id,
        day,
        startTime: s.startTime,
        endTime: s.endTime,
        isAvailable: true,
      })),
    });
  }

  const updated = await db.teacherAvailability.findMany({
    where: { teacherId: params.id, day },
    orderBy: { startTime: 'asc' },
  });

  return ok(updated);
}

// DELETE — clear all availability (reset to defaults)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const teacher = await db.teacher.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!teacher) return err('Teacher not found', 404);

  await db.teacherAvailability.deleteMany({ where: { teacherId: params.id } });
  return ok({ cleared: true });
}

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { DayOfWeek } from '@prisma/client';

// GET — fetch teachers free at a given subject+day+slot (for copy-period picker)
export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const subjectId     = searchParams.get('subjectId');
  const day           = searchParams.get('day') as DayOfWeek | null;
  const periodSlotId  = searchParams.get('periodSlotId');
  const timetableId   = searchParams.get('timetableId');

  if (!subjectId || !day || !periodSlotId || !timetableId) {
    return err('subjectId, day, periodSlotId, timetableId are required', 400);
  }

  // All teachers who can teach this subject
  const teacherSubjects = await db.teacherSubject.findMany({
    where: { subjectId, teacher: { tenantId: session.user.tenantId } },
    include: { teacher: { select: { id: true, name: true } } },
    orderBy: { proficiency: 'asc' },
  });

  // Teachers already booked at this slot (any section)
  const booked = await db.timetableEntry.findMany({
    where: { timetableId, day, periodSlotId },
    select: { teacherId: true },
  });
  const bookedIds = new Set(booked.map(b => b.teacherId));

  const teachers = teacherSubjects.map(ts => ({
    id: ts.teacher.id,
    name: ts.teacher.name,
    proficiency: ts.proficiency as string,
    free: !bookedIds.has(ts.teacher.id),
  }));

  return ok({ teachers });
}

// POST — copy a subject to a target slot (create or replace)
export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json() as {
    timetableId: string;
    sectionId: string;
    subjectId: string;
    teacherId: string;
    targetDay: DayOfWeek;
    targetPeriodSlotId: string;
  };

  const { timetableId, sectionId, subjectId, teacherId, targetDay, targetPeriodSlotId } = body;
  if (!timetableId || !sectionId || !subjectId || !teacherId || !targetDay || !targetPeriodSlotId) {
    return err('All fields are required', 400);
  }

  // Verify timetable belongs to this tenant
  const timetable = await db.timetable.findFirst({
    where: { id: timetableId, tenantId: session.user.tenantId, status: 'ACTIVE' },
  });
  if (!timetable) return err('Timetable not found or not active', 404);

  // Teacher conflict check: is this teacher already teaching another section at this slot?
  const teacherConflict = await db.timetableEntry.findFirst({
    where: { timetableId, teacherId, day: targetDay, periodSlotId: targetPeriodSlotId, NOT: { sectionId } },
  });
  if (teacherConflict) return err('Teacher is already teaching another section at this slot', 409);

  // Upsert: if entry exists for (section, day, slot) → update; else → create
  const existing = await db.timetableEntry.findFirst({
    where: { timetableId, sectionId, day: targetDay, periodSlotId: targetPeriodSlotId },
  });

  let entry;
  if (existing) {
    entry = await db.timetableEntry.update({
      where: { id: existing.id },
      data: { subjectId, teacherId },
      include: {
        subject: { select: { id: true, name: true, colorHex: true } },
        teacher: { select: { id: true, name: true } },
        periodSlot: { select: { periodNo: true } },
      },
    });
  } else {
    entry = await db.timetableEntry.create({
      data: { timetableId, sectionId, subjectId, teacherId, day: targetDay, periodSlotId: targetPeriodSlotId, roomNumber: null },
      include: {
        subject: { select: { id: true, name: true, colorHex: true } },
        teacher: { select: { id: true, name: true } },
        periodSlot: { select: { periodNo: true } },
      },
    });
  }

  return ok({ entry, replaced: !!existing }, existing ? 200 : 201);
}

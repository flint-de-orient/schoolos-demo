import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { DayOfWeek } from '@prisma/client';

// GET — fetch teachers free at a given subject+day+slot (for copy/place picker)
export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const subjectId    = searchParams.get('subjectId');
  const day          = searchParams.get('day') as DayOfWeek | null;
  const periodSlotId = searchParams.get('periodSlotId');
  const timetableId  = searchParams.get('timetableId');
  const sectionId    = searchParams.get('sectionId'); // optional — used to resolve curriculum

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

  // Resolve maxPerDay for this subject in the section's grade (for display hint)
  let maxPerDay = 1;
  if (sectionId) {
    const section = await db.section.findFirst({ where: { id: sectionId }, select: { gradeId: true } });
    if (section) {
      const gs = await db.gradeSubject.findFirst({
        where: { gradeId: section.gradeId, subjectId, sessionType: 'THEORY' },
        select: { maxPerDay: true },
      });
      maxPerDay = gs?.maxPerDay ?? 1;
    }
  }

  const teachers = teacherSubjects.map(ts => ({
    id: ts.teacher.id,
    name: ts.teacher.name,
    proficiency: ts.proficiency as string,
    free: !bookedIds.has(ts.teacher.id),
  }));

  return ok({ teachers, maxPerDay });
}

// POST — place a subject into a target slot (create or replace); teacher conflict checked
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
    skipDayDupeCheck?: boolean; // when caller explicitly allows multiples
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

  // Resolve the section's gradeId to look up maxPerDay
  const section = await db.section.findFirst({ where: { id: sectionId }, select: { gradeId: true } });
  const gradeId = section?.gradeId;

  const [teacherConflict, existing, gradeSubject] = await Promise.all([
    // Teacher already teaching another section at this slot?
    db.timetableEntry.findFirst({
      where: { timetableId, teacherId, day: targetDay, periodSlotId: targetPeriodSlotId, NOT: { sectionId } },
    }),
    // Existing entry at this exact slot for this section?
    db.timetableEntry.findFirst({
      where: { timetableId, sectionId, day: targetDay, periodSlotId: targetPeriodSlotId },
    }),
    // maxPerDay for this subject
    gradeId ? db.gradeSubject.findFirst({
      where: { gradeId, subjectId, sessionType: 'THEORY' },
      select: { maxPerDay: true },
    }) : Promise.resolve(null),
  ]);

  if (teacherConflict) return err('Teacher is already teaching another section at this slot', 409);

  const maxPerDay = gradeSubject?.maxPerDay ?? 1;
  if (!body.skipDayDupeCheck && maxPerDay > 0) {
    // Count how many times this subject already appears on targetDay for this section
    // Exclude the slot being replaced (existing entry) — it's an overwrite, not an addition
    const sameDayCount = await db.timetableEntry.count({
      where: {
        timetableId,
        sectionId,
        subjectId,
        day: targetDay,
        ...(existing ? { NOT: { id: existing.id } } : {}),
      },
    });
    if (sameDayCount >= maxPerDay) {
      return err(
        `This subject already appears ${sameDayCount} time${sameDayCount > 1 ? 's' : ''} on ${targetDay} ` +
        `(max per day: ${maxPerDay}). Increase max per day in Class Subjects settings to allow more.`,
        409
      );
    }
  }

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

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { DayOfWeek } from '@prisma/client';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const teacherId = searchParams.get('teacherId');
  const dateStr = searchParams.get('date');

  if (!teacherId || !dateStr) return err('teacherId and date are required');

  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  const dayOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][date.getDay()] as DayOfWeek;

  // Get all periods assigned to the absent teacher on this day
  const activeTimetable = await db.timetable.findFirst({
    where: { tenantId: session.user.tenantId, status: 'ACTIVE' },
  });
  if (!activeTimetable) return ok({ affectedPeriods: [], suggestions: [] });

  const affectedEntries = await db.timetableEntry.findMany({
    where: { timetableId: activeTimetable.id, teacherId, day: dayOfWeek },
    include: {
      subject: { select: { id: true, name: true } },
      section: { include: { grade: { select: { name: true } } } },
      periodSlot: true,
    },
    orderBy: { periodSlot: { periodNo: 'asc' } },
  });

  // For each affected period, find available substitute teachers
  const suggestions = await Promise.all(
    affectedEntries.map(async (entry) => {
      // Find teachers who:
      // 1. Teach this subject (primary preferred)
      // 2. Are not assigned during this period
      // 3. Are not on leave today
      const teachersWithSubject = await db.teacher.findMany({
        where: {
          tenantId: session.user.tenantId,
          isActive: true,
          deletedAt: null,
          id: { not: teacherId },
          subjects: { some: { subjectId: entry.subjectId } },
        },
        include: {
          subjects: { where: { subjectId: entry.subjectId } },
          availabilities: { where: { day: dayOfWeek, isAvailable: true } },
          leaveRequests: {
            where: {
              status: 'APPROVED',
              fromDate: { lte: date },
              toDate: { gte: date },
            },
            take: 1,
          },
        },
      });

      // Filter out busy teachers (assigned in the same period)
      const busyTeacherIds = await db.timetableEntry.findMany({
        where: {
          timetableId: activeTimetable.id,
          day: dayOfWeek,
          periodSlotId: entry.periodSlotId,
        },
        select: { teacherId: true },
      });
      const busySet = new Set(busyTeacherIds.map((b) => b.teacherId));

      const available = teachersWithSubject.filter(
        (t) =>
          !busySet.has(t.id) &&
          t.leaveRequests.length === 0 &&
          (t.type !== 'PART_TIME' || t.availabilities.length > 0)
      );

      // Score: PRIMARY proficiency > SECONDARY > SUBSTITUTE
      const profOrder: Record<string, number> = { PRIMARY: 3, SECONDARY: 2, SUBSTITUTE: 1 };
      available.sort((a, b) => {
        const aProf = a.subjects[0]?.proficiency ?? 'SUBSTITUTE';
        const bProf = b.subjects[0]?.proficiency ?? 'SUBSTITUTE';
        return (profOrder[bProf] ?? 0) - (profOrder[aProf] ?? 0);
      });

      return {
        periodNo: entry.periodSlot.periodNo,
        startTime: entry.periodSlot.startTime,
        endTime: entry.periodSlot.endTime,
        subject: entry.subject,
        section: `${entry.section.grade.name}-${entry.section.name}`,
        sectionId: entry.sectionId,
        timetableEntryId: entry.id,
        candidates: available.slice(0, 5).map((t) => ({
          id: t.id,
          name: t.name,
          proficiency: t.subjects[0]?.proficiency ?? 'SUBSTITUTE',
        })),
      };
    })
  );

  return ok({ affectedPeriods: affectedEntries.length, suggestions });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { substituteTeacherId, originalTeacherId, timetableEntryId, date, reason } = body;

  if (!substituteTeacherId || !originalTeacherId || !timetableEntryId || !date) {
    return err('substituteTeacherId, originalTeacherId, timetableEntryId and date are required');
  }

  const entry = await db.timetableEntry.findFirst({
    where: { id: timetableEntryId, timetable: { tenantId: session.user.tenantId } },
  });
  if (!entry) return err('Timetable entry not found', 404);

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const sub = await db.substitution.create({
    data: {
      timetableId: entry.timetableId,
      timetableEntryId,
      date: targetDate,
      day: entry.day,
      sectionId: entry.sectionId,
      subjectId: entry.subjectId,
      originalTeacherId,
      substituteTeacherId,
      periodSlotId: entry.periodSlotId,
      reason,
      status: 'ASSIGNED',
    },
  });

  return ok(sub, 201);
}

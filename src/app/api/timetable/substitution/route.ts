import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { DayOfWeek } from '@prisma/client';

// GET /api/timetable/substitution?teacherId=X&date=YYYY-MM-DD
// Also supports ?date=YYYY-MM-DD without teacherId — returns all absent teachers from attendance+leave
export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const teacherIdParam = searchParams.get('teacherId');
  const dateStr = searchParams.get('date');

  if (!dateStr) return err('date is required');

  const date = new Date(dateStr);
  date.setUTCHours(0, 0, 0, 0);
  const dayOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][date.getDay()] as DayOfWeek;

  const tenantId = session.user.tenantId;

  // Gather absent teacher IDs from StaffAttendance (ABSENT / HALF_DAY) + approved leaves
  const [absentAttendance, approvedLeaves] = await Promise.all([
    db.staffAttendance.findMany({
      where: { tenantId, date, status: { in: ['ABSENT', 'HALF_DAY'] }, teacherId: { not: null } },
      select: { teacherId: true },
    }),
    db.leaveRequest.findMany({
      where: { tenantId, status: 'APPROVED', fromDate: { lte: date }, toDate: { gte: date }, teacherId: { not: null } },
      select: { teacherId: true },
    }),
  ]);

  const absentTeacherIds = new Set([
    ...absentAttendance.map((a) => a.teacherId!),
    ...approvedLeaves.map((l) => l.teacherId!),
  ]);

  // If no specific teacher, return the list of absent teachers
  if (!teacherIdParam) {
    const absentTeachers = absentTeacherIds.size > 0
      ? await db.teacher.findMany({
          where: { id: { in: [...absentTeacherIds] }, tenantId },
          select: { id: true, name: true, designation: true },
        })
      : [];
    return ok({ absentTeachers, date: dateStr });
  }

  const teacherId = teacherIdParam;

  const activeTimetable = await db.timetable.findFirst({
    where: { tenantId, status: 'ACTIVE' },
  });
  if (!activeTimetable) return ok({ affectedPeriods: 0, suggestions: [] });

  const affectedEntries = await db.timetableEntry.findMany({
    where: { timetableId: activeTimetable.id, teacherId, day: dayOfWeek },
    include: {
      subject: { select: { id: true, name: true } },
      section: { include: { grade: { select: { name: true } } } },
      periodSlot: true,
    },
    orderBy: { periodSlot: { periodNo: 'asc' } },
  });

  // Count substitutions already assigned today per candidate (for maxPeriodsDay check)
  const todaySubCounts = await db.substitution.groupBy({
    by: ['substituteTeacherId'],
    where: { date, timetable: { tenantId } },
    _count: { _all: true },
  });
  const subCountMap = new Map(todaySubCounts.map((r) => [r.substituteTeacherId, r._count._all]));

  const suggestions = await Promise.all(
    affectedEntries.map(async (entry) => {
      const teachersWithSubject = await db.teacher.findMany({
        where: {
          tenantId,
          isActive: true,
          deletedAt: null,
          id: { not: teacherId },
          subjects: { some: { subjectId: entry.subjectId } },
        },
        include: {
          subjects: { where: { subjectId: entry.subjectId } },
          // Part-time availability: slot must cover this period's time on this day
          availabilities: {
            where: {
              day: dayOfWeek,
              isAvailable: true,
              startTime: { lte: entry.periodSlot.startTime },
              endTime: { gte: entry.periodSlot.endTime },
            },
          },
        },
      });

      const [busyTeacherIds, periodsScheduledToday] = await Promise.all([
        db.timetableEntry.findMany({
          where: { timetableId: activeTimetable.id, day: dayOfWeek, periodSlotId: entry.periodSlotId },
          select: { teacherId: true },
        }),
        db.timetableEntry.groupBy({
          by: ['teacherId'],
          where: { timetableId: activeTimetable.id, day: dayOfWeek },
          _count: { _all: true },
        }),
      ]);

      const busySet = new Set(busyTeacherIds.map((b) => b.teacherId));
      const scheduledCountMap = new Map(periodsScheduledToday.map((r) => [r.teacherId, r._count._all]));

      const available = teachersWithSubject.filter((t) => {
        if (busySet.has(t.id)) return false;
        // Absent/on-leave candidates should not be suggested
        if (absentTeacherIds.has(t.id)) return false;
        // Part-time: must have matching availability window
        if (t.type === 'PART_TIME' && t.availabilities.length === 0) return false;
        // Workload cap: scheduled periods + already-assigned subs today < maxPeriodsDay
        const scheduled = scheduledCountMap.get(t.id) ?? 0;
        const subs = subCountMap.get(t.id) ?? 0;
        if (t.maxPeriodsDay && scheduled + subs >= t.maxPeriodsDay) return false;
        return true;
      });

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
          type: t.type,
        })),
      };
    })
  );

  return ok({ affectedPeriods: affectedEntries.length, suggestions, isAbsent: absentTeacherIds.has(teacherId) });
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
  targetDate.setUTCHours(0, 0, 0, 0);

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

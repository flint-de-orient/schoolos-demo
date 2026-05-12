import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function POST(_req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;

  const activeTimetable = await db.timetable.findFirst({
    where: { tenantId, status: 'ACTIVE' },
    select: { id: true },
    orderBy: { publishedAt: 'desc' },
  });

  if (!activeTimetable) return err('No active timetable found', 404);

  // Load all teachers with their qualified subjects
  const teachers = await db.teacher.findMany({
    where: { tenantId, isActive: true },
    select: {
      id: true,
      name: true,
      maxPeriodsWeek: true,
      maxPeriodsDay: true,
      subjects: { select: { subjectId: true } },
    },
  });

  // Load all timetable entries for the active timetable
  const allEntries = await db.timetableEntry.findMany({
    where: { timetableId: activeTimetable.id },
    select: { id: true, teacherId: true, subjectId: true, day: true, periodSlotId: true, sectionId: true },
  });

  // Build period counts per teacher
  const periodCount: Record<string, number> = {};
  const dailyCount: Record<string, Record<string, number>> = {}; // teacherId -> day -> count
  for (const e of allEntries) {
    periodCount[e.teacherId] = (periodCount[e.teacherId] ?? 0) + 1;
    if (!dailyCount[e.teacherId]) dailyCount[e.teacherId] = {};
    dailyCount[e.teacherId][e.day] = (dailyCount[e.teacherId][e.day] ?? 0) + 1;
  }

  // Build subject qualification map: subjectId -> teacherIds
  const subjectTeachers: Record<string, Set<string>> = {};
  for (const t of teachers) {
    for (const s of t.subjects) {
      if (!subjectTeachers[s.subjectId]) subjectTeachers[s.subjectId] = new Set();
      subjectTeachers[s.subjectId].add(t.id);
    }
  }

  const teacherMap = Object.fromEntries(teachers.map(t => [t.id, t]));

  // Identify overloaded teachers (current > max)
  const overloaded = teachers
    .filter(t => (periodCount[t.id] ?? 0) > t.maxPeriodsWeek)
    .sort((a, b) => (periodCount[b.id] ?? 0) - b.maxPeriodsWeek - ((periodCount[a.id] ?? 0) - a.maxPeriodsWeek));

  if (overloaded.length === 0) {
    return ok({ adjusted: 0, changes: [], message: 'All teachers are within their workload limits — no rebalancing needed.' });
  }

  // Entries already assigned to a specific teacher+day+periodSlot (for conflict detection)
  const assignedSlots = new Set(allEntries.map(e => `${e.teacherId}:${e.day}:${e.periodSlotId}`));

  const changes: { entryId: string; from: string; to: string; subjectId: string }[] = [];
  const mutableCount = { ...periodCount };
  const mutableDaily = JSON.parse(JSON.stringify(dailyCount)) as Record<string, Record<string, number>>;

  for (const overTeacher of overloaded) {
    // Entries assigned to this overloaded teacher, sorted so we move the most moveable first
    const myEntries = allEntries.filter(e => e.teacherId === overTeacher.id && !changes.find(c => c.entryId === e.id));

    for (const entry of myEntries) {
      if ((mutableCount[overTeacher.id] ?? 0) <= overTeacher.maxPeriodsWeek) break;

      // Find a qualified substitute who has capacity and no conflict on this slot
      const qualified = [...(subjectTeachers[entry.subjectId] ?? [])].filter(tid => {
        if (tid === overTeacher.id) return false;
        const t = teacherMap[tid];
        if (!t) return false;
        // Must have weekly capacity
        if ((mutableCount[tid] ?? 0) >= t.maxPeriodsWeek) return false;
        // Must have daily capacity
        const dayLoad = mutableDaily[tid]?.[entry.day] ?? 0;
        if (dayLoad >= t.maxPeriodsDay) return false;
        // Must not already be in this slot
        if (assignedSlots.has(`${tid}:${entry.day}:${entry.periodSlotId}`)) return false;
        return true;
      });

      if (qualified.length === 0) continue;

      // Pick the most underloaded qualified teacher
      const best = qualified.sort((a, b) => {
        const aSlack = teacherMap[a].maxPeriodsWeek - (mutableCount[a] ?? 0);
        const bSlack = teacherMap[b].maxPeriodsWeek - (mutableCount[b] ?? 0);
        return bSlack - aSlack;
      })[0];

      changes.push({ entryId: entry.id, from: overTeacher.id, to: best, subjectId: entry.subjectId });

      // Update mutable counters
      mutableCount[overTeacher.id] = (mutableCount[overTeacher.id] ?? 0) - 1;
      mutableCount[best] = (mutableCount[best] ?? 0) + 1;
      if (!mutableDaily[best]) mutableDaily[best] = {};
      mutableDaily[best][entry.day] = (mutableDaily[best][entry.day] ?? 0) + 1;
      mutableDaily[overTeacher.id][entry.day] = Math.max(0, (mutableDaily[overTeacher.id]?.[entry.day] ?? 1) - 1);

      // Mark the new slot as taken, free the old one
      assignedSlots.delete(`${overTeacher.id}:${entry.day}:${entry.periodSlotId}`);
      assignedSlots.add(`${best}:${entry.day}:${entry.periodSlotId}`);
    }
  }

  if (changes.length === 0) {
    return ok({ adjusted: 0, changes: [], message: 'Overloaded teachers found but no qualified substitutes available for reassignment.' });
  }

  // Persist all reassignments in a transaction
  await db.$transaction(
    changes.map(c =>
      db.timetableEntry.update({
        where: { id: c.entryId },
        data: { teacherId: c.to },
      })
    )
  );

  // Build human-readable change summary
  const teacherNames = Object.fromEntries(teachers.map(t => [t.id, t.name]));
  const affectedTeachers = new Set([...changes.map(c => c.from), ...changes.map(c => c.to)]);

  const summary = changes.map(c => ({
    from: teacherNames[c.from] ?? c.from,
    to: teacherNames[c.to] ?? c.to,
  }));

  return ok({
    adjusted: affectedTeachers.size,
    periodsReassigned: changes.length,
    changes: summary,
    message: `Rebalanced ${changes.length} period${changes.length !== 1 ? 's' : ''} across ${affectedTeachers.size} teacher${affectedTeachers.size !== 1 ? 's' : ''}.`,
  });
}

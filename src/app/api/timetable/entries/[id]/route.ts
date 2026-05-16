import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { DayOfWeek } from '@prisma/client';

// PATCH /api/timetable/entries/[id]
// Moves an entry to a new (day, periodSlotId), swapping with whatever is already there.
// Runs full conflict checks server-side before committing.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;
  const entryId  = params.id;

  const body = await req.json() as { targetDay: DayOfWeek; targetPeriodSlotId: string };
  const { targetDay, targetPeriodSlotId } = body;

  if (!targetDay || !targetPeriodSlotId) {
    return err('targetDay and targetPeriodSlotId are required', 400);
  }

  // Load the source entry with its timetable
  const entryA = await db.timetableEntry.findFirst({
    where: {
      id: entryId,
      timetable: { tenantId, status: 'ACTIVE' },
    },
    include: { timetable: true },
  });
  if (!entryA) return err('Entry not found or timetable is not active', 404);

  // No-op if already in the target position
  if (entryA.day === targetDay && entryA.periodSlotId === targetPeriodSlotId) {
    return ok({ swapped: false, message: 'No change needed' });
  }

  const timetableId = entryA.timetableId;
  const sourceDay   = entryA.day as DayOfWeek;
  const sourcePSId  = entryA.periodSlotId;

  // Find entry at the target position (same section — could be empty)
  const entryB = await db.timetableEntry.findFirst({
    where: { timetableId, sectionId: entryA.sectionId, day: targetDay, periodSlotId: targetPeriodSlotId },
  });

  // ── Resolve maxPerDay for both subjects ─────────────────────────────────────
  const sectionRow = await db.section.findFirst({ where: { id: entryA.sectionId }, select: { gradeId: true } });
  const gradeId = sectionRow?.gradeId;

  async function getMaxPerDay(subjectId: string): Promise<number> {
    if (!gradeId) return 1;
    const gs = await db.gradeSubject.findFirst({
      where: { gradeId, subjectId, sessionType: 'THEORY' },
      select: { maxPerDay: true },
    });
    return gs?.maxPerDay ?? 1;
  }

  // ── Conflict checks ─────────────────────────────────────────────────────────

  // 1. Teacher of A at target slot (other sections, excluding B's slot if swapping)
  const teacherAConflict = await db.timetableEntry.findFirst({
    where: {
      timetableId,
      teacherId: entryA.teacherId,
      day: targetDay,
      periodSlotId: targetPeriodSlotId,
      NOT: { sectionId: entryA.sectionId },
    },
  });
  if (teacherAConflict) {
    return err(`Teacher conflict: teacher already has a class at that slot in another section`, 409);
  }

  // 2. Subject A on targetDay — count existing entries excluding both A and B (they'll swap/move)
  const maxA = await getMaxPerDay(entryA.subjectId);
  if (maxA > 0) {
    const subjectADayCount = await db.timetableEntry.count({
      where: {
        timetableId,
        sectionId: entryA.sectionId,
        subjectId: entryA.subjectId,
        day: targetDay,
        NOT: { id: { in: [entryId, ...(entryB ? [entryB.id] : [])] } },
      },
    });
    if (subjectADayCount >= maxA) {
      return err(`Subject already appears ${subjectADayCount}× on ${targetDay} (max per day: ${maxA})`, 409);
    }
  }

  if (entryB) {
    // 3. Teacher of B at source slot (other sections)
    const teacherBConflict = await db.timetableEntry.findFirst({
      where: {
        timetableId,
        teacherId: entryB.teacherId,
        day: sourceDay,
        periodSlotId: sourcePSId,
        NOT: { sectionId: entryA.sectionId },
      },
    });
    if (teacherBConflict) {
      return err(`Swap conflict: teacher already has a class at the source slot in another section`, 409);
    }

    // 4. Subject B on sourceDay — count excluding both entries
    const maxB = await getMaxPerDay(entryB.subjectId);
    if (maxB > 0) {
      const subjectBDayCount = await db.timetableEntry.count({
        where: {
          timetableId,
          sectionId: entryB.sectionId,
          subjectId: entryB.subjectId,
          day: sourceDay,
          NOT: { id: { in: [entryB.id, entryId] } },
        },
      });
      if (subjectBDayCount >= maxB) {
        return err(`Swap conflict: subject already appears ${subjectBDayCount}× on ${sourceDay} (max per day: ${maxB})`, 409);
      }
    }
  }

  // ── Commit swap / move ──────────────────────────────────────────────────────
  await db.$transaction(async tx => {
    if (entryB) {
      // Swap: move A to target, move B to source
      // Use intermediate dummy to avoid unique constraint collision during swap
      await tx.timetableEntry.update({
        where: { id: entryId },
        data: { day: targetDay, periodSlotId: targetPeriodSlotId },
      });
      await tx.timetableEntry.update({
        where: { id: entryB.id },
        data: { day: sourceDay, periodSlotId: sourcePSId },
      });
    } else {
      // Simple move — target slot is empty
      await tx.timetableEntry.update({
        where: { id: entryId },
        data: { day: targetDay, periodSlotId: targetPeriodSlotId },
      });
    }
  });

  return ok({ swapped: !!entryB, entryAId: entryId, entryBId: entryB?.id ?? null });
}

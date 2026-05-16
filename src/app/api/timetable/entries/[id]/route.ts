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

  // ── Conflict checks ─────────────────────────────────────────────────────────

  // 1. Teacher of A at target slot (other sections, excluding B's slot if swapping)
  const teacherAConflict = await db.timetableEntry.findFirst({
    where: {
      timetableId,
      teacherId: entryA.teacherId,
      day: targetDay,
      periodSlotId: targetPeriodSlotId,
      NOT: { sectionId: entryA.sectionId }, // same-section conflict is the existing entryB, handled by swap
    },
  });
  if (teacherAConflict) {
    return err(`Teacher conflict: teacher already has a class at that slot in another section`, 409);
  }

  // 2. Subject A already taught to this section on targetDay (other than its current slot and entryB's slot)
  const subjectADayConflict = await db.timetableEntry.findFirst({
    where: {
      timetableId,
      sectionId: entryA.sectionId,
      subjectId: entryA.subjectId,
      day: targetDay,
      NOT: { id: { in: [entryId, ...(entryB ? [entryB.id] : [])] } },
    },
  });
  if (subjectADayConflict) {
    return err(`Subject already appears on ${targetDay} for this section`, 409);
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
      return err(`Swap conflict: ${entryB.teacherId}'s teacher already has a class at the source slot in another section`, 409);
    }

    // 4. Subject B already taught on sourceDay (other than its current position and entry A)
    const subjectBDayConflict = await db.timetableEntry.findFirst({
      where: {
        timetableId,
        sectionId: entryB.sectionId,
        subjectId: entryB.subjectId,
        day: sourceDay,
        NOT: { id: { in: [entryB.id, entryId] } },
      },
    });
    if (subjectBDayConflict) {
      return err(`Swap conflict: subject already appears on ${sourceDay} for this section`, 409);
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

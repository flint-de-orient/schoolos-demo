import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;
  const group = await db.gradeGroup.findFirst({ where: { id: params.id, tenantId } });
  if (!group) return err('Grade group not found', 404);

  const body = await req.json() as {
    name?: string;
    displayOrder?: number;
    periodsPerDay?: number;
    periodDuration?: number;
    shortBreakEnabled?: boolean;
    shortBreakAfterPeriod?: number | null;
    shortBreakDuration?: number;
    mainBreakAfterPeriod?: number;
    mainBreakDuration?: number;
    fillerType?: string;
    gradeIds?: string[];      // full replacement list of grades for this group
    applyToAll?: string[];    // field names to copy to all other groups
  };

  // Build update payload
  const data: Parameters<typeof db.gradeGroup.update>[0]['data'] = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.displayOrder !== undefined) data.displayOrder = body.displayOrder;
  if (body.periodsPerDay !== undefined) data.periodsPerDay = body.periodsPerDay;
  if (body.periodDuration !== undefined) data.periodDuration = body.periodDuration;
  if (body.shortBreakEnabled !== undefined) data.shortBreakEnabled = body.shortBreakEnabled;
  if (body.shortBreakAfterPeriod !== undefined) data.shortBreakAfterPeriod = body.shortBreakAfterPeriod;
  if (body.shortBreakDuration !== undefined) data.shortBreakDuration = body.shortBreakDuration;
  if (body.mainBreakAfterPeriod !== undefined) data.mainBreakAfterPeriod = body.mainBreakAfterPeriod;
  if (body.mainBreakDuration !== undefined) data.mainBreakDuration = body.mainBreakDuration;
  if (body.fillerType !== undefined) data.fillerType = body.fillerType as import('@prisma/client').FillerType;

  await db.gradeGroup.update({ where: { id: params.id }, data });

  // Update grade assignments if provided
  if (body.gradeIds !== undefined) {
    // Remove this group from all currently assigned grades
    await db.grade.updateMany({ where: { gradeGroupId: params.id, tenantId }, data: { gradeGroupId: null } });
    // Assign new grades
    if (body.gradeIds.length > 0) {
      await db.grade.updateMany({ where: { id: { in: body.gradeIds }, tenantId }, data: { gradeGroupId: params.id } });
    }
  }

  // "Apply to All" — copy specified fields to all other groups in tenant
  if (body.applyToAll && body.applyToAll.length > 0) {
    const allFieldData: Parameters<typeof db.gradeGroup.update>[0]['data'] = {};
    const allowedApplyFields = [
      'periodDuration', 'shortBreakEnabled', 'shortBreakAfterPeriod',
      'shortBreakDuration', 'mainBreakAfterPeriod', 'mainBreakDuration', 'fillerType',
    ] as const;
    for (const field of body.applyToAll) {
      if (allowedApplyFields.includes(field as typeof allowedApplyFields[number]) && field in data) {
        (allFieldData as Record<string, unknown>)[field] = (data as Record<string, unknown>)[field];
      }
    }
    if (Object.keys(allFieldData).length > 0) {
      await db.gradeGroup.updateMany({
        where: { tenantId, id: { not: params.id } },
        data: allFieldData,
      });
    }
  }

  const updated = await db.gradeGroup.findUnique({
    where: { id: params.id },
    include: { grades: { select: { id: true, name: true, displayOrder: true } } },
  });

  return ok({ group: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;
  const group = await db.gradeGroup.findFirst({ where: { id: params.id, tenantId } });
  if (!group) return err('Grade group not found', 404);

  // Unassign all grades from this group
  await db.grade.updateMany({ where: { gradeGroupId: params.id, tenantId }, data: { gradeGroupId: null } });

  // Delete period slots belonging to this group
  const slots = await db.periodSlot.findMany({ where: { gradeGroupId: params.id }, select: { id: true } });
  const slotIds = slots.map(s => s.id);
  if (slotIds.length > 0) {
    await db.timetableEntry.deleteMany({ where: { periodSlotId: { in: slotIds } } });
    await db.periodSlot.deleteMany({ where: { gradeGroupId: params.id } });
  }

  await db.gradeGroup.delete({ where: { id: params.id } });

  return ok({ deleted: true });
}

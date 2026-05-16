import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;
  const { searchParams } = req.nextUrl;
  const gradeGroupId = searchParams.get('gradeGroupId');
  const sectionId    = searchParams.get('sectionId');

  const config = await db.timetableConfig.findFirst({ where: { tenantId } });
  if (!config) return err('No timetable configuration found.', 404);

  let resolvedGroupId = gradeGroupId;

  // If sectionId provided, resolve grade → gradeGroup
  if (!resolvedGroupId && sectionId) {
    const section = await db.section.findFirst({
      where: { id: sectionId },
      include: { grade: { select: { gradeGroupId: true } } },
    });
    resolvedGroupId = section?.grade.gradeGroupId ?? null;
  }

  if (resolvedGroupId) {
    const group = await db.gradeGroup.findFirst({
      where: { id: resolvedGroupId, tenantId },
    });
    if (!group) return err('Grade group not found', 404);

    const [periodSlots, activityTypes] = await Promise.all([
      db.periodSlot.findMany({ where: { gradeGroupId: resolvedGroupId }, orderBy: { periodNo: 'asc' } }),
      group.fillerActivityIds.length > 0
        ? db.activityType.findMany({ where: { id: { in: group.fillerActivityIds } }, select: { id: true, name: true, colorHex: true } })
        : Promise.resolve([]),
    ]);

    // Return activity names in the order the group selected them (for rotation)
    const activityMap = Object.fromEntries(activityTypes.map(a => [a.id, a.name]));
    const LEGACY: Record<string, string> = {
      STUDY_PERIOD: 'Study Period', REVISION: 'Revision',
      SPORTS: 'Sports', REPEAT_COMPULSORY: 'Revision', LEAVE_EMPTY: '',
    };
    const fillerLabels = group.fillerActivityIds.length > 0
      ? group.fillerActivityIds.map((id: string) => activityMap[id]).filter(Boolean)
      : (group.fillerTypes as string[]).map(ft => LEGACY[ft] ?? '').filter(Boolean);

    return ok({ config, group: { ...group, fillerLabels }, periodSlots });
  }

  // No group context — return config only (no slots yet)
  return ok({ config, group: null, periodSlots: [] });
}

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const sectionId = searchParams.get('sectionId') ?? undefined;
  const teacherId = searchParams.get('teacherId') ?? undefined;
  const draft     = searchParams.get('draft') === 'true';

  // Get the active (or draft-preview) timetable for this tenant
  const timetable = await db.timetable.findFirst({
    where: { tenantId: session.user.tenantId, status: draft ? 'DRAFT' : 'ACTIVE' },
    include: {
      entries: {
        where: {
          ...(sectionId && { sectionId }),
          ...(teacherId && { teacherId }),
        },
        include: {
          subject: { select: { id: true, name: true, colorHex: true, partLabel: true, isSubPart: true } },
          teacher: { select: { id: true, name: true } },
          section: { include: { grade: { select: { name: true, gradeGroupId: true, gradeGroup: { select: { id: true, name: true, fillerTypes: true, fillerActivityIds: true, mainBreakAfterPeriod: true, shortBreakEnabled: true, shortBreakAfterPeriod: true } } } } } },
          periodSlot: true,
        },
        orderBy: [{ day: 'asc' }, { periodSlot: { periodNo: 'asc' } }],
      },
      academicYear: { select: { label: true } },
    },
    orderBy: { publishedAt: 'desc' },
  });

  if (!timetable) return ok({ timetable: null });

  // Resolve fillerActivityIds → names so client never needs a second fetch
  const allActivityIds = [...new Set(
    timetable.entries.flatMap(e => e.section.grade.gradeGroup?.fillerActivityIds ?? [])
  )];
  const activityTypes = allActivityIds.length > 0
    ? await db.activityType.findMany({ where: { id: { in: allActivityIds } }, select: { id: true, name: true, colorHex: true } })
    : [];
  const activityMap = Object.fromEntries(activityTypes.map(a => [a.id, a]));

  // Also fetch today's substitutions
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const substitutions = await db.substitution.findMany({
    where: { timetableId: timetable.id, date: today },
    include: {
      originalTeacher: { select: { id: true, name: true } },
      substituteTeacher: { select: { id: true, name: true } },
    },
  });

  // Also surface any pending DRAFT so the UI can show a banner
  const pendingDraft = await db.timetable.findFirst({
    where: { tenantId: session.user.tenantId, status: 'DRAFT' },
    select: { id: true, label: true, generatedAt: true, qualityScore: true, conflictCount: true },
    orderBy: { createdAt: 'desc' },
  });

  return ok({ timetable, substitutions, activityMap, pendingDraft: pendingDraft ?? null });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { academicYearId, label, entries } = body;

  if (!academicYearId || !label || !Array.isArray(entries)) {
    return err('academicYearId, label and entries array are required');
  }

  // Archive current active timetable
  await db.timetable.updateMany({
    where: { tenantId: session.user.tenantId, status: 'ACTIVE' },
    data: { status: 'ARCHIVED' },
  });

  const timetable = await db.timetable.create({
    data: {
      tenantId: session.user.tenantId,
      academicYearId,
      label,
      status: 'ACTIVE',
      publishedAt: new Date(),
      entries: {
        create: entries.map((e: {
          sectionId: string;
          subjectId: string;
          teacherId: string;
          periodSlotId: string;
          day: string;
          roomNumber?: string;
        }) => ({
          sectionId: e.sectionId,
          subjectId: e.subjectId,
          teacherId: e.teacherId,
          periodSlotId: e.periodSlotId,
          day: e.day as import('@prisma/client').DayOfWeek,
          roomNumber: e.roomNumber,
        })),
      },
    },
    include: { entries: true },
  });

  return ok(timetable, 201);
}

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const sectionId = searchParams.get('sectionId') ?? undefined;
  const teacherId = searchParams.get('teacherId') ?? undefined;

  // Get the active timetable for this tenant
  const timetable = await db.timetable.findFirst({
    where: { tenantId: session.user.tenantId, status: 'ACTIVE' },
    include: {
      entries: {
        where: {
          ...(sectionId && { sectionId }),
          ...(teacherId && { teacherId }),
        },
        include: {
          subject: { select: { id: true, name: true, colorHex: true } },
          teacher: { select: { id: true, name: true } },
          section: { include: { grade: { select: { name: true, gradeGroupId: true, gradeGroup: { select: { id: true, name: true, fillerType: true, mainBreakAfterPeriod: true, shortBreakEnabled: true, shortBreakAfterPeriod: true } } } } } },
          periodSlot: true,
        },
        orderBy: [{ day: 'asc' }, { periodSlot: { periodNo: 'asc' } }],
      },
      academicYear: { select: { label: true } },
    },
    orderBy: { publishedAt: 'desc' },
  });

  if (!timetable) return ok({ timetable: null });

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

  return ok({ timetable, substitutions });
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

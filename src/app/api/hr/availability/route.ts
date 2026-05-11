import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 14);

  const [overrides, weeklySlots] = await Promise.all([
    db.teacherAvailabilityOverride.findMany({
      where: {
        teacher: { tenantId },
        date: { gte: today, lte: horizon },
      },
      include: {
        teacher: { select: { id: true, name: true, designation: true, type: true } },
      },
      orderBy: { date: 'asc' },
    }),
    db.teacherAvailability.findMany({
      where: { teacher: { tenantId } },
      include: {
        teacher: {
          select: {
            id: true, name: true, type: true, designation: true,
            subjects: { include: { subject: { select: { name: true } } } },
          },
        },
      },
      orderBy: [{ teacher: { name: 'asc' } }, { day: 'asc' }, { startTime: 'asc' }],
    }),
  ]);

  return ok({ overrides, weeklySlots });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { teacherId, date, endDate, isAvailable, reason, period, timeTo } = body;

  if (!teacherId || !date) return err('teacherId and date are required');

  // Verify teacher belongs to this tenant
  const teacher = await db.teacher.findFirst({
    where: { id: teacherId, tenantId: session.user.tenantId },
    select: { id: true, name: true },
  });
  if (!teacher) return err('Teacher not found', 404);

  const from = new Date(date);
  from.setHours(0, 0, 0, 0);

  const meta = period !== 'full-day' ? ` [${period}${timeTo ? ` until ${timeTo}` : ''}]` : '';
  const fullReason = `${reason || 'Not specified'}${meta}`;

  // For multi-day, create one record per day in the range
  const dates: Date[] = [new Date(from)];
  if (period === 'multi-day' && endDate) {
    const to = new Date(endDate);
    to.setHours(0, 0, 0, 0);
    const cur = new Date(from);
    cur.setDate(cur.getDate() + 1);
    while (cur <= to && dates.length < 14) {
      dates.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
  }

  const created = await Promise.all(
    dates.map(d =>
      db.teacherAvailabilityOverride.upsert({
        where: { teacherId_date: { teacherId, date: d } },
        create: { teacherId, date: d, isAvailable: !!isAvailable, reason: fullReason },
        update: { isAvailable: !!isAvailable, reason: fullReason },
      })
    )
  );

  return ok(created, 201);
}

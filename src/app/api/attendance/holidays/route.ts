import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

function fmt(d: Date) { return d.toISOString().split('T')[0]; }

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const year = searchParams.get('year');
  const tenantId = session.user.tenantId;

  const where = year
    ? {
        tenantId,
        startDate: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      }
    : { tenantId };

  const holidays = await db.holiday.findMany({
    where,
    orderBy: { startDate: 'asc' },
  });

  return ok(holidays.map(h => ({ ...h, startDate: fmt(h.startDate), endDate: fmt(h.endDate) })));
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { startDate, endDate, name, type } = body;

  if (!startDate || !name) return err('startDate and name are required');

  const start = new Date(startDate);
  const end   = endDate ? new Date(endDate) : new Date(startDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (end < start) return err('endDate cannot be before startDate', 400);

  const tenantId = session.user.tenantId;
  const holiday = await db.holiday.create({
    data: { tenantId, startDate: start, endDate: end, name, type: type ?? 'PUBLIC' },
  });

  return ok({ ...holiday, startDate: fmt(holiday.startDate), endDate: fmt(holiday.endDate) }, 201);
}

export async function DELETE(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const id = searchParams.get('id');
  if (!id) return err('id is required');

  const tenantId = session.user.tenantId;
  const holiday = await db.holiday.findFirst({ where: { id, tenantId } });
  if (!holiday) return err('Holiday not found', 404);

  await db.holiday.delete({ where: { id } });
  return ok({ deleted: true });
}

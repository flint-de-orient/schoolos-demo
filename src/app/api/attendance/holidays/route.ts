import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const year = searchParams.get('year');

  const tenantId = session.user.tenantId;

  const where = year
    ? {
        tenantId,
        date: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      }
    : { tenantId };

  const holidays = await db.holiday.findMany({
    where,
    orderBy: { date: 'asc' },
  });

  return ok(holidays);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { date, name, type } = body;

  if (!date || !name) return err('date and name are required');

  const tenantId = session.user.tenantId;
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const holiday = await db.holiday.upsert({
    where: { tenantId_date: { tenantId, date: targetDate } },
    update: { name, type: type ?? 'PUBLIC' },
    create: { tenantId, date: targetDate, name, type: type ?? 'PUBLIC' },
  });

  return ok(holiday, 201);
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

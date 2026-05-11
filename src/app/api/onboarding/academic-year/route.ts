import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { label, startDate, endDate } = await req.json() as {
    label: string;
    startDate: string;
    endDate: string;
  };

  if (!label || !startDate || !endDate) return err('label, startDate and endDate are required');

  // Unset any existing current year
  await db.academicYear.updateMany({
    where: { tenantId: session.user.tenantId },
    data: { isCurrent: false },
  });

  const year = await db.academicYear.create({
    data: {
      tenantId: session.user.tenantId,
      label,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isCurrent: true,
    },
  });

  return ok(year, 201);
}

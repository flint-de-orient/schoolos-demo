import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET(_req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const config = await db.timetableConfig.findFirst({
    where: { tenantId: session.user.tenantId },
  });

  return ok({ config });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;
  const body = await req.json() as {
    schoolStartTime: string;
    workingDays: string[];
  };

  const { schoolStartTime, workingDays } = body;

  if (!schoolStartTime || !workingDays?.length) {
    return err('schoolStartTime and workingDays are required.', 400);
  }

  type DayEnum = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  const validDays: DayEnum[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  const days = workingDays.filter((d): d is DayEnum => validDays.includes(d as DayEnum));

  const config = await db.timetableConfig.upsert({
    where: { tenantId },
    create: { tenantId, schoolStartTime, workingDays: days },
    update: { schoolStartTime, workingDays: days },
  });

  return ok({ config }, 201);
}

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET(_req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const config = await db.timetableConfig.findFirst({
    where: { tenantId: session.user.tenantId },
    include: { periodSlots: { orderBy: { periodNo: 'asc' } } },
  });

  return ok({ config });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;
  const body = await req.json() as {
    schoolStartTime: string;
    periodDuration: number;
    breakAfterPeriod: number[];
    breakDuration: number;
    workingDays: string[];
  };

  const { schoolStartTime, periodDuration, breakAfterPeriod, breakDuration, workingDays } = body;

  if (!schoolStartTime || !periodDuration || !workingDays?.length) {
    return err('schoolStartTime, periodDuration and workingDays are required.', 400);
  }

  type DayEnum = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  const validDays: DayEnum[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  const days = workingDays.filter((d): d is DayEnum => validDays.includes(d as DayEnum));

  // periodsPerDay is NOT user-input — it is computed from curriculum at generation time.
  // We upsert the config without touching periodsPerDay (schema default 8 on first create).
  const config = await db.timetableConfig.upsert({
    where: { tenantId },
    create: {
      tenantId, schoolStartTime, periodDuration,
      breakAfterPeriod: breakAfterPeriod ?? [],
      breakDuration: breakDuration ?? 20,
      workingDays: days,
    },
    update: {
      schoolStartTime, periodDuration,
      breakAfterPeriod: breakAfterPeriod ?? [],
      breakDuration: breakDuration ?? 20,
      workingDays: days,
    },
  });

  return ok({ config }, 201);
}

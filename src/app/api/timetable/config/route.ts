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
    periodsPerDay: number;
    breakAfterPeriod: number[];
    breakDuration: number;
    workingDays: string[];
  };

  const { schoolStartTime, periodDuration, periodsPerDay, breakAfterPeriod, breakDuration, workingDays } = body;

  if (!schoolStartTime || !periodDuration || !periodsPerDay || !workingDays?.length) {
    return err('schoolStartTime, periodDuration, periodsPerDay and workingDays are required.', 400);
  }

  type DayEnum = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  const validDays: DayEnum[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  const days = workingDays.filter((d): d is DayEnum => validDays.includes(d as DayEnum));

  // Upsert config (one per tenant)
  const config = await db.timetableConfig.upsert({
    where: { tenantId },
    create: { tenantId, schoolStartTime, periodDuration, periodsPerDay, breakAfterPeriod, breakDuration, workingDays: days },
    update: { schoolStartTime, periodDuration, periodsPerDay, breakAfterPeriod, breakDuration, workingDays: days },
  });

  // Auto-generate period slots after saving config
  function addMinutes(time: string, mins: number): string {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + mins;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  let current = config.schoolStartTime;
  const slotDefs = [];
  for (let p = 1; p <= config.periodsPerDay; p++) {
    const end = addMinutes(current, config.periodDuration);
    slotDefs.push({ periodNo: p, startTime: current, endTime: end, isBreak: false, label: `Period ${p}` });
    current = end;
    if (config.breakAfterPeriod.includes(p)) current = addMinutes(current, config.breakDuration);
  }

  // Delete old slots and recreate (config may have changed period count)
  await db.periodSlot.deleteMany({ where: { configId: config.id } });
  await db.periodSlot.createMany({
    data: slotDefs.map(s => ({ configId: config.id, ...s })),
  });

  const periodSlots = await db.periodSlot.findMany({
    where: { configId: config.id },
    orderBy: { periodNo: 'asc' },
  });

  return ok({ config, periodSlots, generated: periodSlots.length }, 201);
}

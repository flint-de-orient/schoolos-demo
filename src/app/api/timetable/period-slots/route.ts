import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function generateSlots(config: {
  periodsPerDay: number;
  schoolStartTime: string;
  periodDuration: number;
  breakAfterPeriod: number[];
  breakDuration: number;
}) {
  const slots: { periodNo: number; startTime: string; endTime: string; isBreak: boolean; label: string }[] = [];
  let current = config.schoolStartTime;

  for (let p = 1; p <= config.periodsPerDay; p++) {
    const end = addMinutes(current, config.periodDuration);
    slots.push({ periodNo: p, startTime: current, endTime: end, isBreak: false, label: `Period ${p}` });
    current = end;
    if (config.breakAfterPeriod.includes(p)) {
      current = addMinutes(current, config.breakDuration);
    }
  }
  return slots;
}

export async function GET(_req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const config = await db.timetableConfig.findFirst({
    where: { tenantId: session.user.tenantId },
    include: { periodSlots: { orderBy: { periodNo: 'asc' } } },
  });

  if (!config) return err('No timetable configuration found. Set up school config first.', 404);

  return ok({ config, periodSlots: config.periodSlots });
}

export async function POST(_req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const config = await db.timetableConfig.findFirst({
    where: { tenantId: session.user.tenantId },
  });

  if (!config) return err('No timetable configuration found.', 404);

  const slots = generateSlots(config);

  // Upsert — safe to call multiple times
  const created = await Promise.all(
    slots.map(s =>
      db.periodSlot.upsert({
        where: { configId_periodNo: { configId: config.id, periodNo: s.periodNo } },
        create: { configId: config.id, ...s },
        update: { startTime: s.startTime, endTime: s.endTime, label: s.label },
      })
    )
  );

  return ok({ generated: created.length, periodSlots: created }, 201);
}

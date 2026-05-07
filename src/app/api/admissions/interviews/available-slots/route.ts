import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

// Default working hours when no config is saved
const DEFAULT_CONFIG = {
  workingDays:    [1, 2, 3, 4, 5, 6], // Mon–Sat
  morningStart:   '09:00',
  morningEnd:     '13:00',
  afternoonStart: '14:00',
  afternoonEnd:   '17:00',
};

function toMins(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function toTimeStr(mins: number) {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const dateStr  = searchParams.get('date');
  const duration = Math.max(15, Math.min(120, Number(searchParams.get('duration') ?? 15)));

  if (!dateStr) return err('date is required');

  // Parse date safely — avoid timezone shift by treating as local noon UTC
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  // ISO weekday: 0=Sun → convert to 1=Mon…7=Sun
  const isoWeekday = dateObj.getUTCDay() === 0 ? 7 : dateObj.getUTCDay();

  // Load tenant slot config (or use defaults)
  const cfg = await db.interviewSlotConfig.findUnique({
    where: { tenantId: session.user.tenantId },
    include: { blockedDates: true },
  });

  const workingDays    = cfg?.workingDays    ?? DEFAULT_CONFIG.workingDays;
  const morningStart   = cfg?.morningStart   ?? DEFAULT_CONFIG.morningStart;
  const morningEnd     = cfg?.morningEnd     ?? DEFAULT_CONFIG.morningEnd;
  const afternoonStart = cfg?.afternoonStart ?? DEFAULT_CONFIG.afternoonStart;
  const afternoonEnd   = cfg?.afternoonEnd   ?? DEFAULT_CONFIG.afternoonEnd;

  // Check if selected date is a working day
  if (!workingDays.includes(isoWeekday)) {
    return ok({ slots: [], reason: 'not_working_day', workingDays });
  }

  // Check if date is blocked
  const isBlocked = cfg?.blockedDates.some(b => {
    const bd = new Date(b.date);
    return bd.getUTCFullYear() === year && (bd.getUTCMonth() + 1) === month && bd.getUTCDate() === day;
  }) ?? false;

  if (isBlocked) {
    const blockedEntry = cfg!.blockedDates.find(b => {
      const bd = new Date(b.date);
      return bd.getUTCFullYear() === year && (bd.getUTCMonth() + 1) === month && bd.getUTCDate() === day;
    });
    return ok({ slots: [], reason: 'blocked', blockedReason: blockedEntry?.reason ?? 'Date blocked' });
  }

  // Fetch already-booked start times for this date
  // Use date range to avoid timezone comparison issues with @db.Date
  const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const dayEnd   = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));

  const booked = await db.interviewSchedule.findMany({
    where: {
      tenantId: session.user.tenantId,
      date: { gte: dayStart, lte: dayEnd },
      status: { notIn: ['CANCELLED'] },
    },
    select: { startTime: true, endTime: true, status: true },
  });

  const bookedStarts = new Set(booked.map(b => b.startTime));

  // Generate slots from morning and afternoon blocks
  const blocks = [
    { from: toMins(morningStart),   to: toMins(morningEnd)   },
    { from: toMins(afternoonStart), to: toMins(afternoonEnd) },
  ];

  const slots: { startTime: string; endTime: string; available: boolean; block: 'morning' | 'afternoon' }[] = [];

  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi];
    let cur = block.from;
    while (cur + duration <= block.to) {
      const start = toTimeStr(cur);
      const end   = toTimeStr(cur + duration);
      slots.push({
        startTime: start,
        endTime: end,
        available: !bookedStarts.has(start),
        block: bi === 0 ? 'morning' : 'afternoon',
      });
      cur += duration;
    }
  }

  return ok({
    slots,
    config: {
      morningStart,
      morningEnd,
      afternoonStart,
      afternoonEnd,
      workingDays,
    },
  });
}

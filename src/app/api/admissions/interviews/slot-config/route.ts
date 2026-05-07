import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

// GET — fetch current slot config (returns defaults if not yet saved)
export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const cfg = await db.interviewSlotConfig.findUnique({
    where: { tenantId: session.user.tenantId },
    include: { blockedDates: { orderBy: { date: 'asc' } } },
  });

  if (!cfg) {
    return ok({
      workingDays:    [1, 2, 3, 4, 5, 6],
      morningStart:   '09:00',
      morningEnd:     '13:00',
      afternoonStart: '14:00',
      afternoonEnd:   '17:00',
      defaultDuration: 15,
      maxConcurrent:  1,
      blockedDates:   [],
    });
  }

  return ok({
    ...cfg,
    blockedDates: cfg.blockedDates.map(b => ({
      id:     b.id,
      date:   new Date(b.date).toISOString().split('T')[0],
      reason: b.reason,
    })),
  });
}

// PUT — upsert slot config
export async function PUT(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const {
    workingDays    = [1, 2, 3, 4, 5, 6],
    morningStart   = '09:00',
    morningEnd     = '13:00',
    afternoonStart = '14:00',
    afternoonEnd   = '17:00',
    defaultDuration = 15,
    maxConcurrent  = 1,
  } = body;

  if (!Array.isArray(workingDays) || workingDays.length === 0) {
    return err('workingDays must be a non-empty array');
  }

  const cfg = await db.interviewSlotConfig.upsert({
    where:  { tenantId: session.user.tenantId },
    create: { tenantId: session.user.tenantId, workingDays, morningStart, morningEnd, afternoonStart, afternoonEnd, defaultDuration, maxConcurrent },
    update: { workingDays, morningStart, morningEnd, afternoonStart, afternoonEnd, defaultDuration, maxConcurrent },
  });

  return ok(cfg);
}

// POST /slot-config/blocked-dates — add blocked date
export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { date, reason } = await req.json();
  if (!date) return err('date is required');

  const [year, month, day] = (date as string).split('-').map(Number);
  const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  // Ensure config exists first
  const cfg = await db.interviewSlotConfig.upsert({
    where:  { tenantId: session.user.tenantId },
    create: { tenantId: session.user.tenantId, workingDays: [1, 2, 3, 4, 5, 6] },
    update: {},
  });

  const blocked = await db.interviewBlockedDate.upsert({
    where:  { configId_date: { configId: cfg.id, date: dateObj } },
    create: { configId: cfg.id, date: dateObj, reason: reason ?? null },
    update: { reason: reason ?? null },
  });

  return ok({ id: blocked.id, date, reason: blocked.reason });
}

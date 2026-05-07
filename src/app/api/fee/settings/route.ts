import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET() {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const settings = await db.tenantFeeSettings.findUnique({
      where: { tenantId: session.user.tenantId },
    });
    return ok(settings ?? null);
  } catch (e) {
    console.error('[GET /api/fee/settings]', e);
    return err((e as Error).message ?? 'Internal server error', 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const body = await req.json();
    const { monthlyDueDay, biMonthlyDueDay, quarterlyDueDay, halfYearlyDueDay, annualDueDay } = body;

    const data: Record<string, number> = {};
    if (monthlyDueDay != null) data.monthlyDueDay = Number(monthlyDueDay);
    if (biMonthlyDueDay != null) data.biMonthlyDueDay = Number(biMonthlyDueDay);
    if (quarterlyDueDay != null) data.quarterlyDueDay = Number(quarterlyDueDay);
    if (halfYearlyDueDay != null) data.halfYearlyDueDay = Number(halfYearlyDueDay);
    if (annualDueDay != null) data.annualDueDay = Number(annualDueDay);

    const settings = await db.tenantFeeSettings.upsert({
      where: { tenantId: session.user.tenantId },
      update: data,
      create: { tenantId: session.user.tenantId, ...data },
    });
    return ok(settings);
  } catch (e) {
    console.error('[PUT /api/fee/settings]', e);
    return err((e as Error).message ?? 'Internal server error', 500);
  }
}

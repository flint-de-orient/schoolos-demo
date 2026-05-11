import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok } from '@/lib/api-auth';
import { Decimal } from '@prisma/client/runtime/library';

export async function GET(_req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const settings = await db.tenantSalarySettings.findUnique({
    where: { tenantId: session.user.tenantId },
  });

  // Return defaults if not yet configured
  return ok({
    settings: settings ?? {
      hraPercent: 20, daPercent: 0, taFlat: 0, medicalFlat: 0,
      specialAllowancePercent: 0, pfPercent: 12,
      professionalTax: 200, tdsThresholdAnnual: 500000,
      tdsPercent: 10, payDay: 28,
    },
  });
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const {
    hraPercent, daPercent, taFlat, medicalFlat, specialAllowancePercent,
    pfPercent, professionalTax, tdsThresholdAnnual, tdsPercent, payDay,
  } = body;

  const d = (v: number) => new Decimal(v ?? 0);

  const settings = await db.tenantSalarySettings.upsert({
    where: { tenantId: session.user.tenantId },
    create: {
      tenantId: session.user.tenantId,
      hraPercent: d(hraPercent), daPercent: d(daPercent),
      taFlat: d(taFlat), medicalFlat: d(medicalFlat),
      specialAllowancePercent: d(specialAllowancePercent),
      pfPercent: d(pfPercent), professionalTax: d(professionalTax),
      tdsThresholdAnnual: d(tdsThresholdAnnual), tdsPercent: d(tdsPercent),
      payDay: Number(payDay) || 28,
    },
    update: {
      hraPercent: d(hraPercent), daPercent: d(daPercent),
      taFlat: d(taFlat), medicalFlat: d(medicalFlat),
      specialAllowancePercent: d(specialAllowancePercent),
      pfPercent: d(pfPercent), professionalTax: d(professionalTax),
      tdsThresholdAnnual: d(tdsThresholdAnnual), tdsPercent: d(tdsPercent),
      payDay: Number(payDay) || 28,
    },
  });

  return ok({ settings });
}

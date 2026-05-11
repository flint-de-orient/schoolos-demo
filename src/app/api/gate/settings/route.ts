import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok } from '@/lib/api-auth';
import { GateNotifyChannel, GateNotifyTrigger } from '@prisma/client';

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const settings = await db.tenantGateSettings.findUnique({
    where: { tenantId: session.user.tenantId },
  });

  return ok(settings ?? {
    notifyTrigger: 'BOTH',
    notifyChannel: 'WHATSAPP',
    schoolStartTime: '08:00',
    schoolEndTime: '15:00',
    lateThresholdMins: 15,
  });
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { notifyTrigger, notifyChannel, schoolStartTime, schoolEndTime, lateThresholdMins } = await req.json();

  const settings = await db.tenantGateSettings.upsert({
    where: { tenantId: session.user.tenantId },
    create: {
      tenantId: session.user.tenantId,
      notifyTrigger: (notifyTrigger as GateNotifyTrigger) ?? 'BOTH',
      notifyChannel: (notifyChannel as GateNotifyChannel) ?? 'WHATSAPP',
      schoolStartTime: schoolStartTime ?? '08:00',
      schoolEndTime: schoolEndTime ?? '15:00',
      lateThresholdMins: lateThresholdMins ?? 15,
    },
    update: {
      ...(notifyTrigger && { notifyTrigger: notifyTrigger as GateNotifyTrigger }),
      ...(notifyChannel && { notifyChannel: notifyChannel as GateNotifyChannel }),
      ...(schoolStartTime && { schoolStartTime }),
      ...(schoolEndTime && { schoolEndTime }),
      ...(lateThresholdMins !== undefined && { lateThresholdMins }),
    },
  });

  return ok(settings);
}

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { DeviceType } from '@prisma/client';

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const devices = await db.gateDevice.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { registeredAt: 'desc' },
  });

  return ok(devices);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { label, location, deviceType } = await req.json();
  if (!label || !deviceType) return err('label and deviceType are required');

  const deviceId = `DEV-${Date.now()}`;

  const device = await db.gateDevice.create({
    data: {
      tenantId: session.user.tenantId,
      deviceId,
      label,
      location: location ?? null,
      deviceType: deviceType as DeviceType,
    },
  });

  return ok(device, 201);
}

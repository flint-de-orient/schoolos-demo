import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const device = await db.gateDevice.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!device) return err('Device not found', 404);

  const { label, location, isActive } = await req.json();

  const updated = await db.gateDevice.update({
    where: { id: params.id },
    data: {
      ...(label !== undefined && { label }),
      ...(location !== undefined && { location }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return ok(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const device = await db.gateDevice.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!device) return err('Device not found', 404);

  await db.gateDevice.delete({ where: { id: params.id } });
  return ok({ success: true });
}

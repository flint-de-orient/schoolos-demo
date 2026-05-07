import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { ModuleId } from '@prisma/client';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenant = await db.tenant.findUnique({
    where: { id: session.user.tenantId },
    include: { modules: true },
  });

  if (!tenant) return err('Tenant not found', 404);

  return ok(tenant);
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { name, address, phone, email, website, logoUrl, module: moduleId, moduleEnabled } = body;

  if (moduleId !== undefined && moduleEnabled !== undefined) {
    await db.tenantModule.upsert({
      where: { tenantId_module: { tenantId: session.user.tenantId, module: moduleId as ModuleId } },
      update: { isActive: moduleEnabled },
      create: {
        tenantId: session.user.tenantId,
        module: moduleId as ModuleId,
        isActive: moduleEnabled,
      },
    });
    return ok({ success: true });
  }

  const updated = await db.tenant.update({
    where: { id: session.user.tenantId },
    data: {
      ...(name && { name }),
      ...(address && { address }),
      ...(phone && { phone }),
      ...(email && { email }),
      ...(website && { website }),
      ...(logoUrl && { logoUrl }),
    },
  });

  return ok(updated);
}

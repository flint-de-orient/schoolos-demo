import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { ok, err } from '@/lib/api-auth';
import { ModuleId } from '@prisma/client';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return err('Unauthorized', 401);
  if (session.user.role !== 'SUPER_ADMIN') return err('Forbidden', 403);

  const body = await req.json();
  const { modules } = body;

  if (!Array.isArray(modules)) return err('modules must be an array');

  const tenant = await db.tenant.findUnique({ where: { id: params.id } });
  if (!tenant) return err('Tenant not found', 404);

  const validModules = modules.filter((m: string) =>
    Object.values(ModuleId).includes(m as ModuleId)
  ) as ModuleId[];

  // Always keep dashboard and settings active
  const required: ModuleId[] = ['dashboard', 'settings'];
  const finalModules = [...new Set([...validModules, ...required])];

  // Upsert all modules for this tenant
  await db.$transaction(async (tx) => {
    // Deactivate all existing
    await tx.tenantModule.updateMany({
      where: { tenantId: params.id },
      data: { isActive: false },
    });

    // Activate the selected ones
    for (const moduleId of finalModules) {
      await tx.tenantModule.upsert({
        where: { tenantId_module: { tenantId: params.id, module: moduleId } },
        update: { isActive: true },
        create: { tenantId: params.id, module: moduleId, isActive: true },
      });
    }
  });

  const updated = await db.tenantModule.findMany({ where: { tenantId: params.id } });
  return ok({ modules: updated });
}

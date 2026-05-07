import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { ok, err } from '@/lib/api-auth';

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user) return { error: err('Unauthorized', 401) };
  if (session.user.role !== 'SUPER_ADMIN') return { error: err('Forbidden', 403) };
  return { error: null };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const tenant = await db.tenant.findUnique({
    where: { id: params.id },
    include: {
      modules: true,
      users: {
        select: { id: true, displayName: true, email: true, role: true, lastLoginAt: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!tenant) return err('Tenant not found', 404);
  return ok(tenant);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const body = await req.json();
  const { name, shortName, headName, headTitle, phone, address, isActive, plan } = body;

  const tenant = await db.tenant.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(shortName !== undefined && { shortName }),
      ...(headName !== undefined && { headName }),
      ...(headTitle !== undefined && { headTitle }),
      ...(phone !== undefined && { phone }),
      ...(address !== undefined && { address }),
      ...(isActive !== undefined && { isActive }),
      ...(plan !== undefined && { plan }),
    },
  });

  return ok(tenant);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  await db.tenant.update({
    where: { id: params.id },
    data: { isActive: false, deletedAt: new Date() },
  });

  return ok({ success: true });
}

import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { ok, err } from '@/lib/api-auth';
import bcrypt from 'bcryptjs';

export async function GET() {
  const session = await auth();
  if (!session?.user) return err('Unauthorized', 401);
  if (session.user.role !== 'SUPER_ADMIN') return err('Forbidden', 403);

  const users = await db.user.findMany({
    where: { deletedAt: null },
    include: { tenant: { select: { name: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return ok(users.map((u) => ({
    id: u.id,
    displayName: u.displayName,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
    tenant: { name: u.tenant.name, slug: u.tenant.slug },
  })));
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return err('Unauthorized', 401);
  if (session.user.role !== 'SUPER_ADMIN') return err('Forbidden', 403);

  const body = await req.json();
  const { userId, isActive, newPassword } = body;
  if (!userId) return err('userId required');

  if (newPassword !== undefined) {
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return err('Password must be at least 8 characters');
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    const user = await db.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return ok({ id: user.id });
  }

  const user = await db.user.update({
    where: { id: userId },
    data: { isActive },
  });

  return ok({ id: user.id, isActive: user.isActive });
}

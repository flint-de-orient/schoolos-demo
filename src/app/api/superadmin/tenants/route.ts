import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { ok, err } from '@/lib/api-auth';
import { Board, ModuleId, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user) return { session: null, error: err('Unauthorized', 401) };
  if (session.user.role !== 'SUPER_ADMIN') return { session: null, error: err('Forbidden', 403) };
  return { session, error: null };
}

export async function GET(req: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get('q') ?? '';

  const tenants = await db.tenant.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { city: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    include: {
      modules: true,
      _count: { select: { users: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return ok({ data: tenants, total: tenants.length });
}

export async function POST(req: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const body = await req.json();
  const {
    name, shortName, board, city, state, email, phone, address,
    headTitle, headName, modules,
    adminEmail, adminPassword, adminName,
  } = body;

  if (!name || !board || !email || !adminEmail || !adminPassword) {
    return err('name, board, email, adminEmail and adminPassword are required');
  }

  // Check email uniqueness
  const existing = await db.tenant.findUnique({ where: { email } });
  if (existing) return err('A school with this email already exists', 409);

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50);

  // Ensure slug is unique
  const slugExists = await db.tenant.findUnique({ where: { slug } });
  const finalSlug = slugExists ? `${slug}-${Date.now()}` : slug;

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const moduleIds: ModuleId[] = Array.isArray(modules)
    ? modules.filter((m: string) => Object.values(ModuleId).includes(m as ModuleId)) as ModuleId[]
    : (['dashboard', 'settings'] as ModuleId[]);

  // Always include dashboard and settings
  const finalModules = [...new Set([...moduleIds, 'dashboard' as ModuleId, 'settings' as ModuleId])];

  const tenant = await db.tenant.create({
    data: {
      slug: finalSlug,
      name,
      shortName: shortName ?? name.split(' ').map((w: string) => w[0]).join('').slice(0, 4).toUpperCase(),
      board: board as Board,
      city: city ?? '',
      state: state ?? '',
      email,
      phone,
      address,
      headTitle: headTitle ?? 'Principal',
      headName: headName ?? adminName,
      modules: {
        create: finalModules.map((module) => ({ module, isActive: true })),
      },
      users: {
        create: {
          email: adminEmail,
          passwordHash,
          role: UserRole.SCHOOL_ADMIN,
          displayName: adminName ?? name,
          emailVerified: true,
        },
      },
    },
  });

  return ok({ id: tenant.id, slug: tenant.slug }, 201);
}

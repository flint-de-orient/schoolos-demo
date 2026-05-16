import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

const DEFAULTS = [
  { name: 'Study Period', colorHex: '#6366F1', sortOrder: 0 },
  { name: 'Revision',     colorHex: '#8B5CF6', sortOrder: 1 },
  { name: 'Sports',       colorHex: '#10B981', sortOrder: 2 },
  { name: 'Dance',        colorHex: '#EC4899', sortOrder: 3 },
  { name: 'Music',        colorHex: '#F59E0B', sortOrder: 4 },
  { name: 'Art & Craft',  colorHex: '#EF4444', sortOrder: 5 },
  { name: 'Library',      colorHex: '#3B82F6', sortOrder: 6 },
  { name: 'Assembly',     colorHex: '#F97316', sortOrder: 7 },
];

// GET — list all activity types for tenant (auto-seeds defaults on first call)
export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;
  let types = await db.activityType.findMany({
    where: { tenantId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  if (types.length === 0) {
    await db.activityType.createMany({
      data: DEFAULTS.map(d => ({ ...d, tenantId })),
      skipDuplicates: true,
    });
    types = await db.activityType.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  return ok({ activityTypes: types });
}

// POST — create a new activity type
export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;
  const { name, colorHex } = await req.json() as { name: string; colorHex?: string };

  if (!name?.trim()) return err('name is required', 400);

  const existing = await db.activityType.findUnique({ where: { tenantId_name: { tenantId, name: name.trim() } } });
  if (existing) return err('An activity type with this name already exists', 409);

  const maxOrder = await db.activityType.aggregate({ where: { tenantId }, _max: { sortOrder: true } });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const created = await db.activityType.create({
    data: { tenantId, name: name.trim(), colorHex: colorHex ?? '#9CA3AF', sortOrder },
  });

  return ok({ activityType: created }, 201);
}

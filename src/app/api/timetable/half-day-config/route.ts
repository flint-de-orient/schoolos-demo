import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

// GET — list all half-day configs for this tenant
export async function GET(_req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const configs = await db.halfDayConfig.findMany({
    where: { tenantId: session.user.tenantId },
    include: { gradeGroup: { select: { id: true, name: true } } },
    orderBy: [{ gradeGroupId: 'asc' }, { dayOfWeek: 'asc' }],
  });

  return ok({ configs });
}

// POST — upsert a half-day config (create or update by tenant+group+day)
export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;
  const body = await req.json() as {
    gradeGroupId: string | null;
    dayOfWeek: string;
    periodsPerDay: number;
    isActive: boolean;
  };

  const { gradeGroupId, dayOfWeek, periodsPerDay, isActive } = body;

  if (!dayOfWeek) return err('dayOfWeek is required', 400);
  if (!periodsPerDay || periodsPerDay < 1) return err('periodsPerDay must be at least 1', 400);

  // Validate gradeGroup belongs to tenant
  if (gradeGroupId) {
    const group = await db.gradeGroup.findFirst({ where: { id: gradeGroupId, tenantId } });
    if (!group) return err('Grade group not found', 404);
  }

  // Upsert: find existing by (tenantId, gradeGroupId, dayOfWeek), then update or create
  const day = dayOfWeek as import('@prisma/client').DayOfWeek;
  const existing = await db.halfDayConfig.findFirst({
    where: { tenantId, gradeGroupId: gradeGroupId ?? null, dayOfWeek: day },
  });

  const data = { periodsPerDay, isActive };

  const config = existing
    ? await db.halfDayConfig.update({ where: { id: existing.id }, data })
    : await db.halfDayConfig.create({
        data: { tenantId, gradeGroupId: gradeGroupId ?? null, dayOfWeek: day, ...data },
      });

  return ok({ config }, existing ? 200 : 201);
}

// DELETE — remove a half-day config by id
export async function DELETE(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return err('id is required', 400);

  const existing = await db.halfDayConfig.findFirst({ where: { id, tenantId: session.user.tenantId } });
  if (!existing) return err('Not found', 404);

  await db.halfDayConfig.delete({ where: { id } });
  return ok({ deleted: true });
}

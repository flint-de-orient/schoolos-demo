import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

type P = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: P) {
  const { session, error } = await requireSession();
  if (error) return error;

  const scheme = await db.assessmentScheme.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!scheme) return err('Not found', 404);

  const patterns = await db.subjectPattern.findMany({
    where: { schemeId: params.id },
    include: { subject: { select: { id: true, name: true } } },
    orderBy: { subject: { name: 'asc' } },
  });

  return ok(patterns);
}

export async function PUT(req: NextRequest, { params }: P) {
  // Upsert a single pattern (subjectId null = default)
  const { session, error } = await requireSession();
  if (error) return error;

  const scheme = await db.assessmentScheme.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!scheme) return err('Not found', 404);

  const { subjectId, components } = await req.json();
  if (!Array.isArray(components)) return err('components array required');

  const pattern = await db.subjectPattern.upsert({
    where: { schemeId_subjectId: { schemeId: params.id, subjectId: subjectId ?? null } },
    create: { schemeId: params.id, subjectId: subjectId ?? null, components },
    update: { components },
    include: { subject: { select: { id: true, name: true } } },
  });

  return ok(pattern);
}

export async function DELETE(req: NextRequest, { params }: P) {
  const { session, error } = await requireSession();
  if (error) return error;

  const scheme = await db.assessmentScheme.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!scheme) return err('Not found', 404);

  const { searchParams } = req.nextUrl;
  const patternId = searchParams.get('patternId');
  if (!patternId) return err('patternId required');

  await db.subjectPattern.delete({ where: { id: patternId } });
  return ok({ success: true });
}

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

type P = { params: { id: string; termId: string } };

async function verifyAccess(schemeId: string, termId: string, tenantId: string) {
  const scheme = await db.assessmentScheme.findFirst({
    where: { id: schemeId, tenantId },
  });
  if (!scheme) return null;

  const term = await db.assessmentTerm.findFirst({
    where: { id: termId, schemeId },
  });
  return term ?? null;
}

// GET — list all subject configs for this term
export async function GET(_req: NextRequest, { params }: P) {
  const { session, error } = await requireSession();
  if (error) return error;

  const term = await verifyAccess(params.id, params.termId, session.user.tenantId);
  if (!term) return err('Not found', 404);

  const configs = await db.termSubjectConfig.findMany({
    where: { termId: params.termId },
    include: { subject: { select: { id: true, name: true } } },
    orderBy: { subject: { name: 'asc' } },
  });

  return ok(configs);
}

// POST — upsert a single subject config
export async function POST(req: NextRequest, { params }: P) {
  const { session, error } = await requireSession();
  if (error) return error;

  const term = await verifyAccess(params.id, params.termId, session.user.tenantId);
  if (!term) return err('Not found', 404);

  const { subjectId, components } = await req.json();
  if (!subjectId) return err('subjectId is required');
  if (!Array.isArray(components)) return err('components must be an array');

  const config = await db.termSubjectConfig.upsert({
    where: { termId_subjectId: { termId: params.termId, subjectId } },
    create: { termId: params.termId, subjectId, components },
    update: { components },
    include: { subject: { select: { id: true, name: true } } },
  });

  return ok(config);
}

// DELETE — remove a subject config by subjectId (?subjectId=)
export async function DELETE(req: NextRequest, { params }: P) {
  const { session, error } = await requireSession();
  if (error) return error;

  const term = await verifyAccess(params.id, params.termId, session.user.tenantId);
  if (!term) return err('Not found', 404);

  const subjectId = req.nextUrl.searchParams.get('subjectId');
  if (!subjectId) return err('subjectId query param required');

  await db.termSubjectConfig.deleteMany({ where: { termId: params.termId, subjectId } });
  return ok({ success: true });
}

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

type P = { params: { id: string } };

export async function POST(req: NextRequest, { params }: P) {
  const { session, error } = await requireSession();
  if (error) return error;

  const scheme = await db.assessmentScheme.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!scheme) return err('Not found', 404);

  const body = await req.json();
  const { name, type, weightPct, sequence, isBoardConducted, examScheduleId } = body;

  if (!name || weightPct === undefined) return err('name and weightPct are required');

  // Auto-sequence if not provided
  const existing = await db.assessmentTerm.count({ where: { schemeId: params.id } });

  const term = await db.assessmentTerm.create({
    data: {
      schemeId: params.id,
      name,
      type: type ?? 'UNIT_TEST',
      weightPct,
      sequence: sequence ?? existing + 1,
      isBoardConducted: isBoardConducted ?? false,
      examScheduleId: examScheduleId ?? null,
    },
  });

  return ok(term, 201);
}

export async function PUT(req: NextRequest, { params }: P) {
  // Bulk replace all terms (simpler for the builder UI)
  const { session, error } = await requireSession();
  if (error) return error;

  const scheme = await db.assessmentScheme.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!scheme) return err('Not found', 404);

  const { terms } = (await req.json()) as {
    terms: {
      id?: string;
      name: string;
      type: string;
      weightPct: number;
      sequence: number;
      isBoardConducted: boolean;
      examScheduleId?: string | null;
    }[];
  };

  if (!Array.isArray(terms)) return err('terms array required');

  const totalWeight = terms.reduce((s, t) => s + t.weightPct, 0);
  if (Math.abs(totalWeight - 100) > 0.01)
    return err(`Term weights must sum to 100 (currently ${totalWeight})`);

  // Delete all existing terms and re-create (cascade deletes overrides)
  await db.assessmentTerm.deleteMany({ where: { schemeId: params.id } });

  await db.assessmentTerm.createMany({
    data: terms.map((t, i) => ({
      schemeId: params.id,
      name: t.name,
      type: t.type,
      weightPct: t.weightPct,
      sequence: t.sequence ?? i + 1,
      isBoardConducted: t.isBoardConducted ?? false,
      examScheduleId: t.examScheduleId ?? null,
    })),
  });

  const fresh = await db.assessmentTerm.findMany({
    where: { schemeId: params.id },
    orderBy: { sequence: 'asc' },
  });

  return ok(fresh);
}

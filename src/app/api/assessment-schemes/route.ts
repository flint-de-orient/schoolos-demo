import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET(_req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const schemes = await db.assessmentScheme.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      academicYear: { select: { id: true, label: true } },
      terms: { orderBy: { sequence: 'asc' } },
      _count: { select: { subjectPatterns: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return ok(schemes);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { name, description, academicYearId, appliedGradeIds, gradingConfig, passCriteria } = body;

  if (!name || !academicYearId) return err('name and academicYearId are required');

  const scheme = await db.assessmentScheme.create({
    data: {
      tenantId: session.user.tenantId,
      name,
      description: description ?? null,
      academicYearId,
      appliedGradeIds: appliedGradeIds ?? [],
      gradingConfig: gradingConfig ?? [],
      passCriteria: passCriteria ?? { perSubject: 33, aggregate: 35 },
    },
    include: {
      academicYear: { select: { id: true, label: true } },
      terms: true,
    },
  });

  return ok(scheme, 201);
}

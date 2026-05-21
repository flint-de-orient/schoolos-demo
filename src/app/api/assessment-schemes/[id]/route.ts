import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

type P = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: P) {
  const { session, error } = await requireSession();
  if (error) return error;

  const scheme = await db.assessmentScheme.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: {
      academicYear: { select: { id: true, label: true } },
      terms: {
        orderBy: { sequence: 'asc' },
        include: {
          examSchedule: { select: { id: true, name: true } },
          overrides: true,
        },
      },
      subjectPatterns: {
        include: { subject: { select: { id: true, name: true } } },
      },
    },
  });

  if (!scheme) return err('Not found', 404);
  return ok(scheme);
}

export async function PUT(req: NextRequest, { params }: P) {
  const { session, error } = await requireSession();
  if (error) return error;

  const scheme = await db.assessmentScheme.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!scheme) return err('Not found', 404);

  const body = await req.json();

  const updated = await db.assessmentScheme.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.appliedGradeIds !== undefined && { appliedGradeIds: body.appliedGradeIds }),
      ...(body.gradingConfig !== undefined && { gradingConfig: body.gradingConfig }),
      ...(body.passCriteria !== undefined && { passCriteria: body.passCriteria }),
      ...(body.isPublished !== undefined && { isPublished: body.isPublished }),
    },
    include: {
      academicYear: { select: { id: true, label: true } },
      terms: { orderBy: { sequence: 'asc' } },
    },
  });

  return ok(updated);
}

export async function DELETE(_req: NextRequest, { params }: P) {
  const { session, error } = await requireSession();
  if (error) return error;

  const scheme = await db.assessmentScheme.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!scheme) return err('Not found', 404);

  await db.assessmentScheme.delete({ where: { id: params.id } });
  return ok({ success: true });
}

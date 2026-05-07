import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const year = await db.academicYear.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!year) return err('Academic year not found', 404);

  const body = await req.json();
  const { label, startDate, endDate, isCurrent } = body;

  const updated = await db.$transaction(async (tx) => {
    // If setting as current, unset all others first
    if (isCurrent === true) {
      await tx.academicYear.updateMany({
        where: { tenantId: session.user.tenantId, id: { not: params.id } },
        data: { isCurrent: false },
      });
    }

    return tx.academicYear.update({
      where: { id: params.id },
      data: {
        ...(label && { label }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(isCurrent !== undefined && { isCurrent }),
      },
    });
  });

  return ok(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const year = await db.academicYear.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!year) return err('Academic year not found', 404);
  if (year.isCurrent) return err('Cannot delete the current academic year', 400);

  // Check if any students exist in this year's grades
  const studentCount = await db.student.count({
    where: {
      tenantId: session.user.tenantId,
      deletedAt: null,
      grade: { academicYearId: params.id },
    },
  });
  if (studentCount > 0) {
    return err(`Cannot delete — ${studentCount} students are linked to this year`, 400);
  }

  await db.academicYear.delete({ where: { id: params.id } });

  return ok({ success: true });
}

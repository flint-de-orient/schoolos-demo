import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { autoAssignFeePlan } from '@/lib/fee-auto-assign';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { toGradeId, toSectionId } = body;

  if (!toGradeId || !toSectionId) {
    return err('toGradeId and toSectionId are required');
  }

  const student = await db.student.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, deletedAt: null },
    include: { grade: { select: { name: true } }, section: { select: { name: true } } },
  });
  if (!student) return err('Student not found', 404);

  // Verify target grade belongs to this tenant
  const targetGrade = await db.grade.findFirst({
    where: { id: toGradeId, tenantId: session.user.tenantId },
    include: { academicYear: { select: { label: true } } },
  });
  if (!targetGrade) return err('Target grade not found', 404);

  const targetSection = await db.section.findFirst({
    where: { id: toSectionId, gradeId: toGradeId },
  });
  if (!targetSection) return err('Target section not found', 404);

  const updated = await db.student.update({
    where: { id: params.id },
    data: { gradeId: toGradeId, sectionId: toSectionId },
    include: {
      grade: { select: { name: true } },
      section: { select: { name: true } },
    },
  });

  // Auto-assign fee plan for the new grade/year if an active plan exists
  await autoAssignFeePlan(
    session.user.tenantId,
    params.id,
    toGradeId,
    targetGrade.academicYearId,
    session.user.id,
  );

  return ok(updated);
}

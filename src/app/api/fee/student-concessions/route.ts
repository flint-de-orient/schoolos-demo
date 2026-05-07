import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET(_req: NextRequest) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const concessions = await db.studentConcession.findMany({
      where: {
        assignment: { tenantId: session.user.tenantId },
      },
      include: {
        concessionTemplate: true,
        assignment: {
          include: {
            student: { select: { id: true, name: true } },
            academicYear: { select: { id: true, label: true } },
            feeAccount: { select: { id: true, gradeId: true } },
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    const gradeIds = concessions
      .map(c => c.assignment.feeAccount?.gradeId)
      .filter(Boolean) as string[];

    const grades = gradeIds.length
      ? await db.grade.findMany({ where: { id: { in: [...new Set(gradeIds)] } }, select: { id: true, name: true } })
      : [];
    const gradeMap = Object.fromEntries(grades.map(g => [g.id, g.name]));

    const rows = concessions.map(c => ({
      id: c.id,
      assignmentId: c.assignmentId,
      studentId: c.assignment.student.id,
      studentName: c.assignment.student.name,
      grade: gradeMap[c.assignment.feeAccount?.gradeId ?? ''] ?? '—',
      academicYear: c.assignment.academicYear.label,
      concessionName: c.concessionTemplate.name,
      type: c.concessionTemplate.type,
      value: Number(c.concessionTemplate.value),
      maxAmount: c.concessionTemplate.maxAmount ? Number(c.concessionTemplate.maxAmount) : null,
    }));

    return ok(rows);
  } catch (e) {
    console.error('[GET /api/fee/student-concessions]', e);
    return err((e as Error).message ?? 'Internal server error', 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const { id } = await req.json();
    if (!id) return err('id is required');

    const con = await db.studentConcession.findFirst({
      where: { id, assignment: { tenantId: session.user.tenantId } },
    });
    if (!con) return err('Not found', 404);

    await db.studentConcession.delete({ where: { id } });
    return ok({ success: true });
  } catch (e) {
    console.error('[DELETE /api/fee/student-concessions]', e);
    return err((e as Error).message ?? 'Internal server error', 500);
  }
}

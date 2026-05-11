import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { gradeId: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const grade = await db.grade.findFirst({
    where: { id: params.gradeId, tenantId: session.user.tenantId },
    include: { _count: { select: { students: true } } },
  });
  if (!grade) return err('Grade not found', 404);

  const body = await req.json() as {
    name?: string;
    isExamClass?: boolean;
    isActive?: boolean;
    displayOrder?: number;
  };

  if (body.isActive === false && grade._count.students > 0) {
    return err(`Cannot deactivate — ${grade._count.students} student(s) enrolled in this class`);
  }

  const updated = await db.grade.update({
    where: { id: params.gradeId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.isExamClass !== undefined && { isExamClass: body.isExamClass }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.displayOrder !== undefined && { displayOrder: body.displayOrder }),
    },
    include: {
      sections: { orderBy: { name: 'asc' } },
      _count: { select: { students: true } },
    },
  });

  return ok(updated);
}

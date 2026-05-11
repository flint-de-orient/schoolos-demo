import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { gradeId: string; sectionId: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const section = await db.section.findFirst({
    where: { id: params.sectionId, gradeId: params.gradeId, tenantId: session.user.tenantId },
    include: { _count: { select: { students: true } } },
  });
  if (!section) return err('Section not found', 404);

  const body = await req.json() as { name?: string; roomNumber?: string; isActive?: boolean };

  if (body.isActive === false && section._count.students > 0) {
    return err(`Cannot deactivate — ${section._count.students} student(s) enrolled in this section`);
  }

  const updated = await db.section.update({
    where: { id: params.sectionId },
    data: {
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.roomNumber !== undefined && { roomNumber: body.roomNumber.trim() || null }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
    include: { _count: { select: { students: true } } },
  });

  return ok(updated);
}

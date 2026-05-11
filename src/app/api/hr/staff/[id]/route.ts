import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { Decimal } from '@prisma/client/runtime/library';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const existing = await db.staff.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return err('Staff not found', 404);

  const body = await req.json();
  const { salary, designation, department, phone, email, qualification } = body;

  if (salary !== undefined && Number(salary) < 0) return err('Salary cannot be negative');

  const updated = await db.staff.update({
    where: { id: params.id },
    data: {
      ...(salary !== undefined && { salary: salary ? new Decimal(salary) : null }),
      ...(designation !== undefined && { designation }),
      ...(department !== undefined && { department }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(qualification !== undefined && { qualification }),
    },
    select: { id: true, salary: true, designation: true, department: true },
  });

  return ok(updated);
}

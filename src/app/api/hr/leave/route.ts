import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { LeaveStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status') as LeaveStatus | null;

  const requests = await db.leaveRequest.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(status && { status }),
    },
    include: {
      teacher: { select: { id: true, name: true, designation: true } },
      staff: { select: { id: true, name: true, designation: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return ok(requests);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { teacherId, staffId, leaveType, fromDate, toDate, reason } = body;

  if (!leaveType || !fromDate || !toDate) {
    return err('leaveType, fromDate and toDate are required');
  }

  const from = new Date(fromDate);
  const to = new Date(toDate);
  const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const request = await db.leaveRequest.create({
    data: {
      tenantId: session.user.tenantId,
      teacherId: teacherId ?? null,
      staffId: staffId ?? null,
      leaveType,
      fromDate: from,
      toDate: to,
      days,
      reason,
      status: 'PENDING',
    },
  });

  return ok(request, 201);
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { id, status } = body;

  if (!id || !status) return err('id and status are required');

  const updated = await db.leaveRequest.updateMany({
    where: { id, tenantId: session.user.tenantId },
    data: { status, approvedAt: status === 'APPROVED' ? new Date() : null },
  });

  if (updated.count === 0) return err('Leave request not found', 404);

  return ok({ success: true });
}

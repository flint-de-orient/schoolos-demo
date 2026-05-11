import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { DeviceType } from '@prisma/client';

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const cards = await db.studentCard.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      student: {
        select: {
          id: true, name: true, admissionNo: true,
          grade: { select: { name: true } },
          section: { select: { name: true } },
        },
      },
    },
    orderBy: { assignedAt: 'desc' },
  });

  return ok(cards);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { studentId, cardUid, faceId, deviceType } = await req.json();
  if (!studentId || !deviceType) return err('studentId and deviceType are required');
  if (!cardUid && !faceId) return err('cardUid or faceId is required');

  const student = await db.student.findFirst({
    where: { id: studentId, tenantId: session.user.tenantId, deletedAt: null },
  });
  if (!student) return err('Student not found', 404);

  // Deactivate any previous card of same type for this student
  await db.studentCard.updateMany({
    where: { tenantId: session.user.tenantId, studentId, deviceType: deviceType as DeviceType },
    data: { isActive: false },
  });

  const card = await db.studentCard.create({
    data: {
      tenantId: session.user.tenantId,
      studentId,
      cardUid: cardUid ?? null,
      faceId: faceId ?? null,
      deviceType: deviceType as DeviceType,
    },
    include: {
      student: { select: { id: true, name: true, admissionNo: true } },
    },
  });

  return ok(card, 201);
}

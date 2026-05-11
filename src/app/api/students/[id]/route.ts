import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { Gender, BloodGroup } from '@prisma/client';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const student = await db.student.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, deletedAt: null },
    include: {
      grade: true,
      section: true,
      parents: { include: { parent: true } },
      medical: true,
      documents: true,
      achievements: true,
      feeAccount: {
        include: {
          installments: { orderBy: { dueDate: 'asc' } },
          transactions: { orderBy: { transactedAt: 'desc' }, take: 5 },
        },
      },
      attendanceRecords: {
        include: { session: true },
        orderBy: { session: { date: 'desc' } },
        take: 30,
      },
      bookIssues: { include: { book: true }, where: { status: 'ISSUED' } },
      healthLogs: { orderBy: { date: 'desc' }, take: 10 },
      behaviourLogs: { orderBy: { loggedAt: 'desc' }, take: 5 },
      learningPlans: { where: { isActive: true }, take: 1 },
      boardPredictions: { orderBy: { generatedAt: 'desc' }, take: 1 },
    },
  });

  if (!student) return err('Student not found', 404);
  return ok(student);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();

  const student = await db.student.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, deletedAt: null },
    include: { parents: { where: { isPrimary: true }, take: 1 } },
  });
  if (!student) return err('Student not found', 404);

  const updated = await db.student.update({
    where: { id: params.id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.rollNo !== undefined && { rollNo: body.rollNo }),
      ...(body.house !== undefined && { house: body.house }),
      ...(body.address !== undefined && { address: body.address }),
      ...(body.city !== undefined && { city: body.city }),
      ...(body.state !== undefined && { state: body.state }),
      ...(body.pincode !== undefined && { pincode: body.pincode }),
      ...(body.religion !== undefined && { religion: body.religion }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.sectionId && { sectionId: body.sectionId }),
      ...(body.gradeId && { gradeId: body.gradeId }),
      ...(body.gender && { gender: body.gender as Gender }),
      ...(body.bloodGroup && { bloodGroup: body.bloodGroup as BloodGroup }),
      ...(body.dateOfBirth && { dateOfBirth: new Date(body.dateOfBirth) }),
    },
    include: {
      grade: { select: { name: true } },
      section: { select: { name: true } },
    },
  });

  // Upsert parent data if provided
  const { fatherName, motherName, phone, email, occupation } = body;
  if (fatherName !== undefined || motherName !== undefined || phone !== undefined) {
    const existingLink = student.parents[0];
    if (existingLink) {
      // Update the existing primary parent record
      await db.parent.update({
        where: { id: existingLink.parentId },
        data: {
          ...(fatherName !== undefined && { fatherName: fatherName || null }),
          ...(motherName !== undefined && { motherName: motherName || null }),
          ...(phone && { phone }),
          ...(email !== undefined && { email: email || null }),
          ...(occupation !== undefined && { occupation: occupation || null }),
        },
      });
    } else if (fatherName || motherName || phone) {
      // No parent yet — create one
      const parent = await db.parent.create({
        data: {
          tenantId: session.user.tenantId,
          fatherName: fatherName || null,
          motherName: motherName || null,
          phone: phone || '0000000000',
          email: email || null,
          occupation: occupation || null,
        },
      });
      await db.studentParent.create({
        data: {
          studentId: params.id,
          parentId: parent.id,
          relation: fatherName ? 'Father' : 'Mother',
          isPrimary: true,
        },
      });
    }
  }

  return ok(updated);
}

// PATCH: toggle isActive (deactivate / reactivate)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { isActive } = body;

  const student = await db.student.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, deletedAt: null },
  });
  if (!student) return err('Student not found', 404);

  if (typeof isActive !== 'boolean') {
    return err('isActive (boolean) is required');
  }

  const updated = await db.student.update({
    where: { id: params.id },
    data: { isActive },
  });

  return ok(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const student = await db.student.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, deletedAt: null },
  });
  if (!student) return err('Student not found', 404);

  await db.student.update({
    where: { id: params.id },
    data: { deletedAt: new Date(), isActive: false },
  });

  return ok({ success: true });
}

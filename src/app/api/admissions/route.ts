import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { AdmissionStage, AdmissionSource } from '@prisma/client';
import { notifyAdmissionStage } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get('q') ?? '';
  const stage = searchParams.get('stage') as AdmissionStage | null;
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.min(100, Number(searchParams.get('limit') ?? 50));

  const where = {
    tenantId: session.user.tenantId,
    ...(stage && { stage }),
    ...(search && {
      OR: [
        { studentName: { contains: search, mode: 'insensitive' as const } },
        { parentName: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search } },
      ],
    }),
  };

  const [total, inquiries] = await Promise.all([
    db.admissionInquiry.count({ where }),
    db.admissionInquiry.findMany({
      where,
      orderBy: { inquiryDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  // Stage counts for kanban
  const stageCounts = await db.admissionInquiry.groupBy({
    by: ['stage'],
    where: { tenantId: session.user.tenantId },
    _count: { _all: true },
  });

  return ok({ data: inquiries, total, page, limit, stageCounts });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { studentName, parentName, phone, email, applyingForGrade, source, notes } = body;

  if (!studentName || !parentName || !phone || !applyingForGrade) {
    return err('studentName, parentName, phone and applyingForGrade are required');
  }

  const inquiry = await db.admissionInquiry.create({
    data: {
      tenantId: session.user.tenantId,
      studentName,
      parentName,
      phone,
      email,
      applyingForGrade,
      source: (source as AdmissionSource) ?? AdmissionSource.WALK_IN,
      stage: AdmissionStage.INQUIRY,
      notes,
    },
  });

  return ok(inquiry, 201);
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { id, stage, followUpDate, notes, assignedTo } = body;

  if (!id || !stage) return err('id and stage are required');

  const inquiry = await db.admissionInquiry.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });
  if (!inquiry) return err('Inquiry not found', 404);

  const updated = await db.admissionInquiry.update({
    where: { id },
    data: {
      stage: stage as AdmissionStage,
      followUpDate: followUpDate ? new Date(followUpDate) : undefined,
      notes,
      assignedTo,
    },
  });

  // Fire WhatsApp notification for stage change (non-blocking)
  if (updated.phone) {
    notifyAdmissionStage(
      session.user.tenantId,
      updated.phone,
      updated.parentName,
      updated.studentName,
      updated.applyingForGrade,
      stage
    ).catch(() => {});
  }

  return ok(updated);
}

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { InterviewStatus, InterviewRecommendation, AdmissionStage } from '@prisma/client';
import { notifyParentQueueAdvance } from '@/lib/notify-parent';
import { getSmsCredentials } from '@/lib/integration-credentials';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const interview = await db.interviewSchedule.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: { inquiry: true },
  });
  if (!interview) return err('Interview not found', 404);

  const body = await req.json();
  const { status, feedback, recommendation } = body;

  const updated = await db.interviewSchedule.update({
    where: { id: params.id },
    data: {
      ...(status         && { status: status as InterviewStatus }),
      ...(feedback       !== undefined && { feedback }),
      ...(recommendation && { recommendation: recommendation as InterviewRecommendation }),
    },
    include: { inquiry: { select: { id: true, studentName: true } } },
  });

  // Auto-advance admission stage based on outcome
  if (status === 'COMPLETED' && recommendation) {
    const nextStage =
      recommendation === 'ADMIT'  ? AdmissionStage.OFFER_MADE :
      recommendation === 'REJECT' ? AdmissionStage.REJECTED   :
      null; // WAITLIST / HOLD — stay at INTERVIEW_SCHEDULED

    if (nextStage) {
      await db.admissionInquiry.update({
        where: { id: interview.inquiryId },
        data:  { stage: nextStage, updatedAt: new Date() },
      });
    }
  }

  // ── Queue advancement on NO_SHOW ────────────────────────────────────────────
  // Find the next pending interview for this date (higher queue number),
  // bump their queueNo down by 1, and notify them if a slot opened up.
  if (status === 'NO_SHOW') {
    const nextInQueue = await db.interviewSchedule.findFirst({
      where: {
        tenantId: session.user.tenantId,
        date: interview.date,
        queueNo: { gt: interview.queueNo },
        status: 'SCHEDULED',
      },
      orderBy: { queueNo: 'asc' },
      include: { inquiry: true },
    });

    if (nextInQueue) {
      // Re-number: decrement queueNo for all interviews after the no-show
      await db.interviewSchedule.updateMany({
        where: {
          tenantId: session.user.tenantId,
          date: interview.date,
          queueNo: { gt: interview.queueNo },
          status: 'SCHEDULED',
        },
        data: { queueNo: { decrement: 1 } },
      });

      // Notify next parent that a slot opened earlier
      if (nextInQueue.inquiry.phone) {
        const fmt12 = (t: string) => {
          const [h, m] = t.split(':').map(Number);
          const ampm = h >= 12 ? 'PM' : 'AM';
          const h12  = h > 12 ? h - 12 : h === 0 ? 12 : h;
          return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
        };
        const dateFormatted = new Date(interview.date).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'long', year: 'numeric',
        });
        const smsCreds = await getSmsCredentials(session.user.tenantId).catch(() => null);
        await notifyParentQueueAdvance({
          phone:        nextInQueue.inquiry.phone,
          studentName:  nextInQueue.inquiry.studentName,
          newTime:      fmt12(interview.startTime),
          originalTime: fmt12(nextInQueue.startTime),
          date:         dateFormatted,
          smsCreds,
        }).catch(() => { /* non-fatal */ });
      }
    }
  }

  return ok(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const interview = await db.interviewSchedule.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!interview) return err('Interview not found', 404);

  await db.interviewSchedule.delete({ where: { id: params.id } });

  // Revert stage to DOCUMENTS_VERIFIED
  await db.admissionInquiry.update({
    where: { id: interview.inquiryId },
    data:  { stage: AdmissionStage.DOCUMENTS_VERIFIED, updatedAt: new Date() },
  });

  // Re-number remaining interviews for this date
  const remaining = await db.interviewSchedule.findMany({
    where: {
      tenantId: session.user.tenantId,
      date: interview.date,
      queueNo: { gt: interview.queueNo },
      status: 'SCHEDULED',
    },
    orderBy: { queueNo: 'asc' },
  });

  for (const r of remaining) {
    await db.interviewSchedule.update({
      where: { id: r.id },
      data:  { queueNo: { decrement: 1 } },
    });
  }

  return ok({ success: true });
}

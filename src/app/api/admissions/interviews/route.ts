import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { InterviewMode, InterviewStatus, AdmissionStage } from '@prisma/client';
import { createMeeting } from '@/lib/meeting-providers';
import { notifyParentInterview } from '@/lib/notify-parent';
import { getZoomCredentials, getGmeetCredentials, getSmsCredentials } from '@/lib/integration-credentials';

// ─── GET — list interviews (filter by date or all) ───────────────────────────

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const date     = searchParams.get('date');   // "2026-05-06"
  const status   = searchParams.get('status') as InterviewStatus | null;

  const where = {
    tenantId: session.user.tenantId,
    ...(date   && { date: new Date(date) }),
    ...(status && { status }),
  };

  const interviews = await db.interviewSchedule.findMany({
    where,
    include: {
      inquiry: {
        select: {
          id: true, studentName: true, parentName: true,
          phone: true, applyingForGrade: true, stage: true,
        },
      },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });

  return ok(interviews);
}

// ─── POST — create interview + generate meeting link + notify parent ──────────

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const {
    inquiryId,
    date,          // "2026-05-06"
    startTime,     // "10:00"
    duration = 15,
    mode = 'PHYSICAL',
    roomOrLink,
    interviewerName,
    notifyParent = true,
  } = body;

  if (!inquiryId || !date || !startTime) {
    return err('inquiryId, date and startTime are required');
  }

  // Verify inquiry belongs to tenant
  const inquiry = await db.admissionInquiry.findFirst({
    where: { id: inquiryId, tenantId: session.user.tenantId },
  });
  if (!inquiry) return err('Inquiry not found', 404);

  // Check for existing interview (upsert-like: delete old first)
  const existing = await db.interviewSchedule.findUnique({ where: { inquiryId } });
  if (existing) {
    await db.interviewSchedule.delete({ where: { inquiryId } });
  }

  // Count interviews already on this date to assign queue number
  const sameDay = await db.interviewSchedule.count({
    where: { tenantId: session.user.tenantId, date: new Date(date) },
  });
  const queueNo = sameDay + 1;

  // Compute endTime
  const [h, m] = startTime.split(':').map(Number);
  const endMins = h * 60 + m + duration;
  const endTime = `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;

  // Generate meeting link if online
  let meetingLink  = roomOrLink ?? null;
  let meetingId    = null as string | null;
  let passcode     = null as string | null;

  if (mode === 'ZOOM' || mode === 'GMEET') {
    const [zoomCreds, gmeetCreds] = await Promise.all([
      getZoomCredentials(session.user.tenantId),
      getGmeetCredentials(session.user.tenantId),
    ]);
    const startDT = new Date(`${date}T${startTime}:00+05:30`);
    const result  = await createMeeting({
      mode:        mode as 'ZOOM' | 'GMEET',
      topic:       `Admission Interview — ${inquiry.studentName} (${inquiry.applyingForGrade})`,
      startTime:   startDT,
      durationMins: duration,
      zoomCreds,
      gmeetCreds,
    });
    meetingLink = result.link;
    meetingId   = result.meetingId ?? null;
    passcode    = result.passcode ?? null;
  }

  // Create the schedule
  const interview = await db.interviewSchedule.create({
    data: {
      tenantId:        session.user.tenantId,
      inquiryId,
      date:            new Date(date),
      startTime,
      endTime,
      duration,
      mode:            mode as InterviewMode,
      roomOrLink:      meetingLink,
      meetingId,
      meetingPasscode: passcode,
      interviewerName: interviewerName ?? null,
      queueNo,
      status:          'SCHEDULED',
    },
    include: { inquiry: true },
  });

  // Advance admission stage to INTERVIEW_SCHEDULED
  await db.admissionInquiry.update({
    where: { id: inquiryId },
    data:  { stage: AdmissionStage.INTERVIEW_SCHEDULED, updatedAt: new Date() },
  });

  // Notify parent
  let parentNotified = false;
  if (notifyParent && inquiry.phone) {
    const smsCreds     = await getSmsCredentials(session.user.tenantId);
    const dateFormatted = new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const [hh, mm] = startTime.split(':');
    const h12 = Number(hh);
    const ampm = h12 >= 12 ? 'PM' : 'AM';
    const timeFormatted = `${h12 > 12 ? h12 - 12 : h12 || 12}:${mm} ${ampm}`;
    const modeLabel = mode === 'GMEET' ? 'Google Meet' : mode === 'ZOOM' ? 'Zoom' : 'In-Person (Physical)';

    const result = await notifyParentInterview({
      phone:           inquiry.phone,
      studentName:     inquiry.studentName,
      date:            dateFormatted,
      startTime:       timeFormatted,
      mode:            modeLabel,
      meetingLink:     meetingLink ?? undefined,
      passcode:        passcode ?? undefined,
      interviewerName: interviewerName ?? undefined,
      queueNo,
      smsCreds,
    });
    parentNotified = result.sent;

    if (parentNotified) {
      await db.interviewSchedule.update({
        where: { id: interview.id },
        data:  { parentNotified: true },
      });
    }
  }

  return ok({ ...interview, parentNotified }, 201);
}

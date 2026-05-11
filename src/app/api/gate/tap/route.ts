import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, err } from '@/lib/api-auth';
import { GateEventType, AttendanceSource } from '@prisma/client';
import { notifyGateEvent } from '@/lib/notifications';

/**
 * POST /api/gate/tap
 * Public webhook called by RFID readers / face-cam controllers.
 * Auth: Authorization: Bearer <deviceToken>
 *
 * Body:
 *   { uid?: string, faceId?: string, direction: "ENTRY"|"EXIT", timestamp?: string }
 *
 * On first ENTRY of the day for a resolved student, auto-marks AttendanceRecord.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const deviceToken = authHeader.replace('Bearer ', '').trim();
  if (!deviceToken) return err('Authorization header required', 401);

  const device = await db.gateDevice.findUnique({
    where: { deviceToken },
    include: { tenant: { select: { id: true, name: true } } },
  });
  if (!device || !device.isActive) return err('Device not found or inactive', 401);

  await db.gateDevice.update({
    where: { id: device.id },
    data: { lastSeenAt: new Date() },
  });

  const body = await req.json().catch(() => ({}));
  const { uid, faceId, direction, timestamp } = body;

  if (!direction || !['ENTRY', 'EXIT'].includes(direction)) {
    return err('direction must be ENTRY or EXIT');
  }
  if (!uid && !faceId) return err('uid or faceId is required');

  const tappedAt = timestamp ? new Date(timestamp) : new Date();
  const tenantId = device.tenantId;
  const eventType: GateEventType = direction === 'ENTRY' ? 'ENTRY' : 'EXIT';

  // Resolve student from card / face
  const card = await db.studentCard.findFirst({
    where: {
      tenantId,
      isActive: true,
      ...(uid ? { cardUid: uid } : { faceId }),
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          sectionId: true,
          parents: {
            where: { isPrimary: true },
            take: 1,
            include: {
              parent: { select: { phone: true, fatherName: true, motherName: true, guardianName: true } },
            },
          },
        },
      },
    },
  });

  const resolved = !!card;
  const studentId = card?.student.id ?? null;

  // Log the gate event
  await db.gateEvent.create({
    data: {
      tenantId,
      studentId,
      type: eventType,
      gateDeviceId: device.id,
      rawUid: uid ?? faceId ?? null,
      resolved,
      scanMethod: device.deviceType,
      timestamp: tappedAt,
    },
  });

  let attendanceMarked = false;
  let attendanceStatus: string | null = null;

  // Auto-mark attendance on first ENTRY of the day
  if (resolved && card && direction === 'ENTRY') {
    const todayStart = new Date(tappedAt);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(tappedAt);
    todayEnd.setHours(23, 59, 59, 999);

    // Check if attendance already marked today for this student (any session)
    const existingRecord = await db.attendanceRecord.findFirst({
      where: {
        studentId: card.student.id,
        session: { date: { gte: todayStart, lte: todayEnd } },
      },
    });

    if (!existingRecord) {
      // Determine PRESENT or LATE based on school settings
      const settings = await db.tenantGateSettings.findUnique({ where: { tenantId } });
      const schoolStartTime = settings?.schoolStartTime ?? '08:00';
      const lateThresholdMins = settings?.lateThresholdMins ?? 15;

      const [sh, sm] = schoolStartTime.split(':').map(Number);
      const schoolStartMs = (sh * 60 + sm + lateThresholdMins) * 60 * 1000;
      const tappedMs = (tappedAt.getHours() * 60 + tappedAt.getMinutes()) * 60 * 1000;
      const status = tappedMs > schoolStartMs ? 'LATE' : 'PRESENT';

      const source: AttendanceSource = faceId ? 'GATE_FACE' : 'GATE_RFID';

      // Find or create today's whole-day session for this section
      const dateOnly = new Date(todayStart);
      const session = await db.attendanceSession.upsert({
        where: {
          sectionId_date_periodNo: {
            sectionId: card.student.sectionId,
            date: dateOnly,
            periodNo: 0,
          },
        },
        create: {
          tenantId,
          sectionId: card.student.sectionId,
          date: dateOnly,
          periodNo: 0,
          markedAt: new Date(),
        },
        update: {},
      });

      await db.attendanceRecord.create({
        data: {
          sessionId: session.id,
          studentId: card.student.id,
          status: status === 'LATE' ? 'LATE' : 'PRESENT',
          source,
          markedAt: tappedAt,
        },
      });

      attendanceMarked = true;
      attendanceStatus = status;
    }
  }

  // Send notification if student identified
  if (resolved && card) {
    const settings = await db.tenantGateSettings.findUnique({ where: { tenantId } });
    const trigger = settings?.notifyTrigger ?? 'BOTH';
    const channel = settings?.notifyChannel ?? 'WHATSAPP';

    const shouldNotify =
      trigger === 'BOTH' ||
      (trigger === 'ENTRY' && direction === 'ENTRY') ||
      (trigger === 'EXIT' && direction === 'EXIT');

    if (shouldNotify && channel !== 'NONE') {
      const sp = card.student.parents[0];
      if (sp?.parent?.phone) {
        const p = sp.parent;
        const parentName = p.fatherName ?? p.motherName ?? p.guardianName ?? 'Parent';
        notifyGateEvent(
          tenantId,
          sp.parent.phone,
          parentName,
          card.student.name,
          direction as 'ENTRY' | 'EXIT',
          tappedAt,
          device.label,
          channel,
        ).catch(() => {});
      }
    }
  }

  return ok({
    resolved,
    studentName: card?.student.name ?? null,
    direction,
    timestamp: tappedAt.toISOString(),
    attendanceMarked,
    attendanceStatus,
  });
}

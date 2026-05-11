import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ok, err } from '@/lib/api-auth';
import { GateEventType } from '@prisma/client';
import { notifyGateEvent } from '@/lib/notifications';

/**
 * POST /api/gate/tap
 * Public webhook called by RFID readers / face-cam controllers.
 * Auth: Authorization: Bearer <deviceToken>
 *
 * Body:
 *   { uid?: string, faceId?: string, direction: "ENTRY"|"EXIT", timestamp?: string }
 *
 * Works for all three hardware types:
 *   HF_RFID  — uid is the card UID read at close range
 *   UHF_RFID — uid is the card UID read at gate antenna
 *   FACE_CAM — faceId is the person ID returned by the camera vendor
 */
export async function POST(req: NextRequest) {
  // Authenticate device via Bearer token
  const authHeader = req.headers.get('authorization') ?? '';
  const deviceToken = authHeader.replace('Bearer ', '').trim();
  if (!deviceToken) return err('Authorization header required', 401);

  const device = await db.gateDevice.findUnique({
    where: { deviceToken },
    include: { tenant: { select: { id: true, name: true } } },
  });
  if (!device || !device.isActive) return err('Device not found or inactive', 401);

  // Update last seen
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
  });
}

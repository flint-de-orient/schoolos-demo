import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { sendWhatsAppTemplate } from '@/lib/whatsapp';

// POST /api/timetable/publish
// Marks the active timetable as published to parents and sends WhatsApp notifications.
export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;
  const body = await req.json() as { timetableId: string };
  const { timetableId } = body;

  if (!timetableId) return err('timetableId is required', 400);

  const timetable = await db.timetable.findFirst({
    where: { id: timetableId, tenantId },
  });

  if (!timetable) return err('Timetable not found', 404);

  // Mark as published
  const now = new Date();
  await db.timetable.update({
    where: { id: timetableId },
    data: {
      isPublishedToParents: true,
      parentPublishedAt: now,
    },
  });

  // Find all sections covered by this timetable
  const sectionIds = await db.timetableEntry.findMany({
    where: { timetableId },
    select: { sectionId: true },
    distinct: ['sectionId'],
  });

  const uniqueSectionIds = sectionIds.map(r => r.sectionId);

  // Fetch all students in those sections with their parents' phones
  const students = await db.student.findMany({
    where: { sectionId: { in: uniqueSectionIds }, isActive: true },
    select: {
      id: true,
      name: true,
      section: {
        select: {
          name: true,
          grade: { select: { name: true } },
        },
      },
      parents: {
        where: { isPrimary: true },
        select: {
          parent: {
            select: {
              fatherName: true,
              motherName: true,
              guardianName: true,
              phone: true,
            },
          },
        },
        take: 1,
      },
    },
  });

  const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
  const schoolName = tenant?.name ?? 'Your school';

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  const notifications = students.map(async (student) => {
    const parentLink = student.parents[0]?.parent;
    if (!parentLink?.phone) { skipped++; return; }

    const parentName = parentLink.fatherName ?? parentLink.guardianName ?? parentLink.motherName ?? 'Parent';
    const gradeName = student.section.grade.name;
    const sectionName = student.section.name;
    const className = `${gradeName} ${sectionName}`;

    const result = await sendWhatsAppTemplate(
      tenantId,
      parentLink.phone,
      'timetable_published',
      [parentName, student.name, className, schoolName],
      undefined,
      parentName
    );

    if (result.success) sent++;
    else failed++;
  });

  await Promise.allSettled(notifications);

  return ok({
    published: true,
    parentPublishedAt: now.toISOString(),
    notificationsSent: sent,
    notificationsFailed: failed,
    notificationsSkipped: skipped,
    totalStudents: students.length,
  });
}

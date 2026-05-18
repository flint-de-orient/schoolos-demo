import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { notifyAbsent } from '@/lib/notifications';

// POST /api/attendance/notify
// Body: { sessionId, studentId }  — resend absent notification for one student
export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { sessionId, studentId } = body;
  if (!sessionId || !studentId) return err('sessionId and studentId are required');

  const tenantId = session.user.tenantId;

  const record = await db.attendanceRecord.findFirst({
    where: {
      sessionId,
      studentId,
      status: 'ABSENT',
      session: { tenantId },
    },
    include: {
      session: { select: { date: true } },
      student: {
        include: {
          section: { include: { grade: { select: { name: true } } } },
          parents: {
            where: { isPrimary: true },
            take: 1,
            include: { parent: { select: { phone: true, fatherName: true, motherName: true, guardianName: true } } },
          },
        },
      },
    },
  });

  if (!record) return err('Absent record not found', 404);

  const sp = record.student.parents[0];
  if (!sp?.parent?.phone) return err('No parent phone number on file', 422);

  const p = sp.parent;
  const parentName = p.fatherName ?? p.motherName ?? p.guardianName ?? 'Parent';
  const className = `${record.student.section.grade.name} - ${record.student.section.name}`;
  const dateStr = new Date(record.session.date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  await notifyAbsent(tenantId, sp.parent.phone, parentName, record.student.name, className, dateStr);

  await db.attendanceRecord.update({
    where: { id: record.id },
    data: { parentNotified: true },
  });

  return ok({ sent: true, studentName: record.student.name });
}

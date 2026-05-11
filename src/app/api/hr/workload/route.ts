import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok } from '@/lib/api-auth';

export async function GET(_req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;

  // Find active timetable for this tenant
  const activeTimetable = await db.timetable.findFirst({
    where: { tenantId, status: 'ACTIVE' },
    select: { id: true, label: true },
    orderBy: { publishedAt: 'desc' },
  });

  // Get all teachers for this tenant
  const teachers = await db.teacher.findMany({
    where: { tenantId, isActive: true },
    select: {
      id: true, name: true, type: true, designation: true, department: true,
      maxPeriodsWeek: true,
      subjects: { include: { subject: { select: { name: true } } } },
    },
    orderBy: { name: 'asc' },
  });

  // Count timetable entries per teacher if active timetable exists
  const periodCounts: Record<string, number> = {};
  if (activeTimetable) {
    const entries = await db.timetableEntry.groupBy({
      by: ['teacherId'],
      where: { timetableId: activeTimetable.id },
      _count: { id: true },
    });
    for (const e of entries) {
      periodCounts[e.teacherId] = e._count.id;
    }
  }

  const workload = teachers.map(t => ({
    id: t.id,
    name: t.name,
    type: t.type,
    designation: t.designation,
    department: t.department,
    subject: t.subjects?.[0]?.subject?.name ?? null,
    periodsPerWeek: periodCounts[t.id] ?? 0,
    maxPeriodsWeek: t.maxPeriodsWeek,
  }));

  return ok({ workload, timetable: activeTimetable });
}

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok } from '@/lib/api-auth';

export interface WorkloadRow {
  teacherId: string;
  teacherName: string;
  subjects: { subjectId: string; subjectName: string; periodsPerWeek: number; sections: string[] }[];
  totalPeriods: number;
}

// GET /api/timetable/workload
// Returns per-teacher period counts across all sections of the active timetable.
export async function GET(_req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const timetable = await db.timetable.findFirst({
    where: { tenantId: session.user.tenantId, status: 'ACTIVE' },
    select: { id: true, label: true, isPublishedToParents: true, parentPublishedAt: true },
  });

  if (!timetable) return ok({ rows: [], timetable: null });

  const entries = await db.timetableEntry.findMany({
    where: { timetableId: timetable.id },
    select: {
      teacherId: true,
      teacher: { select: { name: true } },
      subjectId: true,
      subject: { select: { name: true } },
      section: { select: { name: true, grade: { select: { name: true } } } },
    },
  });

  // Aggregate: teacher → subject → set of sections + count
  const map = new Map<string, {
    teacherName: string;
    subjects: Map<string, { subjectName: string; count: number; sections: Set<string> }>;
  }>();

  for (const e of entries) {
    if (!map.has(e.teacherId)) {
      map.set(e.teacherId, { teacherName: e.teacher.name, subjects: new Map() });
    }
    const teacher = map.get(e.teacherId)!;
    const subKey = e.subjectId;
    if (!teacher.subjects.has(subKey)) {
      teacher.subjects.set(subKey, { subjectName: e.subject.name, count: 0, sections: new Set() });
    }
    const sub = teacher.subjects.get(subKey)!;
    sub.count++;
    sub.sections.add(`${e.section.grade.name}-${e.section.name}`);
  }

  const rows: WorkloadRow[] = [];
  for (const [teacherId, teacher] of map.entries()) {
    const subjects = [...teacher.subjects.entries()].map(([subjectId, s]) => ({
      subjectId,
      subjectName: s.subjectName,
      periodsPerWeek: s.count,
      sections: [...s.sections].sort(),
    })).sort((a, b) => b.periodsPerWeek - a.periodsPerWeek);

    rows.push({
      teacherId,
      teacherName: teacher.teacherName,
      subjects,
      totalPeriods: subjects.reduce((sum, s) => sum + s.periodsPerWeek, 0),
    });
  }

  rows.sort((a, b) => b.totalPeriods - a.totalPeriods);

  return ok({ rows, timetable });
}

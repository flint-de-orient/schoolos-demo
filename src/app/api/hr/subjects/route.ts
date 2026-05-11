import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET(_req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const subjects = await db.subject.findMany({
    where: { tenantId: session.user.tenantId },
    select: {
      id: true, name: true, code: true, colorHex: true,
      isElective: true, isLanguage: true, isPractical: true,
      _count: { select: { teacherSubjects: true, timetableEntries: true } },
    },
    orderBy: { name: 'asc' },
  });

  return ok({ subjects });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { name, code, colorHex, isElective, isLanguage, isPractical } = body;

  if (!name?.trim()) return err('Subject name is required');

  const subject = await db.subject.create({
    data: {
      tenantId: session.user.tenantId,
      name: name.trim(),
      code: code?.trim() || null,
      colorHex: colorHex || null,
      isElective: !!isElective,
      isLanguage: !!isLanguage,
      isPractical: !!isPractical,
    },
  });

  return ok(subject, 201);
}

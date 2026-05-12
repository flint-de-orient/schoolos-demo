import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET(_req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const groups = await db.gradeGroup.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      grades: {
        select: { id: true, name: true, displayOrder: true },
        orderBy: { displayOrder: 'asc' },
      },
    },
    orderBy: { displayOrder: 'asc' },
  });

  // Also return all grades so the UI can show unassigned grades
  const allGrades = await db.grade.findMany({
    where: { tenantId: session.user.tenantId, isActive: true },
    select: { id: true, name: true, displayOrder: true, gradeGroupId: true },
    orderBy: { displayOrder: 'asc' },
  });

  return ok({ groups, allGrades });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;
  const body = await req.json() as {
    name: string;
    displayOrder?: number;
    periodsPerDay?: number;
    periodDuration?: number;
    shortBreakEnabled?: boolean;
    shortBreakAfterPeriod?: number | null;
    shortBreakDuration?: number;
    mainBreakAfterPeriod?: number;
    mainBreakDuration?: number;
    fillerType?: string;
    gradeIds?: string[];
  };

  if (!body.name?.trim()) return err('Group name is required', 400);

  const existing = await db.gradeGroup.findUnique({
    where: { tenantId_name: { tenantId, name: body.name.trim() } },
  });
  if (existing) return err('A group with this name already exists', 409);

  // Count existing groups to set displayOrder
  const count = await db.gradeGroup.count({ where: { tenantId } });

  const group = await db.gradeGroup.create({
    data: {
      tenantId,
      name: body.name.trim(),
      displayOrder: body.displayOrder ?? count,
      periodsPerDay: body.periodsPerDay ?? 8,
      periodDuration: body.periodDuration ?? 40,
      shortBreakEnabled: body.shortBreakEnabled ?? false,
      shortBreakAfterPeriod: body.shortBreakAfterPeriod ?? null,
      shortBreakDuration: body.shortBreakDuration ?? 10,
      mainBreakAfterPeriod: body.mainBreakAfterPeriod ?? 4,
      mainBreakDuration: body.mainBreakDuration ?? 30,
      fillerType: (body.fillerType ?? 'STUDY_PERIOD') as import('@prisma/client').FillerType,
    },
  });

  // Assign grades if provided
  if (body.gradeIds && body.gradeIds.length > 0) {
    await db.grade.updateMany({
      where: { id: { in: body.gradeIds }, tenantId },
      data: { gradeGroupId: group.id },
    });
  }

  const full = await db.gradeGroup.findUnique({
    where: { id: group.id },
    include: { grades: { select: { id: true, name: true, displayOrder: true } } },
  });

  return ok({ group: full }, 201);
}

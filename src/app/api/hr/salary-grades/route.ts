import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { Decimal } from '@prisma/client/runtime/library';

export async function GET(_req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const grades = await db.salaryGrade.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: [{ category: 'asc' }, { basicMin: 'asc' }],
  });

  return ok({ grades });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { name, category, basicMin, basicMax, description } = await req.json();
  if (!name?.trim()) return err('Grade name is required');
  if (!basicMin || !basicMax) return err('Basic range is required');
  if (Number(basicMin) >= Number(basicMax)) return err('basicMin must be less than basicMax');

  const grade = await db.salaryGrade.create({
    data: {
      tenantId: session.user.tenantId,
      name: name.trim(),
      category: category ?? 'ALL',
      basicMin: new Decimal(basicMin),
      basicMax: new Decimal(basicMax),
      description: description?.trim() || null,
    },
  });

  return ok(grade, 201);
}

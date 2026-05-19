import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const plan = await db.feePlan.findFirst({ where: { id: params.id, tenantId: session.user.tenantId } });
    if (!plan) return err('Not found', 404);

    const schedule = await db.feeCustomSchedule.findUnique({
      where: { planId: params.id },
      include: { installments: { orderBy: { displayOrder: 'asc' } } },
    });
    return ok(schedule ?? null);
  } catch (e) {
    console.error('[GET /api/fee/plans/[id]/custom-schedule]', e);
    return err((e as Error).message ?? 'Internal server error', 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const plan = await db.feePlan.findFirst({ where: { id: params.id, tenantId: session.user.tenantId } });
    if (!plan) return err('Not found', 404);

    const body = await req.json();
    const { name, percentage, dueDay, dueMonth } = body;

    if (!name?.trim()) return err('name is required');
    const pct = Number(percentage);
    if (!pct || pct <= 0) return err('percentage must be positive');
    if (!dueDay || dueDay < 1 || dueDay > 31) return err('dueDay must be 1–31');
    if (!dueMonth || dueMonth < 1 || dueMonth > 12) return err('dueMonth must be 1–12');

    const result = await db.$transaction(async (tx) => {
      let schedule = await tx.feeCustomSchedule.findUnique({ where: { planId: params.id } });
      if (!schedule) {
        schedule = await tx.feeCustomSchedule.create({ data: { planId: params.id } });
      }

      // Validate that existing + new percentages don't exceed 100
      const existing = await tx.feeCustomInstallment.findMany({
        where: { scheduleId: schedule.id },
        select: { percentage: true },
      });
      const existingTotal = existing.reduce((s, i) => s + Number(i.percentage), 0);
      const newTotal = existingTotal + pct;
      if (newTotal > 100 + 0.001) { // small epsilon for floating point
        throw new Error(`Total percentage would be ${newTotal.toFixed(2)}% — must not exceed 100%. Currently ${existingTotal.toFixed(2)}% allocated.`);
      }

      const maxOrder = await tx.feeCustomInstallment.aggregate({
        where: { scheduleId: schedule.id },
        _max: { displayOrder: true },
      });
      const installment = await tx.feeCustomInstallment.create({
        data: {
          scheduleId: schedule.id,
          name: name.trim(),
          percentage: pct,
          dueDay: Number(dueDay),
          dueMonth: Number(dueMonth),
          displayOrder: (maxOrder._max.displayOrder ?? -1) + 1,
        },
      });
      return installment;
    });

    return ok(result, 201);
  } catch (e) {
    const msg = (e as Error).message ?? 'Internal server error';
    // Surface percentage validation errors as 400
    if (msg.includes('exceed 100%')) return err(msg, 400);
    console.error('[POST /api/fee/plans/[id]/custom-schedule]', e);
    return err(msg, 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const plan = await db.feePlan.findFirst({ where: { id: params.id, tenantId: session.user.tenantId } });
    if (!plan) return err('Not found', 404);

    const schedule = await db.feeCustomSchedule.findUnique({ where: { planId: params.id } });
    if (!schedule) return ok({ success: true });

    await db.feeCustomSchedule.delete({ where: { planId: params.id } });
    return ok({ success: true });
  } catch (e) {
    console.error('[DELETE /api/fee/plans/[id]/custom-schedule]', e);
    return err((e as Error).message ?? 'Internal server error', 500);
  }
}

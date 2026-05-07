import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; installId: string } },
) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const plan = await db.feePlan.findFirst({ where: { id: params.id, tenantId: session.user.tenantId } });
    if (!plan) return err('Not found', 404);

    const schedule = await db.feeCustomSchedule.findUnique({ where: { planId: params.id } });
    if (!schedule) return err('No custom schedule for this plan', 404);

    await db.feeCustomInstallment.delete({
      where: { id: params.installId, scheduleId: schedule.id },
    });
    return ok({ success: true });
  } catch (e) {
    console.error('[DELETE /api/fee/plans/[id]/custom-schedule/[installId]]', e);
    return err((e as Error).message ?? 'Internal server error', 500);
  }
}

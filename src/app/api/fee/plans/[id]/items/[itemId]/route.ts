import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

async function getItem(planId: string, itemId: string, tenantId: string) {
  const plan = await db.feePlan.findFirst({ where: { id: planId, tenantId } });
  if (!plan) return { item: null, planErr: err('Plan not found', 404) };
  const item = await db.feePlanItem.findFirst({ where: { id: itemId, planId } });
  return { item, planErr: null };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } },
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { item, planErr } = await getItem(params.id, params.itemId, session.user.tenantId);
  if (planErr) return planErr;
  if (!item) return err('Item not found', 404);

  const body = await req.json();
  const updated = await db.feePlanItem.update({
    where: { id: params.itemId },
    data: {
      ...(body.amount != null && { amount: body.amount }),
      ...(body.frequency && { frequency: body.frequency }),
      ...(body.displayOrder !== undefined && { displayOrder: body.displayOrder }),
      ...(body.includeForNewAdmission !== undefined && { includeForNewAdmission: body.includeForNewAdmission }),
    },
    include: { component: true },
  });
  return ok(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; itemId: string } },
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { item, planErr } = await getItem(params.id, params.itemId, session.user.tenantId);
  if (planErr) return planErr;
  if (!item) return err('Item not found', 404);

  const installmentCount = await db.feeInstallment.count({ where: { planItemId: params.itemId } });
  if (installmentCount > 0)
    return err(`Cannot delete — ${installmentCount} installment(s) reference this item`, 400);

  await db.feePlanItem.delete({ where: { id: params.itemId } });
  return ok({ success: true });
}

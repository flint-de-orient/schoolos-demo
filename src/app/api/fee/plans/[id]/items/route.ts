import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const plan = await db.feePlan.findFirst({ where: { id: params.id, tenantId: session.user.tenantId } });
  if (!plan) return err('Not found', 404);

  const items = await db.feePlanItem.findMany({
    where: { planId: params.id },
    include: { component: true },
    orderBy: { displayOrder: 'asc' },
  });
  return ok(items);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const plan = await db.feePlan.findFirst({ where: { id: params.id, tenantId: session.user.tenantId } });
  if (!plan) return err('Not found', 404);

  const body = await req.json();
  const { componentId, amount, frequency, displayOrder, includeForNewAdmission } = body;

  if (!componentId || amount == null) return err('componentId and amount are required');

  const component = await db.feeComponent.findFirst({
    where: { id: componentId, tenantId: session.user.tenantId },
  });
  if (!component) return err('Component not found', 404);

  const existing = await db.feePlanItem.findUnique({
    where: { planId_componentId: { planId: params.id, componentId } },
  });
  if (existing) return err('This component is already in the plan', 409);

  const maxOrder = await db.feePlanItem.aggregate({
    where: { planId: params.id },
    _max: { displayOrder: true },
  });

  const item = await db.feePlanItem.create({
    data: {
      planId: params.id,
      componentId,
      amount,
      frequency: frequency ?? 'ANNUAL',
      displayOrder: displayOrder ?? (maxOrder._max.displayOrder ?? 0) + 1,
      includeForNewAdmission: includeForNewAdmission ?? true,
    },
    include: { component: true },
  });
  return ok(item, 201);
}

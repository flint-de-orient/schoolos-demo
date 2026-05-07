import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET() {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const components = await db.feeComponent.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { displayOrder: 'asc' },
    });
    return ok(components);
  } catch (e) {
    console.error('[GET /api/fee/components]', e);
    return err((e as Error).message ?? 'Internal server error', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const body = await req.json();
    const { name, description, isOptional, isRefundable, displayOrder } = body;
    if (!name?.trim()) return err('name is required');

    const existing = await db.feeComponent.findUnique({
      where: { tenantId_name: { tenantId: session.user.tenantId, name: name.trim() } },
    });
    if (existing) return err('A component with this name already exists', 409);

    const count = await db.feeComponent.count({ where: { tenantId: session.user.tenantId } });
    const comp = await db.feeComponent.create({
      data: {
        tenantId: session.user.tenantId,
        name: name.trim(),
        description: description || null,
        isOptional: isOptional ?? false,
        isRefundable: isRefundable ?? false,
        displayOrder: displayOrder ?? count,
      },
    });
    return ok(comp, 201);
  } catch (e) {
    console.error('[POST /api/fee/components]', e);
    return err((e as Error).message ?? 'Internal server error', 500);
  }
}

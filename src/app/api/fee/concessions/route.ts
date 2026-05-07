import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const concessions = await db.concessionTemplate.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { name: 'asc' },
  });
  return ok(concessions);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { name, type, value, applicableTo, componentIds, isStackable, maxAmount } = body;

  if (!name?.trim() || !type || value == null) return err('name, type, and value are required');

  const existing = await db.concessionTemplate.findUnique({
    where: { tenantId_name: { tenantId: session.user.tenantId, name: name.trim() } },
  });
  if (existing) return err('A concession with this name already exists', 409);

  const concession = await db.concessionTemplate.create({
    data: {
      tenantId: session.user.tenantId,
      name: name.trim(),
      type,
      value,
      applicableTo: applicableTo ?? 'ALL_COMPONENTS',
      componentIds: componentIds ?? [],
      isStackable: isStackable ?? false,
      maxAmount: maxAmount ?? null,
    },
  });
  return ok(concession, 201);
}

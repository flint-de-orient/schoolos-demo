import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const categories = await db.studentCategory.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { name: 'asc' },
  });
  return ok(categories);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { name, description } = await req.json();
  if (!name?.trim()) return err('name is required');

  const existing = await db.studentCategory.findUnique({
    where: { tenantId_name: { tenantId: session.user.tenantId, name: name.trim() } },
  });
  if (existing) return err('Category already exists', 409);

  const cat = await db.studentCategory.create({
    data: { tenantId: session.user.tenantId, name: name.trim(), description },
  });
  return ok(cat, 201);
}

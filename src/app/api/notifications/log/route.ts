import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok } from '@/lib/api-auth';
import { NotificationChannel, MessageStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const channel = searchParams.get('channel') as NotificationChannel | null;
  const status  = searchParams.get('status')  as MessageStatus | null;
  const page    = Math.max(1, Number(searchParams.get('page')  ?? 1));
  const limit   = Math.min(100, Number(searchParams.get('limit') ?? 50));

  const where = {
    tenantId: session.user.tenantId,
    ...(channel && { channel }),
    ...(status  && { status }),
  };

  const [total, logs] = await Promise.all([
    db.outboundLog.count({ where }),
    db.outboundLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const summary = await db.outboundLog.groupBy({
    by: ['status'],
    where: { tenantId: session.user.tenantId },
    _count: { _all: true },
  });

  return ok({ data: logs, total, page, limit, summary });
}

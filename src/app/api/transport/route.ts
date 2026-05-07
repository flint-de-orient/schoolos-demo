import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const routes = await db.transportRoute.findMany({
    where: { tenantId: session.user.tenantId, isActive: true },
    include: {
      stops: { orderBy: { stopOrder: 'asc' } },
      vehicle: {
        include: { driver: true },
      },
      assignments: { select: { id: true } },
    },
    orderBy: { routeName: 'asc' },
  });

  const sosAlerts = await db.sOSAlert.findMany({
    where: { route: { tenantId: session.user.tenantId } },
    include: { route: { select: { routeName: true } } },
    orderBy: { triggeredAt: 'desc' },
    take: 5,
  });

  const routesWithStats = routes.map((r) => ({
    ...r,
    studentsCount: r.assignments.length,
    capacity: r.vehicle?.capacity ?? 0,
  }));

  return ok({ routes: routesWithStats, sosAlerts });
}

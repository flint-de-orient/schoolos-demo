import { db } from '@/lib/db';
import { requireSession, ok } from '@/lib/api-auth';

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;

  // Last 12 months of sessions with their records
  const since = new Date();
  since.setMonth(since.getMonth() - 11);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const sessions = await db.attendanceSession.findMany({
    where: { tenantId, date: { gte: since } },
    select: {
      date: true,
      records: { select: { status: true } },
    },
  });

  // Group by year-month
  const monthMap: Record<string, { present: number; total: number }> = {};
  for (const s of sessions) {
    const d = new Date(s.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap[key]) monthMap[key] = { present: 0, total: 0 };
    for (const r of s.records) {
      monthMap[key].total += 1;
      if (r.status === 'PRESENT' || r.status === 'LATE') monthMap[key].present += 1;
    }
  }

  // Build ordered array for last 12 months
  const result = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
    const { present = 0, total = 0 } = monthMap[key] ?? {};
    result.push({ month: label, percent: total > 0 ? Math.round((present / total) * 100) : null });
  }

  // Only return months with data (trim leading nulls)
  const firstData = result.findIndex(r => r.percent !== null);
  return ok(firstData >= 0 ? result.slice(firstData) : []);
}

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { refreshOverdueStatuses } from '@/lib/fee-overdue';

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const tenantId = session.user.tenantId;
    await refreshOverdueStatuses(tenantId);
    const academicYearId = req.nextUrl.searchParams.get('academicYearId') ?? undefined;

    // Monthly collection: sum of transactions grouped by month
    const transactions = await db.feeTransaction.findMany({
      where: {
        tenantId,
        status: 'SUCCESS',
        ...(academicYearId && { feeAccount: { academicYearId } }),
      },
      select: { amount: true, transactedAt: true },
    });

    // Monthly targets: sum of installments grouped by due month
    const installments = await db.feeInstallment.findMany({
      where: {
        feeAccount: {
          tenantId,
          ...(academicYearId && { academicYearId }),
        },
      },
      select: { amount: true, dueDate: true },
    });

    // Build month buckets (Apr–Mar for Indian academic year)
    const MONTHS = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];

    const collected: Record<string, number> = {};
    const target: Record<string, number> = {};

    for (const tx of transactions) {
      const d = new Date(tx.transactedAt);
      const key = d.toLocaleString('en-US', { month: 'short' });
      collected[key] = (collected[key] ?? 0) + Number(tx.amount);
    }

    for (const inst of installments) {
      const d = new Date(inst.dueDate);
      const key = d.toLocaleString('en-US', { month: 'short' });
      target[key] = (target[key] ?? 0) + Number(inst.amount);
    }

    const monthly = MONTHS.map(m => ({
      month: m,
      collected: Math.round((collected[m] ?? 0) / 1000),
      target: Math.round((target[m] ?? 0) / 1000),
    }));

    // Grade-wise breakdown
    const accountsByGrade = await db.feeAccount.groupBy({
      by: ['gradeId'],
      where: { tenantId, ...(academicYearId && { academicYearId }) },
      _sum: { totalDue: true, totalPaid: true },
    });

    const gradeIds = accountsByGrade.map(g => g.gradeId).filter(Boolean) as string[];
    const grades = await db.grade.findMany({
      where: { id: { in: gradeIds } },
      select: { id: true, name: true },
    });
    const gradeMap = Object.fromEntries(grades.map(g => [g.id, g.name]));

    const gradeWise = accountsByGrade.map(g => ({
      grade: gradeMap[g.gradeId ?? ''] ?? '—',
      collected: Math.round(Number(g._sum.totalPaid ?? 0) / 1000),
      pending: Math.round((Number(g._sum.totalDue ?? 0) - Number(g._sum.totalPaid ?? 0)) / 1000),
    })).sort((a, b) => a.grade.localeCompare(b.grade));

    // Payment mode breakdown
    const txByMode = await db.feeTransaction.groupBy({
      by: ['mode'],
      where: { tenantId, status: 'SUCCESS' },
      _count: { _all: true },
    });

    const modeWise = txByMode.map(m => ({
      mode: m.mode,
      count: m._count._all,
    }));

    return ok({ monthly, gradeWise, modeWise });
  } catch (e) {
    console.error('[GET /api/fee/analytics]', e);
    return err((e as Error).message ?? 'Internal server error', 500);
  }
}

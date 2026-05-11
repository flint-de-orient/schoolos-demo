import { db } from '@/lib/db';
import { requireSession, ok } from '@/lib/api-auth';
import { FeeStatus } from '@prisma/client';

/**
 * POST /api/fee/recalculate
 * Recomputes totalDue, totalPaid, balance, and status for every FeeAccount
 * in the tenant from its actual installments. Fixes accounts that were
 * created with a stale totalDue (e.g. before the frequency-multiplier fix).
 */
export async function POST() {
  const { session, error } = await requireSession();
  if (error) return error;

  const accounts = await db.feeAccount.findMany({
    where: { tenantId: session.user.tenantId },
    select: { id: true },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let fixed = 0;

  for (const { id } of accounts) {
    const installments = await db.feeInstallment.findMany({
      where: { feeAccountId: id },
      select: { amount: true, paidAmount: true, status: true, dueDate: true },
    });

    if (installments.length === 0) continue;

    const raised     = installments.filter(i => i.dueDate <= today);
    const totalDue   = installments.reduce((s, i) => s + Number(i.amount), 0);
    const totalPaid  = installments.reduce((s, i) => s + Number(i.paidAmount), 0);
    const balance    = raised
      .filter(i => i.status !== 'PAID' && i.status !== 'WAIVED')
      .reduce((s, i) => s + Number(i.amount), 0);
    const allPaid    = installments.every(i => i.status === 'PAID' || i.status === 'WAIVED');
    const hasOverdue = raised.some(i => i.status === 'OVERDUE');
    const status: FeeStatus = allPaid ? 'PAID' : hasOverdue ? 'OVERDUE' : 'PENDING';

    await db.feeAccount.update({
      where: { id },
      data: { totalDue, totalPaid, balance, status },
    });
    fixed++;
  }

  return ok({ fixed, total: accounts.length });
}

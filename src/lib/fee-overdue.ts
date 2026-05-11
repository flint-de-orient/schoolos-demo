import { db } from '@/lib/db';
import { FeeStatus } from '@prisma/client';

/**
 * Sweeps past-due PENDING installments → OVERDUE, then recalculates each
 * FeeAccount's balance using only RAISED installments (dueDate ≤ today).
 * Future installments are scheduled but not yet demanded — they must not
 * inflate the current balance. Safe to call on every GET request.
 */
export async function refreshOverdueStatuses(tenantId: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Flip past-due PENDING installments to OVERDUE
  await db.feeInstallment.updateMany({
    where: {
      feeAccount: { tenantId },
      status: 'PENDING',
      dueDate: { lt: today },
    },
    data: { status: 'OVERDUE' },
  });

  // 2. Recalculate balance for every account in the tenant.
  //    Fetch all installments in one query, then group in memory.
  const allInstallments = await db.feeInstallment.findMany({
    where: { feeAccount: { tenantId } },
    select: { feeAccountId: true, amount: true, paidAmount: true, status: true, dueDate: true },
  });

  const byAccount = new Map<string, typeof allInstallments>();
  for (const inst of allInstallments) {
    if (!byAccount.has(inst.feeAccountId)) byAccount.set(inst.feeAccountId, []);
    byAccount.get(inst.feeAccountId)!.push(inst);
  }

  for (const [accountId, insts] of byAccount) {
    // raised = installments whose due date has arrived (demand has been raised)
    const raised    = insts.filter(i => i.dueDate <= today);
    const totalDue  = insts.reduce((s, i) => s + Number(i.amount), 0);
    const totalPaid = insts.reduce((s, i) => s + Number(i.paidAmount), 0);
    // balance = only unpaid raised installments — future months excluded
    const balance   = raised
      .filter(i => i.status !== 'PAID' && i.status !== 'WAIVED')
      .reduce((s, i) => s + Number(i.amount), 0);

    const allPaid    = insts.every(i => i.status === 'PAID' || i.status === 'WAIVED');
    const hasOverdue = raised.some(i => i.status === 'OVERDUE');
    const status: FeeStatus = allPaid ? 'PAID' : hasOverdue ? 'OVERDUE' : 'PENDING';

    await db.feeAccount.update({
      where: { id: accountId },
      data: { totalDue, totalPaid, balance, status },
    });
  }
}

import { db } from '@/lib/db';

/**
 * Sweeps past-due PENDING installments → OVERDUE, then propagates that
 * status up to the parent FeeAccount. Safe to call on every GET request —
 * updateMany is a no-op when nothing needs changing.
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

  // 2. Mark the parent FeeAccount OVERDUE if it has any OVERDUE installment
  //    (skip accounts already fully PAID)
  const overdueFeeAccountIds = await db.feeInstallment.findMany({
    where: {
      feeAccount: { tenantId },
      status: 'OVERDUE',
    },
    select: { feeAccountId: true },
    distinct: ['feeAccountId'],
  });

  const ids = overdueFeeAccountIds.map(r => r.feeAccountId);
  if (ids.length > 0) {
    await db.feeAccount.updateMany({
      where: { id: { in: ids }, status: { not: 'PAID' } },
      data: { status: 'OVERDUE' },
    });
  }
}

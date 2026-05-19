import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { FeeStatus } from '@prisma/client';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const { action } = await req.json();
    if (!action) return err('action is required');
    if (action !== 'waive' && action !== 'unwaive') return err('action must be waive or unwaive');

    // Verify the installment belongs to this tenant
    const installment = await db.feeInstallment.findFirst({
      where: {
        id: params.id,
        feeAccount: { tenantId: session.user.tenantId },
      },
      include: {
        feeAccount: true,
      },
    });
    if (!installment) return err('Installment not found', 404);

    if (installment.feeAccount.isLocked) {
      return err('Fee account is locked — unlock before modifying installments', 400);
    }

    const newStatus: FeeStatus = action === 'waive' ? 'WAIVED' : 'PENDING';

    const updated = await db.$transaction(async (tx) => {
      await tx.feeInstallment.update({
        where: { id: params.id },
        data: { status: newStatus, paidAmount: action === 'waive' ? installment.amount : 0 },
      });

      // Recompute account totals
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const allInst = await tx.feeInstallment.findMany({
        where: { feeAccountId: installment.feeAccountId },
        select: { amount: true, paidAmount: true, status: true, dueDate: true },
      });

      const raised     = allInst.filter(i => i.dueDate <= today);
      const totalDue   = allInst.reduce((s, i) => s + Number(i.amount), 0);
      const totalPaid  = allInst
        .filter(i => i.status === 'PAID')
        .reduce((s, i) => s + Number(i.paidAmount), 0);
      const balance    = raised
        .filter(i => i.status !== 'PAID' && i.status !== 'WAIVED')
        .reduce((s, i) => s + Number(i.amount), 0);
      const allSettled = allInst.length > 0 && allInst.every(i => i.status === 'PAID' || i.status === 'WAIVED');
      const hasOverdue = raised.some(i => i.status === 'OVERDUE');
      const accountStatus: FeeStatus = allSettled ? 'PAID' : hasOverdue ? 'OVERDUE' : 'PENDING';

      return tx.feeAccount.update({
        where: { id: installment.feeAccountId },
        data: { totalDue, totalPaid, balance, status: accountStatus },
      });
    });

    return ok(updated);
  } catch (e) {
    console.error('[PATCH /api/fee/installments/[id]]', e);
    return err((e as Error).message ?? 'Internal server error', 500);
  }
}

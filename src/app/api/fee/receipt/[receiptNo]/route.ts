import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET(_req: NextRequest, { params }: { params: { receiptNo: string } }) {
  try {
    const { session, error } = await requireSession();
    if (error) return error;

    const transaction = await db.feeTransaction.findFirst({
      where: { receiptNo: params.receiptNo, tenantId: session.user.tenantId },
      include: {
        feeAccount: {
          include: {
            student: { select: { id: true, name: true, admissionNo: true } },
            grade: { select: { name: true } },
            feePlan: { select: { name: true } },
          },
        },
      },
    });
    if (!transaction) return err('Receipt not found', 404);

    const tenant = await db.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { name: true, address: true, phone: true, email: true, logoUrl: true },
    });

    const fmtMode: Record<string, string> = {
      UPI: 'UPI', CASH: 'Cash', NEFT: 'NEFT', CHEQUE: 'Cheque', DD: 'DD', CARD: 'Card', RAZORPAY: 'Razorpay',
    };

    return ok({
      receiptNo: transaction.receiptNo,
      amount: Number(transaction.amount),
      mode: fmtMode[transaction.mode] ?? transaction.mode,
      transactedAt: transaction.transactedAt.toISOString(),
      notes: transaction.notes ?? null,
      student: {
        name: transaction.feeAccount.student.name,
        admissionNo: transaction.feeAccount.student.admissionNo ?? '',
        grade: transaction.feeAccount.grade.name,
      },
      feePlan: transaction.feeAccount.feePlan?.name ?? '—',
      school: {
        name: tenant?.name ?? '',
        address: tenant?.address ?? '',
        phone: tenant?.phone ?? '',
        email: tenant?.email ?? '',
      },
    });
  } catch (e) {
    console.error('[GET /api/fee/receipt/[receiptNo]]', e);
    return err((e as Error).message ?? 'Internal server error', 500);
  }
}

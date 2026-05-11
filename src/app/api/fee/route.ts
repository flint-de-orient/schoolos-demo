import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { FeeStatus, TransactionMode } from '@prisma/client';
import { notifyFeeConfirmed } from '@/lib/notifications';
import { refreshOverdueStatuses } from '@/lib/fee-overdue';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  // Keep overdue statuses accurate without a background job
  await refreshOverdueStatuses(session.user.tenantId);

  const { searchParams } = req.nextUrl;
  const search = searchParams.get('q') ?? '';
  const status = searchParams.get('status') as FeeStatus | null;
  const gradeId = searchParams.get('gradeId') ?? undefined;
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.min(100, Number(searchParams.get('limit') ?? 50));

  const where = {
    tenantId: session.user.tenantId,
    ...(status && { status }),
    ...(gradeId && { gradeId }),
    ...(search && {
      student: { name: { contains: search, mode: 'insensitive' as const } },
    }),
  };

  const [total, accounts] = await Promise.all([
    db.feeAccount.count({ where }),
    db.feeAccount.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, admissionNo: true } },
        grade: { select: { name: true } },
        feePlan: { select: { name: true } },
        installments: { orderBy: { dueDate: 'asc' } },
        transactions: { orderBy: { transactedAt: 'desc' }, take: 3 },
        defaulterPrediction: true,
      },
      orderBy: [{ status: 'asc' }, { student: { name: 'asc' } }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  // Summary stats
  const summaryResult = await db.feeAccount.aggregate({
    where: { tenantId: session.user.tenantId },
    _sum: { totalDue: true, totalPaid: true, balance: true },
    _count: { _all: true },
  });

  const overdueCount = await db.feeAccount.count({
    where: { tenantId: session.user.tenantId, status: 'OVERDUE' },
  });

  return ok({
    data: accounts,
    total,
    page,
    limit,
    summary: {
      totalDue: summaryResult._sum.totalDue ?? 0,
      totalPaid: summaryResult._sum.totalPaid ?? 0,
      balance: summaryResult._sum.balance ?? 0,
      overdueCount,
    },
  });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { feeAccountId, installmentId, amount, mode, notes } = body;

  if (!feeAccountId || !amount || !mode) {
    return err('feeAccountId, amount and mode are required');
  }

  const account = await db.feeAccount.findFirst({
    where: { id: feeAccountId, tenantId: session.user.tenantId },
  });
  if (!account) return err('Fee account not found', 404);

  const receiptNo = `RCP${Date.now()}`;

  const transaction = await db.$transaction(async (tx) => {
    const t = await tx.feeTransaction.create({
      data: {
        tenantId: session.user.tenantId,
        feeAccountId,
        installmentId,
        amount,
        mode: mode as TransactionMode,
        receiptNo,
        notes,
        status: 'SUCCESS',
      },
    });

    const newPaid = Number(account.totalPaid) + Number(amount);
    const newBalance = Number(account.totalDue) - newPaid;
    const newStatus: FeeStatus = newBalance <= 0 ? 'PAID' : 'PENDING';

    await tx.feeAccount.update({
      where: { id: feeAccountId },
      data: { totalPaid: newPaid, balance: newBalance > 0 ? newBalance : 0, status: newStatus },
    });

    if (installmentId) {
      await tx.feeInstallment.update({
        where: { id: installmentId },
        data: { paidAmount: { increment: Number(amount) }, status: newStatus },
      });
    }

    return t;
  });

  // Fire WhatsApp payment confirmation (non-blocking)
  const fullAccount = await db.feeAccount.findUnique({
    where: { id: feeAccountId },
    include: {
      student: {
        include: {
          parents: {
            where: { isPrimary: true },
            take: 1,
            include: { parent: { select: { phone: true, fatherName: true, motherName: true, guardianName: true } } },
          },
        },
      },
    },
  });
  const sp = fullAccount?.student?.parents?.[0];
  if (sp?.parent?.phone) {
    const p = sp.parent;
    const parentName = p.fatherName ?? p.motherName ?? p.guardianName ?? 'Parent';
    const paidDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    notifyFeeConfirmed(
      session.user.tenantId,
      p.phone,
      parentName,
      Number(amount),
      fullAccount!.student.name,
      paidDate,
      receiptNo
    ).catch(() => {});
  }

  return ok(transaction, 201);
}

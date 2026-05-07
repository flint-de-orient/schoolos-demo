import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const month = searchParams.get('month');
  const year = searchParams.get('year');

  const now = new Date();
  const targetYear = year ? parseInt(year) : now.getFullYear();
  const targetMonth = month ? parseInt(month) : now.getMonth() + 1;

  const payrolls = await db.payroll.findMany({
    where: {
      tenantId: session.user.tenantId,
      year: targetYear,
      month: targetMonth,
    },
    include: {
      staff: { select: { id: true, name: true, designation: true, department: true } },
    },
    orderBy: { staff: { name: 'asc' } },
  });

  const summary = payrolls.reduce(
    (acc, p) => {
      const deductions =
        Number(p.pfDeduction) + Number(p.tdsDeduction) + Number(p.otherDeductions);
      return {
        totalGross: acc.totalGross + Number(p.basic) + Number(p.allowances),
        totalNet: acc.totalNet + Number(p.netPay),
        totalDeductions: acc.totalDeductions + deductions,
        paid: acc.paid + (p.status === 'PAID' ? 1 : 0),
        pending: acc.pending + (p.status === 'PENDING' ? 1 : 0),
      };
    },
    { totalGross: 0, totalNet: 0, totalDeductions: 0, paid: 0, pending: 0 }
  );

  return ok({ payrolls, summary, month: targetMonth, year: targetYear });
}

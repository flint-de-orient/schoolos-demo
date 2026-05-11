import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { Decimal } from '@prisma/client/runtime/library';

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
      const deductions = Number(p.pfDeduction) + Number(p.tdsDeduction) + Number(p.otherDeductions);
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

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { month, year } = body;

  if (!month || !year) return err('month and year are required');

  const tenantId = session.user.tenantId;

  // Get all active staff with salary set
  const allStaff = await db.staff.findMany({
    where: { tenantId, isActive: true, salary: { not: null } },
  });

  if (allStaff.length === 0) return err('No active staff with salary found');

  // Upsert payroll entries for each staff member
  const results = await Promise.all(
    allStaff.map(s => {
      const basic = Number(s.salary ?? 0);
      const allowances = Math.round(basic * 0.2);
      const pf = Math.round(basic * 0.12);
      const tds = basic > 50000 ? Math.round(basic * 0.05) : 0;
      const net = basic + allowances - pf - tds;
      return db.payroll.upsert({
        where: { staffId_month_year: { staffId: s.id, month, year } },
        create: {
          tenantId,
          staffId: s.id,
          month,
          year,
          basic: new Decimal(basic),
          allowances: new Decimal(allowances),
          pfDeduction: new Decimal(pf),
          tdsDeduction: new Decimal(tds),
          otherDeductions: new Decimal(0),
          netPay: new Decimal(net),
          status: 'PENDING',
        },
        update: {},
      });
    })
  );

  return ok({ generated: results.length }, 201);
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { id, ids, status } = body;

  if (!status) return err('status is required');

  const tenantId = session.user.tenantId;

  if (ids && Array.isArray(ids)) {
    // Bulk update
    await db.payroll.updateMany({
      where: { id: { in: ids }, tenantId },
      data: { status, paidAt: status === 'PAID' ? new Date() : null },
    });
    return ok({ updated: ids.length });
  }

  if (id) {
    await db.payroll.updateMany({
      where: { id, tenantId },
      data: { status, paidAt: status === 'PAID' ? new Date() : null },
    });
    return ok({ updated: 1 });
  }

  return err('id or ids required');
}

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
    where: { tenantId: session.user.tenantId, year: targetYear, month: targetMonth },
    include: {
      staff:   { select: { id: true, name: true, designation: true, department: true } },
      teacher: { select: { id: true, name: true, designation: true, department: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const summary = payrolls.reduce(
    (acc, p) => {
      const deductions = Number(p.pfDeduction) + Number(p.tdsDeduction) + Number(p.otherDeductions);
      return {
        totalGross:      acc.totalGross + Number(p.basic) + Number(p.allowances),
        totalNet:        acc.totalNet + Number(p.netPay),
        totalDeductions: acc.totalDeductions + deductions,
        paid:            acc.paid + (p.status === 'PAID' ? 1 : 0),
        pending:         acc.pending + (p.status === 'PENDING' ? 1 : 0),
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

  // Load configured salary settings (fall back to defaults)
  const ss = await db.tenantSalarySettings.findUnique({ where: { tenantId } });
  const hraP = Number(ss?.hraPercent  ?? 20) / 100;
  const daP  = Number(ss?.daPercent   ?? 0)  / 100;
  const taF  = Number(ss?.taFlat      ?? 0);
  const medF = Number(ss?.medicalFlat ?? 0);
  const spP  = Number(ss?.specialAllowancePercent ?? 0) / 100;
  const pfP  = Number(ss?.pfPercent   ?? 12) / 100;
  const pt   = Number(ss?.professionalTax ?? 200);
  const tdsThreshold = Number(ss?.tdsThresholdAnnual ?? 500000);
  const tdsP = Number(ss?.tdsPercent ?? 10) / 100;

  function buildEntry(basic: number) {
    const allowances = Math.round(basic * hraP) + Math.round(basic * daP) + taF + medF + Math.round(basic * spP);
    const gross      = basic + allowances;
    const pf         = Math.round(basic * pfP);
    const tds        = gross * 12 > tdsThreshold ? Math.round(gross * tdsP) : 0;
    const net        = Math.max(gross - pf - pt - tds, 0);
    return { allowances, pf, tds, net };
  }

  // Active non-teaching staff with salary assigned
  const allStaff = await db.staff.findMany({
    where: { tenantId, isActive: true, salary: { not: null }, deletedAt: null },
  });

  // Active teachers with salary assigned
  const allTeachers = await db.teacher.findMany({
    where: { tenantId, isActive: true, salary: { not: null }, deletedAt: null },
  });

  if (allStaff.length === 0 && allTeachers.length === 0) {
    return err('No active staff or teachers with salary assigned. Set salaries first.');
  }

  const staffResults = await Promise.all(
    allStaff.map(s => {
      const basic = Number(s.salary ?? 0);
      const { allowances, pf, tds, net } = buildEntry(basic);
      return db.payroll.upsert({
        where:  { staffId_month_year: { staffId: s.id, month, year } },
        create: {
          tenantId, staffId: s.id, month, year,
          basic: new Decimal(basic), allowances: new Decimal(allowances),
          pfDeduction: new Decimal(pf), tdsDeduction: new Decimal(tds),
          otherDeductions: new Decimal(pt), netPay: new Decimal(net), status: 'PENDING',
        },
        update: {},
      });
    })
  );

  const teacherResults = await Promise.all(
    allTeachers.map(t => {
      const basic = Number(t.salary ?? 0);
      const { allowances, pf, tds, net } = buildEntry(basic);
      return db.payroll.upsert({
        where:  { teacherId_month_year: { teacherId: t.id, month, year } },
        create: {
          tenantId, teacherId: t.id, month, year,
          basic: new Decimal(basic), allowances: new Decimal(allowances),
          pfDeduction: new Decimal(pf), tdsDeduction: new Decimal(tds),
          otherDeductions: new Decimal(pt), netPay: new Decimal(net), status: 'PENDING',
        },
        update: {},
      });
    })
  );

  return ok({
    generated: staffResults.length + teacherResults.length,
    staff: staffResults.length,
    teachers: teacherResults.length,
  }, 201);
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { id, ids, status } = body;
  if (!status) return err('status is required');

  const tenantId = session.user.tenantId;

  if (ids && Array.isArray(ids)) {
    await db.payroll.updateMany({
      where: { id: { in: ids }, tenantId },
      data:  { status, paidAt: status === 'PAID' ? new Date() : null },
    });
    return ok({ updated: ids.length });
  }

  if (id) {
    await db.payroll.updateMany({
      where: { id, tenantId },
      data:  { status, paidAt: status === 'PAID' ? new Date() : null },
    });
    return ok({ updated: 1 });
  }

  return err('id or ids required');
}

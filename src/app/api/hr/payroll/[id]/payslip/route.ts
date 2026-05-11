import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;

  const payroll = await db.payroll.findFirst({
    where: { id: params.id, tenantId },
    include: {
      staff: {
        select: {
          id: true, employeeCode: true, name: true, designation: true,
          department: true, email: true, phone: true, joiningDate: true,
        },
      },
      teacher: {
        select: {
          id: true, employeeCode: true, name: true, designation: true,
          department: true, email: true, phone: true, joiningDate: true,
        },
      },
    },
  });

  if (!payroll) return err('Payroll record not found', 404);

  const [ss, tenant] = await Promise.all([
    db.tenantSalarySettings.findUnique({ where: { tenantId } }),
    db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, shortName: true, address: true, phone: true, email: true, headName: true, headTitle: true, city: true, state: true },
    }),
  ]);

  const basic    = Number(payroll.basic);
  const hraP     = Number(ss?.hraPercent ?? 20);
  const daP      = Number(ss?.daPercent ?? 0);
  const taF      = Number(ss?.taFlat ?? 0);
  const medF     = Number(ss?.medicalFlat ?? 0);
  const spP      = Number(ss?.specialAllowancePercent ?? 0);
  const pfP      = Number(ss?.pfPercent ?? 12);
  const pt       = Number(ss?.professionalTax ?? 200);

  const components = {
    basic,
    hra:     { label: 'House Rent Allowance',  percent: hraP, amount: Math.round(basic * hraP / 100) },
    da:      { label: 'Dearness Allowance',    percent: daP,  amount: Math.round(basic * daP  / 100) },
    ta:      { label: 'Transport Allowance',   flat: taF,     amount: taF },
    medical: { label: 'Medical Allowance',     flat: medF,    amount: medF },
    special: { label: 'Special Allowance',     percent: spP,  amount: Math.round(basic * spP  / 100) },
    pf:      { label: 'Employee PF',           percent: pfP,  amount: Math.round(basic * pfP  / 100) },
    professionalTax: { label: 'Professional Tax', amount: pt },
    tds:     { label: 'Income Tax (TDS)',       amount: Number(payroll.tdsDeduction) },
  };

  const employee     = payroll.staff ?? payroll.teacher;
  const employeeType = payroll.teacherId ? 'Teaching Staff' : 'Non-Teaching Staff';

  return ok({ payroll, employee, employeeType, components, tenant });
}

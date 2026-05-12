import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok } from '@/lib/api-auth';

export async function GET(_req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;
  const now = new Date();

  // Current academic session: April 1 of this/last year
  const acYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const sessionStart = new Date(acYear, 3, 1);

  // ── Parallel queries ─────────────────────────────────────────────────────
  const [
    teachers,
    staff,
    leaveRequests,
    lastSixPayrolls,
    topEarnerPayrolls,
    leaveByDept,
  ] = await Promise.all([
    // All active teachers with salary + department
    db.teacher.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true, name: true, designation: true, department: true,
        salary: true, joiningDate: true, qualification: true, type: true,
        subjects: { select: { subject: { select: { name: true } } } },
      },
    }),

    // All active non-teaching staff
    db.staff.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true, name: true, designation: true, department: true,
        salary: true, joiningDate: true,
      },
    }),

    // All leave requests in current session
    db.leaveRequest.findMany({
      where: { tenantId, fromDate: { gte: sessionStart } },
      select: {
        leaveType: true, days: true, status: true,
        fromDate: true,
        teacher: { select: { id: true, department: true } },
        staff:   { select: { id: true, department: true } },
      },
    }),

    // Monthly payroll totals — last 6 months
    Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        return db.payroll.aggregate({
          where: { tenantId, year: d.getFullYear(), month: d.getMonth() + 1 },
          _sum: { netPay: true, basic: true, allowances: true, pfDeduction: true, tdsDeduction: true, otherDeductions: true },
          _count: { id: true },
        }).then(r => ({
          month: d.toLocaleString('en-IN', { month: 'short' }),
          year: d.getFullYear(),
          netPay: Number(r._sum.netPay ?? 0),
          gross: Number(r._sum.basic ?? 0) + Number(r._sum.allowances ?? 0),
          deductions: Number(r._sum.pfDeduction ?? 0) + Number(r._sum.tdsDeduction ?? 0) + Number(r._sum.otherDeductions ?? 0),
          headcount: r._count.id,
        }));
      })
    ),

    // Top 5 earners — pull from most recent payroll month with data
    db.payroll.findMany({
      where: {
        tenantId,
        year: now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
        month: now.getMonth() === 0 ? 12 : now.getMonth(), // previous month
      },
      orderBy: { netPay: 'desc' },
      take: 10,
      select: {
        netPay: true, basic: true, allowances: true,
        teacher: { select: { id: true, name: true, designation: true } },
        staff:   { select: { id: true, name: true, designation: true } },
      },
    }),

    // Approved leave days by department (derived from teacher/staff dept)
    db.leaveRequest.findMany({
      where: { tenantId, status: 'APPROVED', fromDate: { gte: sessionStart } },
      select: {
        days: true, leaveType: true,
        teacher: { select: { department: true } },
        staff:   { select: { department: true } },
      },
    }),
  ]);

  // ── Leave type distribution (approved, current session) ──────────────────
  const leaveTypeMap: Record<string, number> = {};
  const leaveMonthMap: Record<string, number> = {};
  let totalApprovedDays = 0;
  let totalPendingCount = 0;

  for (const l of leaveRequests) {
    if (l.status === 'APPROVED') {
      leaveTypeMap[l.leaveType] = (leaveTypeMap[l.leaveType] ?? 0) + l.days;
      totalApprovedDays += l.days;
      const mo = new Date(l.fromDate).toLocaleString('en-IN', { month: 'short' });
      leaveMonthMap[mo] = (leaveMonthMap[mo] ?? 0) + l.days;
    }
    if (l.status === 'PENDING') totalPendingCount += 1;
  }

  const leaveTypeBreakdown = Object.entries(leaveTypeMap)
    .map(([type, days]) => ({ type, days: Math.round(days * 10) / 10 }))
    .sort((a, b) => b.days - a.days);

  // ── Monthly leave trend (last 6 months) ─────────────────────────────────
  const leaveTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const mo = d.toLocaleString('en-IN', { month: 'short' });
    return { month: mo, days: leaveMonthMap[mo] ?? 0 };
  });

  // ── Department-wise leave days ───────────────────────────────────────────
  const deptLeaveMap: Record<string, number> = {};
  for (const l of leaveByDept) {
    const dept = l.teacher?.department ?? l.staff?.department ?? 'Other';
    deptLeaveMap[dept] = (deptLeaveMap[dept] ?? 0) + l.days;
  }
  const deptLeaveDays = Object.entries(deptLeaveMap)
    .map(([dept, days]) => ({ dept, days: Math.round(days * 10) / 10 }))
    .sort((a, b) => b.days - a.days)
    .slice(0, 8);

  // ── Monthly payroll trend (chronological) ───────────────────────────────
  const payrollTrend = lastSixPayrolls.reverse();
  const hasPayrollData = payrollTrend.some(p => p.netPay > 0);

  // ── Top earners: real payroll net pay, fallback to basic salary ──────────
  type EarnerSource = { id: string; name: string; designation: string | null };
  const topEarners: { id: string; name: string; designation: string; net: number; basic: number }[] = [];

  if (topEarnerPayrolls.length > 0) {
    for (const p of topEarnerPayrolls) {
      const person: EarnerSource | null = (p.teacher ?? p.staff) as EarnerSource | null;
      if (!person) continue;
      topEarners.push({
        id: person.id,
        name: person.name,
        designation: person.designation ?? 'Staff',
        net: Number(p.netPay),
        basic: Number(p.basic),
      });
    }
  }

  // Fallback: derive from basic salary on teacher/staff records
  if (topEarners.length === 0) {
    const all = [
      ...teachers.map(t => ({ id: t.id, name: t.name, designation: t.designation ?? 'Teacher', salary: Number(t.salary ?? 0) })),
      ...staff.map(s => ({ id: s.id, name: s.name, designation: s.designation ?? 'Staff', salary: Number(s.salary ?? 0) })),
    ].sort((a, b) => b.salary - a.salary).slice(0, 5);
    for (const p of all) {
      // Estimated net: basic + 20% HRA - 12% PF - ₹200 PT
      const net = Math.max(Math.round(p.salary * 1.08), 0);
      topEarners.push({ id: p.id, name: p.name, designation: p.designation, net, basic: p.salary });
    }
  }

  const topEarnersFinal = topEarners.slice(0, 5);
  const maxNet = topEarnersFinal[0]?.net ?? 1;

  // ── Headcount by employment type ─────────────────────────────────────────
  const fullTime = teachers.filter(t => t.type === 'FULL_TIME').length + staff.length;
  const partTime = teachers.filter(t => t.type === 'PART_TIME').length;
  const contract = teachers.filter(t => t.type === 'CONTRACT').length;

  // ── Qualification breakdown (teachers only — staff has no qualification field) ──
  const qualMap: Record<string, number> = {};
  for (const t of teachers) {
    const q = t.qualification ?? 'Other';
    const key = q.includes('PhD') ? 'PhD' : q.includes('M.Ed') ? 'M.Ed' : q.includes('B.Ed') ? 'B.Ed' : q.includes('M.') ? 'Masters' : q.includes('B.') ? 'Bachelors' : 'Other';
    qualMap[key] = (qualMap[key] ?? 0) + 1;
  }
  const qualBreakdown = Object.entries(qualMap)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  return ok({
    summary: {
      totalStaff: teachers.length + staff.length,
      totalApprovedLeaveDays: Math.round(totalApprovedDays * 10) / 10,
      pendingLeaveRequests: totalPendingCount,
      hasPayrollData,
    },
    payrollTrend,
    leaveTypeBreakdown,
    leaveTrend,
    deptLeaveDays,
    topEarners: topEarnersFinal.map(e => ({ ...e, pct: maxNet > 0 ? Math.round((e.net / maxNet) * 100) : 0 })),
    headcountByType: [
      { type: 'Full-Time', count: fullTime },
      { type: 'Part-Time', count: partTime },
      { type: 'Contract', count: contract },
    ].filter(x => x.count > 0),
    qualBreakdown,
  });
}

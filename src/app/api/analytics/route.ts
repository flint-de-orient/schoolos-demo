import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok } from '@/lib/api-auth';

function academicYear(date: Date): number {
  // Academic year starts April 1. Year label = the April start year.
  return date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
}

function formatCr(amount: number): string {
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(2)} Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(2)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

export async function GET(_req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;
  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const thisAcYear = academicYear(now);
  const sessionStart = new Date(thisAcYear, 3, 1); // April 1 of current session

  // ── Parallel DB fetches ──────────────────────────────────────────────────
  const [
    totalStudents,
    totalStaff,
    totalTeachers,
    feeAggregate,
    overdueCount,
    attendanceToday,
    atRiskStudents,
    boardPredictions,
    gradeEnrollment,
    totalParents,
    activatedParents,
    teachersOnLeaveToday,
    allStudentsAdmDates,
    markEntriesRaw,
    lastSixMonthsFee,
    highLeaveRisk,
  ] = await Promise.all([
    // overview
    db.student.count({ where: { tenantId, isActive: true } }),
    db.staff.count({ where: { tenantId, isActive: true } }),
    db.teacher.count({ where: { tenantId, isActive: true } }),
    db.feeAccount.aggregate({
      where: { tenantId },
      _sum: { totalDue: true, totalPaid: true, balance: true },
    }),
    db.feeAccount.count({ where: { tenantId, status: 'OVERDUE' } }),

    // student attendance today
    db.attendanceSession.findMany({
      where: { tenantId, date: today },
      include: { records: { select: { status: true } } },
    }),

    // AI-predicted fee defaulters
    db.aIFeeDefaulterPrediction.findMany({
      where: { feeAccount: { tenantId }, riskLevel: { in: ['HIGH', 'CRITICAL'] } },
      include: { feeAccount: { include: { student: { select: { id: true, name: true } } } } },
      take: 5,
    }),

    // Board score predictions
    db.aIBoardScorePrediction.findMany({
      where: { student: { tenantId } },
      include: {
        student: {
          select: {
            id: true, name: true,
            section: { include: { grade: { select: { name: true } } } },
          },
        },
      },
    }),

    // Grade-wise enrollment
    db.grade.findMany({
      where: { tenantId },
      include: { _count: { select: { students: true } } },
      orderBy: { displayOrder: 'asc' },
    }),

    // Parent app adoption
    db.parent.count({ where: { tenantId } }),
    db.parent.count({ where: { tenantId, devices: { some: { isActive: true } } } }),

    // Teacher attendance today (approved leave = absent)
    db.leaveRequest.count({
      where: {
        tenantId,
        status: 'APPROVED',
        fromDate: { lte: today },
        toDate: { gte: today },
        teacherId: { not: null },
      },
    }),

    // All student admission dates (for enrollment trend)
    db.student.findMany({
      where: { tenantId },
      select: { admissionDate: true },
    }),

    // Subject performance from mark entries
    db.markEntry.findMany({
      where: { tenantId, isAbsent: false, marksObtained: { not: null } },
      select: {
        marksObtained: true,
        subject: { select: { name: true } },
        student: {
          select: {
            section: {
              select: { grade: { select: { name: true, displayOrder: true } } },
            },
          },
        },
      },
    }),

    // Fee collection last 6 months
    Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        return db.feeTransaction
          .aggregate({
            where: { tenantId, transactedAt: { gte: start, lt: end }, status: 'SUCCESS' },
            _sum: { amount: true },
          })
          .then((r) => ({
            month: d.toLocaleString('en-IN', { month: 'short' }),
            year: d.getFullYear(),
            collected: Number(r._sum.amount ?? 0),
          }));
      })
    ),

    // Teacher attrition risk: approved leave >15 days this session
    db.leaveRequest.groupBy({
      by: ['teacherId'],
      where: {
        tenantId,
        status: 'APPROVED',
        teacherId: { not: null },
        fromDate: { gte: sessionStart },
      },
      _sum: { days: true },
      having: { days: { _sum: { gt: 15 } } },
    }),
  ]);

  // ── Attendance summary ───────────────────────────────────────────────────
  const attSummary = attendanceToday.reduce(
    (acc, s) => {
      const present = s.records.filter((r) => r.status === 'PRESENT').length;
      acc.present += present;
      acc.total += s.records.length;
      return acc;
    },
    { present: 0, total: 0 }
  );

  // ── Parent app adoption ──────────────────────────────────────────────────
  const parentAppAdoption =
    totalParents > 0 ? Math.round((activatedParents / totalParents) * 100) : 0;

  // ── Teacher attendance rate ──────────────────────────────────────────────
  const teacherAttendance =
    totalTeachers > 0
      ? Math.round(((totalTeachers - teachersOnLeaveToday) / totalTeachers) * 100)
      : 100;

  // ── Enrollment trend (academic-year buckets from admissionDate) ──────────
  const admByAcYear: Record<number, number> = {};
  for (const s of allStudentsAdmDates) {
    const yr = academicYear(new Date(s.admissionDate));
    admByAcYear[yr] = (admByAcYear[yr] ?? 0) + 1;
  }
  const enrollmentTrend = Array.from({ length: 6 }, (_, i) => {
    const yr = thisAcYear - 5 + i;
    return { year: yr, students: admByAcYear[yr] ?? 0 };
  });
  // Override current year with live active count
  if (enrollmentTrend.length > 0) {
    enrollmentTrend[enrollmentTrend.length - 1].students = totalStudents;
  }

  // ── Subject performance by grade ─────────────────────────────────────────
  // Accumulate marks per grade × subject
  type SubMap = Record<string, { sum: number; count: number }>;
  const perfMap: Record<string, { displayOrder: number; subjects: SubMap }> = {};

  for (const e of markEntriesRaw) {
    const gradeName = e.student.section?.grade?.name;
    if (!gradeName) continue;
    const order = e.student.section?.grade?.displayOrder ?? 99;
    const subKey = e.subject.name.toLowerCase().replace(/\s+/g, '_');
    if (!perfMap[gradeName]) perfMap[gradeName] = { displayOrder: order, subjects: {} };
    if (!perfMap[gradeName].subjects[subKey])
      perfMap[gradeName].subjects[subKey] = { sum: 0, count: 0 };
    perfMap[gradeName].subjects[subKey].sum += e.marksObtained!;
    perfMap[gradeName].subjects[subKey].count += 1;
  }

  const subjectPerformance = Object.entries(perfMap)
    .sort((a, b) => a[1].displayOrder - b[1].displayOrder)
    .map(([gradeName, { subjects }]) => ({
      class: gradeName.startsWith('Class ') ? `Cl. ${gradeName.slice(6)}` : gradeName,
      ...Object.fromEntries(
        Object.entries(subjects).map(([sub, { sum, count }]) => [
          sub,
          Math.round(sum / count),
        ])
      ),
    }));

  // ── Board predictions by grade ───────────────────────────────────────────
  const boardByGrade: Record<string, number> = {};
  boardPredictions.forEach((p) => {
    const gradeName = p.student?.section?.grade?.name ?? 'Unknown';
    if (!boardByGrade[gradeName]) boardByGrade[gradeName] = 0;
    boardByGrade[gradeName] = Math.round(
      (boardByGrade[gradeName] + Number(p.predictedScore)) / 2
    );
  });

  // ── Fee collection (last 6 months, chronological) ───────────────────────
  const feeByMonth = lastSixMonthsFee.reverse();
  const totalCollectedLast6 = feeByMonth.reduce((s, m) => s + m.collected, 0);
  const avgMonthly = feeByMonth.filter((m) => m.collected > 0).length > 0
    ? totalCollectedLast6 / feeByMonth.filter((m) => m.collected > 0).length
    : 0;

  // ── Forecast ─────────────────────────────────────────────────────────────
  // Growth rate from last 2 admissions years
  const prev1 = admByAcYear[thisAcYear - 1] ?? 0;
  const prev2 = admByAcYear[thisAcYear - 2] ?? 0;
  const growthRate =
    prev2 > 0 ? ((prev1 - prev2) / prev2) : 0.048; // fallback 4.8%
  const enrollmentNextYear = Math.round(totalStudents * (1 + Math.max(0, growthRate)));

  const projectedAnnual = avgMonthly * 12;
  const totalDue = Number(feeAggregate._sum.totalDue ?? 0);
  const projectedFeeRevenue = formatCr(projectedAnnual > 0 ? projectedAnnual : totalDue);

  const nextAcYear = thisAcYear + 1;
  const growthPct = `↑ ${(Math.max(0, growthRate) * 100).toFixed(1)}% growth projected`;

  return ok({
    overview: {
      totalStudents,
      totalStaff: totalStaff + totalTeachers,
      feeCollected: Number(feeAggregate._sum.totalPaid ?? 0),
      feeDue: totalDue,
      feePending: Number(feeAggregate._sum.balance ?? 0),
      overdueAccounts: overdueCount,
      attendanceToday:
        attSummary.total > 0
          ? Math.round((attSummary.present / attSummary.total) * 100)
          : 0,
      presentToday: attSummary.present,
      totalExpectedToday: attSummary.total,
    },
    enrollmentTrend,
    feeByMonth,
    gradeEnrollment: gradeEnrollment.map((g) => ({
      grade: g.name,
      students: g._count.students,
    })),
    subjectPerformance,
    atRiskStudents: atRiskStudents.map((p) => ({
      studentId: p.feeAccount.student.id,
      name: p.feeAccount.student.name,
      riskLevel: p.riskLevel,
      riskScore: p.riskScore,
    })),
    boardPredictions: boardByGrade,
    parentAppAdoption,
    totalParents,
    activatedParents,
    teacherAttendance,
    forecast: {
      enrollmentNextYear,
      projectedFeeRevenue,
      growthPct,
      nextAcYearLabel: `${nextAcYear}-${(nextAcYear + 1).toString().slice(2)}`,
      attritionRisk: highLeaveRisk.length,
      teacherAttendance,
    },
  });
}

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;

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
  ] = await Promise.all([
    db.student.count({ where: { tenantId, isActive: true } }),
    db.staff.count({ where: { tenantId, isActive: true } }),
    db.teacher.count({ where: { tenantId, isActive: true } }),
    db.feeAccount.aggregate({
      where: { tenantId },
      _sum: { totalDue: true, totalPaid: true, balance: true },
    }),
    db.feeAccount.count({ where: { tenantId, status: 'OVERDUE' } }),
    db.attendanceSession.findMany({
      where: { tenantId, date: (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })() },
      include: { records: { select: { status: true } } },
    }),
    db.aIFeeDefaulterPrediction.findMany({
      where: { feeAccount: { tenantId }, riskLevel: { in: ['HIGH', 'CRITICAL'] } },
      include: { feeAccount: { include: { student: { select: { id: true, name: true } } } } },
      take: 5,
    }),
    db.aIBoardScorePrediction.findMany({
      where: { student: { tenantId } },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            section: { include: { grade: { select: { name: true } } } },
          },
        },
      },
    }),
    db.grade.findMany({
      where: { tenantId },
      include: { _count: { select: { students: true } } },
      orderBy: { displayOrder: 'asc' },
    }),
  ]);

  // Attendance summary
  const attSummary = attendanceToday.reduce(
    (acc, s) => {
      const present = s.records.filter((r) => r.status === 'PRESENT').length;
      acc.present += present;
      acc.total += s.records.length;
      return acc;
    },
    { present: 0, total: 0 }
  );

  // Fee collection by month (last 6 months)
  const now = new Date();
  const feeByMonth = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      return db.feeTransaction.aggregate({
        where: { tenantId, transactedAt: { gte: start, lt: end }, status: 'SUCCESS' },
        _sum: { amount: true },
      }).then((r) => ({
        month: d.toLocaleString('en-IN', { month: 'short' }),
        year: d.getFullYear(),
        collected: Number(r._sum.amount ?? 0),
      }));
    })
  );

  // Enrollment trend (static + current)
  const enrollmentTrend = [
    { year: 2021, students: 430 },
    { year: 2022, students: 455 },
    { year: 2023, students: 478 },
    { year: 2024, students: 499 },
    { year: 2025, students: 512 },
    { year: 2026, students: totalStudents },
  ];

  // Board score predictions by grade
  const boardByGrade: Record<string, number> = {};
  boardPredictions.forEach((p) => {
    const gradeName = p.student?.section?.grade?.name ?? 'Unknown';
    if (!boardByGrade[gradeName]) boardByGrade[gradeName] = 0;
    boardByGrade[gradeName] = Math.round(
      (boardByGrade[gradeName] + Number(p.predictedScore)) / 2
    );
  });

  return ok({
    overview: {
      totalStudents,
      totalStaff: totalStaff + totalTeachers,
      feeCollected: Number(feeAggregate._sum.totalPaid ?? 0),
      feeDue: Number(feeAggregate._sum.totalDue ?? 0),
      feePending: Number(feeAggregate._sum.balance ?? 0),
      overdueAccounts: overdueCount,
      attendanceToday: attSummary.total > 0
        ? Math.round((attSummary.present / attSummary.total) * 100)
        : 0,
      presentToday: attSummary.present,
      totalExpectedToday: attSummary.total,
    },
    enrollmentTrend,
    feeByMonth: feeByMonth.reverse(),
    gradeEnrollment: gradeEnrollment.map((g) => ({
      grade: g.name,
      students: g._count.students,
    })),
    atRiskStudents: atRiskStudents.map((p) => ({
      studentId: p.feeAccount.student.id,
      name: p.feeAccount.student.name,
      riskLevel: p.riskLevel,
      riskScore: p.riskScore,
    })),
    boardPredictions: boardByGrade,
    parentAppAdoption: 73,
    teacherAttendance: 96,
  });
}

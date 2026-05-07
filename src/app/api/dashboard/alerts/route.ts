import { requireSession, ok } from '@/lib/api-auth';
import { db } from '@/lib/db';

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;

  const [atRiskStudents, overdueAccounts, boardPredictions, lowAttendanceSessions] =
    await Promise.all([
      // Students below 75% attendance
      db.student.findMany({
        where: { tenantId, isActive: true, deletedAt: null, attendancePercent: { lt: 75 } },
        select: {
          id: true,
          name: true,
          attendancePercent: true,
          grade: { select: { name: true } },
          section: { select: { name: true } },
        },
        orderBy: { attendancePercent: 'asc' },
        take: 5,
      }),

      // Overdue fee accounts with total balance at risk
      db.feeAccount.aggregate({
        where: { tenantId, status: 'OVERDUE' },
        _count: true,
        _sum: { balance: true },
      }),

      // Board score predictions
      db.aIBoardScorePrediction.findMany({
        where: { tenantId },
        select: {
          predictedScore: true,
          student: { select: { grade: { select: { name: true } } } },
        },
        orderBy: { generatedAt: 'desc' },
      }),

      // Sections with low attendance today (or most recent date)
      db.attendanceSession.findMany({
        where: { tenantId },
        orderBy: { date: 'desc' },
        take: 50,
        include: {
          records: { select: { status: true } },
          section: { include: { grade: { select: { name: true } } } },
        },
      }),
    ]);

  // Compute board prediction averages per class from DB predictions
  const predByClass: Record<string, number[]> = {};
  for (const p of boardPredictions) {
    const grade = p.student?.grade?.name ?? 'Unknown';
    if (!predByClass[grade]) predByClass[grade] = [];
    predByClass[grade].push(p.predictedScore);
  }
  const boardAlerts = Object.entries(predByClass)
    .map(([grade, scores]) => ({
      grade,
      avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }))
    .filter(({ avgScore }) => avgScore < 80)
    .sort((a, b) => a.avgScore - b.avgScore);

  // If no predictions in DB, derive from student academic scores (fallback)
  let boardAlertsResolved = boardAlerts;
  if (boardAlertsResolved.length === 0) {
    const examStudents = await db.student.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
        grade: { isExamClass: true },
      },
      select: {
        attendancePercent: true,
        grade: { select: { name: true } },
      },
    });

    const gradeAttendance: Record<string, number[]> = {};
    for (const s of examStudents) {
      const g = s.grade?.name ?? 'Unknown';
      if (!gradeAttendance[g]) gradeAttendance[g] = [];
      if (s.attendancePercent !== null) gradeAttendance[g].push(s.attendancePercent);
    }

    boardAlertsResolved = Object.entries(gradeAttendance)
      .map(([grade, vals]) => ({
        grade,
        // Estimate predicted score as attendance-correlated proxy (demo heuristic)
        avgScore: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 0.9),
      }))
      .filter(({ avgScore }) => avgScore < 80)
      .sort((a, b) => a.avgScore - b.avgScore)
      .slice(0, 2);
  }

  // Compute low-attendance sections from most recent date's data
  const mostRecentDate = lowAttendanceSessions[0]?.date ?? null;
  const recentSessions = mostRecentDate
    ? lowAttendanceSessions.filter(
        (s) => s.date.toISOString() === mostRecentDate.toISOString()
      )
    : [];
  const lowSections = recentSessions
    .map((s) => {
      const total = s.records.length;
      const present = s.records.filter((r: { status: string }) => r.status === 'PRESENT').length;
      return {
        label: `${s.section?.grade?.name} – ${s.section?.name}`,
        percent: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    })
    .filter((s: { percent: number }) => s.percent < 80)
    .sort((a: { percent: number }, b: { percent: number }) => a.percent - b.percent)
    .slice(0, 3);

  return ok({
    atRiskStudents,
    overdueAccounts: {
      count: overdueAccounts._count,
      totalBalance: overdueAccounts._sum.balance ?? 0,
    },
    boardAlerts: boardAlertsResolved,
    lowAttendanceSections: lowSections,
  });
}

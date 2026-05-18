import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';
import { anthropic, HAIKU } from '@/lib/anthropic';
import { Prisma } from '@prisma/client';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AttendanceAlert {
  severity: 'high' | 'medium' | 'low';
  type: 'chronic_absence' | 'consecutive_absence' | 'class_anomaly' | 'threshold_risk' | 'declining_trend';
  message: string;
  studentIds: string[];
  studentNames: string[];
  actionHint: string;
}

// ── Data gathering ─────────────────────────────────────────────────────────────

async function gatherData(tenantId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const twentyEightDaysAgo = new Date(today);
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

  // Run all queries in parallel
  const [
    tenant,
    todaySessions,
    atRiskStudents,
    recentSessionDates,
    historicalSessions,
    recentTwoWeeks,
    priorTwoWeeks,
  ] = await Promise.all([
    // School info
    db.tenant.findUnique({ where: { id: tenantId }, select: { name: true, city: true } }),

    // Today's sessions
    db.attendanceSession.findMany({
      where: { tenantId, date: today },
      include: {
        section: { include: { grade: { select: { name: true, displayOrder: true } } } },
        records: { select: { status: true } },
      },
    }),

    // Students below 80% (gives buffer — 75% is the official threshold)
    db.student.findMany({
      where: { tenantId, isActive: true, attendancePercent: { lt: 80 } },
      select: {
        id: true,
        name: true,
        attendancePercent: true,
        section: { select: { name: true, grade: { select: { name: true } } } },
      },
      orderBy: { attendancePercent: 'asc' },
      take: 15,
    }),

    // Last 7 distinct session dates (for consecutive-absence detection)
    db.attendanceSession.findMany({
      where: { tenantId },
      select: { date: true },
      distinct: ['date'],
      orderBy: { date: 'desc' },
      take: 7,
    }),

    // Historical sessions last 30 days — for class-average anomaly detection
    db.attendanceSession.findMany({
      where: { tenantId, date: { gte: thirtyDaysAgo } },
      select: {
        sectionId: true,
        date: true,
        section: { select: { name: true, grade: { select: { name: true } } } },
        records: { select: { status: true } },
      },
    }),

    // Last 14 days records per student (for declining-trend detection)
    db.attendanceRecord.findMany({
      where: {
        session: { tenantId, date: { gte: fourteenDaysAgo } },
        student: { isActive: true },
      },
      select: { studentId: true, status: true },
    }),

    // Prior 14 days (day 15–28) for trend comparison
    db.attendanceRecord.findMany({
      where: {
        session: { tenantId, date: { gte: twentyEightDaysAgo, lt: fourteenDaysAgo } },
        student: { isActive: true },
      },
      select: { studentId: true, status: true },
    }),
  ]);

  // ── Today's school-wide summary ───────────────────────────────────────────
  let todayTotal = 0, todayPresent = 0;
  for (const s of todaySessions) {
    todayTotal   += s.records.length;
    todayPresent += s.records.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
  }
  const todayPct = todayTotal > 0 ? Math.round((todayPresent / todayTotal) * 100) : null;

  // ── Consecutive absences (last 7 school days) ─────────────────────────────
  const recentDates = recentSessionDates.map(s => s.date.toISOString().split('T')[0]);
  const absentInRecent = await db.attendanceRecord.findMany({
    where: {
      status: 'ABSENT',
      session: { tenantId, date: { in: recentSessionDates.map(s => s.date) } },
      student: { isActive: true },
    },
    select: {
      studentId: true,
      session: { select: { date: true } },
      student: {
        select: {
          id: true, name: true,
          section: { select: { name: true, grade: { select: { name: true } } } },
        },
      },
    },
  });

  const studentAbsMap: Record<string, { name: string; grade: string; section: string; id: string; count: number; consecutiveDays: number }> = {};
  for (const r of absentInRecent) {
    const sid = r.studentId;
    if (!studentAbsMap[sid]) {
      studentAbsMap[sid] = {
        id: r.student.id,
        name: r.student.name,
        grade: r.student.section.grade.name,
        section: r.student.section.name,
        count: 0,
        consecutiveDays: 0,
      };
    }
    studentAbsMap[sid].count++;
  }

  // Compute consecutive days from the front of the sorted recent dates
  for (const [sid, data] of Object.entries(studentAbsMap)) {
    const absentDates = new Set(
      absentInRecent.filter(r => r.studentId === sid).map(r => r.session.date.toISOString().split('T')[0])
    );
    let consecutive = 0;
    for (const d of recentDates) { // recentDates is already desc (most recent first)
      if (absentDates.has(d)) consecutive++;
      else break;
    }
    data.consecutiveDays = consecutive;
  }

  const frequentAbsences = Object.values(studentAbsMap)
    .filter(s => s.count >= 3 || s.consecutiveDays >= 2)
    .sort((a, b) => b.consecutiveDays - a.consecutiveDays || b.count - a.count)
    .slice(0, 8);

  // ── Class anomalies (today vs 30-day average) ─────────────────────────────
  const sectionStats: Record<string, { name: string; grade: string; days: { pct: number }[] }> = {};
  for (const s of historicalSessions) {
    const key = s.sectionId;
    if (!sectionStats[key]) {
      sectionStats[key] = {
        name: s.section.name,
        grade: s.section.grade.name,
        days: [],
      };
    }
    const total = s.records.length;
    const present = s.records.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
    if (total > 0) sectionStats[key].days.push({ pct: Math.round((present / total) * 100) });
  }

  const todaySectionPct: Record<string, number> = {};
  for (const s of todaySessions) {
    const total = s.records.length;
    const present = s.records.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
    if (total > 0) todaySectionPct[s.sectionId] = Math.round((present / total) * 100);
  }

  const classAnomalies: { grade: string; section: string; todayPct: number; avgPct: number; diff: number }[] = [];
  for (const [sectionId, stats] of Object.entries(sectionStats)) {
    if (stats.days.length < 3) continue; // not enough data
    const avg = Math.round(stats.days.reduce((s, d) => s + d.pct, 0) / stats.days.length);
    const todPct = todaySectionPct[sectionId];
    if (todPct !== undefined && avg - todPct >= 12) {
      classAnomalies.push({ grade: stats.grade, section: stats.name, todayPct: todPct, avgPct: avg, diff: avg - todPct });
    }
  }
  classAnomalies.sort((a, b) => b.diff - a.diff);

  // ── Declining trend ───────────────────────────────────────────────────────
  const countByStudent = (records: { studentId: string; status: string }[]) => {
    const map: Record<string, { present: number; total: number }> = {};
    for (const r of records) {
      if (!map[r.studentId]) map[r.studentId] = { present: 0, total: 0 };
      map[r.studentId].total++;
      if (r.status === 'PRESENT' || r.status === 'LATE') map[r.studentId].present++;
    }
    return map;
  };
  const recentMap = countByStudent(recentTwoWeeks);
  const priorMap  = countByStudent(priorTwoWeeks);

  // Build student lookup for names
  const studentIdsForTrend = [...new Set([...Object.keys(recentMap), ...Object.keys(priorMap)])];
  const trendStudents = await db.student.findMany({
    where: { id: { in: studentIdsForTrend }, isActive: true, tenantId },
    select: { id: true, name: true, section: { select: { name: true, grade: { select: { name: true } } } } },
  });
  const trendStudentMap = Object.fromEntries(trendStudents.map(s => [s.id, s]));

  const decliningStudents: { id: string; name: string; grade: string; section: string; recentPct: number; priorPct: number; drop: number }[] = [];
  for (const [sid, recent] of Object.entries(recentMap)) {
    const prior = priorMap[sid];
    if (!prior || prior.total < 3 || recent.total < 3) continue;
    const recentPct = Math.round((recent.present / recent.total) * 100);
    const priorPct  = Math.round((prior.present  / prior.total)  * 100);
    const drop = priorPct - recentPct;
    if (drop >= 15 && recentPct < 80) {
      const s = trendStudentMap[sid];
      if (!s) continue;
      decliningStudents.push({ id: sid, name: s.name, grade: s.section.grade.name, section: s.section.name, recentPct, priorPct, drop });
    }
  }
  decliningStudents.sort((a, b) => b.drop - a.drop);

  return {
    tenant,
    today: { date: today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), total: todayTotal, present: todayPresent, pct: todayPct },
    atRisk: atRiskStudents.map(s => ({ id: s.id, name: s.name, grade: s.section.grade.name, section: s.section.name, pct: Math.round(s.attendancePercent) })),
    frequentAbsences,
    classAnomalies: classAnomalies.slice(0, 4),
    decliningStudents: decliningStudents.slice(0, 5),
  };
}

// ── Claude call ────────────────────────────────────────────────────────────────

async function callClaude(data: Awaited<ReturnType<typeof gatherData>>) {
  const { tenant, today, atRisk, frequentAbsences, classAnomalies, decliningStudents } = data;

  const lines: string[] = [
    `School: ${tenant?.name ?? 'School'}, ${tenant?.city ?? 'India'}`,
    `Date: ${today.date}`,
    `School-wide today: ${today.pct !== null ? `${today.present}/${today.total} present (${today.pct}%)` : 'Attendance not yet marked today'}`,
    '',
  ];

  if (atRisk.length > 0) {
    lines.push('BELOW 75% ATTENDANCE (critical threshold):');
    atRisk.filter(s => s.pct < 75).forEach(s =>
      lines.push(`  - ${s.name} (${s.grade}-${s.section}): ${s.pct}%`)
    );
    const approaching = atRisk.filter(s => s.pct >= 75 && s.pct < 80);
    if (approaching.length > 0) {
      lines.push('APPROACHING 75% THRESHOLD (75-80%):');
      approaching.forEach(s => lines.push(`  - ${s.name} (${s.grade}-${s.section}): ${s.pct}%`));
    }
    lines.push('');
  }

  if (frequentAbsences.length > 0) {
    lines.push('FREQUENT/CONSECUTIVE ABSENCES (last 7 school days):');
    frequentAbsences.forEach(s => {
      const detail = s.consecutiveDays >= 2
        ? `${s.consecutiveDays} consecutive school days absent`
        : `absent ${s.count} of last 7 school days`;
      lines.push(`  - ${s.name} (${s.grade}-${s.section}): ${detail}`);
    });
    lines.push('');
  }

  if (classAnomalies.length > 0) {
    lines.push('CLASS ANOMALIES (today significantly below 30-day average):');
    classAnomalies.forEach(c =>
      lines.push(`  - ${c.grade}-${c.section}: ${c.todayPct}% today vs ${c.avgPct}% average (−${c.diff} pts)`)
    );
    lines.push('');
  }

  if (decliningStudents.length > 0) {
    lines.push('DECLINING TREND (dropped 15%+ in last 14 days vs prior 14 days):');
    decliningStudents.forEach(s =>
      lines.push(`  - ${s.name} (${s.grade}-${s.section}): ${s.priorPct}% → ${s.recentPct}%`)
    );
    lines.push('');
  }

  if (atRisk.length === 0 && frequentAbsences.length === 0 && classAnomalies.length === 0 && decliningStudents.length === 0) {
    lines.push('No significant attendance issues detected. Overall attendance appears healthy.');
  }

  const prompt = lines.join('\n');

  const response = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 1024,
    system: 'You are an attendance intelligence system for an Indian school. Analyse the data and generate specific, actionable alerts for the school administrator. Be direct and name the students/classes. Prioritise by urgency.',
    tools: [{
      name: 'report_alerts',
      description: 'Report attendance alerts to the school administrator',
      input_schema: {
        type: 'object' as const,
        required: ['summary', 'alerts'],
        properties: {
          summary: {
            type: 'string',
            description: 'One concise sentence summarising the overall attendance situation today',
          },
          alerts: {
            type: 'array',
            description: 'Up to 5 alerts, ordered by severity (high first)',
            maxItems: 5,
            items: {
              type: 'object',
              required: ['severity', 'type', 'message', 'studentIds', 'studentNames', 'actionHint'],
              properties: {
                severity: { type: 'string', enum: ['high', 'medium', 'low'] },
                type: {
                  type: 'string',
                  enum: ['chronic_absence', 'consecutive_absence', 'class_anomaly', 'threshold_risk', 'declining_trend'],
                },
                message: {
                  type: 'string',
                  description: 'Specific alert mentioning student/class names and exact numbers',
                },
                studentIds: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Student IDs mentioned in this alert (empty for class anomalies)',
                },
                studentNames: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Student names mentioned in this alert',
                },
                actionHint: {
                  type: 'string',
                  description: 'Short recommended action for the administrator (one sentence)',
                },
              },
            },
          },
        },
      },
    }],
    tool_choice: { type: 'any' as const },
    messages: [{ role: 'user', content: prompt }],
  });

  const toolUse = response.content.find(b => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') throw new Error('Claude did not return tool_use block');

  const result = toolUse.input as { summary: string; alerts: AttendanceAlert[] };
  return {
    summary: result.summary,
    alerts: result.alerts ?? [],
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const tenantId = session.user.tenantId;
  const force = req.nextUrl.searchParams.get('force') === 'true';

  // Check API key
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes('placeholder')) {
    return err('ANTHROPIC_API_KEY not configured', 503);
  }

  // Serve from cache if fresh
  if (!force) {
    const cached = await db.attendanceInsight.findUnique({ where: { tenantId } });
    if (cached && cached.expiresAt > new Date()) {
      return ok({
        summary: cached.summary,
        alerts: cached.alerts as unknown as AttendanceAlert[],
        generatedAt: cached.generatedAt,
        inputTokens: cached.inputTokens,
        outputTokens: cached.outputTokens,
        cached: true,
      });
    }
  }

  // Gather data and call Claude
  try {
    const data = await gatherData(tenantId);
    const result = await callClaude(data);

    const expiresAt = new Date(Date.now() + CACHE_TTL_MS);
    const alertsJson = result.alerts as unknown as Prisma.InputJsonValue;
    await db.attendanceInsight.upsert({
      where: { tenantId },
      update: { summary: result.summary, alerts: alertsJson, inputTokens: result.inputTokens, outputTokens: result.outputTokens, generatedAt: new Date(), expiresAt },
      create: { tenantId, summary: result.summary, alerts: alertsJson, inputTokens: result.inputTokens, outputTokens: result.outputTokens, expiresAt },
    });

    return ok({ ...result, generatedAt: new Date(), cached: false });
  } catch (e) {
    console.error('[attendance/insights] Claude call failed:', e);
    // Return stale cache rather than a blank error
    const stale = await db.attendanceInsight.findUnique({ where: { tenantId } });
    if (stale) {
      return ok({
        summary: stale.summary,
        alerts: stale.alerts as unknown as AttendanceAlert[],
        generatedAt: stale.generatedAt,
        inputTokens: stale.inputTokens,
        outputTokens: stale.outputTokens,
        cached: true,
        stale: true,
      });
    }
    return err('Failed to generate attendance insights', 500);
  }
}

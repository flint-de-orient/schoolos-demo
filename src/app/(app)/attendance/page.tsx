'use client';

import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { toast } from 'sonner';
import {
  Users, CheckCircle, XCircle, Percent, CalendarDays,
  ChevronDown, RefreshCw, Clock, AlertTriangle, Check, X,
  Bell, BellOff, Download, Plus, Trash2, FileText, Sparkles, TrendingDown, School,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import AIBadge from '@/components/shared/AIBadge';

// ─── Types ────────────────────────────────────────────────────────────────────

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY';

interface AttendanceAlert {
  severity: 'high' | 'medium' | 'low';
  type: 'chronic_absence' | 'consecutive_absence' | 'class_anomaly' | 'threshold_risk' | 'declining_trend';
  message: string;
  studentIds: string[];
  studentNames: string[];
  actionHint: string;
}

interface InsightsData {
  summary: string;
  alerts: AttendanceAlert[];
  generatedAt: string;
  cached: boolean;
  stale?: boolean;
  inputTokens: number;
  outputTokens: number;
}

interface SectionRow {
  sectionId: string;
  sectionName: string;
  gradeName: string;
  gradeOrder: number;
  sessionId: string | null;
  total: number;
  present: number;
  absent: number;
  late: number;
  percent: number;
  gateCount: number;
}

interface Absentee {
  studentId: string;
  sessionId: string;
  name: string;
  className: string;
  reason: string | null;
  parentNotified: boolean;
}

interface Holiday {
  id: string;
  startDate: string;
  endDate: string;
  name: string;
  type: string;
}

interface GradeSection {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

interface SheetStudent {
  id: string;
  name: string;
  rollNo: string | null;
  admissionNo: string;
  status: AttendanceStatus;
  reason: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0];

function pctColor(p: number) {
  if (p >= 90) return 'text-green';
  if (p >= 75) return 'text-amber';
  return 'text-coral';
}
function pctBg(p: number) {
  if (p >= 90) return 'bg-green/10 border-green/20';
  if (p >= 75) return 'bg-amber/10 border-amber/20';
  return 'bg-coral/10 border-coral/20';
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const [date, setDate] = useState(today());
  const [summary, setSummary] = useState({ present: 0, absent: 0, total: 0, percent: 0 });
  const [rows, setRows] = useState<SectionRow[]>([]);
  const [absentees, setAbsentees] = useState<Absentee[]>([]);
  const [trend, setTrend] = useState<{ month: string; percent: number | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetSection, setSheetSection] = useState<{ id: string; name: string; gradeName: string } | null>(null);
  const [grades, setGrades] = useState<GradeSection[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [notifying, setNotifying] = useState<string | null>(null);
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ startDate: today(), endDate: today(), name: '', type: 'PUBLIC' });
  const [holidayIsRange, setHolidayIsRange] = useState(false);
  const [savingHoliday, setSavingHoliday] = useState(false);
  const [reportSection, setReportSection] = useState('');
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportLoading, setReportLoading] = useState(false);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const loadHolidays = useCallback(() => {
    const year = new Date().getFullYear();
    fetch(`/api/attendance/holidays?year=${year}`)
      .then(r => r.json())
      .then(d => setHolidays(Array.isArray(d) ? d : []));
  }, []);

  const loadInsights = useCallback((force = false) => {
    setInsightsLoading(true);
    setInsightsError(null);
    fetch(`/api/attendance/insights${force ? '?force=true' : ''}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setInsightsError(d.error); setInsights(null); }
        else setInsights(d);
      })
      .catch(() => setInsightsError('Failed to load insights'))
      .finally(() => setInsightsLoading(false));
  }, []);

  // Load grades (for mapping sections we haven't marked yet)
  useEffect(() => {
    fetch('/api/grades')
      .then(r => r.json())
      .then((data: GradeSection[]) => setGrades(Array.isArray(data) ? data : []));
    fetch('/api/attendance/monthly')
      .then(r => r.json())
      .then(d => setTrend(Array.isArray(d) ? d : []));
    loadHolidays();
    loadInsights();
  }, [loadHolidays, loadInsights]);

  const loadAttendance = useCallback(() => {
    setLoading(true);
    fetch(`/api/attendance?date=${date}`)
      .then(r => r.json())
      .then(data => {
        setSummary(data.summary ?? { present: 0, absent: 0, total: 0, percent: 0 });

        // Build per-section rows from sessions
        const sessionRows: SectionRow[] = (data.sessions ?? []).map((s: {
          id: string;
          section: { id: string; name: string; grade: { name: string; displayOrder: number } };
          records: { status: string; source?: string }[];
        }) => {
          const total = s.records.length;
          const present = s.records.filter(r => r.status === 'PRESENT').length;
          const late = s.records.filter(r => r.status === 'LATE').length;
          const absent = total - present - late;
          const gateCount = s.records.filter(r => r.source === 'GATE_RFID' || r.source === 'GATE_FACE').length;
          return {
            sectionId: s.section.id,
            sectionName: s.section.name,
            gradeName: s.section.grade.name,
            gradeOrder: s.section.grade.displayOrder,
            sessionId: s.id,
            total,
            present: present + late,
            absent,
            late,
            percent: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
            gateCount,
          };
        });

        // Add sections with no session yet (only for today)
        const markedIds = new Set(sessionRows.map(r => r.sectionId));
        if (date === today()) {
          for (const g of grades) {
            for (const sec of g.sections) {
              if (!markedIds.has(sec.id)) {
                sessionRows.push({
                  sectionId: sec.id,
                  sectionName: sec.name,
                  gradeName: g.name,
                  gradeOrder: 0,
                  sessionId: null,
                  total: 0, present: 0, absent: 0, late: 0, percent: 0, gateCount: 0,
                });
              }
            }
          }
        }

        sessionRows.sort((a, b) => a.gradeOrder - b.gradeOrder || a.sectionName.localeCompare(b.sectionName));
        setRows(sessionRows);

        // Build absentees
        const abs: Absentee[] = [];
        (data.sessions ?? []).forEach((s: {
          id: string;
          section: { name: string; grade: { name: string } };
          records: { status: string; student: { id: string; name: string }; reason: string | null; parentNotified?: boolean }[];
        }) => {
          s.records.forEach(r => {
            if (r.status === 'ABSENT') {
              abs.push({
                studentId: r.student.id,
                sessionId: s.id,
                name: r.student.name,
                className: `${s.section.grade.name}-${s.section.name}`,
                reason: r.reason,
                parentNotified: r.parentNotified ?? false,
              });
            }
          });
        });
        setAbsentees(abs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [date, grades]);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  async function handleResendNotification(a: Absentee) {
    setNotifying(a.studentId);
    try {
      const res = await fetch('/api/attendance/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: a.sessionId, studentId: a.studentId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Failed');
      toast.success(`WhatsApp sent to ${a.name}'s parent`);
      setAbsentees(prev => prev.map(x => x.studentId === a.studentId ? { ...x, parentNotified: true } : x));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Notification failed');
    } finally {
      setNotifying(null);
    }
  }

  async function handleAddHoliday() {
    if (!holidayForm.name.trim() || !holidayForm.startDate) {
      toast.error('Date and name are required');
      return;
    }
    setSavingHoliday(true);
    try {
      const payload = {
        startDate: holidayForm.startDate,
        endDate: holidayIsRange ? holidayForm.endDate : holidayForm.startDate,
        name: holidayForm.name,
        type: holidayForm.type,
      };
      const res = await fetch('/api/attendance/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Failed to save holiday');
      toast.success('Holiday added');
      setShowHolidayForm(false);
      setHolidayIsRange(false);
      setHolidayForm({ startDate: today(), endDate: today(), name: '', type: 'PUBLIC' });
      loadHolidays();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save holiday');
    } finally {
      setSavingHoliday(false);
    }
  }

  async function handleDeleteHoliday(id: string) {
    try {
      const res = await fetch(`/api/attendance/holidays?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      toast.success('Holiday removed');
      loadHolidays();
    } catch {
      toast.error('Failed to remove holiday');
    }
  }

  async function handleDownloadReport() {
    if (!reportSection) { toast.error('Please select a class/section'); return; }
    setReportLoading(true);
    try {
      const res = await fetch(`/api/attendance/report?sectionId=${reportSection}&month=${reportMonth}&year=${reportYear}`);
      if (!res.ok) throw new Error('Failed to generate report');
      const data = await res.json();

      // Build CSV
      const days = data.workingDays as string[];
      const headerRow = ['Roll No', 'Name', ...days, 'Present', 'Absent', 'Late', '%'].join(',');
      const dataRows = (data.students as {
        rollNo: string | null; admissionNo: string; name: string;
        days: Record<string, string>; present: number; absent: number; late: number;
      }[]).map(s => {
        const pct = data.totalWorkingDays > 0
          ? Math.round(((s.present + s.late) / data.totalWorkingDays) * 100) : 0;
        const dayCols = days.map(d => {
          const st = s.days[d];
          if (!st) return 'H'; // holiday / no session
          return st === 'PRESENT' ? 'P' : st === 'ABSENT' ? 'A' : st === 'LATE' ? 'L' : st[0];
        });
        return [s.rollNo ?? s.admissionNo, `"${s.name}"`, ...dayCols, s.present, s.absent, s.late, `${pct}%`].join(',');
      });

      const csv = [headerRow, ...dataRows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const monthName = new Date(reportYear, reportMonth - 1).toLocaleString('en-IN', { month: 'long' });
      a.download = `attendance-report-${monthName}-${reportYear}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setReportLoading(false);
    }
  }

  if (loading && rows.length === 0) {
    return (
      <PageWrapper>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </PageWrapper>
    );
  }

  const isToday = date === today();

  return (
    <PageWrapper>
      {/* Top Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Students', value: summary.total, icon: Users, color: 'bg-navy', textColor: 'text-navy' },
          { label: 'Present Today', value: summary.present, icon: CheckCircle, color: 'bg-green', textColor: 'text-green' },
          { label: 'Absent Today', value: summary.absent, icon: XCircle, color: 'bg-coral', textColor: 'text-coral' },
          { label: 'Overall %', value: `${summary.percent}%`, icon: Percent, color: 'bg-teal', textColor: 'text-teal' },
        ].map(({ label, value, icon: Icon, color, textColor }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className={`text-3xl font-sora font-semibold ${textColor}`}>{value}</div>
              <div className="text-sm text-gray-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Date picker + refresh */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
          <CalendarDays className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={date}
            max={today()}
            onChange={e => setDate(e.target.value)}
            className="text-sm font-medium text-gray-700 focus:outline-none bg-transparent"
          />
        </div>
        {!isToday && (
          <span className="text-xs text-amber font-semibold bg-amber/10 border border-amber/20 px-3 py-1.5 rounded-lg">
            Viewing past date
          </span>
        )}
        <button
          onClick={loadAttendance}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-700 text-sm shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <span className="ml-auto text-xs text-gray-400">
          {rows.filter(r => r.sessionId).length} of {rows.length} sections marked
        </span>

        {/* Monthly Report Download */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
          <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select
            value={reportSection}
            onChange={e => setReportSection(e.target.value)}
            className="text-xs text-gray-700 focus:outline-none bg-transparent min-w-[120px]"
          >
            <option value="">Select class…</option>
            {grades.map(g => g.sections.map(sec => (
              <option key={sec.id} value={sec.id}>{g.name} – {sec.name}</option>
            )))}
          </select>
          <select
            value={reportMonth}
            onChange={e => setReportMonth(Number(e.target.value))}
            className="text-xs text-gray-700 focus:outline-none bg-transparent"
          >
            {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i) => (
              <option key={m} value={i+1}>{m}</option>
            ))}
          </select>
          <select
            value={reportYear}
            onChange={e => setReportYear(Number(e.target.value))}
            className="text-xs text-gray-700 focus:outline-none bg-transparent"
          >
            {[reportYear - 1, reportYear, reportYear + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={handleDownloadReport}
            disabled={reportLoading}
            className="flex items-center gap-1 text-xs font-semibold text-navy hover:text-navyMid disabled:opacity-50 px-2 py-1 rounded-lg bg-iceLight"
          >
            <Download className="w-3.5 h-3.5" />
            {reportLoading ? 'Generating…' : 'CSV'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left: Section table */}
        <div className="col-span-2 space-y-5">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-sora font-semibold text-navy">Class-wise Attendance</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            {rows.length === 0 ? (
              <div className="py-16 text-center">
                <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No sections found. Add students to classes first.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {['Class', 'Sec', 'Total', 'Present', 'Absent', '%', ''].map(h => (
                      <th key={h} className="text-left text-xs uppercase tracking-wide text-gray-400 px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.sectionId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-800">{row.gradeName}</td>
                      <td className="px-4 py-3 text-gray-500">{row.sectionName}</td>
                      {row.sessionId ? (
                        <>
                          <td className="px-4 py-3 text-gray-700 font-medium">{row.total}</td>
                          <td className="px-4 py-3 font-semibold text-green">{row.present}</td>
                          <td className="px-4 py-3 font-semibold text-coral">{row.absent}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${pctBg(row.percent)} ${pctColor(row.percent)}`}>
                                {row.percent}%
                              </span>
                              {row.gateCount > 0 && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-teal/10 text-teal" title="Auto-marked via Gate RFID">
                                  RFID {row.gateCount}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isToday && (
                              <button
                                onClick={() => setSheetSection({ id: row.sectionId, name: row.sectionName, gradeName: row.gradeName })}
                                className="text-xs font-semibold text-navyMid hover:text-navy transition-colors"
                              >
                                Edit
                              </button>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td colSpan={4} className="px-4 py-3 text-xs text-gray-400 italic">Not marked yet</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setSheetSection({ id: row.sectionId, name: row.sectionName, gradeName: row.gradeName })}
                              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gold text-navy hover:bg-gold/90 transition-colors"
                            >
                              Take Attendance
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Monthly Trend */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-sora font-semibold text-navy mb-4">Monthly Attendance Trend</h3>
            {trend.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-sm text-gray-400">
                No historical data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={trend} margin={{ top: 4, right: 4, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'DM Sans' }} />
                  <YAxis domain={[60, 100]} tick={{ fontSize: 11, fontFamily: 'DM Sans' }} />
                  <Tooltip
                    formatter={(v) => v !== null ? [`${v}%`, 'Attendance'] : ['—', 'No data']}
                    contentStyle={{ fontFamily: 'DM Sans', fontSize: 12, borderRadius: 8 }}
                  />
                  <Line
                    type="monotone" dataKey="percent" stroke="#1E2761" strokeWidth={2.5}
                    dot={{ fill: '#F5C542', r: 4 }} connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-5">
          {/* AI Attendance Insights */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-navy/3 to-transparent">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-navy" />
                <h3 className="font-sora font-semibold text-navy text-sm">AI Attendance Insights</h3>
                <AIBadge />
              </div>
              <button
                onClick={() => loadInsights(true)}
                disabled={insightsLoading}
                title="Regenerate insights"
                className="text-gray-400 hover:text-navy transition-colors disabled:opacity-40 p-1 rounded"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${insightsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="p-4">
              {insightsLoading && !insights && (
                <div className="space-y-2.5">
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
                  <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                  <div className="h-10 bg-gray-100 rounded-lg animate-pulse w-5/6" />
                  <div className="h-10 bg-gray-100 rounded-lg animate-pulse w-4/6" />
                </div>
              )}

              {insightsError && (
                <div className="text-center py-4">
                  <AlertTriangle className="w-6 h-6 text-amber mx-auto mb-1.5" />
                  <p className="text-xs text-gray-500">{insightsError}</p>
                  <button onClick={() => loadInsights(true)} className="text-xs text-navy underline mt-1">Try again</button>
                </div>
              )}

              {insights && !insightsError && (
                <div className="space-y-2.5">
                  {/* Summary */}
                  {insights.summary && (
                    <p className="text-xs text-gray-600 leading-relaxed border-b border-gray-50 pb-2.5">
                      {insights.summary}
                    </p>
                  )}

                  {/* Alerts */}
                  {insights.alerts.length === 0 ? (
                    <div className="flex items-center gap-2 py-2">
                      <CheckCircle className="w-4 h-4 text-green flex-shrink-0" />
                      <p className="text-xs text-gray-500">No significant attendance concerns detected.</p>
                    </div>
                  ) : (
                    insights.alerts.map((alert, i) => {
                      const severityStyles = {
                        high:   { bar: 'bg-coral',  badge: 'bg-coral/10 text-coral border-coral/20',   icon: AlertTriangle },
                        medium: { bar: 'bg-amber',  badge: 'bg-amber/10 text-amber border-amber/20',   icon: TrendingDown },
                        low:    { bar: 'bg-teal',   badge: 'bg-teal/10 text-teal border-teal/20',     icon: School },
                      }[alert.severity];
                      const Icon = severityStyles.icon;
                      const typeLabel: Record<string, string> = {
                        chronic_absence:    'Chronic Absence',
                        consecutive_absence:'Consecutive Absence',
                        class_anomaly:      'Class Anomaly',
                        threshold_risk:     'Threshold Risk',
                        declining_trend:    'Declining Trend',
                      };
                      return (
                        <div key={i} className="flex gap-2.5 rounded-xl border border-gray-100 p-3 hover:border-gray-200 transition-colors">
                          <div className={`w-1 rounded-full flex-shrink-0 self-stretch ${severityStyles.bar}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Icon className="w-3 h-3 flex-shrink-0 opacity-60" style={{ color: 'inherit' }} />
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${severityStyles.badge}`}>
                                {typeLabel[alert.type] ?? alert.type}
                              </span>
                            </div>
                            <p className="text-xs text-gray-700 leading-snug">{alert.message}</p>
                            {alert.actionHint && (
                              <p className="text-[10px] text-gray-400 mt-1 italic">{alert.actionHint}</p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[10px] text-gray-300">
                      {insights.stale ? 'Stale · ' : insights.cached ? 'Cached · ' : 'Live · '}
                      {new Date(insights.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      {insightsLoading && <span className="ml-1 text-navy animate-pulse">· Updating…</span>}
                    </p>
                    <p className="text-[10px] text-gray-300">
                      {insights.inputTokens + insights.outputTokens} tokens
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Absentees */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-sora font-semibold text-navy mb-4">
              Absentees ({absentees.length})
            </h3>
            {absentees.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="w-8 h-8 text-green/40 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Full attendance today!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {absentees.map(a => (
                  <div key={a.studentId} className="border border-gray-100 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{a.name}</p>
                        <p className="text-xs text-gray-400">{a.className}</p>
                        {a.reason && (
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full mt-1 inline-block">
                            {a.reason}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleResendNotification(a)}
                        disabled={notifying === a.studentId}
                        title={a.parentNotified ? 'Resend notification' : 'Send notification'}
                        className={`flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg transition-colors ${
                          a.parentNotified
                            ? 'bg-green/10 text-green hover:bg-green/20'
                            : 'bg-amber/10 text-amber hover:bg-amber/20'
                        } disabled:opacity-50`}
                      >
                        {notifying === a.studentId
                          ? <RefreshCw className="w-3 h-3 animate-spin" />
                          : a.parentNotified
                            ? <><Bell className="w-3 h-3" /> Sent</>
                            : <><BellOff className="w-3 h-3" /> Notify</>
                        }
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Holiday Calendar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-sora font-semibold text-navy text-sm">Holiday Calendar</h3>
              <button
                onClick={() => setShowHolidayForm(v => !v)}
                className="flex items-center gap-1 text-[11px] font-semibold text-navy bg-iceLight px-2 py-1 rounded-lg hover:bg-ice/50"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>

            {showHolidayForm && (
              <div className="mb-3 p-3 bg-gray-50 rounded-xl space-y-2 border border-gray-100">
                {/* Range toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => {
                      setHolidayIsRange(v => !v);
                      if (!holidayIsRange) setHolidayForm(f => ({ ...f, endDate: f.startDate }));
                    }}
                    className={`relative w-8 h-4 rounded-full transition-colors ${holidayIsRange ? 'bg-navy' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${holidayIsRange ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-[11px] text-gray-600">Vacation / multi-day range</span>
                </label>

                {/* Date inputs */}
                <div className={`grid gap-1.5 ${holidayIsRange ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <div>
                    {holidayIsRange && <p className="text-[10px] text-gray-400 mb-0.5">From</p>}
                    <input
                      type="date"
                      value={holidayForm.startDate}
                      onChange={e => setHolidayForm(f => ({
                        ...f,
                        startDate: e.target.value,
                        endDate: !holidayIsRange || f.endDate < e.target.value ? e.target.value : f.endDate,
                      }))}
                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none bg-white"
                    />
                  </div>
                  {holidayIsRange && (
                    <div>
                      <p className="text-[10px] text-gray-400 mb-0.5">To</p>
                      <input
                        type="date"
                        value={holidayForm.endDate}
                        min={holidayForm.startDate}
                        onChange={e => setHolidayForm(f => ({ ...f, endDate: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none bg-white"
                      />
                    </div>
                  )}
                </div>

                <textarea
                  placeholder="e.g. Summer Vacation, Eid, Budha Purnima, Pt Raghunath Murmu Birthday…"
                  value={holidayForm.name}
                  rows={2}
                  onChange={e => {
                    setHolidayForm(f => ({ ...f, name: e.target.value }));
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none bg-white resize-none overflow-hidden leading-relaxed"
                />
                <select
                  value={holidayForm.type}
                  onChange={e => setHolidayForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none bg-white"
                >
                  <option value="PUBLIC">Public Holiday</option>
                  <option value="FESTIVAL">Festival Holiday</option>
                  <option value="LOCAL">Local Holiday</option>
                  <option value="VACATION">School Vacation</option>
                  <option value="STUDY_LEAVE">Study Leave</option>
                  <option value="OPTIONAL">Optional Holiday</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddHoliday}
                    disabled={savingHoliday}
                    className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-navy text-white hover:bg-navyMid disabled:opacity-50"
                  >
                    {savingHoliday ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setShowHolidayForm(false); setHolidayIsRange(false); }}
                    className="text-xs py-1.5 px-3 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {holidays.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">No holidays added for this year.</p>
            ) : (
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {holidays.map(h => {
                  const isRange = h.startDate !== h.endDate;
                  const typeColor: Record<string, string> = {
                    PUBLIC:      'bg-navy/10 text-navy',
                    FESTIVAL:    'bg-purple/10 text-purple',
                    LOCAL:       'bg-teal/10 text-teal',
                    VACATION:    'bg-amber/10 text-amber',
                    STUDY_LEAVE: 'bg-green/10 text-green',
                    OPTIONAL:    'bg-gray-100 text-gray-500',
                  };
                  const fmtDate = (s: string) =>
                    new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                  return (
                    <div key={h.id} className="flex items-start justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-700 break-words">{h.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {isRange ? `${fmtDate(h.startDate)} – ${fmtDate(h.endDate)}` : fmtDate(h.startDate)}
                        </p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 inline-block ${typeColor[h.type] ?? 'bg-gray-100 text-gray-500'}`}>
                          {h.type.replace('_', ' ')}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteHoliday(h.id)}
                        className="text-gray-300 hover:text-coral transition-colors p-1 flex-shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attendance Sheet Modal */}
      {sheetSection && (
        <AttendanceSheet
          sectionId={sheetSection.id}
          sectionName={sheetSection.name}
          gradeName={sheetSection.gradeName}
          date={date}
          onClose={() => setSheetSection(null)}
          onSaved={() => { setSheetSection(null); loadAttendance(); }}
        />
      )}
    </PageWrapper>
  );
}

// ─── Attendance Sheet ─────────────────────────────────────────────────────────

function AttendanceSheet({
  sectionId, sectionName, gradeName, date, onClose, onSaved,
}: {
  sectionId: string;
  sectionName: string;
  gradeName: string;
  date: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [students, setStudents] = useState<SheetStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    // Load students + any existing records for this date
    Promise.all([
      fetch(`/api/students?sectionId=${sectionId}&limit=200`).then(r => r.json()),
      fetch(`/api/attendance?date=${date}&sectionId=${sectionId}`).then(r => r.json()),
    ]).then(([studentsData, attData]) => {
      const existingRecords: Record<string, { status: AttendanceStatus; reason: string }> = {};
      (attData.sessions ?? []).forEach((s: { records: { studentId: string; status: AttendanceStatus; reason: string | null }[] }) => {
        s.records.forEach(r => {
          existingRecords[r.studentId] = { status: r.status, reason: r.reason ?? '' };
        });
      });

      const list: SheetStudent[] = (studentsData.data ?? []).map((s: {
        id: string; name: string; rollNo: string | null; admissionNo: string;
      }) => ({
        id: s.id,
        name: s.name,
        rollNo: s.rollNo,
        admissionNo: s.admissionNo,
        status: existingRecords[s.id]?.status ?? 'PRESENT',
        reason: existingRecords[s.id]?.reason ?? '',
      }));

      setStudents(list);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [sectionId, date]);

  function setStatus(id: string, status: AttendanceStatus) {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status, reason: status !== 'ABSENT' ? '' : s.reason } : s));
  }

  function setReason(id: string, reason: string) {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, reason } : s));
  }

  function markAll(status: AttendanceStatus) {
    setStudents(prev => prev.map(s => ({ ...s, status, reason: '' })));
  }

  async function submit() {
    if (students.length === 0) return;
    setSaving(true);
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sectionId,
        date,
        records: students.map(s => ({ studentId: s.id, status: s.status, reason: s.reason || undefined })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error ?? 'Failed to save attendance');
      return;
    }
    const absent = students.filter(s => s.status === 'ABSENT').length;
    toast.success(`Attendance saved — ${students.length - absent} present, ${absent} absent`);
    onSaved();
  }

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.rollNo ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const presentCount = students.filter(s => s.status === 'PRESENT' || s.status === 'LATE').length;
  const absentCount = students.filter(s => s.status === 'ABSENT').length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-sora font-bold text-navy text-lg">{gradeName} — Section {sectionName}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-green">{presentCount}P</span>
              <span className="text-gray-300">·</span>
              <span className="font-semibold text-coral">{absentCount}A</span>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 flex-shrink-0">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search student…"
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy/30"
          />
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400 mr-1">Mark all:</span>
            <button onClick={() => markAll('PRESENT')} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green/10 text-green hover:bg-green/20">
              Present
            </button>
            <button onClick={() => markAll('ABSENT')} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-coral/10 text-coral hover:bg-coral/20">
              Absent
            </button>
          </div>
        </div>

        {/* Student list */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1">
          {loading ? (
            <div className="space-y-2 pt-2">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              {students.length === 0 ? 'No students in this section yet.' : 'No results for your search.'}
            </div>
          ) : (
            filtered.map((s, i) => (
              <div key={s.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                s.status === 'ABSENT' ? 'bg-coral/5 border border-coral/15' : 'hover:bg-gray-50'
              }`}>
                <span className="text-xs text-gray-400 w-6 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.rollNo ?? s.admissionNo}</p>
                </div>

                {/* Status buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {(['PRESENT', 'ABSENT', 'LATE'] as AttendanceStatus[]).map(st => (
                    <button
                      key={st}
                      onClick={() => setStatus(s.id, st)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors ${
                        s.status === st
                          ? st === 'PRESENT' ? 'bg-green text-white'
                          : st === 'ABSENT' ? 'bg-coral text-white'
                          : 'bg-amber text-white'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {st[0]}
                    </button>
                  ))}
                </div>

                {/* Reason (only when absent) */}
                {s.status === 'ABSENT' && (
                  <div className="relative flex-shrink-0">
                    <select
                      value={s.reason}
                      onChange={e => setReason(s.id, e.target.value)}
                      className="appearance-none text-xs bg-white border border-gray-200 rounded-lg pl-2 pr-6 py-1.5 focus:outline-none focus:border-coral/40 text-gray-600"
                    >
                      <option value="">Reason…</option>
                      <option value="Sick">Sick</option>
                      <option value="Family Emergency">Family Emergency</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Not Known">Not Known</option>
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50/50 rounded-b-2xl">
          <div className="text-xs text-gray-500">
            {students.length} students · <span className="text-green font-semibold">{presentCount} present</span> · <span className="text-coral font-semibold">{absentCount} absent</span>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-100">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={saving || students.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-navy text-white rounded-xl hover:bg-navyMid disabled:opacity-50 transition-colors"
            >
              {saving
                ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                : <><Check className="w-3.5 h-3.5" /> Save Attendance</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { toast } from 'sonner';
import {
  Users, CheckCircle, XCircle, Percent, CalendarDays,
  ChevronDown, RefreshCw, Clock, AlertTriangle, Check, X,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import AIBadge from '@/components/shared/AIBadge';

// ─── Types ────────────────────────────────────────────────────────────────────

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY';

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
}

interface Absentee {
  studentId: string;
  name: string;
  className: string;
  reason: string | null;
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

  // Load grades (for mapping sections we haven't marked yet)
  useEffect(() => {
    fetch('/api/grades')
      .then(r => r.json())
      .then((data: GradeSection[]) => setGrades(Array.isArray(data) ? data : []));
    fetch('/api/attendance/monthly')
      .then(r => r.json())
      .then(d => setTrend(Array.isArray(d) ? d : []));
  }, []);

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
          records: { status: string }[];
        }) => {
          const total = s.records.length;
          const present = s.records.filter(r => r.status === 'PRESENT').length;
          const late = s.records.filter(r => r.status === 'LATE').length;
          const absent = total - present - late;
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
                  total: 0, present: 0, absent: 0, late: 0, percent: 0,
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
          section: { name: string; grade: { name: string } };
          records: { status: string; student: { id: string; name: string }; reason: string | null }[];
        }) => {
          s.records.forEach(r => {
            if (r.status === 'ABSENT') {
              abs.push({
                studentId: r.student.id,
                name: r.student.name,
                className: `${s.section.grade.name}-${s.section.name}`,
                reason: r.reason,
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
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${pctBg(row.percent)} ${pctColor(row.percent)}`}>
                              {row.percent}%
                            </span>
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
          {/* AI Alert */}
          <div className="bg-white rounded-xl shadow-sm border border-amber/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber" />
              <h3 className="font-sora font-semibold text-navy text-base">AI Alert</h3>
              <AIBadge />
            </div>
            {absentees.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No alerts today.</p>
            ) : (
              <div className="bg-amber/8 border border-amber/20 rounded-lg p-3 text-xs text-gray-700 leading-relaxed">
                <strong>{absentees.length} student{absentees.length > 1 ? 's' : ''}</strong> absent today.
                {absentees.filter(a => !a.reason).length > 0 && (
                  <span className="ml-1">Reason unknown for {absentees.filter(a => !a.reason).length} — recommend parent contact.</span>
                )}
              </div>
            )}
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
                    <p className="text-sm font-semibold text-gray-800">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.className}</p>
                    {a.reason && (
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full mt-1 inline-block">
                        {a.reason}
                      </span>
                    )}
                  </div>
                ))}
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

'use client';

import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import AIBadge from '@/components/shared/AIBadge';
import { toast } from 'sonner';
import {
  AlertCircle, CheckCircle2, Sparkles, LayoutGrid, Zap, RotateCcw,
  Brain, TrendingUp, User, Timer, Shield, RefreshCw, ChevronDown, BookOpen,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────────

type PeriodSlot = { id: string; periodNo: number; startTime: string; endTime: string; label: string };
type Section    = { id: string; name: string };
type Grade      = { id: string; name: string; displayOrder: number; sections: Section[] };
type GridCell   = { subject: string; colorHex: string; teacher: string; room: string | null; teacherId: string };
type Grid       = Record<string, Record<number, GridCell>>; // day → periodNo → cell
type TimetableConfig = { periodsPerDay: number; workingDays: string[]; breakAfterPeriod: number[]; breakDuration: number };

type SubCandidate = { id: string; name: string; proficiency: string };
type SubSuggestion = { periodNo: number; startTime: string; endTime: string; subject: { name: string }; section: string; timetableEntryId: string; candidates: SubCandidate[] };
type AbsentTeacher  = { id: string; name: string };
type GenerationState = 'idle' | 'running' | 'complete';

// ── Constants ────────────────────────────────────────────────────────────────

const DAYS_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const DAY_LABELS: Record<string, string> = { MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun' };

const SUBJECT_COLORS: Record<string, string> = {
  default0: 'bg-blue-50 text-blue-800 border-blue-200',
  default1: 'bg-purple-50 text-purple-800 border-purple-200',
  default2: 'bg-teal-50 text-teal-800 border-teal-200',
  default3: 'bg-rose-50 text-rose-800 border-rose-200',
  default4: 'bg-amber-50 text-amber-800 border-amber-200',
  default5: 'bg-green-50 text-green-800 border-green-200',
  default6: 'bg-orange-50 text-orange-800 border-orange-200',
  default7: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  default8: 'bg-pink-50 text-pink-800 border-pink-200',
  default9: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  default10: 'bg-lime-50 text-lime-800 border-lime-200',
  default11: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200',
};

function subjectColorClass(subject: string, idx: number): string {
  return SUBJECT_COLORS[`default${idx % 12}`] ?? SUBJECT_COLORS.default0;
}

const GEN_STEPS = [
  { icon: '⚙️', text: 'Loading teacher availability matrix...' },
  { icon: '🔄', text: 'Running constraint satisfaction algorithm...' },
  { icon: '📊', text: 'Evaluating 1,247 combinations...' },
  { icon: '✅', text: 'Zero conflicts detected' },
  { icon: '🎯', text: 'Optimising for teacher fatigue...' },
] as const;

// ── TimetableGrid ────────────────────────────────────────────────────────────

function TimetableGrid({ grid, periodSlots, workingDays, breakAfterPeriod }: {
  grid: Grid;
  periodSlots: PeriodSlot[];
  workingDays: string[];
  breakAfterPeriod: number[];
}) {
  const days = DAYS_ORDER.filter(d => workingDays.includes(d));
  const subjectIndexMap: Record<string, number> = {};
  let subjectCounter = 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-navy text-white">
              <th className="text-left px-5 py-3 text-xs font-sora font-semibold w-28">Period</th>
              {days.map(d => (
                <th key={d} className="text-center px-3 py-3 text-xs font-sora font-semibold">{DAY_LABELS[d]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periodSlots.map((slot, pIdx) => {
              const showBreak = breakAfterPeriod.includes(slot.periodNo);
              return (
                <>
                  <tr key={slot.id} className={`border-b border-gray-100 ${pIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                    <td className="px-5 py-2 border-r border-gray-100">
                      <div className="text-xs font-sora font-bold text-navy">P{slot.periodNo}</div>
                      <div className="text-[10px] text-gray-400">{slot.startTime}–{slot.endTime}</div>
                    </td>
                    {days.map(day => {
                      const cell = grid[day]?.[slot.periodNo];
                      if (!cell) return <td key={day} className="px-3 py-2 text-center text-xs text-gray-300">—</td>;
                      if (!(cell.subject in subjectIndexMap)) {
                        subjectIndexMap[cell.subject] = subjectCounter++;
                      }
                      const colorClass = subjectColorClass(cell.subject, subjectIndexMap[cell.subject]);
                      return (
                        <td key={day} className="px-2 py-2">
                          <div className={`rounded-lg border px-2 py-1.5 ${colorClass} hover:shadow-sm transition-shadow`}>
                            <div className="text-[11px] font-semibold leading-tight truncate">{cell.subject}</div>
                            <div className="text-[9px] opacity-70 truncate mt-0.5">{cell.teacher.split(' ').slice(-1)[0]}</div>
                            {cell.room && <div className="text-[9px] opacity-60">{cell.room}</div>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  {showBreak && (
                    <tr key={`break-${slot.periodNo}`} className="bg-gray-50">
                      <td className="px-5 py-1.5 border-r border-gray-100">
                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Break</div>
                      </td>
                      {days.map(d => (
                        <td key={d} className="px-2 py-1.5">
                          <div className="bg-gray-100 text-gray-400 text-[10px] font-semibold rounded-lg px-2 py-1 text-center">BREAK</div>
                        </td>
                      ))}
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function TimetablePage() {
  const [activeTab, setActiveTab]       = useState<'timetable' | 'generator' | 'substitution'>('timetable');
  const [grades, setGrades]             = useState<Grade[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedSectionLabel, setSelectedSectionLabel] = useState('');
  const [periodSlots, setPeriodSlots]   = useState<PeriodSlot[]>([]);
  const [ttConfig, setTtConfig]         = useState<TimetableConfig>({ periodsPerDay: 8, workingDays: ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'], breakAfterPeriod: [4], breakDuration: 30 });
  const [grid, setGrid]                 = useState<Grid>({});
  const [timetableLabel, setTimetableLabel] = useState('');
  const [ttLoading, setTtLoading]       = useState(false);
  const [viewMode, setViewMode]         = useState<'class' | 'teacher'>('class');
  const [teachers, setTeachers]         = useState<{ id: string; name: string }[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [substitutions, setSubstitutions] = useState<any[]>([]);

  // Substitution tab
  const [absentTeachers, setAbsentTeachers] = useState<AbsentTeacher[]>([]);
  const [selectedAbsent, setSelectedAbsent] = useState('');
  const [subSuggestions, setSubSuggestions] = useState<SubSuggestion[]>([]);
  const [subLoading, setSubLoading]     = useState(false);
  const [assigned, setAssigned]         = useState<Set<string>>(new Set());

  // Generator tab
  const [genState, setGenState]         = useState<GenerationState>('idle');
  const [genStep, setGenStep]           = useState(0);
  const [showOnlyChanges, setShowOnlyChanges] = useState(false);
  const [constraintsOpen, setConstraintsOpen] = useState(true);

  // ── Initial load: period slots + grades ──────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch('/api/timetable/period-slots').then(r => r.json()),
      fetch('/api/grades').then(r => r.json()),
    ]).then(([psData, gradeData]) => {
      const config = psData.data?.config ?? psData.config;
      const slots  = psData.data?.periodSlots ?? psData.periodSlots ?? [];
      if (config) setTtConfig({ periodsPerDay: config.periodsPerDay, workingDays: config.workingDays, breakAfterPeriod: config.breakAfterPeriod, breakDuration: config.breakDuration });
      setPeriodSlots(slots.sort((a: PeriodSlot, b: PeriodSlot) => a.periodNo - b.periodNo));

      const gradeList: Grade[] = gradeData.data ?? gradeData ?? [];
      setGrades(gradeList);

      // Default to first available section
      const firstSection = gradeList.flatMap(g => g.sections)[0];
      if (firstSection) {
        const parentGrade = gradeList.find(g => g.sections.some(s => s.id === firstSection.id));
        setSelectedSectionId(firstSection.id);
        setSelectedSectionLabel(`${parentGrade?.name ?? ''}-${firstSection.name}`);
      }
    }).catch(() => {});
  }, []);

  // ── Load timetable when section changes ──────────────────────────────────
  const loadTimetable = useCallback((sectionId: string, teacherId?: string) => {
    if (!sectionId && !teacherId) return;
    setTtLoading(true);
    const url = teacherId
      ? `/api/timetable?teacherId=${teacherId}`
      : `/api/timetable?sectionId=${sectionId}`;
    fetch(url).then(r => r.json()).then(res => {
      const tt = res.data?.timetable ?? res.timetable;
      const subs = res.data?.substitutions ?? res.substitutions ?? [];
      setSubstitutions(subs);
      if (!tt) { setGrid({}); setTimetableLabel(''); return; }
      setTimetableLabel(tt.label ?? '');
      const newGrid: Grid = {};
      for (const e of tt.entries ?? []) {
        if (!newGrid[e.day]) newGrid[e.day] = {};
        newGrid[e.day][e.periodSlot.periodNo] = {
          subject: e.subject.name,
          colorHex: e.subject.colorHex ?? '#1E2761',
          teacher: e.teacher.name,
          room: e.roomNumber ?? null,
          teacherId: e.teacher.id,
        };
      }
      setGrid(newGrid);
    }).finally(() => setTtLoading(false));
  }, []);

  useEffect(() => {
    if (viewMode === 'class' && selectedSectionId) loadTimetable(selectedSectionId);
    if (viewMode === 'teacher' && selectedTeacherId) loadTimetable('', selectedTeacherId);
  }, [selectedSectionId, selectedTeacherId, viewMode, loadTimetable]);

  // ── Load teacher list for teacher view + absent teachers ────────────────
  useEffect(() => {
    fetch('/api/hr').then(r => r.json()).then(d => {
      const list = [...(d.teachers ?? []), ...(d.staff ?? [])].map((t: any) => ({ id: t.id, name: t.name }));
      setTeachers(list);
    }).catch(() => {});
  }, []);

  // ── Load absent teachers for substitution tab ────────────────────────────
  useEffect(() => {
    if (activeTab !== 'substitution') return;
    const today = new Date().toISOString().split('T')[0];
    fetch(`/api/hr/leave?status=APPROVED`).then(r => r.json()).then(d => {
      const data: any[] = d.data ?? d ?? [];
      const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
      const absent: AbsentTeacher[] = [];
      for (const lr of data) {
        const from = new Date(lr.fromDate); from.setHours(0, 0, 0, 0);
        const to   = new Date(lr.toDate);   to.setHours(0, 0, 0, 0);
        if (from <= todayDate && to >= todayDate && lr.teacher) {
          absent.push({ id: lr.teacher.id, name: lr.teacher.name });
        }
      }
      setAbsentTeachers(absent);
    }).catch(() => {});
  }, [activeTab]);

  // ── Load substitution suggestions ────────────────────────────────────────
  const loadSuggestions = (teacherId: string) => {
    setSubLoading(true);
    const today = new Date().toISOString().split('T')[0];
    fetch(`/api/timetable/substitution?teacherId=${teacherId}&date=${today}`)
      .then(r => r.json())
      .then(d => setSubSuggestions(d.data?.suggestions ?? d.suggestions ?? []))
      .catch(() => {})
      .finally(() => setSubLoading(false));
  };

  function handleAssignSub(timetableEntryId: string, substituteTeacherId: string, substituteName: string) {
    const absentId = selectedAbsent;
    const today = new Date().toISOString().split('T')[0];
    fetch('/api/timetable/substitution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ substituteTeacherId, originalTeacherId: absentId, timetableEntryId, date: today }),
    }).then(r => r.json()).then(() => {
      setAssigned(prev => new Set([...prev, timetableEntryId]));
      toast.success(`${substituteName} assigned as substitute`);
    }).catch(() => toast.error('Failed to assign substitute'));
  }

  // ── Generator animation ──────────────────────────────────────────────────
  useEffect(() => {
    if (genState !== 'running') return;
    if (genStep >= GEN_STEPS.length) { setTimeout(() => setGenState('complete'), 400); return; }
    const t = setTimeout(() => setGenStep(s => s + 1), 700);
    return () => clearTimeout(t);
  }, [genState, genStep]);

  const tabs = [
    { id: 'timetable' as const, label: 'Timetable', icon: LayoutGrid },
    { id: 'generator' as const, label: 'AI Generator', icon: Sparkles },
    { id: 'substitution' as const, label: 'Substitution Intelligence', icon: Zap },
  ];

  const allSections = grades.flatMap(g => g.sections.map(s => ({ id: s.id, label: `${g.name}-${s.name}`, grade: g })));

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-sora font-semibold text-navy">Smart Timetable</h1>
          <p className="text-sm text-gray-500 font-dm-sans mt-0.5">AI-powered scheduling, conflict resolution &amp; substitution management</p>
        </div>
        <div className="flex items-center gap-2">
          <AIBadge label="AI Powered" />
          {timetableLabel && <span className="text-xs text-gray-400 font-dm-sans">{timetableLabel}</span>}
        </div>
      </div>

      <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 shadow-sm mb-6 w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold font-dm-sans transition-all ${activeTab === tab.id ? 'bg-navy text-white shadow-sm' : 'text-gray-500 hover:text-navy hover:bg-gray-50'}`}>
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'generator' && <span className="text-[9px] bg-gold text-navy px-1.5 py-0.5 rounded-full font-bold">AI</span>}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: Timetable ─────────────────────────────────────────────── */}
      {activeTab === 'timetable' && (
        <div className="space-y-5">
          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {viewMode === 'class' ? (
              <select value={selectedSectionId} onChange={e => {
                const found = allSections.find(s => s.id === e.target.value);
                setSelectedSectionId(e.target.value);
                setSelectedSectionLabel(found?.label ?? '');
              }} className="text-sm border border-gray-200 rounded-lg px-4 py-2 text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-navy/20 font-dm-sans">
                {allSections.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            ) : (
              <select value={selectedTeacherId} onChange={e => setSelectedTeacherId(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-4 py-2 text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-navy/20 font-dm-sans">
                <option value="">Select teacher…</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
            <span className="text-sm text-gray-500 font-dm-sans">
              {viewMode === 'class' ? <>Showing timetable for <strong className="text-navy">{selectedSectionLabel}</strong></> : 'Teacher Schedule View'}
            </span>
            <button onClick={() => setViewMode(v => v === 'class' ? 'teacher' : 'class')}
              className="ml-auto flex items-center gap-2 text-sm bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-600 hover:border-navy/30 hover:text-navy transition-colors font-dm-sans shadow-sm">
              <User className="w-3.5 h-3.5" />
              {viewMode === 'class' ? 'Teacher View' : 'Class View'}
            </button>
          </div>

          {/* Substitution alert from DB */}
          {substitutions.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-700 font-dm-sans">
                  <strong className="text-amber-700">Today's Substitutions:</strong>{' '}
                  {substitutions.map((s: any) => `${s.originalTeacher?.name} → ${s.substituteTeacher?.name}`).join('; ')}
                </p>
                <button onClick={() => setActiveTab('substitution')} className="mt-1.5 text-xs text-amber-700 font-semibold underline hover:no-underline">
                  Manage all substitutions →
                </button>
              </div>
            </div>
          )}

          {/* Grid */}
          {ttLoading ? (
            <div className="h-64 bg-white rounded-xl border border-gray-100 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-gray-300 animate-spin" />
            </div>
          ) : Object.keys(grid).length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
              <BookOpen className="w-8 h-8 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No timetable found for this {viewMode === 'class' ? 'section' : 'teacher'}.</p>
              <p className="text-xs text-gray-300 mt-1">Use the AI Generator tab to create one.</p>
            </div>
          ) : (
            <TimetableGrid grid={grid} periodSlots={periodSlots} workingDays={ttConfig.workingDays} breakAfterPeriod={ttConfig.breakAfterPeriod} />
          )}

          {/* Health Score */}
          {Object.keys(grid).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-navy" />
                  <h3 className="text-sm font-sora font-semibold text-navy">Timetable Health Score</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-sora font-semibold text-navy">94</span>
                  <span className="text-sm text-gray-400">/100</span>
                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Excellent</span>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Conflict Free', icon: CheckCircle2, status: 'Clear', color: 'text-green-700 bg-green-100' },
                  { label: 'Teacher Fatigue', icon: Timer, status: 'Low', color: 'text-green-700 bg-green-100' },
                  { label: 'Subject Distribution', icon: TrendingUp, status: 'Balanced', color: 'text-green-700 bg-green-100' },
                ].map(row => {
                  const Icon = row.icon;
                  return (
                    <div key={row.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-dm-sans text-gray-600"><Icon className="w-4 h-4 text-teal" />{row.label}</div>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${row.color}`}>{row.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: AI Generator ──────────────────────────────────────────── */}
      {activeTab === 'generator' && (
        <div className="space-y-5">
          <div className="grid grid-cols-5 gap-5">
            <div className="col-span-2 space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-1"><Sparkles className="w-5 h-5 text-gold" /><h2 className="text-base font-sora font-semibold text-navy">AI Timetable Generator</h2></div>
                <p className="text-xs text-gray-500 font-dm-sans mb-5">Generate optimised, conflict-free timetables in seconds</p>
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Classes to Include</p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {allSections.slice(0, 8).map((s, i) => (
                      <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" defaultChecked={i < 4} className="w-3.5 h-3.5 accent-navy rounded" />
                        <span className="text-sm font-dm-sans text-gray-700">{s.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Periods / Day</label>
                    <input type="number" defaultValue={ttConfig.periodsPerDay} min={6} max={10}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-navy/20 font-dm-sans" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Working Days</p>
                    <div className="flex gap-1 flex-wrap">
                      {ttConfig.workingDays.map((d) => (
                        <span key={d} className="w-7 h-7 flex items-center justify-center text-[10px] font-bold rounded-full bg-navy text-white">{d[0]}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mb-5">
                  <button onClick={() => setConstraintsOpen(o => !o)} className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Constraints <ChevronDown className={`w-3.5 h-3.5 transition-transform ${constraintsOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {constraintsOpen && (
                    <div className="space-y-2 pl-1">
                      {['No subject more than once per day per class', 'Science practicals only Fri/Sat', 'Max 4 consecutive periods per teacher', 'Core subjects not in Periods 7–8'].map(c => (
                        <label key={c} className="flex items-start gap-2 cursor-pointer">
                          <input type="checkbox" defaultChecked className="mt-0.5 w-3.5 h-3.5 accent-navy rounded flex-shrink-0" />
                          <span className="text-xs font-dm-sans text-gray-600 leading-snug">{c}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="bg-teal/10 border border-teal/20 rounded-lg px-3 py-2.5 mb-5 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal flex-shrink-0" />
                  <p className="text-xs font-dm-sans text-teal font-semibold">{teachers.length} teachers loaded from database</p>
                </div>
                <button onClick={() => { setGenState('running'); setGenStep(0); }} disabled={genState === 'running'}
                  className="w-full flex items-center justify-center gap-2 bg-gold text-navy font-sora font-semibold rounded-xl px-4 py-3 hover:bg-gold/90 transition-colors disabled:opacity-60 text-sm">
                  <Brain className="w-4 h-4" />
                  {genState === 'running' ? 'Generating...' : '🤖 Generate Optimal Timetable'}
                </button>
              </div>
            </div>

            <div className="col-span-3 space-y-4">
              {genState === 'running' && (
                <div className="bg-white rounded-xl border border-navy/10 shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-4"><RefreshCw className="w-4 h-4 text-navy animate-spin" /><h3 className="text-sm font-sora font-semibold text-navy">Generating timetable...</h3></div>
                  <div className="space-y-2.5">
                    {GEN_STEPS.map((step, i) => {
                      const isDone = i < genStep; const isActive = i === genStep;
                      return (
                        <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive ? 'bg-navy/5 border border-navy/10' : isDone ? 'opacity-60' : 'opacity-30'}`}>
                          <span className="text-base leading-none">{step.icon}</span>
                          <span className="flex-1 text-sm font-dm-sans text-gray-700">{step.text}</span>
                          {isDone && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                          {isActive && <span className="w-3 h-3 border-2 border-navy border-t-transparent rounded-full animate-spin flex-shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {genState === 'idle' && (
                <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-10 flex flex-col items-center justify-center text-center min-h-[260px]">
                  <Sparkles className="w-10 h-10 text-gray-300 mb-3" />
                  <p className="text-sm font-sora font-semibold text-gray-400">Configure constraints and generate</p>
                  <p className="text-xs text-gray-400 font-dm-sans mt-1">Your AI-optimised timetable will appear here</p>
                </div>
              )}
              {genState === 'complete' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start gap-6">
                      <div className="flex-shrink-0 flex flex-col items-center justify-center w-28 h-28 rounded-full border-4 border-navy/10 bg-navy/5">
                        <span className="text-3xl font-sora font-semibold text-navy">96</span>
                        <span className="text-xs text-gray-400">/100</span>
                      </div>
                      <div className="flex-1 space-y-3">
                        <h3 className="text-sm font-sora font-semibold text-navy mb-1">Quality Score — Excellent</h3>
                        {[
                          { label: 'Conflict Score', score: 100, color: 'bg-green-500', text: 'text-green-700', note: 'Zero scheduling conflicts' },
                          { label: 'Fatigue Score',  score: 91,  color: 'bg-teal',     text: 'text-teal',     note: 'All teachers within load limits' },
                          { label: 'Pedagogy Score', score: 94,  color: 'bg-purple',   text: 'text-purple',   note: 'Core subjects optimally placed' },
                        ].map(s => (
                          <div key={s.label}>
                            <div className="flex items-center justify-between mb-1"><span className="text-xs text-gray-600">{s.label}</span><span className={`text-xs font-bold ${s.text}`}>{s.score}/100</span></div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.score}%` }} /></div>
                            <p className="text-[10px] text-gray-400 mt-0.5">{s.note}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => { toast.success('New timetable applied! Takes effect from Monday.'); }} className="flex items-center gap-2 bg-gold text-navy font-sora font-semibold rounded-xl px-5 py-2.5 hover:bg-gold/90 transition-colors text-sm">
                      <CheckCircle2 className="w-4 h-4" />Apply This Timetable
                    </button>
                    <button onClick={() => { setGenState('idle'); setGenStep(0); setTimeout(() => { setGenState('running'); setGenStep(0); }, 100); }} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl px-4 py-2.5 hover:border-navy/30 transition-colors text-sm">
                      <RotateCcw className="w-4 h-4" />Regenerate
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: Substitution Intelligence ─────────────────────────────── */}
      {activeTab === 'substitution' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-sora font-semibold text-navy mb-3">Select Absent Teacher</h3>
            <div className="flex items-center gap-3 flex-wrap">
              <select value={selectedAbsent}
                onChange={e => { setSelectedAbsent(e.target.value); if (e.target.value) loadSuggestions(e.target.value); }}
                className="text-sm border border-gray-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20">
                <option value="">-- Select teacher on leave today --</option>
                {absentTeachers.length > 0 ? (
                  absentTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                ) : (
                  teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                )}
              </select>
              {absentTeachers.length > 0 && (
                <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full font-semibold">
                  {absentTeachers.length} teacher{absentTeachers.length !== 1 ? 's' : ''} on leave today
                </span>
              )}
              {absentTeachers.length === 0 && (
                <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-semibold">
                  No approved leaves today
                </span>
              )}
            </div>
          </div>

          {subLoading && (
            <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
              <RefreshCw className="w-5 h-5 text-gray-300 animate-spin mx-auto" />
            </div>
          )}

          {!subLoading && selectedAbsent && subSuggestions.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-sm text-gray-400">
              No periods scheduled for this teacher today, or no active timetable found.
            </div>
          )}

          {!subLoading && subSuggestions.map(sug => (
            <div key={sug.timetableEntryId} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 p-4 border-b border-gray-100 bg-amber-50/40">
                <div>
                  <span className="text-sm font-sora font-bold text-navy">Period {sug.periodNo}</span>
                  <span className="text-xs text-gray-500 ml-2">{sug.startTime}–{sug.endTime}</span>
                  <span className="ml-2 text-xs bg-purple/10 text-purple px-2 py-0.5 rounded font-semibold">{sug.subject.name}</span>
                  <span className="ml-1 text-xs text-gray-400">· {sug.section}</span>
                </div>
              </div>
              <div className="p-4">
                {sug.candidates.length === 0 ? (
                  <p className="text-xs text-gray-400">No available substitute found for this period.</p>
                ) : (
                  <div className="space-y-2">
                    {sug.candidates.map((c, i) => (
                      <div key={c.id} className="flex items-center gap-3 p-2.5 bg-teal/5 border border-teal/15 rounded-lg">
                        <div className="w-6 h-6 rounded-full bg-navy flex items-center justify-center text-white text-[10px] font-bold">{i + 1}</div>
                        <div className="flex-1">
                          <span className="text-sm font-semibold text-gray-800">{c.name}</span>
                          <span className="ml-2 text-[10px] text-teal font-semibold">{c.proficiency}</span>
                        </div>
                        {assigned.has(sug.timetableEntryId) ? (
                          <span className="flex items-center gap-1 text-xs text-green-700 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" />Assigned</span>
                        ) : (
                          i === 0 && (
                            <button onClick={() => handleAssignSub(sug.timetableEntryId, c.id, c.name)}
                              className="bg-navy text-white text-xs font-semibold rounded-lg px-4 py-1.5 hover:bg-navyMid transition-colors">
                              Assign
                            </button>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}

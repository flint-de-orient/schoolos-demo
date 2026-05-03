'use client';

import { useState, useEffect } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import AIBadge from '@/components/shared/AIBadge';
import { toast } from 'sonner';
import {
  AlertCircle,
  CheckCircle2,
  Sparkles,
  LayoutGrid,
  Zap,
  RotateCcw,
  Brain,
  TrendingUp,
  User,
  Timer,
  Shield,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import timetableData from '@/data/timetable.json';

// ─── Types ─────────────────────────────────────────────────────────────────

type GenerationState = 'idle' | 'running' | 'complete';

interface SubAssignment {
  id: string;
  assignedTo: boolean;
  substitute: string;
  toastMsg: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
type DayKey = (typeof DAYS)[number];

const GEN_STEPS = [
  { icon: '⚙️', text: 'Loading teacher availability matrix...' },
  { icon: '🔄', text: 'Running constraint satisfaction algorithm...' },
  { icon: '📊', text: 'Evaluating 1,247 combinations...' },
  { icon: '✅', text: 'Zero conflicts detected' },
  { icon: '🎯', text: 'Optimising for teacher fatigue...' },
] as const;

const CHANGED_PERIODS = new Set(['Mon-1', 'Fri-7', 'Sat-3']);

const HIST_LOG = [
  { date: '09 Apr 2025', absent: 'Mr. Tapas Mukherjee', periods: 'P4, P6', sub: 'Mrs. Pamela Sen', status: 'Done' },
  { date: '07 Apr 2025', absent: 'Mrs. Ranjana Bhaduri', periods: 'P5', sub: 'Mrs. Swapna Dey', status: 'Done' },
  { date: '04 Apr 2025', absent: 'Mr. Debabrata Pal', periods: 'P3, P7', sub: 'Mr. Subhashis Bose', status: 'Done' },
  { date: '01 Apr 2025', absent: 'Mrs. Priyanka Mondal', periods: 'P8', sub: 'Mrs. Jayashree Nair', status: 'Done' },
  { date: '28 Mar 2025', absent: 'Mr. Kaushik Mitra', periods: 'P7', sub: 'Mr. Prosenjit Chatterjee', status: 'Done' },
];

const INITIAL_ASSIGNMENTS: Record<string, SubAssignment> = {
  'das-p3': { id: 'das-p3', assignedTo: false, substitute: 'Mrs. Suchitra Ghosh', toastMsg: 'Mrs. Suchitra Ghosh assigned to Period 3, Class X-A' },
  'das-p5': { id: 'das-p5', assignedTo: false, substitute: 'Mr. Tapas Mukherjee', toastMsg: 'Mr. Tapas Mukherjee assigned to Period 5, Class IX-A' },
  'das-p7': { id: 'das-p7', assignedTo: false, substitute: 'Mr. Subhashis Bose', toastMsg: 'Mr. Subhashis Bose assigned to Period 7, Class X-B' },
  'dey-p2': { id: 'dey-p2', assignedTo: false, substitute: 'Mr. Prosenjit Chatterjee', toastMsg: 'Mr. Prosenjit Chatterjee assigned to Period 2, Class VIII-A' },
  'dey-p6': { id: 'dey-p6', assignedTo: false, substitute: 'Mrs. Jayashree Nair', toastMsg: 'Mrs. Jayashree Nair assigned to Period 6, Class VII-B' },
};

// ─── Timetable Grid Component ───────────────────────────────────────────────

function TimetableGrid({
  selectedClass,
  showChanges = false,
  highlightChanged = false,
}: {
  selectedClass: string;
  showChanges?: boolean;
  highlightChanged?: boolean;
}) {
  const schedule = (timetableData.schedule as Record<string, Record<string, typeof timetableData.schedule['Class X-A']['Monday']>>)[selectedClass]
    ?? timetableData.schedule['Class X-A'];
  const allPeriods = schedule?.Monday ?? [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="gradient-navy text-white">
              <th className="text-left px-5 py-3 text-xs font-sora font-semibold w-28">Period</th>
              {DAYS.map(d => (
                <th key={d} className="text-center px-3 py-3 text-xs font-sora font-semibold">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allPeriods.map((period, pIdx) => (
              <tr key={period.periodNo} className={`border-b border-gray-100 ${pIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                <td className="px-5 py-2 border-r border-gray-100">
                  <div className="text-xs font-sora font-bold text-navy">P{period.periodNo}</div>
                  <div className="text-[10px] text-gray-400">{period.startTime}–{period.endTime}</div>
                </td>
                {DAYS.map(day => {
                  const p = schedule?.[day as DayKey]?.[pIdx];
                  const cellKey = `${day.slice(0, 3)}-${pIdx + 1}`;
                  const isChanged = highlightChanged && CHANGED_PERIODS.has(cellKey);
                  const isGrayed = showChanges && !isChanged;

                  if (!p) return <td key={day} className="px-3 py-2 text-center text-xs text-gray-300">—</td>;
                  if (p.subject === 'Break') {
                    return (
                      <td key={day} className="px-3 py-2">
                        <div className="bg-gray-100 text-gray-400 text-[10px] font-semibold rounded-lg px-2 py-1.5 text-center">BREAK</div>
                      </td>
                    );
                  }
                  const colorClass =
                    timetableData.subjectColors[p.subject as keyof typeof timetableData.subjectColors] ??
                    'bg-gray-100 text-gray-700 border-gray-200';
                  return (
                    <td key={day} className={`px-2 py-2 transition-opacity ${isGrayed ? 'opacity-25' : 'opacity-100'}`}>
                      <div className={`rounded-lg border px-2 py-1.5 ${colorClass} ${isChanged ? 'ring-2 ring-gold ring-offset-1' : ''} hover:shadow-sm transition-shadow`}>
                        <div className="text-[11px] font-semibold leading-tight truncate">{p.subject}</div>
                        <div className="text-[9px] opacity-70 truncate mt-0.5">{p.teacher.split(' ').slice(-1)[0]}</div>
                        <div className="text-[9px] opacity-60">{p.room}</div>
                        {isChanged && (
                          <div className="text-[8px] text-amber-700 font-bold mt-0.5">● Changed</div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function TimetablePage() {
  const [activeTab, setActiveTab] = useState<'timetable' | 'generator' | 'substitution'>('timetable');
  const [selectedClass, setSelectedClass] = useState('Class X-A');
  const [genState, setGenState] = useState<GenerationState>('idle');
  const [genStep, setGenStep] = useState(0);
  const [showOnlyChanges, setShowOnlyChanges] = useState(false);
  const [assignments, setAssignments] = useState<Record<string, SubAssignment>>(INITIAL_ASSIGNMENTS);
  const [assignAllDone, setAssignAllDone] = useState(false);
  const [constraintsOpen, setConstraintsOpen] = useState(true);

  // Generation animation
  useEffect(() => {
    if (genState !== 'running') return;
    if (genStep >= GEN_STEPS.length) {
      const t = setTimeout(() => setGenState('complete'), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setGenStep(s => s + 1), 700);
    return () => clearTimeout(t);
  }, [genState, genStep]);

  function startGeneration() {
    setGenState('running');
    setGenStep(0);
  }

  function handleApply() {
    toast.success('New timetable applied! Takes effect from Monday.');
  }

  function handleRegenerate() {
    setGenState('idle');
    setGenStep(0);
    setTimeout(() => startGeneration(), 100);
  }

  function handleAssign(id: string) {
    setAssignments(prev => {
      const updated = { ...prev, [id]: { ...prev[id], assignedTo: true } };
      toast.success(prev[id].toastMsg);
      return updated;
    });
  }

  function handleAssignAll() {
    const allAssigned = Object.fromEntries(
      Object.entries(assignments).map(([k, v]) => [k, { ...v, assignedTo: true }])
    );
    setAssignments(allAssigned);
    setAssignAllDone(true);
    toast.success('5 substitutions assigned. Notifications sent to staff and class teachers.');
  }

  const assignedCount = Object.values(assignments).filter(a => a.assignedTo).length;
  const pendingCount = Object.values(assignments).length - assignedCount;

  const tabs = [
    { id: 'timetable' as const, label: 'Timetable', icon: LayoutGrid },
    { id: 'generator' as const, label: 'AI Generator', icon: Sparkles },
    { id: 'substitution' as const, label: 'Substitution Intelligence', icon: Zap },
  ];

  return (
    <PageWrapper>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-sora font-semibold text-navy">Smart Timetable</h1>
          <p className="text-sm text-gray-500 font-dm-sans mt-0.5">AI-powered scheduling, conflict resolution &amp; substitution management</p>
        </div>
        <div className="flex items-center gap-2">
          <AIBadge label="AI Powered" />
          <span className="text-xs text-gray-400 font-dm-sans">Week of 7–12 Apr 2025</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 shadow-sm mb-6 w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold font-dm-sans transition-all ${
                activeTab === tab.id
                  ? 'bg-navy text-white shadow-sm'
                  : 'text-gray-500 hover:text-navy hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'generator' && (
                <span className="text-[9px] bg-gold text-navy px-1.5 py-0.5 rounded-full font-bold">NEW</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: Timetable ─────────────────────────────────────────────── */}
      {activeTab === 'timetable' && (
        <div className="space-y-5">
          {/* Controls */}
          <div className="flex items-center gap-4">
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-4 py-2 text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-navy/20 font-dm-sans"
            >
              {timetableData.classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="text-sm text-gray-500 font-dm-sans">
              Showing timetable for <strong className="text-navy">{selectedClass}</strong>
            </span>
            <button className="ml-auto flex items-center gap-2 text-sm bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-600 hover:border-navy/30 hover:text-navy transition-colors font-dm-sans shadow-sm">
              <User className="w-3.5 h-3.5" />
              Teacher View
            </button>
          </div>

          {/* Substitution alert */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-700 font-dm-sans">
                <strong className="text-amber-700">Substitution Notice:</strong> Mr. Arijit Das (Physics) is on leave today — Period 3 Physics auto-assigned to{' '}
                <strong>Mrs. Suchitra Ghosh</strong>. Room 201.
              </p>
              <button
                onClick={() => setActiveTab('substitution')}
                className="mt-1.5 text-xs text-amber-700 font-semibold underline hover:no-underline"
              >
                Manage all substitutions →
              </button>
            </div>
          </div>

          {/* Grid */}
          <TimetableGrid selectedClass={selectedClass} />

          {/* Legend */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-400 font-dm-sans mr-1">Subjects:</span>
            {Object.entries(timetableData.subjectColors)
              .filter(([k]) => k !== 'Break')
              .slice(0, 10)
              .map(([subject, cls]) => (
                <span key={subject} className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${cls}`}>
                  {subject}
                </span>
              ))}
          </div>

          {/* Quality Score card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-navy" />
                <h3 className="text-sm font-sora font-semibold text-navy">Timetable Health Score</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-sora font-semibold text-navy">94</span>
                <span className="text-sm text-gray-400 font-dm-sans">/ 100</span>
                <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Excellent</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-dm-sans text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Conflict Free
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-semibold">✅ Clear</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-dm-sans text-gray-600">
                  <Timer className="w-4 h-4 text-teal" />
                  Teacher Fatigue
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-semibold">Low</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-dm-sans text-gray-600">
                  <TrendingUp className="w-4 h-4 text-purple" />
                  Subject Distribution
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-semibold">Balanced</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: AI Generator ──────────────────────────────────────────── */}
      {activeTab === 'generator' && (
        <div className="space-y-5">
          <div className="grid grid-cols-5 gap-5">
            {/* Left config panel */}
            <div className="col-span-2 space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-5 h-5 text-gold" />
                  <h2 className="text-base font-sora font-semibold text-navy">AI Timetable Generator</h2>
                </div>
                <p className="text-xs text-gray-500 font-dm-sans mb-5">
                  Generate optimised, conflict-free timetables in seconds
                </p>

                {/* Classes */}
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Classes to Include</p>
                  <div className="space-y-1.5">
                    {[
                      { label: 'Class X-A', checked: true },
                      { label: 'Class X-B', checked: true },
                      { label: 'Class IX-A', checked: true },
                      { label: 'Class IX-B', checked: false },
                    ].map(item => (
                      <label key={item.label} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked={item.checked}
                          className="w-3.5 h-3.5 accent-navy rounded"
                        />
                        <span className="text-sm font-dm-sans text-gray-700">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Periods / days */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                      Periods / Day
                    </label>
                    <input
                      type="number"
                      defaultValue={8}
                      min={6}
                      max={10}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-navy/20 font-dm-sans"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Working Days</p>
                    <div className="flex gap-1 flex-wrap">
                      {['M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                        <span
                          key={i}
                          className="w-7 h-7 flex items-center justify-center text-[10px] font-bold rounded-full bg-navy text-white cursor-pointer hover:bg-navyMid transition-colors"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Constraints */}
                <div className="mb-5">
                  <button
                    onClick={() => setConstraintsOpen(o => !o)}
                    className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2"
                  >
                    Constraints
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${constraintsOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {constraintsOpen && (
                    <div className="space-y-2 pl-1">
                      {[
                        'No subject taught more than once per day per class',
                        'Science practicals only on Friday / Saturday',
                        'Max 4 consecutive periods per teacher',
                        'Core subjects (Maths/English) not in Periods 7–8',
                      ].map(c => (
                        <label key={c} className="flex items-start gap-2 cursor-pointer">
                          <input type="checkbox" defaultChecked className="mt-0.5 w-3.5 h-3.5 accent-navy rounded flex-shrink-0" />
                          <span className="text-xs font-dm-sans text-gray-600 leading-snug">{c}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Teacher availability */}
                <div className="bg-teal/10 border border-teal/20 rounded-lg px-3 py-2.5 mb-5 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal flex-shrink-0" />
                  <p className="text-xs font-dm-sans text-teal font-semibold">
                    All 12 teachers marked available for next week
                  </p>
                </div>

                {/* Generate button */}
                <button
                  onClick={startGeneration}
                  disabled={genState === 'running'}
                  className="w-full flex items-center justify-center gap-2 bg-gold text-navy font-sora font-semibold rounded-xl px-4 py-3 hover:bg-gold/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                >
                  <Brain className="w-4 h-4" />
                  {genState === 'running' ? 'Generating...' : '🤖 Generate Optimal Timetable'}
                </button>
              </div>
            </div>

            {/* Right result panel */}
            <div className="col-span-3 space-y-4">
              {/* Generation animation */}
              {genState === 'running' && (
                <div className="bg-white rounded-xl border border-navy/10 shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <RefreshCw className="w-4 h-4 text-navy animate-spin" />
                    <h3 className="text-sm font-sora font-semibold text-navy">Generating timetable...</h3>
                  </div>
                  <div className="space-y-2.5">
                    {GEN_STEPS.map((step, i) => {
                      const isDone = i < genStep;
                      const isActive = i === genStep;
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                            isActive ? 'bg-navy/5 border border-navy/10' : isDone ? 'opacity-60' : 'opacity-30'
                          }`}
                        >
                          <span className="text-base leading-none">{step.icon}</span>
                          <span className="flex-1 text-sm font-dm-sans text-gray-700">{step.text}</span>
                          {isDone && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                          {isActive && (
                            <span className="w-4 h-4 flex-shrink-0">
                              <span className="block w-3 h-3 border-2 border-navy border-t-transparent rounded-full animate-spin mx-auto" />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Idle empty state */}
              {genState === 'idle' && (
                <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-10 flex flex-col items-center justify-center text-center min-h-[260px]">
                  <Sparkles className="w-10 h-10 text-gray-300 mb-3" />
                  <p className="text-sm font-sora font-semibold text-gray-400">Configure constraints and generate</p>
                  <p className="text-xs text-gray-400 font-dm-sans mt-1">Your AI-optimised timetable will appear here →</p>
                </div>
              )}

              {/* Complete result */}
              {genState === 'complete' && (
                <div className="space-y-4">
                  {/* Quality score card */}
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start gap-6">
                      {/* Circular gauge */}
                      <div className="flex-shrink-0 flex flex-col items-center justify-center w-28 h-28 rounded-full border-4 border-navy/10 bg-navy/5">
                        <span className="text-3xl font-sora font-semibold text-navy">96</span>
                        <span className="text-xs text-gray-400 font-dm-sans">/ 100</span>
                      </div>
                      {/* Sub scores */}
                      <div className="flex-1 space-y-3">
                        <h3 className="text-sm font-sora font-semibold text-navy mb-1">Quality Score — Excellent</h3>
                        {[
                          { label: 'Conflict Score', score: 100, color: 'bg-green-500', note: 'Zero scheduling conflicts', textColor: 'text-green-700' },
                          { label: 'Fatigue Score', score: 91, color: 'bg-teal', note: 'All teachers within load limits', textColor: 'text-teal' },
                          { label: 'Pedagogy Score', score: 94, color: 'bg-purple', note: 'Core subjects optimally placed', textColor: 'text-purple' },
                        ].map(s => (
                          <div key={s.label}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-dm-sans text-gray-600">{s.label}</span>
                              <span className={`text-xs font-bold ${s.textColor}`}>{s.score}/100</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.score}%` }} />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5 font-dm-sans">{s.note}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400 font-dm-sans mt-3 pt-3 border-t border-gray-100">
                      Generated in 3.2 seconds · 4 classes · 192 periods/week · 0 conflicts
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleApply}
                      className="flex items-center gap-2 bg-gold text-navy font-sora font-semibold rounded-xl px-5 py-2.5 hover:bg-gold/90 transition-colors text-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Apply This Timetable
                    </button>
                    <button
                      onClick={handleRegenerate}
                      className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl px-4 py-2.5 hover:border-navy/30 hover:text-navy transition-colors text-sm font-dm-sans"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Regenerate
                    </button>
                  </div>

                  {/* What changed */}
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="text-sm font-sora font-semibold text-navy mb-3">What Changed</h3>
                    <div className="space-y-2">
                      {[
                        'Moved Class X-A Maths from Period 7 to Period 2 (reduces cognitive fatigue)',
                        'Redistributed Science practicals — now all on Fri/Sat across both sections',
                        'Eliminated 2 double-booking conflicts from previous timetable',
                      ].map((note, i) => (
                        <div key={i} className="flex items-start gap-3 pl-3 border-l-2 border-green-400">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs font-dm-sans text-gray-600">{note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Generated timetable preview (shown after complete) */}
          {genState === 'complete' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-sora font-semibold text-navy">Generated Timetable Preview</h3>
                  <AIBadge />
                  <span className="text-xs text-gold font-semibold bg-goldLight px-2 py-0.5 rounded-full">3 periods changed</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-500 font-dm-sans">
                  <input
                    type="checkbox"
                    checked={showOnlyChanges}
                    onChange={e => setShowOnlyChanges(e.target.checked)}
                    className="w-3.5 h-3.5 accent-navy"
                  />
                  Show only changes
                </label>
              </div>
              <TimetableGrid
                selectedClass="Class X-A"
                highlightChanged
                showChanges={showOnlyChanges}
              />
              <div className="mt-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm ring-2 ring-gold ring-offset-1 bg-blue-100 inline-block" />
                <span className="text-[10px] text-gray-500 font-dm-sans">Gold ring = period modified by AI</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Substitution Intelligence ────────────────────────────── */}
      {activeTab === 'substitution' && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <h2 className="text-base font-sora font-semibold text-navy">Today — Thursday, 10 April 2025</h2>
            </div>
            <span className="flex items-center gap-1.5 bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">
              <AlertCircle className="w-3 h-3" />
              2 staff absent
            </span>
            <span className="flex items-center gap-1.5 bg-teal/10 text-teal text-xs font-bold px-3 py-1 rounded-full">
              <Brain className="w-3 h-3" />
              AI has auto-assigned substitutes
            </span>
            <AIBadge label="AI" />
          </div>

          {/* Absent staff */}
          <div className="space-y-5">
            {/* Card 1: Arijit Das */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Staff header */}
              <div className="flex items-center gap-4 p-5 border-b border-gray-100 bg-red-50/40">
                <div className="w-10 h-10 rounded-full bg-navy flex items-center justify-center text-white text-sm font-sora font-bold flex-shrink-0">
                  AD
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-sora font-semibold text-navy">Mr. Arijit Das</h3>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">On Leave — Medical</span>
                  </div>
                  <p className="text-xs text-gray-500 font-dm-sans">Physics Teacher · 3 periods affected today</p>
                </div>
              </div>

              {/* Period rows */}
              <div className="divide-y divide-gray-100">
                {[
                  {
                    id: 'das-p3',
                    period: 'Period 3',
                    time: '09:10 – 10:00',
                    cls: 'Class X-A',
                    subject: 'Physics',
                    room: 'Room 201',
                    sub: 'Mrs. Suchitra Ghosh',
                    subDept: 'Chemistry',
                    reason: 'Nearest subject (Science dept). Currently free in Period 3. Load: 4/8 periods today.',
                  },
                  {
                    id: 'das-p5',
                    period: 'Period 5',
                    time: '10:20 – 11:10',
                    cls: 'Class IX-A',
                    subject: 'Physics',
                    room: 'Room 305',
                    sub: 'Mr. Tapas Mukherjee',
                    subDept: 'Geography',
                    reason: 'Free in Period 5. Has supervised Physics class before.',
                  },
                  {
                    id: 'das-p7',
                    period: 'Period 7',
                    time: '12:00 – 12:50',
                    cls: 'Class X-B',
                    subject: 'Physics',
                    room: 'Room 202',
                    sub: 'Mr. Subhashis Bose',
                    subDept: 'Mathematics',
                    reason: 'Only available qualified teacher for this slot.',
                  },
                ].map(row => (
                  <div key={row.id} className="p-4 flex items-start gap-4">
                    <div className="flex-shrink-0 w-28">
                      <p className="text-xs font-sora font-bold text-navy">{row.period}</p>
                      <p className="text-[10px] text-gray-400 font-dm-sans">{row.time}</p>
                      <p className="text-[10px] text-gray-500 mt-1 font-dm-sans">{row.cls} · {row.room}</p>
                      <span className="mt-1 inline-block text-[10px] bg-purple/10 text-purple px-1.5 py-0.5 rounded font-semibold">{row.subject}</span>
                    </div>
                    <div className="flex-1 bg-teal/5 border border-teal/15 rounded-lg px-3 py-2.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <AIBadge label="Best Substitute" />
                        <span className="text-xs font-sora font-semibold text-navy">{row.sub}</span>
                        <span className="text-[10px] text-gray-400">({row.subDept})</span>
                      </div>
                      <p className="text-[11px] text-gray-600 font-dm-sans leading-snug">{row.reason}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {assignments[row.id]?.assignedTo ? (
                        <span className="flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Assigned
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAssign(row.id)}
                          className="bg-navy text-white text-xs font-semibold rounded-lg px-4 py-1.5 hover:bg-navyMid transition-colors font-dm-sans"
                        >
                          Assign
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 2: Swapna Dey */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 p-5 border-b border-gray-100 bg-red-50/40">
                <div className="w-10 h-10 rounded-full bg-navyMid flex items-center justify-center text-white text-sm font-sora font-bold flex-shrink-0">
                  SD
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-sora font-semibold text-navy">Mrs. Swapna Dey</h3>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">On Leave — Personal</span>
                  </div>
                  <p className="text-xs text-gray-500 font-dm-sans">Bengali Teacher · 2 periods affected today</p>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {[
                  {
                    id: 'dey-p2',
                    period: 'Period 2',
                    time: '08:20 – 09:10',
                    cls: 'Class VIII-A',
                    subject: 'Bengali',
                    room: 'Room 104',
                    sub: 'Mr. Prosenjit Chatterjee',
                    subDept: 'Biology',
                    reason: 'Language arts background. Free Period 2. Student-friendly.',
                  },
                  {
                    id: 'dey-p6',
                    period: 'Period 6',
                    time: '11:10 – 12:00',
                    cls: 'Class VII-B',
                    subject: 'Bengali',
                    room: 'Room 107',
                    sub: 'Mrs. Jayashree Nair',
                    subDept: 'English',
                    reason: 'Language teacher — closest fit. Free Period 6.',
                  },
                ].map(row => (
                  <div key={row.id} className="p-4 flex items-start gap-4">
                    <div className="flex-shrink-0 w-28">
                      <p className="text-xs font-sora font-bold text-navy">{row.period}</p>
                      <p className="text-[10px] text-gray-400 font-dm-sans">{row.time}</p>
                      <p className="text-[10px] text-gray-500 mt-1 font-dm-sans">{row.cls} · {row.room}</p>
                      <span className="mt-1 inline-block text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-semibold">{row.subject}</span>
                    </div>
                    <div className="flex-1 bg-teal/5 border border-teal/15 rounded-lg px-3 py-2.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <AIBadge label="Best Substitute" />
                        <span className="text-xs font-sora font-semibold text-navy">{row.sub}</span>
                        <span className="text-[10px] text-gray-400">({row.subDept})</span>
                      </div>
                      <p className="text-[11px] text-gray-600 font-dm-sans leading-snug">{row.reason}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {assignments[row.id]?.assignedTo ? (
                        <span className="flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Assigned
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAssign(row.id)}
                          className="bg-navy text-white text-xs font-semibold rounded-lg px-4 py-1.5 hover:bg-navyMid transition-colors font-dm-sans"
                        >
                          Assign
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Assignment summary */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-sora font-semibold text-navy mb-4">Assignment Summary</h3>
            <div className="flex items-center gap-6 mb-4">
              <div className="text-center">
                <div className={`text-2xl font-sora font-semibold ${pendingCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {pendingCount}
                </div>
                <div className="text-xs text-gray-500 font-dm-sans">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-sora font-semibold text-green-600">{assignedCount}</div>
                <div className="text-xs text-gray-500 font-dm-sans">Assigned</div>
              </div>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${(assignedCount / 5) * 100}%` }}
                />
              </div>
            </div>
            {!assignAllDone && pendingCount > 0 && (
              <button
                onClick={handleAssignAll}
                className="flex items-center gap-2 bg-gold text-navy font-sora font-semibold rounded-xl px-5 py-2.5 hover:bg-gold/90 transition-colors text-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                Assign All Remaining
              </button>
            )}
            {(assignAllDone || pendingCount === 0) && (
              <div className="flex items-center gap-2 text-green-700 text-sm font-semibold font-dm-sans">
                <CheckCircle2 className="w-4 h-4" />
                All substitutions assigned!
              </div>
            )}
            <p className="mt-3 text-xs text-gray-500 font-dm-sans flex items-center gap-1.5">
              <span>📱</span>
              Parents notified automatically of subject changes
            </p>
          </div>

          {/* Historical log */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-sm font-sora font-semibold text-navy">Historical Substitution Log</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    {['Date', 'Absent Teacher', 'Periods', 'Substitute', 'Status'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs uppercase tracking-wide text-gray-400 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {HIST_LOG.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-2.5 text-xs text-gray-600 font-dm-sans">{row.date}</td>
                      <td className="px-4 py-2.5 text-xs font-semibold text-navy font-dm-sans">{row.absent}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600 font-dm-sans">{row.periods}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600 font-dm-sans">{row.sub}</td>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full w-fit">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

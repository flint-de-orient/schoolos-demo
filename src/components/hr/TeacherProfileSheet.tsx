'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  X, BookOpen, Clock, BarChart3, Plus, Trash2, Save,
  CheckCircle2, AlertCircle, Loader2, Star,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

type Proficiency = 'PRIMARY' | 'SECONDARY' | 'SUBSTITUTE';

interface SubjectRecord {
  id: string;
  proficiency: Proficiency;
  gradeIds: string[];
  subject: { id: string; name: string; code: string | null; colorHex: string | null };
}

interface AvailSlot {
  id: string;
  day: DayKey;
  startTime: string;
  endTime: string;
}

type DayKey = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';

interface TeacherDetail {
  id: string;
  name: string;
  employeeCode: string;
  type: string;
  designation: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
  qualification: string | null;
  maxPeriodsDay: number;
  maxPeriodsWeek: number;
  subjects: SubjectRecord[];
  availabilities: AvailSlot[];
}

interface SubjectOption {
  id: string;
  name: string;
  code: string | null;
  colorHex: string | null;
  isElective: boolean;
}

interface GradeOption {
  id: string;
  name: string;
  displayOrder: number;
}

interface Props {
  teacherId: string | null;
  onClose: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS: { key: DayKey; short: string }[] = [
  { key: 'MONDAY', short: 'Mon' },
  { key: 'TUESDAY', short: 'Tue' },
  { key: 'WEDNESDAY', short: 'Wed' },
  { key: 'THURSDAY', short: 'Thu' },
  { key: 'FRIDAY', short: 'Fri' },
  { key: 'SATURDAY', short: 'Sat' },
];

const PROF_META: Record<Proficiency, { label: string; color: string; bg: string; desc: string }> = {
  PRIMARY:    { label: 'Primary',    color: 'text-navy',   bg: 'bg-navy/10 border-navy/20',     desc: 'Main subject — always preferred' },
  SECONDARY:  { label: 'Secondary',  color: 'text-teal',   bg: 'bg-teal/10 border-teal/20',     desc: 'Can teach well — used regularly' },
  SUBSTITUTE: { label: 'Substitute', color: 'text-amber',  bg: 'bg-amber/10 border-amber/20',   desc: 'Emergency cover only' },
};

const TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-Time', PART_TIME: 'Part-Time',
  CONTRACT: 'Contract', NON_TEACHING: 'Non-Teaching',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProficiencyBadge({ level }: { level: Proficiency }) {
  const m = PROF_META[level];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${m.bg} ${m.color}`}>
      {level === 'PRIMARY' && <Star className="w-2.5 h-2.5" />}
      {m.label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TeacherProfileSheet({ teacherId, onClose }: Props) {
  const [teacher, setTeacher] = useState<TeacherDetail | null>(null);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'subjects' | 'availability' | 'limits'>('subjects');

  // Subject form state
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [subjectForm, setSubjectForm] = useState<{ subjectId: string; proficiency: Proficiency; gradeIds: string[] }>({
    subjectId: '', proficiency: 'SECONDARY', gradeIds: [],
  });
  const [savingSubject, setSavingSubject] = useState(false);

  // Availability state — map day → slots being edited
  const [availEdit, setAvailEdit] = useState<Record<DayKey, { startTime: string; endTime: string }[]>>({
    MONDAY: [], TUESDAY: [], WEDNESDAY: [], THURSDAY: [], FRIDAY: [], SATURDAY: [],
  });
  const [availDirty, setAvailDirty] = useState<Set<DayKey>>(new Set());
  const [savingAvail, setSavingAvail] = useState<DayKey | null>(null);

  // Load limits state
  const [limits, setLimits] = useState({ maxPeriodsDay: 6, maxPeriodsWeek: 30 });
  const [savingLimits, setSavingLimits] = useState(false);

  // ── Load teacher data ──
  const loadTeacher = useCallback(async () => {
    if (!teacherId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/hr/teachers/${teacherId}`);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) {
        setLoadError(json?.error ?? `HTTP ${res.status}`);
        return;
      }
      const t = json.data?.teacher ?? json.teacher ?? null;
      if (!t) { setLoadError('Teacher data missing in response'); return; }
      setTeacher(t);
      setLimits({ maxPeriodsDay: t.maxPeriodsDay, maxPeriodsWeek: t.maxPeriodsWeek });

      // Populate availability edit state from DB
      const map: Record<DayKey, { startTime: string; endTime: string }[]> = {
        MONDAY: [], TUESDAY: [], WEDNESDAY: [], THURSDAY: [], FRIDAY: [], SATURDAY: [],
      };
      for (const slot of (t.availabilities ?? [])) {
        if (map[slot.day as DayKey]) {
          map[slot.day as DayKey].push({ startTime: slot.startTime, endTime: slot.endTime });
        }
      }
      setAvailEdit(map);
    } catch (e: any) {
      setLoadError(e?.message ?? 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  // ── Load subjects & grades (once) ──
  useEffect(() => {
    Promise.all([
      fetch('/api/hr/subjects').then(r => r.json()),
      fetch('/api/hr/grades').then(r => r.json()),
    ]).then(([s, g]) => {
      setSubjects(s.subjects ?? s.data?.subjects ?? []);
      setGrades(g.grades ?? g.data?.grades ?? []);
    });
  }, []);

  useEffect(() => {
    setTeacher(null);
    setLoadError(null);
    setActiveTab('subjects');
    setShowSubjectForm(false);
    setAvailDirty(new Set());
    loadTeacher();
  }, [loadTeacher]);

  // ── Subject handlers ──
  async function handleAddSubject() {
    if (!subjectForm.subjectId) { toast.error('Select a subject'); return; }
    setSavingSubject(true);
    try {
      const res = await fetch(`/api/hr/teachers/${teacherId}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subjectForm),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Failed'); return; }
      await loadTeacher();
      setShowSubjectForm(false);
      setSubjectForm({ subjectId: '', proficiency: 'SECONDARY', gradeIds: [] });
      toast.success('Subject capability saved');
    } finally {
      setSavingSubject(false);
    }
  }

  async function handleRemoveSubject(subjectId: string, subjectName: string) {
    const res = await fetch(`/api/hr/teachers/${teacherId}/subjects`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectId }),
    });
    if (!res.ok) { toast.error('Failed to remove'); return; }
    await loadTeacher();
    toast.success(`${subjectName} removed`);
  }

  function toggleGrade(gradeId: string) {
    setSubjectForm(f => ({
      ...f,
      gradeIds: f.gradeIds.includes(gradeId)
        ? f.gradeIds.filter(g => g !== gradeId)
        : [...f.gradeIds, gradeId],
    }));
  }

  // ── Availability handlers ──
  function addSlot(day: DayKey) {
    setAvailEdit(prev => ({ ...prev, [day]: [...prev[day], { startTime: '08:00', endTime: '14:00' }] }));
    setAvailDirty(prev => new Set(prev).add(day));
  }

  function removeSlot(day: DayKey, idx: number) {
    setAvailEdit(prev => ({ ...prev, [day]: prev[day].filter((_, i) => i !== idx) }));
    setAvailDirty(prev => new Set(prev).add(day));
  }

  function updateSlot(day: DayKey, idx: number, field: 'startTime' | 'endTime', val: string) {
    setAvailEdit(prev => {
      const slots = [...prev[day]];
      slots[idx] = { ...slots[idx], [field]: val };
      return { ...prev, [day]: slots };
    });
    setAvailDirty(prev => new Set(prev).add(day));
  }

  async function saveDay(day: DayKey) {
    setSavingAvail(day);
    try {
      const res = await fetch(`/api/hr/teachers/${teacherId}/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day, slots: availEdit[day] }),
      });
      if (!res.ok) { toast.error('Failed to save'); return; }
      setAvailDirty(prev => { const s = new Set(prev); s.delete(day); return s; });
      toast.success(`${day.charAt(0) + day.slice(1).toLowerCase()} availability saved`);
    } finally {
      setSavingAvail(null);
    }
  }

  // ── Load limits handler ──
  async function handleSaveLimits() {
    setSavingLimits(true);
    try {
      const res = await fetch(`/api/hr/teachers/${teacherId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(limits),
      });
      if (!res.ok) { toast.error('Failed to save'); return; }
      toast.success('Load limits updated');
    } finally {
      setSavingLimits(false);
    }
  }

  if (!teacherId) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end" onClick={onClose}>
      <div
        className="bg-white w-full max-w-xl h-full flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-navy" />
            <p className="text-xs text-gray-400">Loading teacher profile…</p>
          </div>
        ) : loadError ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-3 p-8">
            <AlertCircle className="w-8 h-8 text-coral" />
            <p className="text-sm font-semibold text-gray-700">Failed to load profile</p>
            <p className="text-xs text-gray-400 text-center">{loadError}</p>
            <button onClick={loadTeacher} className="text-xs font-semibold text-navy border border-navy/30 px-4 py-2 rounded-xl hover:bg-navy/5">
              Retry
            </button>
          </div>
        ) : !teacher ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-3 p-8">
            <AlertCircle className="w-8 h-8 text-gray-300" />
            <p className="text-sm text-gray-400">Teacher not found</p>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-r from-navy to-navyMid px-6 py-5 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold font-sora text-lg">{getInitials(teacher.name)}</span>
                  </div>
                  <div>
                    <h2 className="text-white font-sora font-semibold text-base leading-tight">{teacher.name}</h2>
                    <p className="text-ice text-xs mt-0.5">{teacher.designation ?? teacher.type} · {teacher.department ?? teacher.employeeCode}</p>
                    <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      teacher.type === 'PART_TIME' ? 'bg-amber/20 text-amber' : 'bg-white/20 text-white'
                    }`}>
                      {TYPE_LABELS[teacher.type] ?? teacher.type}
                    </span>
                  </div>
                </div>
                <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Summary pills */}
              <div className="flex gap-2 mt-4 flex-wrap">
                <div className="bg-white/10 rounded-xl px-3 py-1.5 text-center">
                  <div className="text-white font-bold text-sm font-sora">{teacher.subjects.length}</div>
                  <div className="text-ice text-[10px]">Subjects</div>
                </div>
                <div className="bg-white/10 rounded-xl px-3 py-1.5 text-center">
                  <div className="text-white font-bold text-sm font-sora">{teacher.maxPeriodsDay}</div>
                  <div className="text-ice text-[10px]">Max / Day</div>
                </div>
                <div className="bg-white/10 rounded-xl px-3 py-1.5 text-center">
                  <div className="text-white font-bold text-sm font-sora">{teacher.maxPeriodsWeek}</div>
                  <div className="text-ice text-[10px]">Max / Week</div>
                </div>
                <div className="bg-white/10 rounded-xl px-3 py-1.5 text-center">
                  <div className="text-white font-bold text-sm font-sora">
                    {Object.values(availEdit).filter(s => s.length > 0).length}
                  </div>
                  <div className="text-ice text-[10px]">Days set</div>
                </div>
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex border-b border-gray-100 flex-shrink-0 bg-white">
              {([
                { id: 'subjects', label: 'Subjects & Capability', icon: BookOpen },
                { id: 'availability', label: 'Weekly Availability', icon: Clock },
                { id: 'limits', label: 'Load Limits', icon: BarChart3 },
              ] as const).map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold border-b-2 transition-colors ${
                    activeTab === t.id
                      ? 'border-navy text-navy'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>

            {/* ── Tab content ── */}
            <div className="flex-1 overflow-y-auto">

              {/* ── Subjects & Capability ── */}
              {activeTab === 'subjects' && (
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-sora font-semibold text-navy text-sm">Teaching Capability</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Used by timetable engine and auto-substitution</p>
                    </div>
                    <button
                      onClick={() => setShowSubjectForm(f => !f)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-navy text-white text-xs font-semibold rounded-xl hover:bg-navyMid transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Subject
                    </button>
                  </div>

                  {/* Add subject form */}
                  {showSubjectForm && (
                    <div className="bg-iceLight border border-ice rounded-2xl p-4 space-y-3">
                      <p className="text-xs font-semibold text-navy">Add Subject Capability</p>

                      {/* Subject picker */}
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Subject</label>
                        <select
                          value={subjectForm.subjectId}
                          onChange={e => setSubjectForm(f => ({ ...f, subjectId: e.target.value }))}
                          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white"
                        >
                          <option value="">— Select subject —</option>
                          {subjects
                            .filter(s => !teacher.subjects.some(ts => ts.subject.id === s.id))
                            .map(s => (
                              <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</option>
                            ))}
                        </select>
                      </div>

                      {/* Proficiency picker */}
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Proficiency Level</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['PRIMARY', 'SECONDARY', 'SUBSTITUTE'] as Proficiency[]).map(p => {
                            const m = PROF_META[p];
                            return (
                              <button
                                key={p}
                                onClick={() => setSubjectForm(f => ({ ...f, proficiency: p }))}
                                className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                                  subjectForm.proficiency === p ? `${m.bg} border-current ${m.color}` : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className={`text-[11px] font-bold ${subjectForm.proficiency === p ? m.color : 'text-gray-700'}`}>{m.label}</div>
                                <div className="text-[9px] text-gray-500 mt-0.5 leading-tight">{m.desc}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Grade filter */}
                      {grades.length > 0 && (
                        <div>
                          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                            Grade Levels <span className="normal-case font-normal">(leave blank = all grades)</span>
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {grades.map(g => (
                              <button
                                key={g.id}
                                onClick={() => toggleGrade(g.id)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                                  subjectForm.gradeIds.includes(g.id)
                                    ? 'bg-navy text-white border-navy'
                                    : 'border-gray-200 text-gray-600 hover:border-navy/40'
                                }`}
                              >
                                {g.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => { setShowSubjectForm(false); setSubjectForm({ subjectId: '', proficiency: 'SECONDARY', gradeIds: [] }); }}
                          className="flex-1 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddSubject}
                          disabled={savingSubject}
                          className="flex-1 py-2 text-xs font-semibold bg-navy text-white rounded-xl hover:bg-navyMid transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {savingSubject ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          Save
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Subject list */}
                  {teacher.subjects.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No subjects assigned yet</p>
                      <p className="text-xs mt-1">Click &ldquo;Add Subject&rdquo; to define teaching capability</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(['PRIMARY', 'SECONDARY', 'SUBSTITUTE'] as Proficiency[]).map(level => {
                        const group = teacher.subjects.filter(s => s.proficiency === level);
                        if (group.length === 0) return null;
                        return (
                          <div key={level}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <ProficiencyBadge level={level} />
                              <p className="text-[10px] text-gray-400">{PROF_META[level].desc}</p>
                            </div>
                            <div className="space-y-1.5">
                              {group.map(ts => (
                                <div key={ts.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-2.5 hover:border-gray-200 transition-colors group">
                                  <div
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: ts.subject.colorHex ?? '#1E2761' }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm font-semibold text-gray-800">{ts.subject.name}</span>
                                    {ts.subject.code && <span className="text-[10px] text-gray-400 ml-1.5">({ts.subject.code})</span>}
                                    {ts.gradeIds.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {ts.gradeIds.map(gId => {
                                          const g = grades.find(gr => gr.id === gId);
                                          return g ? (
                                            <span key={gId} className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">{g.name}</span>
                                          ) : null;
                                        })}
                                      </div>
                                    )}
                                    {ts.gradeIds.length === 0 && <span className="text-[10px] text-gray-400 ml-1.5">· All grades</span>}
                                  </div>
                                  <button
                                    onClick={() => handleRemoveSubject(ts.subject.id, ts.subject.name)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-50 text-red-400"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Legend */}
                  <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50 space-y-2">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">How proficiency is used</p>
                    {(['PRIMARY', 'SECONDARY', 'SUBSTITUTE'] as Proficiency[]).map(p => (
                      <div key={p} className="flex items-start gap-2">
                        <ProficiencyBadge level={p} />
                        <p className="text-[11px] text-gray-500 leading-relaxed">{PROF_META[p].desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Weekly Availability ── */}
              {activeTab === 'availability' && (
                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="font-sora font-semibold text-navy text-sm">Weekly Availability</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {teacher.type === 'PART_TIME'
                        ? 'Part-time: define exactly which days and hours this teacher is on campus'
                        : 'Full-time teachers are available all days by default — restrict here if needed'}
                    </p>
                  </div>

                  {teacher.type === 'FULL_TIME' && Object.values(availEdit).every(s => s.length === 0) && (
                    <div className="flex items-start gap-2.5 bg-teal/5 border border-teal/20 rounded-xl p-3">
                      <CheckCircle2 className="w-4 h-4 text-teal flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-teal">Full-time teacher — available all 6 days. Add slots below only to restrict specific days.</p>
                    </div>
                  )}

                  {teacher.type === 'PART_TIME' && Object.values(availEdit).every(s => s.length === 0) && (
                    <div className="flex items-start gap-2.5 bg-amber/5 border border-amber/20 rounded-xl p-3">
                      <AlertCircle className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber">No availability defined. The timetable engine cannot schedule this teacher until availability is set.</p>
                    </div>
                  )}

                  {/* Day rows */}
                  {DAYS.map(({ key, short }) => {
                    const slots = availEdit[key];
                    const isDirty = availDirty.has(key);
                    const isSaving = savingAvail === key;
                    return (
                      <div key={key} className="border border-gray-100 rounded-2xl p-4 space-y-2.5">
                        {/* Day header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-sora font-bold text-navy text-sm w-8">{short}</span>
                            {slots.length === 0 ? (
                              <span className="text-[10px] text-gray-400 border border-dashed border-gray-200 px-2 py-0.5 rounded-full">
                                {teacher.type === 'FULL_TIME' ? 'Full day (default)' : 'Not available'}
                              </span>
                            ) : (
                              <span className="text-[10px] text-teal bg-teal/10 border border-teal/20 px-2 py-0.5 rounded-full font-semibold">
                                {slots.length} slot{slots.length > 1 ? 's' : ''}
                              </span>
                            )}
                            {isDirty && !isSaving && (
                              <span className="text-[10px] text-amber font-semibold">Unsaved</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {(isDirty || slots.length > 0) && (
                              <button
                                onClick={() => saveDay(key)}
                                disabled={isSaving}
                                className="text-[11px] font-semibold text-white bg-navy px-2.5 py-1 rounded-lg hover:bg-navyMid transition-colors disabled:opacity-50 flex items-center gap-1"
                              >
                                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                Save
                              </button>
                            )}
                            <button
                              onClick={() => addSlot(key)}
                              className="text-[11px] font-semibold text-navy border border-navy/30 px-2.5 py-1 rounded-lg hover:bg-navy/5 transition-colors flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Add slot
                            </button>
                          </div>
                        </div>

                        {/* Slot rows */}
                        {slots.map((slot, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 flex-1 bg-gray-50 rounded-xl px-3 py-2">
                              <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <input
                                type="time"
                                value={slot.startTime}
                                onChange={e => updateSlot(key, idx, 'startTime', e.target.value)}
                                className="text-sm text-gray-800 bg-transparent border-none outline-none w-24"
                              />
                              <span className="text-gray-400 text-xs">to</span>
                              <input
                                type="time"
                                value={slot.endTime}
                                onChange={e => updateSlot(key, idx, 'endTime', e.target.value)}
                                className="text-sm text-gray-800 bg-transparent border-none outline-none w-24"
                              />
                            </div>
                            <button
                              onClick={() => removeSlot(key, idx)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Load Limits ── */}
              {activeTab === 'limits' && (
                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="font-sora font-semibold text-navy text-sm">Scheduling Load Limits</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Hard caps — the timetable engine will never schedule beyond these</p>
                  </div>

                  <div className="bg-iceLight border border-ice rounded-2xl p-5 space-y-5">
                    {/* Max per day */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-gray-700">Max Periods per Day</label>
                        <span className="text-2xl font-bold font-sora text-navy">{limits.maxPeriodsDay}</span>
                      </div>
                      <input
                        type="range" min={1} max={10} value={limits.maxPeriodsDay}
                        onChange={e => setLimits(l => ({ ...l, maxPeriodsDay: Number(e.target.value) }))}
                        className="w-full accent-navy"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                        <span>1 period</span><span>10 periods</span>
                      </div>
                    </div>

                    {/* Max per week */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-gray-700">Max Periods per Week</label>
                        <span className="text-2xl font-bold font-sora text-navy">{limits.maxPeriodsWeek}</span>
                      </div>
                      <input
                        type="range" min={5} max={40} value={limits.maxPeriodsWeek}
                        onChange={e => setLimits(l => ({ ...l, maxPeriodsWeek: Number(e.target.value) }))}
                        className="w-full accent-navy"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                        <span>5 periods</span><span>40 periods</span>
                      </div>
                    </div>

                    {/* Guidance */}
                    <div className="border-t border-ice pt-4 space-y-2 text-[11px] text-gray-500">
                      <p><strong className="text-gray-700">Full-time</strong> — typically 6/day, 30/week</p>
                      <p><strong className="text-gray-700">Part-time</strong> — set based on contract hours</p>
                      <p><strong className="text-gray-700">Substitute</strong> — usually 4/day to keep load light</p>
                    </div>
                  </div>

                  {/* Teacher type */}
                  <div className="border border-gray-100 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Employment Type</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'NON_TEACHING'] as const).map(t => (
                        <button
                          key={t}
                          onClick={async () => {
                            await fetch(`/api/hr/teachers/${teacherId}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ type: t }),
                            });
                            setTeacher(prev => prev ? { ...prev, type: t } : prev);
                            toast.success('Employment type updated');
                          }}
                          className={`py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                            teacher.type === t
                              ? 'bg-navy text-white border-navy'
                              : 'border-gray-200 text-gray-600 hover:border-navy/40'
                          }`}
                        >
                          {TYPE_LABELS[t]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSaveLimits}
                    disabled={savingLimits}
                    className="w-full py-3 bg-gold text-navy font-semibold rounded-xl hover:bg-gold/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  >
                    {savingLimits ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Load Limits
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

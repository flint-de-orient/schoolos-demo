'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  RefreshCw, Save, AlertCircle, ChevronDown, ChevronRight,
  GraduationCap, BookMarked, Sparkles, UserX, ArrowRight,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type CurrSubject = {
  id: string; name: string; code: string | null; subjectCategory: string;
  isLanguage: boolean; isElective: boolean; isPractical: boolean;
  teachers: { id: string; name: string }[];
};

type CurrGradeEntry = {
  id: string; subjectId: string; periodsPerWeek: number;
  isCompulsory: boolean; isOptional: boolean;
  languageLevel: string | null; schedulingSlot: string;
  maxMarks: number; passMarks: number;
};

type CurrGrade = {
  id: string; name: string; displayOrder: number;
  gradeGroupId: string | null; gradeGroupName: string | null;
  curriculum: CurrGradeEntry[];
};
type Category  = { value: string; label: string; icon: string; color: string; description: string };
type LangLevel = { value: string; label: string; description: string };
type SchedSlot = { value: string; label: string; description: string };

// ── Display maps ──────────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  CORE: 'bg-blue-50 border-blue-200 text-blue-800',
  LANGUAGE: 'bg-green-50 border-green-200 text-green-800',
  ELECTIVE: 'bg-purple-50 border-purple-200 text-purple-800',
  PRACTICAL: 'bg-teal-50 border-teal-200 text-teal-800',
  SPORTS: 'bg-orange-50 border-orange-200 text-orange-800',
  ARTS: 'bg-pink-50 border-pink-200 text-pink-800',
  TECHNOLOGY: 'bg-indigo-50 border-indigo-200 text-indigo-800',
  VALUE_EDUCATION: 'bg-amber-50 border-amber-200 text-amber-800',
  REMEDIAL: 'bg-red-50 border-red-200 text-red-800',
  ENRICHMENT: 'bg-yellow-50 border-yellow-200 text-yellow-900',
};

const CAT_HEADER: Record<string, string> = {
  CORE: 'bg-blue-600', LANGUAGE: 'bg-green-600', ELECTIVE: 'bg-purple-600',
  PRACTICAL: 'bg-teal-600', SPORTS: 'bg-orange-500', ARTS: 'bg-pink-600',
  TECHNOLOGY: 'bg-indigo-600', VALUE_EDUCATION: 'bg-amber-600', REMEDIAL: 'bg-red-600',
  ENRICHMENT: 'bg-yellow-500',
};

// Default periods/week per category (AI Suggest)
const DEFAULT_PPW: Record<string, number> = {
  LANGUAGE: 6, CORE: 5, ELECTIVE: 3, PRACTICAL: 2,
  SPORTS: 2, ARTS: 2, TECHNOLOGY: 2, VALUE_EDUCATION: 1, REMEDIAL: 2,
  ENRICHMENT: 1,
};

// Default scheduling slot per category
const DEFAULT_SLOT: Record<string, string> = {
  LANGUAGE: 'REGULAR', CORE: 'REGULAR', ELECTIVE: 'REGULAR', PRACTICAL: 'REGULAR',
  SPORTS: 'ACTIVITY', ARTS: 'ACTIVITY', TECHNOLOGY: 'ACTIVITY',
  VALUE_EDUCATION: 'ACTIVITY', REMEDIAL: 'REGULAR',
  ENRICHMENT: 'ACTIVITY',
};

// ── Draft types ───────────────────────────────────────────────────────────────

type DraftEntry = {
  included: boolean;
  periodsPerWeek: number;
  isCompulsory: boolean;
  isOptional: boolean;
  languageLevel: string;
  schedulingSlot: string;
  maxMarks: number;
  passMarks: number;
};

type GradeDraft = Record<string, DraftEntry>;

function defaultDraft(subject: CurrSubject): DraftEntry {
  const cat = subject.subjectCategory;
  return {
    included: false,
    periodsPerWeek: DEFAULT_PPW[cat] ?? 5,
    isCompulsory: true,
    isOptional: false,
    languageLevel: '',
    schedulingSlot: DEFAULT_SLOT[cat] ?? 'REGULAR',
    maxMarks: cat === 'PRACTICAL' ? 50 : 100,
    passMarks: cat === 'PRACTICAL' ? 17 : 33,
  };
}

function buildDraft(curriculum: CurrGradeEntry[], subjects: CurrSubject[]): GradeDraft {
  const draft: GradeDraft = {};
  for (const s of subjects) draft[s.id] = defaultDraft(s);
  for (const c of curriculum) {
    if (draft[c.subjectId]) {
      draft[c.subjectId] = {
        included: true,
        periodsPerWeek: c.periodsPerWeek,
        isCompulsory: c.isCompulsory,
        isOptional: c.isOptional,
        languageLevel: c.languageLevel ?? '',
        schedulingSlot: c.schedulingSlot,
        maxMarks: c.maxMarks,
        passMarks: c.passMarks,
      };
    }
  }
  return draft;
}

// ── Subject row ───────────────────────────────────────────────────────────────

function SubjectRow({ subject, entry, onChange, langLevels, schedSlots }: {
  subject: CurrSubject;
  entry: DraftEntry;
  onChange: (patch: Partial<DraftEntry>) => void;
  langLevels: LangLevel[];
  schedSlots: SchedSlot[];
}) {
  const [expanded, setExpanded] = useState(false);
  const isLang    = subject.subjectCategory === 'LANGUAGE';
  const colorClass = CAT_COLORS[subject.subjectCategory] ?? CAT_COLORS.CORE;

  return (
    <div className={`border rounded-xl overflow-hidden ${entry.included ? `${colorClass} border-opacity-60` : 'bg-white border-gray-100'}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <input type="checkbox" checked={entry.included}
          onChange={e => onChange({ included: e.target.checked })}
          className="w-4 h-4 accent-navy rounded flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold font-dm-sans ${entry.included ? '' : 'text-gray-500'}`}>{subject.name}</span>
            {subject.code && <span className="text-[10px] text-gray-400 font-mono">{subject.code}</span>}
            {isLang && entry.included && entry.languageLevel && (
              <span className="text-[9px] bg-green-700 text-white px-1.5 py-0.5 rounded-full font-bold">{entry.languageLevel}</span>
            )}
            {entry.included && entry.schedulingSlot !== 'REGULAR' && (
              <span className="text-[9px] bg-navy/10 text-navy px-1.5 py-0.5 rounded-full font-semibold">
                {schedSlots.find(s => s.value === entry.schedulingSlot)?.label ?? entry.schedulingSlot}
              </span>
            )}
            {entry.isOptional && (
              <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">Optional</span>
            )}
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5 truncate">
            {subject.teachers.map(t => t.name).join(' · ')}
          </p>
        </div>

        {entry.included && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1">
              <input type="number" value={entry.periodsPerWeek} min={1} max={14}
                onChange={e => onChange({ periodsPerWeek: Math.max(1, Math.min(14, Number(e.target.value))) })}
                className="w-10 border border-gray-200 rounded px-1.5 py-1 text-xs text-center bg-white/70 focus:outline-none focus:ring-1 focus:ring-navy/20" />
              <span className="text-[10px] text-gray-500">p/w</span>
            </div>
            <button onClick={() => setExpanded(e => !e)}
              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-navy">
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      {entry.included && expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-black/5 grid grid-cols-2 gap-3 bg-white/40">
          {isLang && (
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Language Level</label>
              <select value={entry.languageLevel}
                onChange={e => onChange({ languageLevel: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none">
                <option value="">— Not set —</option>
                {langLevels.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Scheduling</label>
            <select value={entry.schedulingSlot}
              onChange={e => onChange({ schedulingSlot: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none">
              {schedSlots.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex items-center">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={!entry.isCompulsory}
                onChange={e => onChange({ isCompulsory: !e.target.checked, isOptional: e.target.checked })}
                className="w-3 h-3 accent-navy" />
              <span className="text-xs text-gray-600">Optional / Elective</span>
            </label>
          </div>
          <div className="flex gap-2">
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Max Marks</label>
              <input type="number" value={entry.maxMarks} min={0} max={200}
                onChange={e => onChange({ maxMarks: Number(e.target.value) })}
                className="w-16 border border-gray-200 rounded px-1.5 py-1 text-xs text-center bg-white focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Pass Marks</label>
              <input type="number" value={entry.passMarks} min={0} max={200}
                onChange={e => onChange({ passMarks: Number(e.target.value) })}
                className="w-16 border border-gray-200 rounded px-1.5 py-1 text-xs text-center bg-white focus:outline-none" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ClassSubjectsTab({ onGoToGenerator }: { onGoToGenerator: (gradeId?: string) => void }) {
  const [grades, setGrades]         = useState<CurrGrade[]>([]);
  const [subjects, setSubjects]     = useState<CurrSubject[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [langLevels, setLangLevels] = useState<LangLevel[]>([]);
  const [schedSlots, setSchedSlots] = useState<SchedSlot[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [drafts, setDrafts]         = useState<Record<string, GradeDraft>>({});
  const [collapsedCats, setCollapsedCats]     = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    fetch('/api/timetable/curriculum').then(r => r.json()).then(d => {
      const data = d.data ?? d;
      const g: CurrGrade[]   = data.grades ?? [];
      const s: CurrSubject[] = data.subjects ?? [];
      setGrades(g);
      setSubjects(s);
      setCategories(data.categories ?? []);
      setLangLevels(data.languageLevels ?? []);
      setSchedSlots(data.schedulingSlots ?? []);

      const allDrafts: Record<string, GradeDraft> = {};
      for (const grade of g) allDrafts[grade.id] = buildDraft(grade.curriculum, s);
      setDrafts(allDrafts);
      if (g.length > 0) setSelectedGradeId(g[0].id);
    }).catch(() => toast.error('Failed to load subject data'))
      .finally(() => setLoading(false));
  }, []);

  function updateEntry(gradeId: string, subjectId: string, patch: Partial<DraftEntry>) {
    setDrafts(prev => ({
      ...prev,
      [gradeId]: { ...prev[gradeId], [subjectId]: { ...prev[gradeId][subjectId], ...patch } },
    }));
  }

  function handleAISuggest() {
    if (!selectedGradeId) return;
    // Auto-include all subjects with teachers and fill smart defaults
    const withTeachers = subjects.filter(s => s.teachers.length > 0);
    setDrafts(prev => {
      const updated = { ...prev[selectedGradeId] };
      for (const s of withTeachers) {
        const cat  = s.subjectCategory;
        const cur  = updated[s.id] ?? defaultDraft(s);
        updated[s.id] = {
          ...cur,
          included: true,
          periodsPerWeek: DEFAULT_PPW[cat] ?? 5,
          schedulingSlot: DEFAULT_SLOT[cat] ?? 'REGULAR',
        };
      }
      return { ...prev, [selectedGradeId]: updated };
    });
    toast.success('AI suggested periods applied — review and adjust before saving');
  }

  function handleSave(andGenerate = false) {
    if (!selectedGradeId) return;
    setSaving(true);
    const draft = drafts[selectedGradeId] ?? {};
    const curriculum = Object.entries(draft)
      .filter(([, e]) => e.included)
      .map(([subjectId, e]) => ({
        subjectId,
        periodsPerWeek: e.periodsPerWeek,
        isCompulsory: e.isCompulsory,
        isOptional: e.isOptional,
        languageLevel: e.languageLevel || null,
        schedulingSlot: e.schedulingSlot,
        maxMarks: e.maxMarks,
        passMarks: e.passMarks,
      }));

    fetch('/api/timetable/curriculum', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gradeId: selectedGradeId, curriculum }),
    }).then(r => r.json()).then(d => {
      if (d.error) { toast.error(d.error); return; }
      const gradeName = grades.find(g => g.id === selectedGradeId)?.name;
      toast.success(`Subjects saved for ${gradeName}`);
      if (andGenerate) onGoToGenerator(selectedGradeId);
    }).catch(() => toast.error('Failed to save'))
      .finally(() => setSaving(false));
  }

  // ── Derived state ───────────────────────────────────────────────────────────

  const draft         = useMemo(() => drafts[selectedGradeId] ?? {}, [drafts, selectedGradeId]);
  const selectedGrade = grades.find(g => g.id === selectedGradeId);

  // Hard split: with teachers (assignable) vs without (blocked)
  const withTeachers    = useMemo(() => subjects.filter(s => s.teachers.length > 0), [subjects]);
  const withoutTeachers = useMemo(() => subjects.filter(s => s.teachers.length === 0), [subjects]);

  const includedCount   = Object.values(draft).filter(e => e.included).length;
  const totalPeriods    = Object.values(draft).filter(e => e.included).reduce((s, e) => s + e.periodsPerWeek, 0);

  const subjectsByCategory = useMemo(() =>
    categories.map(cat => ({
      cat,
      subjects: withTeachers.filter(s => s.subjectCategory === cat.value),
    })).filter(g => g.subjects.length > 0),
  [categories, withTeachers]);

  const langSubjects = withTeachers.filter(s => s.subjectCategory === 'LANGUAGE');
  const langSummary  = ['L1', 'L2', 'L3', 'L4'].map(level => ({
    level,
    subject: langSubjects.find(s => draft[s.id]?.included && draft[s.id]?.languageLevel === level),
  }));

  // Validation
  const langWithoutLevel = langSubjects.some(s => draft[s.id]?.included && !draft[s.id]?.languageLevel);
  const dupeLangLevels   = (() => {
    const counts: Record<string, number> = {};
    langSubjects.forEach(s => { const l = draft[s.id]?.languageLevel; if (draft[s.id]?.included && l) counts[l] = (counts[l] ?? 0) + 1; });
    return Object.entries(counts).filter(([, c]) => c > 1).map(([l]) => l);
  })();

  if (loading) return (
    <div className="bg-white rounded-xl border border-gray-100 p-12 flex items-center justify-center gap-3">
      <RefreshCw className="w-5 h-5 text-gray-300 animate-spin" />
      <span className="text-sm text-gray-400 font-dm-sans">Loading subjects…</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="bg-navy/5 border border-navy/10 rounded-xl p-4 flex items-start gap-3">
        <GraduationCap className="w-4 h-4 text-navy mt-0.5 flex-shrink-0" />
        <p className="text-sm text-navy/80 font-dm-sans">
          Assign subjects to each grade. Only subjects with an assigned teacher can be added.
          The AI Generator uses this to build grade-appropriate timetables — periods per day are calculated automatically.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-5">
        {/* ── Grade selector (grouped by GradeGroup) ── */}
        <div className="col-span-1">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Grade</p>
            </div>
            <div className="overflow-y-auto max-h-[70vh]">
              {(() => {
                // Group grades by gradeGroupName (null → 'Unassigned')
                const grouped = new Map<string, CurrGrade[]>();
                for (const g of grades) {
                  const key = g.gradeGroupName ?? '⚠ Unassigned';
                  if (!grouped.has(key)) grouped.set(key, []);
                  grouped.get(key)!.push(g);
                }
                const sortedKeys = [...grouped.keys()].sort((a, b) => {
                  if (a.startsWith('⚠')) return 1;
                  if (b.startsWith('⚠')) return -1;
                  return a.localeCompare(b);
                });
                return sortedKeys.map((groupName) => {
                  const groupGrades = grouped.get(groupName)!;
                  const isUnassigned = groupName.startsWith('⚠');
                  // Count grades in this group that have subjects configured
                  const configuredCount = groupGrades.filter(g =>
                    Object.values(drafts[g.id] ?? {}).some(e => e.included)
                  ).length;
                  return (
                    <div key={groupName}>
                      {/* Group header */}
                      <div className={`px-3 py-2 flex items-center justify-between border-b ${
                        isUnassigned
                          ? 'bg-red-50 border-red-100'
                          : 'bg-iceLight border-blue-100'
                      }`}>
                        <span className={`text-[10px] font-sora font-bold uppercase tracking-wide ${
                          isUnassigned ? 'text-red-500' : 'text-navy'
                        }`}>{groupName}</span>
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                          configuredCount > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {configuredCount}/{groupGrades.length}
                        </span>
                      </div>
                      {/* Grades in this group */}
                      <div className="divide-y divide-gray-50">
                        {groupGrades.map(g => {
                          const count    = Object.values(drafts[g.id] ?? {}).filter(e => e.included).length;
                          const isActive = selectedGradeId === g.id;
                          return (
                            <button key={g.id} onClick={() => setSelectedGradeId(g.id)}
                              className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors ${
                                isActive ? 'bg-navy text-white' : 'hover:bg-gray-50 text-gray-700'
                              }`}>
                              <span className={`text-sm font-dm-sans font-medium truncate ${isActive ? 'text-white' : ''}`}>
                                {g.name}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1 flex-shrink-0 ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : count > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                              }`}>
                                {count > 0 ? count : '—'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* ── Subject editor ── */}
        <div className="col-span-3 space-y-4">
          {!selectedGradeId ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <BookMarked className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Select a grade to assign subjects</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-sm font-sora font-semibold text-navy">{selectedGrade?.name} — Subject Assignment</h3>
                    <p className="text-xs text-gray-500 mt-0.5 font-dm-sans">
                      {includedCount} subject{includedCount !== 1 ? 's' : ''} · {totalPeriods} periods/week
                      {totalPeriods > 0 && (
                        <span className="ml-2 text-navy font-semibold">
                          (avg {(totalPeriods / 6).toFixed(1)} p/day over 6 days)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={handleAISuggest}
                      className="flex items-center gap-1.5 border border-navy/20 text-navy text-xs font-sora font-semibold px-3 py-2 rounded-lg hover:bg-navy/5 transition-colors">
                      <Sparkles className="w-3.5 h-3.5" /> AI Suggest Periods
                    </button>
                    <button onClick={() => handleSave(false)} disabled={saving || includedCount === 0}
                      className="flex items-center gap-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg px-4 py-2 hover:border-navy/30 transition-colors disabled:opacity-40">
                      {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save
                    </button>
                    <button onClick={() => handleSave(true)} disabled={saving || includedCount === 0}
                      className="flex items-center gap-2 bg-gold text-navy font-sora font-semibold rounded-lg px-4 py-2 hover:bg-gold/90 transition-colors disabled:opacity-40 text-sm">
                      {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      Save &amp; Generate
                    </button>
                  </div>
                </div>
              </div>

              {/* Language summary */}
              {langSubjects.some(s => draft[s.id]?.included) && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-green-700 uppercase tracking-wide mb-2">Language Assignment</p>
                  <div className="flex gap-3 flex-wrap">
                    {langSummary.map(({ level, subject }) => (
                      <div key={level} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${subject ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-400 border-gray-200'}`}>
                        <span>{level}</span>
                        <span className="font-normal">{subject ? subject.name : '— Not assigned'}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-green-600 mt-1.5">Expand a language subject row to set its level (L1–L4)</p>
                </div>
              )}

              {/* Subjects grouped by category */}
              {subjectsByCategory.map(({ cat, subjects: catSubjects }) => {
                const isCollapsed   = collapsedCats.has(cat.value);
                const includedInCat = catSubjects.filter(s => draft[s.id]?.included).length;
                const headerBg      = CAT_HEADER[cat.value] ?? 'bg-gray-600';
                return (
                  <div key={cat.value} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <button
                      onClick={() => setCollapsedCats(prev => {
                        const next = new Set(prev);
                        if (next.has(cat.value)) { next.delete(cat.value); } else { next.add(cat.value); }
                        return next;
                      })}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-white ${headerBg} hover:opacity-90 transition-opacity`}>
                      <span className="text-base leading-none">{cat.icon}</span>
                      <div className="flex-1 text-left">
                        <span className="text-sm font-sora font-semibold">{cat.label}</span>
                        <span className="text-[10px] opacity-70 ml-2">{cat.description}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {includedInCat > 0 && (
                          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                            {includedInCat}/{catSubjects.length}
                          </span>
                        )}
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {!isCollapsed && (
                      <div className="p-3 space-y-2">
                        {catSubjects.map(subject => (
                          <SubjectRow
                            key={subject.id}
                            subject={subject}
                            entry={draft[subject.id] ?? defaultDraft(subject)}
                            onChange={patch => updateEntry(selectedGradeId, subject.id, patch)}
                            langLevels={langLevels}
                            schedSlots={schedSlots}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {withTeachers.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
                  <UserX className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No subjects have teachers assigned yet.</p>
                  <p className="text-xs text-gray-300 mt-1">Go to HR → Teachers to assign subjects to teachers first.</p>
                </div>
              )}

              {/* Subjects without teachers — informational, not assignable */}
              {withoutTeachers.length > 0 && (
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <UserX className="w-4 h-4 text-gray-400" />
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Cannot Assign — No Teacher ({withoutTeachers.length})
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {withoutTeachers.map(s => (
                      <span key={s.id} className="text-[10px] bg-white border border-gray-200 text-gray-400 px-2 py-1 rounded-full">
                        {s.name}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">
                    Assign teachers to these subjects in <strong>HR → Teachers</strong> to make them available here.
                  </p>
                </div>
              )}

              {/* Validations */}
              {langWithoutLevel && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700 font-dm-sans">
                    <strong>Action needed:</strong> Some language subjects don&apos;t have a level (L1–L4) set. Expand the subject row to assign it.
                  </p>
                </div>
              )}
              {dupeLangLevels.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700">
                    Conflict: {dupeLangLevels.join(', ')} assigned to more than one language. Each level must be unique.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

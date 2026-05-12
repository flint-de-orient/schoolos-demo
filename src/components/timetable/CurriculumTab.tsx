'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  RefreshCw, Save, AlertCircle, ChevronDown, ChevronRight,
  GraduationCap, BookMarked, Plus,
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

type CurrGrade = { id: string; name: string; displayOrder: number; curriculum: CurrGradeEntry[] };

type Category = { value: string; label: string; icon: string; color: string; description: string };
type LangLevel = { value: string; label: string; description: string };
type SchedSlot = { value: string; label: string; description: string };

// ── Category config ───────────────────────────────────────────────────────────

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
};

const CAT_HEADER: Record<string, string> = {
  CORE: 'bg-blue-600', LANGUAGE: 'bg-green-600', ELECTIVE: 'bg-purple-600',
  PRACTICAL: 'bg-teal-600', SPORTS: 'bg-orange-500', ARTS: 'bg-pink-600',
  TECHNOLOGY: 'bg-indigo-600', VALUE_EDUCATION: 'bg-amber-600', REMEDIAL: 'bg-red-600',
};

const SCHED_LABEL: Record<string, string> = {
  REGULAR: 'Regular', ACTIVITY: 'Activity Period',
  DOUBLE_PERIOD: 'Double Period', AFTER_SCHOOL: 'After School', WEEKEND: 'Weekend',
};

// ── Draft state for one grade ─────────────────────────────────────────────────

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

type GradeDraft = Record<string, DraftEntry>; // subjectId → entry

function defaultDraft(subject: CurrSubject): DraftEntry {
  const ppw = subject.subjectCategory === 'LANGUAGE' ? 6
    : subject.subjectCategory === 'SPORTS' ? 2
    : subject.subjectCategory === 'ARTS' ? 2
    : subject.subjectCategory === 'TECHNOLOGY' ? 2
    : subject.subjectCategory === 'VALUE_EDUCATION' ? 1
    : subject.subjectCategory === 'PRACTICAL' ? 2
    : subject.subjectCategory === 'REMEDIAL' ? 2 : 5;
  return {
    included: false, periodsPerWeek: ppw, isCompulsory: true, isOptional: false,
    languageLevel: '', schedulingSlot: ['SPORTS', 'ARTS', 'TECHNOLOGY', 'VALUE_EDUCATION'].includes(subject.subjectCategory) ? 'ACTIVITY' : 'REGULAR',
    maxMarks: subject.subjectCategory === 'PRACTICAL' ? 50 : 100,
    passMarks: subject.subjectCategory === 'PRACTICAL' ? 17 : 33,
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
  const isLang = subject.subjectCategory === 'LANGUAGE';
  const colorClass = CAT_COLORS[subject.subjectCategory] ?? CAT_COLORS.CORE;

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${entry.included ? `${colorClass} border-opacity-60` : 'bg-white border-gray-100'}`}>
      {/* Main row */}
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
              <span className="text-[9px] bg-navy/10 text-navy px-1.5 py-0.5 rounded-full font-semibold">{SCHED_LABEL[entry.schedulingSlot]}</span>
            )}
            {entry.isOptional && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">Optional</span>}
          </div>
          {subject.teachers.length > 0
            ? <p className="text-[10px] text-gray-400 mt-0.5 truncate">{subject.teachers.map(t => t.name).join(', ')}</p>
            : <p className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-1"><AlertCircle className="w-2.5 h-2.5" />No teacher assigned</p>
          }
        </div>

        {entry.included && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1">
              <input type="number" value={entry.periodsPerWeek} min={1} max={14}
                onChange={e => onChange({ periodsPerWeek: Number(e.target.value) })}
                className="w-10 border border-gray-200 rounded px-1.5 py-1 text-xs text-center bg-white/70 focus:outline-none focus:ring-1 focus:ring-navy/20" />
              <span className="text-[10px] text-gray-500">p/w</span>
            </div>
            <button onClick={() => setExpanded(e => !e)}
              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-navy transition-colors">
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      {/* Expanded options */}
      {entry.included && expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-black/5 grid grid-cols-2 gap-3 bg-white/40">
          {isLang && (
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Language Level</label>
              <select value={entry.languageLevel}
                onChange={e => onChange({ languageLevel: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-navy/20">
                <option value="">— Not set —</option>
                {langLevels.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Scheduling</label>
            <select value={entry.schedulingSlot}
              onChange={e => onChange({ schedulingSlot: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-navy/20">
              {schedSlots.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={!entry.isCompulsory}
                onChange={e => onChange({ isCompulsory: !e.target.checked, isOptional: e.target.checked })}
                className="w-3 h-3 accent-navy" />
              <span className="text-xs text-gray-600">Optional/Elective</span>
            </label>
          </div>
          <div className="flex items-center gap-2">
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

export default function CurriculumTab({ onGoToGenerator }: { onGoToGenerator: () => void }) {
  const [grades, setGrades]           = useState<CurrGrade[]>([]);
  const [subjects, setSubjects]       = useState<CurrSubject[]>([]);
  const [categories, setCategories]   = useState<Category[]>([]);
  const [langLevels, setLangLevels]   = useState<LangLevel[]>([]);
  const [schedSlots, setSchedSlots]   = useState<SchedSlot[]>([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [selectedGradeId, setSelectedGradeId] = useState('');
  // draft: gradeId → GradeDraft
  const [drafts, setDrafts]           = useState<Record<string, GradeDraft>>({});
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    fetch('/api/timetable/curriculum').then(r => r.json()).then(d => {
      const data = d.data ?? d;
      const g: CurrGrade[] = data.grades ?? [];
      const s: CurrSubject[] = data.subjects ?? [];
      setGrades(g);
      setSubjects(s);
      setCategories(data.categories ?? []);
      setLangLevels(data.languageLevels ?? []);
      setSchedSlots(data.schedulingSlots ?? []);
      // Build drafts for all grades
      const allDrafts: Record<string, GradeDraft> = {};
      for (const grade of g) allDrafts[grade.id] = buildDraft(grade.curriculum, s);
      setDrafts(allDrafts);
      if (g.length > 0) setSelectedGradeId(g[0].id);
    }).catch(() => toast.error('Failed to load curriculum data'))
      .finally(() => setLoading(false));
  }, []);

  function updateEntry(gradeId: string, subjectId: string, patch: Partial<DraftEntry>) {
    setDrafts(prev => ({
      ...prev,
      [gradeId]: { ...prev[gradeId], [subjectId]: { ...prev[gradeId][subjectId], ...patch } },
    }));
  }

  function handleSave() {
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
      toast.success(`Curriculum saved for ${gradeName} — ${curriculum.length} subjects`);
    }).catch(() => toast.error('Failed to save'))
      .finally(() => setSaving(false));
  }

  function handleUpdateSubjectCategory(subjectId: string, category: string) {
    fetch('/api/timetable/curriculum', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectId, subjectCategory: category }),
    }).then(r => r.json()).then(d => {
      if (d.error) { toast.error(d.error); return; }
      setSubjects(prev => prev.map(s => s.id === subjectId ? { ...s, subjectCategory: category } : s));
      toast.success('Subject category updated');
    }).catch(() => toast.error('Failed to update category'));
  }

  const draft = drafts[selectedGradeId] ?? {};
  const selectedGrade = grades.find(g => g.id === selectedGradeId);
  const includedCount = Object.values(draft).filter(e => e.included).length;

  // Group subjects by category
  const subjectsByCategory = categories.map(cat => ({
    cat,
    subjects: subjects.filter(s => s.subjectCategory === cat.value),
  })).filter(g => g.subjects.length > 0);

  // L1/L2/L3/L4 summary for languages
  const langSubjects = subjects.filter(s => s.subjectCategory === 'LANGUAGE');
  const langSummary = ['L1', 'L2', 'L3', 'L4'].map(level => {
    const match = langSubjects.find(s => draft[s.id]?.included && draft[s.id]?.languageLevel === level);
    return { level, subject: match };
  });

  if (loading) return (
    <div className="bg-white rounded-xl border border-gray-100 p-12 flex items-center justify-center gap-3">
      <RefreshCw className="w-5 h-5 text-gray-300 animate-spin" />
      <span className="text-sm text-gray-400 font-dm-sans">Loading curriculum data…</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="bg-navy/5 border border-navy/10 rounded-xl p-4 flex items-start gap-3">
        <GraduationCap className="w-4 h-4 text-navy mt-0.5 flex-shrink-0" />
        <p className="text-sm text-navy/80 font-dm-sans">
          Define a 360° curriculum for each grade — core subjects, languages (L1→L4), electives, sports, arts, technology &amp; co-curricular activities. The AI Timetable Generator uses this to build grade-appropriate schedules.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-5">
        {/* ── Grade selector ── */}
        <div className="col-span-1">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Grade</p>
            </div>
            <div className="divide-y divide-gray-50">
              {grades.map(g => {
                const count = Object.values(drafts[g.id] ?? {}).filter(e => e.included).length;
                const isActive = selectedGradeId === g.id;
                return (
                  <button key={g.id} onClick={() => setSelectedGradeId(g.id)}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${isActive ? 'bg-navy text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
                    <span className={`text-sm font-dm-sans font-medium truncate ${isActive ? 'text-white' : ''}`}>{g.name}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1 flex-shrink-0 ${isActive ? 'bg-white/20 text-white' : count > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Curriculum editor ── */}
        <div className="col-span-3 space-y-4">
          {!selectedGradeId ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <BookMarked className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Select a grade to configure its curriculum</p>
            </div>
          ) : (
            <>
              {/* Header + Save */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-sora font-semibold text-navy">{selectedGrade?.name} — 360° Curriculum</h3>
                  <p className="text-xs text-gray-500 mt-0.5 font-dm-sans">{includedCount} subjects configured</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={onGoToGenerator}
                    className="text-xs text-navy underline hover:no-underline font-semibold">
                    AI Generator →
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 bg-gold text-navy font-sora font-semibold rounded-lg px-4 py-2 hover:bg-gold/90 transition-colors disabled:opacity-50 text-sm">
                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Curriculum
                  </button>
                </div>
              </div>

              {/* Language level summary strip (only if any lang subject selected) */}
              {langSubjects.some(s => draft[s.id]?.included) && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-green-700 uppercase tracking-wide mb-2">Language Assignment Summary</p>
                  <div className="flex gap-3 flex-wrap">
                    {langSummary.map(({ level, subject }) => (
                      <div key={level} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${subject ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-400 border-gray-200'}`}>
                        <span>{level}</span>
                        <span className="font-normal">{subject ? subject.name : '— Not assigned'}</span>
                        {subject && !draft[subject.id]?.languageLevel && (
                          <AlertCircle className="w-3 h-3 text-yellow-300" />
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-green-600 mt-1.5">Set the language level for each language subject below (expand the row)</p>
                </div>
              )}

              {/* Subject groups by category */}
              {subjectsByCategory.map(({ cat, subjects: catSubjects }) => {
                const isCollapsed = collapsedCats.has(cat.value);
                const includedInCat = catSubjects.filter(s => draft[s.id]?.included).length;
                const headerBg = CAT_HEADER[cat.value] ?? 'bg-gray-600';
                return (
                  <div key={cat.value} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Category header */}
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
                            {includedInCat}/{catSubjects.length} selected
                          </span>
                        )}
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {/* Subject rows */}
                    {!isCollapsed && (
                      <div className="p-3 space-y-2">
                        {catSubjects.map(subject => (
                          <div key={subject.id} className="group relative">
                            <SubjectRow
                              subject={subject}
                              entry={draft[subject.id] ?? defaultDraft(subject)}
                              onChange={patch => updateEntry(selectedGradeId, subject.id, patch)}
                              langLevels={langLevels}
                              schedSlots={schedSlots}
                            />
                            {/* Category badge — click to change */}
                            <div className="absolute top-2 right-10 opacity-0 group-hover:opacity-100 transition-opacity">
                              <select
                                value={subject.subjectCategory}
                                onChange={e => handleUpdateSubjectCategory(subject.id, e.target.value)}
                                className="text-[9px] border border-gray-200 rounded px-1 py-0.5 bg-white text-gray-500 cursor-pointer"
                                title="Change subject category">
                                {categories.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                              </select>
                            </div>
                          </div>
                        ))}

                        {/* No subjects in this category notice */}
                        {catSubjects.length === 0 && (
                          <div className="py-3 text-center text-xs text-gray-400 font-dm-sans">
                            No subjects in this category yet
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Empty state */}
              {subjects.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
                  <Plus className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No subjects found. Add subjects via HR → Subjects first.</p>
                </div>
              )}

              {/* Summary footer */}
              {includedCount > 0 && (
                <div className="bg-iceLight rounded-xl border border-ice p-4">
                  <p className="text-xs font-semibold text-navy mb-2">Curriculum Summary — {selectedGrade?.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(draft).filter(([, e]) => e.included).map(([sid, e]) => {
                      const subj = subjects.find(s => s.id === sid);
                      if (!subj) return null;
                      const colorClass = CAT_COLORS[subj.subjectCategory] ?? '';
                      return (
                        <span key={sid} className={`text-[10px] px-2 py-1 rounded-full border font-semibold ${colorClass}`}>
                          {subj.name} · {e.periodsPerWeek}p/w
                          {e.languageLevel && ` · ${e.languageLevel}`}
                          {e.schedulingSlot !== 'REGULAR' && ` · ${SCHED_LABEL[e.schedulingSlot]}`}
                        </span>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-[10px] text-gray-500">
                    <span>Total periods/week: <strong className="text-navy">{Object.values(draft).filter(e => e.included).reduce((sum, e) => sum + e.periodsPerWeek, 0)}</strong></span>
                    <span>Regular: <strong className="text-navy">{Object.values(draft).filter(e => e.included && e.schedulingSlot === 'REGULAR').length} subjects</strong></span>
                    <span>Co-curricular: <strong className="text-navy">{Object.values(draft).filter(e => e.included && e.schedulingSlot !== 'REGULAR').length} subjects</strong></span>
                  </div>
                </div>
              )}

              {/* Validation: languages without level set */}
              {langSubjects.some(s => draft[s.id]?.included && !draft[s.id]?.languageLevel) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-700 font-dm-sans">
                    <strong>Action needed:</strong> Some language subjects don&apos;t have a language level (L1/L2/L3/L4) set.
                    Expand the subject row and assign a level so the AI generator knows which language is First Language, etc.
                  </div>
                </div>
              )}

              {/* No teacher warnings */}
              {Object.entries(draft).some(([sid, e]) => {
                const s = subjects.find(x => x.id === sid);
                return e.included && s && s.teachers.length === 0;
              }) && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-red-700 font-dm-sans">
                    <strong>Warning:</strong> Some selected subjects have no teacher assigned — they cannot be scheduled by the AI generator.
                    Go to <strong>HR → Teachers</strong> to assign teachers to these subjects.
                  </div>
                </div>
              )}

              {/* Conflict check: duplicate language levels */}
              {(() => {
                const levelCounts: Record<string, number> = {};
                langSubjects.forEach(s => { const l = draft[s.id]?.languageLevel; if (s && draft[s.id]?.included && l) levelCounts[l] = (levelCounts[l] ?? 0) + 1; });
                const dupes = Object.entries(levelCounts).filter(([, c]) => c > 1);
                if (dupes.length === 0) return null;
                return (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-700">Conflict: {dupes.map(([l]) => l).join(', ')} assigned to multiple languages. Each language level should be unique.</p>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

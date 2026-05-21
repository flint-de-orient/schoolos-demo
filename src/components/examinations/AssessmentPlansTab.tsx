'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Plus, Trash2, Save, BookOpen, CheckCircle2,
  X, Settings, Layers, ChevronDown, ChevronUp, Sparkles,
} from 'lucide-react';
import { ExamSetupWizard } from './ExamSetupWizard';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Types ─────────────────────────────────────────────────────────────────────

type ComponentDef = { name: string; maxMarks: number; passMarks: number };
type GradingBand = { label: string; minPct: number; description: string };
type PassCriteria = { perSubject: number; aggregate: number };

interface TermSubjectConfig {
  id?: string;
  subjectId: string;
  subject: { id: string; name: string };
  components: ComponentDef[];
}

interface SchemeTerm {
  id?: string;
  sequence: number;
  name: string;
  type: string;
  weightPct: number;
  isBoardConducted: boolean;
  examScheduleId: string | null;
  subjectConfigs: TermSubjectConfig[];
}

interface SchemeListItem {
  id: string;
  name: string;
  description: string | null;
  academicYear: { id: string; label: string };
  appliedGradeIds: string[];
  isPublished: boolean;
  terms: { id: string; name: string; weightPct: number }[];
}

interface SchemeDetail {
  id: string;
  name: string;
  description: string | null;
  academicYear: { id: string; label: string };
  appliedGradeIds: string[];
  isPublished: boolean;
  gradingConfig: GradingBand[];
  passCriteria: PassCriteria;
  terms: SchemeTerm[];
}

interface TermRow {
  _localId: string;
  id?: string;
  sequence: number;
  name: string;
  type: string;
  weightPct: number;
  isBoardConducted: boolean;
  examScheduleId: string | null;
  subjectConfigs: TermSubjectConfig[];
}

interface Grade { id: string; name: string; displayOrder: number }
interface AcademicYear { id: string; label: string; isCurrent: boolean }
interface ExamSched { id: string; name: string }
interface Subject { id: string; name: string }

// ─── Constants ─────────────────────────────────────────────────────────────────

const TERM_TYPES = [
  { value: 'UNIT_TEST', label: 'Unit Test' },
  { value: 'HALF_YEARLY', label: 'Half-Yearly' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'PRE_BOARD', label: 'Pre-Board' },
  { value: 'BOARD_EXAM', label: 'Board Exam' },
  { value: 'PROJECT', label: 'Project/Portfolio' },
  { value: 'INTERNAL', label: 'Internal Assessment' },
];

const COMPONENT_OPTIONS = ['Theory', 'Written', 'Practical', 'Viva', 'Oral', 'Project', 'Internal', 'Assignment'];

const DEFAULT_GRADING: GradingBand[] = [
  { label: 'A+', minPct: 90, description: 'Outstanding' },
  { label: 'A',  minPct: 80, description: 'Excellent' },
  { label: 'B+', minPct: 70, description: 'Very Good' },
  { label: 'B',  minPct: 60, description: 'Good' },
  { label: 'C',  minPct: 50, description: 'Average' },
  { label: 'D',  minPct: 40, description: 'Below Average' },
  { label: 'F',  minPct: 0,  description: 'Fail' },
];

// ─── Create Scheme Modal ────────────────────────────────────────────────────────

function CreateSchemeModal({ open, onClose, onCreated, academicYears }: {
  open: boolean;
  onClose: () => void;
  onCreated: (s: SchemeListItem) => void;
  academicYears: AcademicYear[];
}) {
  const [name, setName] = useState('');
  const [ayId, setAyId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const cur = academicYears.find((y) => y.isCurrent);
      if (cur) setAyId(cur.id);
    }
  }, [open, academicYears]);

  async function submit() {
    if (!name.trim()) { toast.error('Plan name is required'); return; }
    if (!ayId) { toast.error('Academic year is required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/assessment-schemes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), academicYearId: ayId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      const created: SchemeListItem = await res.json();
      onCreated(created);
      toast.success(`Plan "${created.name}" created`);
      onClose();
      setName('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-sora font-semibold text-navy text-lg">New Assessment Plan</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Plan Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CISCE Standard Plan 2025-26"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Academic Year</label>
            <select
              value={ayId}
              onChange={(e) => setAyId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
            >
              <option value="">Select year…</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>{y.label}{y.isCurrent ? ' (Current)' : ''}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 text-sm font-semibold py-2 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={submit} disabled={saving} className="flex-1 bg-gold text-navy text-sm font-semibold py-2 rounded-lg hover:bg-gold/90 disabled:opacity-60">
            {saving ? 'Creating…' : 'Create Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Component Editor (inline, for a single subject within a term) ─────────────

function ComponentEditor({ components, onChange }: {
  components: ComponentDef[];
  onChange: (c: ComponentDef[]) => void;
}) {
  function add() {
    onChange([...components, { name: 'Theory', maxMarks: 100, passMarks: 33 }]);
  }
  function remove(i: number) { onChange(components.filter((_, j) => j !== i)); }
  function update(i: number, field: keyof ComponentDef, val: string | number) {
    onChange(components.map((c, j) => (j === i ? { ...c, [field]: val } : c)));
  }

  return (
    <div className="space-y-1.5">
      {components.length === 0 && (
        <p className="text-[10px] text-gray-400 italic">No components — click Add</p>
      )}
      {components.map((c, i) => (
        <div key={i} className="grid grid-cols-[1fr_64px_64px_24px] gap-1.5 items-center">
          <select
            value={c.name}
            onChange={(e) => update(i, 'name', e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-navy"
          >
            {COMPONENT_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <input
            type="number" value={c.maxMarks} min={0} placeholder="Max"
            onChange={(e) => update(i, 'maxMarks', parseInt(e.target.value) || 0)}
            className="border border-gray-200 rounded-lg px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-navy"
          />
          <input
            type="number" value={c.passMarks} min={0} placeholder="Pass"
            onChange={(e) => update(i, 'passMarks', parseInt(e.target.value) || 0)}
            className="border border-gray-200 rounded-lg px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-navy"
          />
          <button onClick={() => remove(i)} className="text-coral hover:text-coral/80 flex items-center justify-center">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      {/* column labels */}
      {components.length > 0 && (
        <div className="grid grid-cols-[1fr_64px_64px_24px] gap-1.5 px-0.5">
          <span className="text-[9px] text-gray-400">Component</span>
          <span className="text-[9px] text-gray-400 text-center">Max</span>
          <span className="text-[9px] text-gray-400 text-center">Pass</span>
          <span />
        </div>
      )}
      <button
        onClick={add}
        className="flex items-center gap-1 text-[10px] font-semibold text-teal hover:text-teal/80"
      >
        <Plus className="w-3 h-3" /> Add component
      </button>
    </div>
  );
}

// ─── Term Subject Config Panel (expanded under a term row) ─────────────────────

function TermSubjectPanel({ schemeId, termId, subjectConfigs: initial, subjects, onSaved }: {
  schemeId: string;
  termId: string;
  subjectConfigs: TermSubjectConfig[];
  subjects: Subject[];
  onSaved: (configs: TermSubjectConfig[]) => void;
}) {
  const [configs, setConfigs] = useState<TermSubjectConfig[]>(initial);
  const [saving, setSaving] = useState<string | null>(null);
  const [addingId, setAddingId] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const usedIds = new Set(configs.map((c) => c.subjectId));
  const available = subjects.filter((s) => !usedIds.has(s.id));

  function addSubject() {
    if (!addingId) { toast.error('Select a subject'); return; }
    const sub = subjects.find((s) => s.id === addingId);
    if (!sub) return;
    setConfigs((prev) => [...prev, { subjectId: addingId, subject: sub, components: [] }]);
    setAddingId('');
    setShowAdd(false);
  }

  async function saveConfig(subjectId: string) {
    const cfg = configs.find((c) => c.subjectId === subjectId);
    if (!cfg) return;
    setSaving(subjectId);
    try {
      const res = await fetch(
        `/api/assessment-schemes/${schemeId}/terms/${termId}/subjects`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subjectId, components: cfg.components }),
        }
      );
      if (!res.ok) throw new Error('Failed');
      const saved: TermSubjectConfig = await res.json();
      const updated = configs.map((c) => (c.subjectId === subjectId ? { ...c, id: saved.id } : c));
      setConfigs(updated);
      onSaved(updated);
      toast.success(`${cfg.subject.name} saved`);
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(null);
    }
  }

  async function removeConfig(subjectId: string) {
    try {
      await fetch(
        `/api/assessment-schemes/${schemeId}/terms/${termId}/subjects?subjectId=${subjectId}`,
        { method: 'DELETE' }
      );
      const updated = configs.filter((c) => c.subjectId !== subjectId);
      setConfigs(updated);
      onSaved(updated);
      toast.success('Subject removed');
    } catch {
      toast.error('Failed to remove');
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
          Subject Assessment Types
        </span>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 text-[10px] font-semibold text-navy border border-navy/20 rounded-lg px-2 py-1 hover:bg-navy/5"
        >
          <Plus className="w-3 h-3" /> Add Subject
        </button>
      </div>

      {showAdd && (
        <div className="flex gap-2">
          <select
            value={addingId}
            onChange={(e) => setAddingId(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-navy"
          >
            <option value="">Select subject…</option>
            {available.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={addSubject} className="bg-navy text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-navyMid">Add</button>
          <button onClick={() => { setShowAdd(false); setAddingId(''); }} className="text-gray-400 hover:text-gray-600 px-1"><X className="w-4 h-4" /></button>
        </div>
      )}

      {configs.length === 0 ? (
        <p className="text-[10px] text-gray-400 italic">
          No subjects configured — add subjects to define assessment components for this term.
        </p>
      ) : (
        <div className="space-y-3">
          {configs.map((cfg) => (
            <div key={cfg.subjectId} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-navy">{cfg.subject.name}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => saveConfig(cfg.subjectId)}
                    disabled={saving === cfg.subjectId}
                    className="text-[10px] font-semibold bg-navy text-white px-2.5 py-1 rounded-lg hover:bg-navyMid disabled:opacity-60"
                  >
                    {saving === cfg.subjectId ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => removeConfig(cfg.subjectId)}
                    className="text-coral hover:text-coral/80"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <ComponentEditor
                components={cfg.components}
                onChange={(comps) =>
                  setConfigs((prev) => prev.map((c) => c.subjectId === cfg.subjectId ? { ...c, components: comps } : c))
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Terms Editor ──────────────────────────────────────────────────────────────

function TermsEditor({ schemeId, initialTerms, exams, subjects, onSaved }: {
  schemeId: string;
  initialTerms: TermRow[];
  exams: ExamSched[];
  subjects: Subject[];
  onSaved: () => void;
}) {
  const [terms, setTerms] = useState<TermRow[]>(initialTerms);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const totalWeight = terms.reduce((s, t) => s + (t.weightPct || 0), 0);
  const weightOk = Math.abs(totalWeight - 100) <= 0.01;

  function addTerm() {
    const localId = `new_${Date.now()}`;
    setTerms((prev) => [...prev, {
      _localId: localId,
      sequence: prev.length + 1,
      name: '',
      type: 'UNIT_TEST',
      weightPct: 0,
      isBoardConducted: false,
      examScheduleId: null,
      subjectConfigs: [],
    }]);
  }

  function removeTerm(localId: string) {
    setTerms((prev) => prev.filter((t) => t._localId !== localId));
    setExpanded((prev) => { const s = new Set(prev); s.delete(localId); return s; });
  }

  function updateTerm(localId: string, field: keyof TermRow, value: unknown) {
    setTerms((prev) => prev.map((t) => t._localId === localId ? { ...t, [field]: value } : t));
  }

  function toggleExpand(localId: string) {
    setExpanded((prev) => {
      const s = new Set(prev);
      if (s.has(localId)) { s.delete(localId); } else { s.add(localId); }
      return s;
    });
  }

  async function saveTerms() {
    if (!weightOk) { toast.error(`Weights must sum to 100% (currently ${totalWeight}%)`); return; }
    if (terms.some((t) => !t.name.trim())) { toast.error('All term names are required'); return; }
    setSaving(true);
    try {
      const payload = terms.map((t, i) => ({
        id: t.id,
        name: t.name.trim(),
        type: t.type,
        weightPct: t.weightPct,
        sequence: i + 1,
        isBoardConducted: t.isBoardConducted,
        examScheduleId: t.examScheduleId || null,
      }));
      const res = await fetch(`/api/assessment-schemes/${schemeId}/terms`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terms: payload }),
      });
      if (!res.ok) { const b = await res.json(); throw new Error(b.error ?? 'Failed'); }
      toast.success('Terms saved — now configure subjects for each term');
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Weight indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-700">Assessment Terms</span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${weightOk ? 'bg-green/10 text-green' : 'bg-coral/10 text-coral'}`}>
            {totalWeight}% / 100%
          </span>
        </div>
        <button onClick={addTerm} className="flex items-center gap-1.5 text-xs font-semibold text-navy border border-navy/20 rounded-lg px-3 py-1.5 hover:bg-navy/5">
          <Plus className="w-3.5 h-3.5" /> Add Term
        </button>
      </div>

      {terms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
          <Layers className="w-8 h-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400 mb-3">No terms yet. Add your first assessment term.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {terms.map((term, idx) => {
            const isExpanded = expanded.has(term._localId);
            const hasSavedId = !!term.id;
            return (
              <div key={term._localId} className="border border-gray-100 rounded-xl overflow-hidden">
                {/* Term row */}
                <div className="grid grid-cols-[24px_1fr_120px_80px_100px_160px_32px_28px] gap-2 items-center px-3 py-2.5 bg-white">
                  <span className="text-xs font-bold text-gray-400 text-center">{idx + 1}</span>
                  <input
                    value={term.name}
                    onChange={(e) => updateTerm(term._localId, 'name', e.target.value)}
                    placeholder="e.g. Unit Test 1"
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                  <select
                    value={term.type}
                    onChange={(e) => updateTerm(term._localId, 'type', e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-navy"
                  >
                    {TERM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <div className="flex items-center gap-1">
                    <input
                      type="number" value={term.weightPct} min={0} max={100}
                      onChange={(e) => updateTerm(term._localId, 'weightPct', parseFloat(e.target.value) || 0)}
                      className="w-14 text-center border border-gray-200 rounded-lg px-1.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-navy"
                    />
                    <span className="text-[10px] text-gray-400">%</span>
                  </div>
                  <label className="flex items-center gap-1.5 text-[10px] text-gray-500 cursor-pointer">
                    <input
                      type="checkbox" checked={term.isBoardConducted}
                      onChange={(e) => updateTerm(term._localId, 'isBoardConducted', e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-navy"
                    />
                    Board
                  </label>
                  <select
                    value={term.examScheduleId ?? ''}
                    onChange={(e) => updateTerm(term._localId, 'examScheduleId', e.target.value || null)}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-navy"
                  >
                    <option value="">No linked exam</option>
                    {exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                  <button onClick={() => removeTerm(term._localId)} className="text-coral hover:text-coral/80 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {/* Expand subjects — only if term is saved */}
                  <button
                    onClick={() => hasSavedId && toggleExpand(term._localId)}
                    title={hasSavedId ? 'Configure subjects' : 'Save terms first to configure subjects'}
                    className={`p-1 rounded transition-colors ${hasSavedId ? 'text-navy hover:bg-navy/5' : 'text-gray-300 cursor-not-allowed'}`}
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Subject config panel */}
                {isExpanded && hasSavedId && (
                  <div className="px-4 pb-4 bg-gray-50/50 border-t border-gray-100">
                    <TermSubjectPanel
                      schemeId={schemeId}
                      termId={term.id!}
                      subjectConfigs={term.subjectConfigs}
                      subjects={subjects}
                      onSaved={(configs) =>
                        setTerms((prev) => prev.map((t) => t._localId === term._localId ? { ...t, subjectConfigs: configs } : t))
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Column header hint */}
      {terms.length > 0 && (
        <div className="grid grid-cols-[24px_1fr_120px_80px_100px_160px_32px_28px] gap-2 px-3">
          {['#', 'Name', 'Type', 'Weight', 'Board', 'Linked Exam', '', ''].map((h, i) => (
            <span key={i} className="text-[9px] text-gray-400 font-medium uppercase tracking-wide text-center first:text-left">{h}</span>
          ))}
        </div>
      )}

      {terms.length > 0 && !weightOk && (
        <p className="text-xs text-coral">Weights sum to {totalWeight}%. Must equal 100% before saving.</p>
      )}

      <div className="flex items-center gap-3 justify-end">
        <p className="text-[10px] text-gray-400">Save terms first, then expand each term to configure subject assessment types.</p>
        <button
          onClick={saveTerms} disabled={saving}
          className="flex items-center gap-2 bg-gold text-navy font-semibold text-sm px-5 py-2 rounded-lg hover:bg-gold/90 disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save Terms'}
        </button>
      </div>
    </div>
  );
}

// ─── Pass & Grading Tab ────────────────────────────────────────────────────────

function PassGradingTab({ schemeId, passCriteria: initialPC, gradingConfig: initialGC, onSaved }: {
  schemeId: string;
  passCriteria: PassCriteria;
  gradingConfig: GradingBand[];
  onSaved: () => void;
}) {
  const [pc, setPC] = useState<PassCriteria>(initialPC);
  const [grading, setGrading] = useState<GradingBand[]>(
    initialGC.length > 0 ? initialGC : [...DEFAULT_GRADING]
  );
  const [saving, setSaving] = useState(false);

  function addBand() { setGrading((p) => [...p, { label: '', minPct: 0, description: '' }]); }
  function removeBand(i: number) { setGrading((p) => p.filter((_, j) => j !== i)); }
  function updateBand(i: number, f: keyof GradingBand, v: string | number) {
    setGrading((p) => p.map((b, j) => j === i ? { ...b, [f]: v } : b));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/assessment-schemes/${schemeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passCriteria: pc, gradingConfig: grading }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Pass criteria & grading saved');
      onSaved();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Pass Criteria</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Per-Subject Pass %', key: 'perSubject', hint: 'Minimum per subject' },
            { label: 'Aggregate Pass %', key: 'aggregate', hint: 'Overall minimum' },
          ].map(({ label, key, hint }) => (
            <div key={key} className="bg-gray-50 rounded-xl p-4">
              <label className="block text-xs font-semibold text-gray-600 mb-2">{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={pc[key as keyof PassCriteria]}
                  onChange={(e) => setPC({ ...pc, [key]: parseFloat(e.target.value) || 0 })}
                  min={0} max={100}
                  className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center font-bold text-navy focus:outline-none focus:ring-2 focus:ring-navy/30"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">{hint}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Grading Scale</h3>
          <button onClick={addBand} className="flex items-center gap-1 text-xs font-semibold text-navy border border-navy/20 rounded-lg px-3 py-1.5 hover:bg-navy/5">
            <Plus className="w-3 h-3" /> Add Band
          </button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left text-xs uppercase tracking-wide text-gray-400 px-4 py-2.5 font-medium w-24">Grade</th>
                <th className="text-center text-xs uppercase tracking-wide text-gray-400 px-3 py-2.5 font-medium w-28">Min %</th>
                <th className="text-left text-xs uppercase tracking-wide text-gray-400 px-3 py-2.5 font-medium">Description</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {grading.map((band, i) => (
                <tr key={i} className="border-t border-gray-50">
                  <td className="px-4 py-2">
                    <input value={band.label} onChange={(e) => updateBand(i, 'label', e.target.value)} placeholder="A+"
                      className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-navy" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input type="number" value={band.minPct} onChange={(e) => updateBand(i, 'minPct', parseFloat(e.target.value) || 0)} min={0} max={100}
                      className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-navy" />
                  </td>
                  <td className="px-3 py-2">
                    <input value={band.description} onChange={(e) => updateBand(i, 'description', e.target.value)} placeholder="e.g. Outstanding"
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-navy" />
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => removeBand(i)} className="text-coral hover:text-coral/80"><X className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 bg-gold text-navy font-semibold text-sm px-5 py-2 rounded-lg hover:bg-gold/90 disabled:opacity-60">
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

// ─── Scheme Editor ─────────────────────────────────────────────────────────────

function SchemeEditor({ scheme, grades, exams, subjects, onRefresh, onClose }: {
  scheme: SchemeDetail;
  grades: Grade[];
  exams: ExamSched[];
  subjects: Subject[];
  onRefresh: () => void;
  onClose: () => void;
}) {
  type InnerTab = 'basic' | 'terms' | 'grading';
  const [innerTab, setInnerTab] = useState<InnerTab>('basic');
  const [name, setName] = useState(scheme.name);
  const [description, setDescription] = useState(scheme.description ?? '');
  const [appliedGradeIds, setAppliedGradeIds] = useState<string[]>(scheme.appliedGradeIds);
  const [savingBasic, setSavingBasic] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    setName(scheme.name);
    setDescription(scheme.description ?? '');
    setAppliedGradeIds(scheme.appliedGradeIds);
    setInnerTab('basic');
  }, [scheme.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleGrade(id: string) {
    setAppliedGradeIds((prev) => prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]);
  }

  async function saveBasic() {
    if (!name.trim()) { toast.error('Plan name required'); return; }
    setSavingBasic(true);
    try {
      const res = await fetch(`/api/assessment-schemes/${scheme.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description || null, appliedGradeIds }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Basic info saved');
      onRefresh();
    } catch { toast.error('Failed to save'); }
    finally { setSavingBasic(false); }
  }

  async function togglePublish() {
    setPublishing(true);
    try {
      const res = await fetch(`/api/assessment-schemes/${scheme.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !scheme.isPublished }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(scheme.isPublished ? 'Set to Draft' : 'Plan published!');
      onRefresh();
    } catch { toast.error('Failed'); }
    finally { setPublishing(false); }
  }

  const termRows: TermRow[] = scheme.terms.map((t) => ({
    _localId: t.id ?? `new_${Math.random()}`,
    id: t.id,
    sequence: t.sequence,
    name: t.name,
    type: t.type,
    weightPct: t.weightPct,
    isBoardConducted: t.isBoardConducted,
    examScheduleId: t.examScheduleId,
    subjectConfigs: t.subjectConfigs,
  }));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          <div>
            <h2 className="font-sora font-semibold text-navy text-sm">{scheme.name}</h2>
            <p className="text-[10px] text-gray-400">{scheme.academicYear.label}</p>
          </div>
        </div>
        <button onClick={togglePublish} disabled={publishing}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
            scheme.isPublished ? 'bg-green/10 text-green hover:bg-green/20' : 'bg-amber/10 text-amber hover:bg-amber/20'
          }`}>
          {scheme.isPublished ? <><CheckCircle2 className="w-3.5 h-3.5" /> Published</> : 'Draft — Publish'}
        </button>
      </div>

      {/* Inner tabs */}
      <div className="flex gap-0.5 bg-gray-100 rounded-xl p-1 w-fit mb-5 flex-shrink-0">
        {([
          { id: 'basic', label: 'Basic Info' },
          { id: 'terms', label: 'Terms & Subjects' },
          { id: 'grading', label: 'Pass & Grading' },
        ] as const).map((t) => (
          <button key={t.id} onClick={() => setInnerTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              innerTab === t.id ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {innerTab === 'basic' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Plan Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                placeholder="Describe the assessment structure…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">Applicable Classes</label>
              <div className="flex flex-wrap gap-2">
                {grades.map((g) => (
                  <button key={g.id} type="button" onClick={() => toggleGrade(g.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      appliedGradeIds.includes(g.id)
                        ? 'bg-navy text-white border-navy'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-navy/50'
                    }`}>{g.name}</button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">
                {appliedGradeIds.length === 0 ? 'Applies to all classes' : `${appliedGradeIds.length} selected`}
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={saveBasic} disabled={savingBasic}
                className="flex items-center gap-2 bg-gold text-navy font-semibold text-sm px-5 py-2 rounded-lg hover:bg-gold/90 disabled:opacity-60">
                <Save className="w-4 h-4" />
                {savingBasic ? 'Saving…' : 'Save Basic Info'}
              </button>
            </div>
          </div>
        )}

        {innerTab === 'terms' && (
          <TermsEditor
            key={`terms-${scheme.id}`}
            schemeId={scheme.id}
            initialTerms={termRows}
            exams={exams}
            subjects={subjects}
            onSaved={onRefresh}
          />
        )}

        {innerTab === 'grading' && (
          <PassGradingTab
            key={`grading-${scheme.id}`}
            schemeId={scheme.id}
            passCriteria={scheme.passCriteria ?? { perSubject: 33, aggregate: 35 }}
            gradingConfig={Array.isArray(scheme.gradingConfig) ? scheme.gradingConfig : []}
            onSaved={onRefresh}
          />
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function AssessmentPlansTab({ grades, academicYears, exams }: {
  grades: Grade[];
  academicYears: AcademicYear[];
  exams: ExamSched[];
}) {
  const [schemes, setSchemes] = useState<SchemeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SchemeDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const fetchSchemes = useCallback(async () => {
    try {
      const res = await fetch('/api/assessment-schemes');
      if (!res.ok) throw new Error('Failed');
      const data: SchemeListItem[] = await res.json();
      setSchemes(data);
    } catch { toast.error('Failed to load assessment plans'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSchemes(); }, [fetchSchemes]);

  useEffect(() => {
    fetch('/api/hr/subjects')
      .then((r) => r.json())
      .then((d: { subjects: Subject[] }) => setSubjects(d.subjects ?? []))
      .catch(() => {});
  }, []);

  async function fetchDetail(id: string) {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/assessment-schemes/${id}`);
      if (!res.ok) throw new Error('Failed');
      const data: SchemeDetail = await res.json();
      setDetail(data);
    } catch { toast.error('Failed to load plan details'); }
    finally { setLoadingDetail(false); }
  }

  function handleSelect(id: string) { setSelectedId(id); fetchDetail(id); }
  function handleRefresh() { fetchSchemes(); if (selectedId) fetchDetail(selectedId); }
  function handleClose() { setSelectedId(null); setDetail(null); }

  async function deleteScheme(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/assessment-schemes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setSchemes((prev) => prev.filter((s) => s.id !== id));
      if (selectedId === id) handleClose();
      toast.success('Plan deleted');
    } catch { toast.error('Failed to delete plan'); }
  }

  return (
    <div className="flex gap-5" style={{ minHeight: '600px' }}>
      {/* Left: list */}
      <div className="w-72 flex-shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="font-sora font-semibold text-navy text-sm">Plans</span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowWizard(true)}
              className="flex items-center gap-1 text-xs font-semibold bg-gold text-navy px-2.5 py-1.5 rounded-lg hover:bg-gold/90">
              <Sparkles className="w-3 h-3" /> AI Setup
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1 text-xs font-semibold bg-navy text-white px-2.5 py-1.5 rounded-lg hover:bg-navyMid">
              <Plus className="w-3 h-3" /> New
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        ) : schemes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 rounded-xl flex-1">
            <BookOpen className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-xs text-gray-400 mb-3">No assessment plans yet</p>
            <button onClick={() => setShowCreate(true)} className="text-xs font-semibold bg-gold text-navy px-3 py-1.5 rounded-lg hover:bg-gold/90">Create First Plan</button>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto flex-1">
            {schemes.map((s) => (
              <button key={s.id} onClick={() => handleSelect(s.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedId === s.id ? 'border-navy bg-navy/5 ring-1 ring-navy/20' : 'border-gray-100 bg-white hover:border-navy/20 hover:shadow-sm'
                }`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-sora font-semibold text-navy text-xs leading-snug flex-1">{s.name}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${s.isPublished ? 'bg-green/10 text-green' : 'bg-amber/10 text-amber'}`}>
                    {s.isPublished ? 'Live' : 'Draft'}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mb-2">{s.academicYear.label}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{s.terms.length} term{s.terms.length !== 1 ? 's' : ''}</span>
                  <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{s.appliedGradeIds.length > 0 ? `${s.appliedGradeIds.length} classes` : 'All classes'}</span>
                </div>
                {s.terms.length > 0 && (
                  <p className="text-[9px] text-gray-400 mt-1.5 truncate">{s.terms.map((t) => t.name).join(' · ')}</p>
                )}
                <div className="flex justify-end mt-2 pt-2 border-t border-gray-100">
                  <button onClick={(e) => { e.stopPropagation(); deleteScheme(s.id, s.name); }} className="text-coral hover:text-coral/80 p-0.5">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: editor */}
      <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col">
        {!selectedId ? (
          <div className="flex flex-col items-center justify-center flex-1 py-20 text-center">
            <Settings className="w-12 h-12 text-gray-200 mb-3" />
            <h3 className="font-sora font-semibold text-gray-400 text-sm mb-1">Select a Plan to Edit</h3>
            <p className="text-xs text-gray-300 mb-4">Choose a plan from the left or create a new one</p>
            <button onClick={() => setShowCreate(true)} className="text-xs font-semibold bg-gold text-navy px-4 py-2 rounded-lg hover:bg-gold/90">
              <Plus className="w-3.5 h-3.5 inline mr-1" />New Plan
            </button>
          </div>
        ) : loadingDetail ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-64 rounded-lg" />
            <Skeleton className="h-4 w-40 rounded" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : detail ? (
          <SchemeEditor
            scheme={detail}
            grades={grades}
            exams={exams}
            subjects={subjects}
            onRefresh={handleRefresh}
            onClose={handleClose}
          />
        ) : null}
      </div>

      <CreateSchemeModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(s) => setSchemes((prev) => [s, ...prev])}
        academicYears={academicYears}
      />

      {showWizard && (
        <ExamSetupWizard
          grades={grades}
          academicYears={academicYears}
          onClose={() => setShowWizard(false)}
          onApplied={(schemeId, schemeName) => {
            fetchSchemes();
            setSelectedId(schemeId);
            fetchDetail(schemeId);
          }}
        />
      )}
    </div>
  );
}

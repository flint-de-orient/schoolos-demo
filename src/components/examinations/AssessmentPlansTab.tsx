'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Plus, Trash2, Save, BookOpen, CheckCircle2,
  X, Settings, Layers,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Types ─────────────────────────────────────────────────────────────────────

type ComponentDef = { name: string; maxMarks: number; passMarks: number };
type GradingBand = { label: string; minPct: number; description: string };
type PassCriteria = { perSubject: number; aggregate: number };

interface SchemeListItem {
  id: string;
  name: string;
  description: string | null;
  academicYear: { id: string; label: string };
  appliedGradeIds: string[];
  isPublished: boolean;
  terms: { id: string; name: string; weightPct: number }[];
  _count: { subjectPatterns: number };
}

interface SchemeDetail extends Omit<SchemeListItem, 'terms'> {
  gradingConfig: GradingBand[];
  passCriteria: PassCriteria;
  terms: {
    id: string;
    sequence: number;
    name: string;
    type: string;
    weightPct: number;
    isBoardConducted: boolean;
    examScheduleId: string | null;
  }[];
  subjectPatterns: {
    id: string;
    subjectId: string | null;
    subject: { id: string; name: string } | null;
    components: ComponentDef[];
  }[];
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

const COMPONENT_SUGGESTIONS = ['Theory', 'Practical', 'Viva', 'Project', 'Oral', 'Internal', 'Assignment'];

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
      toast.error(e instanceof Error ? e.message : 'Failed to create plan');
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
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 bg-gold text-navy text-sm font-semibold py-2 rounded-lg hover:bg-gold/90 disabled:opacity-60"
          >
            {saving ? 'Creating…' : 'Create Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Terms Editor ──────────────────────────────────────────────────────────────

function TermsEditor({ schemeId, initialTerms, exams, onSaved }: {
  schemeId: string;
  initialTerms: TermRow[];
  exams: ExamSched[];
  onSaved: () => void;
}) {
  const [terms, setTerms] = useState<TermRow[]>(initialTerms);
  const [saving, setSaving] = useState(false);

  const totalWeight = terms.reduce((s, t) => s + (t.weightPct || 0), 0);
  const weightOk = Math.abs(totalWeight - 100) <= 0.01;

  function addTerm() {
    setTerms((prev) => [
      ...prev,
      {
        _localId: `new_${Date.now()}`,
        sequence: prev.length + 1,
        name: '',
        type: 'UNIT_TEST',
        weightPct: 0,
        isBoardConducted: false,
        examScheduleId: null,
      },
    ]);
  }

  function removeTerm(localId: string) {
    setTerms((prev) => prev.filter((t) => t._localId !== localId));
  }

  function updateTerm(localId: string, field: keyof TermRow, value: unknown) {
    setTerms((prev) => prev.map((t) => (t._localId === localId ? { ...t, [field]: value } : t)));
  }

  async function saveTerms() {
    if (!weightOk) {
      toast.error(`Weights must sum to 100% (currently ${totalWeight}%)`);
      return;
    }
    const emptyNames = terms.filter((t) => !t.name.trim());
    if (emptyNames.length > 0) { toast.error('All term names are required'); return; }

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
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Failed');
      }
      toast.success('Terms saved');
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save terms');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-700">Assessment Terms</span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            weightOk ? 'bg-green/10 text-green' : 'bg-coral/10 text-coral'
          }`}>
            {totalWeight}% / 100%
          </span>
        </div>
        <button
          onClick={addTerm}
          className="flex items-center gap-1.5 text-xs font-semibold text-navy border border-navy/20 rounded-lg px-3 py-1.5 hover:bg-navy/5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Term
        </button>
      </div>

      {terms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
          <Layers className="w-8 h-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400 mb-3">No terms yet. Click &ldquo;Add Term&rdquo; to define your assessment structure.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left text-xs uppercase tracking-wide text-gray-400 px-3 py-2.5 font-medium w-8">#</th>
                <th className="text-left text-xs uppercase tracking-wide text-gray-400 px-3 py-2.5 font-medium min-w-[150px]">Name</th>
                <th className="text-left text-xs uppercase tracking-wide text-gray-400 px-3 py-2.5 font-medium min-w-[130px]">Type</th>
                <th className="text-center text-xs uppercase tracking-wide text-gray-400 px-3 py-2.5 font-medium w-24">Weight %</th>
                <th className="text-center text-xs uppercase tracking-wide text-gray-400 px-3 py-2.5 font-medium w-24">Board</th>
                <th className="text-left text-xs uppercase tracking-wide text-gray-400 px-3 py-2.5 font-medium min-w-[160px]">Linked Exam</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {terms.map((term, idx) => (
                <tr key={term._localId} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-3 py-2 text-xs font-bold text-gray-400">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <input
                      value={term.name}
                      onChange={(e) => updateTerm(term._localId, 'name', e.target.value)}
                      placeholder="e.g. Unit Test 1"
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-navy"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={term.type}
                      onChange={(e) => updateTerm(term._localId, 'type', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-navy"
                    >
                      {TERM_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="number"
                      value={term.weightPct}
                      onChange={(e) => updateTerm(term._localId, 'weightPct', parseFloat(e.target.value) || 0)}
                      min={0}
                      max={100}
                      className="w-16 text-center border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-navy"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={term.isBoardConducted}
                      onChange={(e) => updateTerm(term._localId, 'isBoardConducted', e.target.checked)}
                      className="w-4 h-4 rounded accent-navy"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={term.examScheduleId ?? ''}
                      onChange={(e) => updateTerm(term._localId, 'examScheduleId', e.target.value || null)}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-navy"
                    >
                      <option value="">None</option>
                      {exams.map((e) => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => removeTerm(term._localId)} className="text-coral hover:text-coral/80 p-1 rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {terms.length > 0 && !weightOk && (
        <p className="text-xs text-coral">
          Weights currently sum to {totalWeight}%. Adjust to reach exactly 100% before saving.
        </p>
      )}

      <div className="flex justify-end">
        <button
          onClick={saveTerms}
          disabled={saving}
          className="flex items-center gap-2 bg-gold text-navy font-semibold text-sm px-5 py-2 rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save Terms'}
        </button>
      </div>
    </div>
  );
}

// ─── Pattern Editor ─────────────────────────────────────────────────────────────

function PatternEditor({ label, components, onChange }: {
  label: string;
  components: ComponentDef[];
  onChange: (comps: ComponentDef[]) => void;
}) {
  function addComponent() {
    onChange([...components, { name: 'Theory', maxMarks: 100, passMarks: 33 }]);
  }
  function removeComponent(idx: number) {
    onChange(components.filter((_, i) => i !== idx));
  }
  function updateComponent(idx: number, field: keyof ComponentDef, value: string | number) {
    onChange(components.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  }

  return (
    <div className="border border-gray-100 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500">{label}</span>
        <button
          onClick={addComponent}
          className="text-xs font-semibold text-teal border border-teal/20 rounded-lg px-2.5 py-1 hover:bg-teal/5 transition-colors flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>

      {components.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-2">No components — defaults to Theory 100%</p>
      ) : (
        <>
          <div className="grid grid-cols-[1fr_72px_72px_28px] gap-1.5 px-0.5">
            <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wide">Component</span>
            <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wide text-center">Max Marks</span>
            <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wide text-center">Pass Marks</span>
            <span></span>
          </div>
          {components.map((comp, i) => (
            <div key={i} className="grid grid-cols-[1fr_72px_72px_28px] gap-1.5 items-center">
              <select
                value={comp.name}
                onChange={(e) => updateComponent(i, 'name', e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-navy"
              >
                {COMPONENT_SUGGESTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <input
                type="number"
                value={comp.maxMarks}
                onChange={(e) => updateComponent(i, 'maxMarks', parseInt(e.target.value) || 0)}
                min={0}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-navy"
              />
              <input
                type="number"
                value={comp.passMarks}
                onChange={(e) => updateComponent(i, 'passMarks', parseInt(e.target.value) || 0)}
                min={0}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-navy"
              />
              <button onClick={() => removeComponent(i)} className="text-coral hover:text-coral/80 flex items-center justify-center">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Subject Patterns Tab ──────────────────────────────────────────────────────

type LocalPattern = {
  id?: string;
  subjectId: string | null;
  subject: { id: string; name: string } | null;
  components: ComponentDef[];
};

function SubjectPatternsTab({ schemeId, patterns: initialPatterns, subjects }: {
  schemeId: string;
  patterns: SchemeDetail['subjectPatterns'];
  subjects: Subject[];
}) {
  const [patterns, setPatterns] = useState<LocalPattern[]>(initialPatterns);
  const [saving, setSaving] = useState<string | null>(null);
  const [addingSubject, setAddingSubject] = useState(false);
  const [newSubjectId, setNewSubjectId] = useState('');

  const defaultEntry = patterns.find((p) => p.subjectId === null);
  const defaultComponents = defaultEntry?.components ?? [];
  const subjectOverrides = patterns.filter((p) => p.subjectId !== null);
  const usedSubjectIds = new Set(subjectOverrides.map((p) => p.subjectId));
  const availableSubjects = subjects.filter((s) => !usedSubjectIds.has(s.id));

  async function savePattern(subjectId: string | null, components: ComponentDef[]) {
    const key = subjectId ?? 'default';
    setSaving(key);
    try {
      const res = await fetch(`/api/assessment-schemes/${schemeId}/subject-patterns`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, components }),
      });
      if (!res.ok) throw new Error('Failed');
      const saved: LocalPattern = await res.json();
      setPatterns((prev) => {
        const exists = prev.some((p) => p.subjectId === subjectId);
        if (exists) return prev.map((p) => (p.subjectId === subjectId ? { ...p, ...saved } : p));
        return [...prev, saved];
      });
      toast.success(subjectId ? 'Subject pattern saved' : 'Default pattern saved');
    } catch {
      toast.error('Failed to save pattern');
    } finally {
      setSaving(null);
    }
  }

  async function deletePattern(patternId: string | undefined, subjectId: string | null) {
    if (!patternId) {
      setPatterns((prev) => prev.filter((p) => p.subjectId !== subjectId));
      return;
    }
    try {
      await fetch(`/api/assessment-schemes/${schemeId}/subject-patterns?patternId=${patternId}`, { method: 'DELETE' });
      setPatterns((prev) => prev.filter((p) => p.id !== patternId));
      toast.success('Override removed');
    } catch {
      toast.error('Failed to remove override');
    }
  }

  function addOverride() {
    if (!newSubjectId) { toast.error('Select a subject first'); return; }
    const sub = subjects.find((s) => s.id === newSubjectId);
    if (!sub) return;
    setPatterns((prev) => [...prev, { subjectId: newSubjectId, subject: sub, components: [...defaultComponents] }]);
    setNewSubjectId('');
    setAddingSubject(false);
  }

  return (
    <div className="space-y-5">
      {/* Default Pattern */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Default Pattern — all subjects</h3>
        <PatternEditor
          label="Component Split"
          components={defaultComponents}
          onChange={(comps) =>
            setPatterns((prev) => {
              const exists = prev.some((p) => p.subjectId === null);
              if (exists) return prev.map((p) => (p.subjectId === null ? { ...p, components: comps } : p));
              return [...prev, { subjectId: null, subject: null, components: comps }];
            })
          }
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={() => {
              const cur = patterns.find((p) => p.subjectId === null);
              savePattern(null, cur?.components ?? []);
            }}
            disabled={saving === 'default'}
            className="text-xs font-semibold bg-navy text-white px-3 py-1.5 rounded-lg hover:bg-navyMid transition-colors disabled:opacity-60"
          >
            {saving === 'default' ? 'Saving…' : 'Save Default'}
          </button>
        </div>
      </div>

      {/* Subject Overrides */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject-Specific Overrides</h3>
          <button
            onClick={() => setAddingSubject(true)}
            className="text-xs font-semibold text-purple border border-purple/20 rounded-lg px-3 py-1.5 hover:bg-purple/5 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add Override
          </button>
        </div>

        {addingSubject && (
          <div className="flex gap-2 mb-3 p-3 bg-gray-50 rounded-xl">
            <select
              value={newSubjectId}
              onChange={(e) => setNewSubjectId(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-navy"
            >
              <option value="">Select subject…</option>
              {availableSubjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button onClick={addOverride} className="bg-navy text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-navyMid">
              Add
            </button>
            <button onClick={() => { setAddingSubject(false); setNewSubjectId(''); }} className="text-gray-400 hover:text-gray-600 px-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {subjectOverrides.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
            <p className="text-xs text-gray-400">No subject overrides. All subjects use the default pattern.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {subjectOverrides.map((p) => {
              const current = patterns.find((lp) => lp.subjectId === p.subjectId);
              return (
                <div key={p.subjectId} className="bg-gray-50/70 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-navy">{p.subject?.name}</span>
                    <button
                      onClick={() => deletePattern(p.id, p.subjectId)}
                      className="text-[10px] text-coral hover:text-coral/80 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  </div>
                  <PatternEditor
                    label={p.subject?.name ?? ''}
                    components={current?.components ?? []}
                    onChange={(comps) =>
                      setPatterns((prev) => prev.map((lp) => lp.subjectId === p.subjectId ? { ...lp, components: comps } : lp))
                    }
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => {
                        const cur = patterns.find((lp) => lp.subjectId === p.subjectId);
                        if (p.subjectId) savePattern(p.subjectId, cur?.components ?? []);
                      }}
                      disabled={saving === p.subjectId}
                      className="text-xs font-semibold bg-navy text-white px-3 py-1.5 rounded-lg hover:bg-navyMid disabled:opacity-60"
                    >
                      {saving === p.subjectId ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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

  function addBand() {
    setGrading((prev) => [...prev, { label: '', minPct: 0, description: '' }]);
  }
  function removeBand(idx: number) {
    setGrading((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateBand(idx: number, field: keyof GradingBand, value: string | number) {
    setGrading((prev) => prev.map((b, i) => (i === idx ? { ...b, [field]: value } : b)));
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
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Pass Criteria */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Pass Criteria</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <label className="block text-xs font-semibold text-gray-600 mb-2">Per-Subject Pass %</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={pc.perSubject}
                onChange={(e) => setPC({ ...pc, perSubject: parseFloat(e.target.value) || 0 })}
                min={0} max={100}
                className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center font-bold text-navy focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Minimum score required in each subject</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <label className="block text-xs font-semibold text-gray-600 mb-2">Aggregate Pass %</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={pc.aggregate}
                onChange={(e) => setPC({ ...pc, aggregate: parseFloat(e.target.value) || 0 })}
                min={0} max={100}
                className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center font-bold text-navy focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Overall percentage required to pass</p>
          </div>
        </div>
      </div>

      {/* Grading Scale */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Grading Scale</h3>
          <button
            onClick={addBand}
            className="text-xs font-semibold text-navy border border-navy/20 rounded-lg px-3 py-1.5 hover:bg-navy/5 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add Grade Band
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
              {grading.map((band, idx) => (
                <tr key={idx} className="border-t border-gray-50">
                  <td className="px-4 py-2">
                    <input
                      value={band.label}
                      onChange={(e) => updateBand(idx, 'label', e.target.value)}
                      placeholder="A+"
                      className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-navy"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="number"
                      value={band.minPct}
                      onChange={(e) => updateBand(idx, 'minPct', parseFloat(e.target.value) || 0)}
                      min={0} max={100}
                      className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-navy"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={band.description}
                      onChange={(e) => updateBand(idx, 'description', e.target.value)}
                      placeholder="e.g. Outstanding"
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-navy"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => removeBand(idx)} className="text-coral hover:text-coral/80">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-gold text-navy font-semibold text-sm px-5 py-2 rounded-lg hover:bg-gold/90 disabled:opacity-60"
        >
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
  type InnerTab = 'basic' | 'terms' | 'patterns' | 'grading';
  const [innerTab, setInnerTab] = useState<InnerTab>('basic');
  const [name, setName] = useState(scheme.name);
  const [description, setDescription] = useState(scheme.description ?? '');
  const [appliedGradeIds, setAppliedGradeIds] = useState<string[]>(scheme.appliedGradeIds);
  const [savingBasic, setSavingBasic] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Reset local state when scheme changes
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
    if (!name.trim()) { toast.error('Plan name is required'); return; }
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
    } catch {
      toast.error('Failed to save');
    } finally {
      setSavingBasic(false);
    }
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
      toast.success(scheme.isPublished ? 'Plan set to Draft' : 'Plan published!');
      onRefresh();
    } catch {
      toast.error('Failed to update publish status');
    } finally {
      setPublishing(false);
    }
  }

  const termRows: TermRow[] = scheme.terms.map((t) => ({
    _localId: t.id,
    id: t.id,
    sequence: t.sequence,
    name: t.name,
    type: t.type,
    weightPct: t.weightPct,
    isBoardConducted: t.isBoardConducted,
    examScheduleId: t.examScheduleId,
  }));

  const INNER_TABS: { id: InnerTab; label: string }[] = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'terms', label: 'Terms' },
    { id: 'patterns', label: 'Components' },
    { id: 'grading', label: 'Pass & Grading' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
          <div>
            <h2 className="font-sora font-semibold text-navy text-sm leading-tight">{scheme.name}</h2>
            <p className="text-[10px] text-gray-400">{scheme.academicYear.label}</p>
          </div>
        </div>
        <button
          onClick={togglePublish}
          disabled={publishing}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
            scheme.isPublished
              ? 'bg-green/10 text-green hover:bg-green/20'
              : 'bg-amber/10 text-amber hover:bg-amber/20'
          }`}
        >
          {scheme.isPublished ? (
            <><CheckCircle2 className="w-3.5 h-3.5" /> Published</>
          ) : (
            'Draft — Click to Publish'
          )}
        </button>
      </div>

      {/* Inner tab bar */}
      <div className="flex gap-0.5 bg-gray-100 rounded-xl p-1 w-fit mb-5 flex-shrink-0">
        {INNER_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setInnerTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              innerTab === t.id ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {innerTab === 'basic' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Plan Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe the assessment structure…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">Applicable Classes</label>
              <div className="flex flex-wrap gap-2">
                {grades.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGrade(g.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      appliedGradeIds.includes(g.id)
                        ? 'bg-navy text-white border-navy'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-navy/50'
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">
                {appliedGradeIds.length === 0
                  ? 'No classes selected — plan applies to all classes'
                  : `Applies to ${appliedGradeIds.length} selected class${appliedGradeIds.length > 1 ? 'es' : ''}`}
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={saveBasic}
                disabled={savingBasic}
                className="flex items-center gap-2 bg-gold text-navy font-semibold text-sm px-5 py-2 rounded-lg hover:bg-gold/90 disabled:opacity-60"
              >
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
            onSaved={onRefresh}
          />
        )}

        {innerTab === 'patterns' && (
          <SubjectPatternsTab
            key={`patterns-${scheme.id}`}
            schemeId={scheme.id}
            patterns={scheme.subjectPatterns}
            subjects={subjects}
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
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const fetchSchemes = useCallback(async () => {
    try {
      const res = await fetch('/api/assessment-schemes');
      if (!res.ok) throw new Error('Failed');
      const data: SchemeListItem[] = await res.json();
      setSchemes(data);
    } catch {
      toast.error('Failed to load assessment plans');
    } finally {
      setLoading(false);
    }
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
    } catch {
      toast.error('Failed to load plan details');
    } finally {
      setLoadingDetail(false);
    }
  }

  function handleSelect(id: string) {
    setSelectedId(id);
    fetchDetail(id);
  }

  function handleRefresh() {
    fetchSchemes();
    if (selectedId) fetchDetail(selectedId);
  }

  function handleClose() {
    setSelectedId(null);
    setDetail(null);
  }

  async function deleteScheme(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/assessment-schemes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setSchemes((prev) => prev.filter((s) => s.id !== id));
      if (selectedId === id) { setSelectedId(null); setDetail(null); }
      toast.success('Plan deleted');
    } catch {
      toast.error('Failed to delete plan');
    }
  }

  return (
    <div className="flex gap-5" style={{ minHeight: '600px' }}>
      {/* Left: scheme list */}
      <div className="w-72 flex-shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="font-sora font-semibold text-navy text-sm">Plans</span>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-xs font-semibold bg-navy text-white px-3 py-1.5 rounded-lg hover:bg-navyMid transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : schemes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 rounded-xl flex-1">
            <BookOpen className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-xs text-gray-400 mb-3">No assessment plans yet</p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-xs font-semibold bg-gold text-navy px-3 py-1.5 rounded-lg hover:bg-gold/90"
            >
              Create First Plan
            </button>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto flex-1">
            {schemes.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelect(s.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedId === s.id
                    ? 'border-navy bg-navy/5 ring-1 ring-navy/20'
                    : 'border-gray-100 bg-white hover:border-navy/20 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-sora font-semibold text-navy text-xs leading-snug flex-1">{s.name}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    s.isPublished ? 'bg-green/10 text-green' : 'bg-amber/10 text-amber'
                  }`}>
                    {s.isPublished ? 'Live' : 'Draft'}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mb-2">{s.academicYear.label}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                    {s.terms.length} term{s.terms.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                    {s.appliedGradeIds.length > 0 ? `${s.appliedGradeIds.length} classes` : 'All classes'}
                  </span>
                </div>
                {s.terms.length > 0 && (
                  <p className="text-[9px] text-gray-400 mt-1.5 truncate">
                    {s.terms.map((t) => t.name).join(' · ')}
                  </p>
                )}
                <div className="flex justify-end mt-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteScheme(s.id, s.name); }}
                    className="text-coral hover:text-coral/80 p-0.5"
                  >
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
            <p className="text-xs text-gray-300 mb-4">Choose an assessment plan from the left, or create a new one</p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-xs font-semibold bg-gold text-navy px-4 py-2 rounded-lg hover:bg-gold/90"
            >
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
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  X, Sparkles, ChevronDown, ChevronUp, Check, Loader2,
  BookOpen, GraduationCap, AlertCircle, Layers,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Grade { id: string; name: string; displayOrder: number }
interface AcademicYear { id: string; label: string; isCurrent: boolean }

type ComponentDef = { name: string; maxMarks: number; passMarks: number };
interface GeneratedSubjectConfig {
  subjectId: string;
  subjectName: string;
  components: ComponentDef[];
}
interface GeneratedTerm {
  sequence: number;
  name: string;
  type: string;
  weightPct: number;
  isBoardConducted: boolean;
  subjectConfigs: GeneratedSubjectConfig[];
}
interface GeneratedScheme {
  schemeName: string;
  description: string;
  passCriteria: { perSubject: number; aggregate: number };
  gradingBands: { label: string; minPct: number; description: string }[];
  terms: GeneratedTerm[];
}

type Step = 'configure' | 'generating' | 'preview';

const TERM_TYPE_LABELS: Record<string, string> = {
  UNIT_TEST: 'Unit Test',
  HALF_YEARLY: 'Half-Yearly',
  ANNUAL: 'Annual',
  PRE_BOARD: 'Pre-Board',
  BOARD_EXAM: 'Board Exam',
  PROJECT: 'Project/Portfolio',
  INTERNAL: 'Internal Assessment',
};

// ─── Component ─────────────────────────────────────────────────────────────────

export function ExamSetupWizard({
  grades,
  academicYears,
  onClose,
  onApplied,
}: {
  grades: Grade[];
  academicYears: AcademicYear[];
  onClose: () => void;
  onApplied: (schemeId: string, schemeName: string) => void;
}) {
  const [step, setStep] = useState<Step>('configure');
  const [selectedGradeIds, setSelectedGradeIds] = useState<string[]>([]);
  const [ayId, setAyId] = useState('');
  const [generated, setGenerated] = useState<GeneratedScheme | null>(null);
  const [generatingMsg, setGeneratingMsg] = useState('');
  const [applying, setApplying] = useState(false);
  const [expandedTerms, setExpandedTerms] = useState<Set<number>>(new Set([1]));

  useEffect(() => {
    const cur = academicYears.find((y) => y.isCurrent);
    if (cur) setAyId(cur.id);
  }, [academicYears]);

  function toggleGrade(id: string) {
    setSelectedGradeIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }

  function toggleTerm(seq: number) {
    setExpandedTerms((prev) => {
      const s = new Set(prev);
      if (s.has(seq)) { s.delete(seq); } else { s.add(seq); }
      return s;
    });
  }

  async function generate() {
    if (!selectedGradeIds.length) { toast.error('Select at least one class'); return; }
    if (!ayId) { toast.error('Select an academic year'); return; }

    setStep('generating');
    const msgs = [
      'Reading board curriculum norms…',
      'Analysing subject-wise evaluation patterns…',
      'Determining optimal term structure…',
      'Assigning component weights per subject…',
      'Finalising assessment scheme…',
    ];
    let i = 0;
    setGeneratingMsg(msgs[0]);
    const interval = setInterval(() => {
      i = Math.min(i + 1, msgs.length - 1);
      setGeneratingMsg(msgs[i]);
    }, 1800);

    try {
      const res = await fetch('/api/ai/exam-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gradeIds: selectedGradeIds, academicYearId: ayId }),
      });
      const data = await res.json();
      clearInterval(interval);
      if (!res.ok) {
        toast.error(data.error ?? 'Generation failed');
        setStep('configure');
        return;
      }
      setGenerated(data.scheme);
      setExpandedTerms(new Set([1]));
      setStep('preview');
    } catch {
      clearInterval(interval);
      toast.error('Generation failed. Please try again.');
      setStep('configure');
    }
  }

  async function apply() {
    if (!generated) return;
    setApplying(true);
    try {
      const res = await fetch('/api/ai/exam-setup/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheme: generated, gradeIds: selectedGradeIds, academicYearId: ayId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Failed to save'); return; }
      toast.success(`"${data.schemeName}" created successfully`);
      onApplied(data.schemeId, data.schemeName);
      onClose();
    } catch {
      toast.error('Failed to save scheme');
    } finally {
      setApplying(false);
    }
  }

  const totalWeight = generated?.terms.reduce((s, t) => s + t.weightPct, 0) ?? 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-navy to-navyMid flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-gold" />
            </div>
            <div>
              <h2 className="font-sora font-semibold text-white text-sm">AI Exam Setup</h2>
              <p className="text-[11px] text-ice/70">
                {step === 'configure' && 'Select classes → AI generates the full scheme'}
                {step === 'generating' && 'Generating board-optimised assessment plan…'}
                {step === 'preview' && 'Review the generated scheme before saving'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Step indicators ── */}
        <div className="flex items-center gap-0 border-b border-gray-100 bg-gray-50 px-6 py-2.5 flex-shrink-0">
          {(['configure', 'generating', 'preview'] as Step[]).map((s, idx) => (
            <div key={s} className="flex items-center gap-0">
              <div className={`flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-full transition-colors ${
                step === s ? 'bg-navy/10 text-navy' : step === 'preview' && s !== 'preview' ? 'text-green' : 'text-gray-400'
              }`}>
                {step === 'preview' && s !== 'preview' ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step === s ? 'bg-navy text-white' : 'bg-gray-200 text-gray-500'
                  }`}>{idx + 1}</span>
                )}
                <span className="capitalize">{s === 'generating' ? 'Generating' : s === 'configure' ? 'Configure' : 'Preview'}</span>
              </div>
              {idx < 2 && <div className="w-6 h-px bg-gray-200 mx-1" />}
            </div>
          ))}
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Step 1: Configure */}
          {step === 'configure' && (
            <div className="p-6 space-y-6">
              {/* Academic year */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">
                  Academic Year
                </label>
                <select
                  value={ayId}
                  onChange={(e) => setAyId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
                >
                  <option value="">Select academic year…</option>
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.label}{ay.isCurrent ? ' (Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Classes */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">
                  Apply to Classes <span className="text-gray-400 font-normal normal-case">(select all that share the same pattern)</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {grades.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => toggleGrade(g.id)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        selectedGradeIds.includes(g.id)
                          ? 'border-navy bg-navy/5 text-navy ring-1 ring-navy/20'
                          : 'border-gray-100 bg-white text-gray-600 hover:border-navy/20'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        selectedGradeIds.includes(g.id) ? 'bg-navy border-navy' : 'border-gray-300'
                      }`}>
                        {selectedGradeIds.includes(g.id) && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className="truncate">{g.name}</span>
                    </button>
                  ))}
                </div>
                {selectedGradeIds.length > 0 && (
                  <p className="text-[11px] text-teal mt-2">
                    {selectedGradeIds.length} class{selectedGradeIds.length !== 1 ? 'es' : ''} selected
                  </p>
                )}
              </div>

              {/* Info box */}
              <div className="flex items-start gap-3 bg-teal/5 border border-teal/20 rounded-xl p-4">
                <Sparkles className="w-4 h-4 text-teal flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-teal mb-1">What AI generates</p>
                  <ul className="text-xs text-teal/80 space-y-0.5 list-disc list-inside">
                    <li>Term structure with correct weightages per your board</li>
                    <li>Per-subject component breakdown (Theory / Practical / Oral / Project)</li>
                    <li>Max marks, pass marks, grading bands — all board-aligned</li>
                    <li>Pass criteria following board norms</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Generating */}
          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-24 gap-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-navy/5 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-navy/30 animate-pulse" />
                </div>
                <Loader2 className="w-20 h-20 text-gold absolute -inset-2 animate-spin opacity-60" />
              </div>
              <div className="text-center">
                <p className="font-sora font-semibold text-navy text-sm mb-1">{generatingMsg}</p>
                <p className="text-xs text-gray-400">Applying board curriculum norms to your subjects</p>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && generated && (
            <div className="p-6 space-y-5">
              {/* Scheme summary */}
              <div className="bg-navy/3 border border-navy/10 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-sora font-semibold text-navy text-sm leading-snug">{generated.schemeName}</h3>
                  <span className="text-[10px] bg-teal/10 text-teal font-bold px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />AI
                  </span>
                </div>
                {generated.description && (
                  <p className="text-xs text-gray-500 mb-3">{generated.description}</p>
                )}
                <div className="flex flex-wrap gap-3 text-xs">
                  <div className="bg-white border border-gray-100 rounded-lg px-3 py-1.5">
                    <span className="text-gray-400">Per subject pass: </span>
                    <span className="font-semibold text-navy">{generated.passCriteria.perSubject}%</span>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-lg px-3 py-1.5">
                    <span className="text-gray-400">Aggregate pass: </span>
                    <span className="font-semibold text-navy">{generated.passCriteria.aggregate}%</span>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-lg px-3 py-1.5">
                    <span className="text-gray-400">Terms: </span>
                    <span className="font-semibold text-navy">{generated.terms.length}</span>
                  </div>
                  <div className={`bg-white border rounded-lg px-3 py-1.5 ${totalWeight === 100 ? 'border-green/20' : 'border-coral/20'}`}>
                    <span className="text-gray-400">Total weight: </span>
                    <span className={`font-semibold ${totalWeight === 100 ? 'text-green' : 'text-coral'}`}>{totalWeight}%</span>
                  </div>
                </div>
              </div>

              {/* Grading bands */}
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Grading Scale</p>
                <div className="flex flex-wrap gap-1.5">
                  {generated.gradingBands.map((b) => (
                    <div key={b.label} className="flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1 text-[11px]">
                      <span className="font-bold text-navy">{b.label}</span>
                      <span className="text-gray-400">≥{b.minPct}%</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-gray-500">{b.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Terms */}
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Assessment Terms</p>
                <div className="space-y-2">
                  {generated.terms.map((term) => (
                    <div key={term.sequence} className="border border-gray-100 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleTerm(term.sequence)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {term.sequence}
                          </span>
                          <div className="text-left">
                            <span className="font-semibold text-navy text-xs">{term.name}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] bg-navy/10 text-navy px-1.5 py-0.5 rounded-full">
                                {TERM_TYPE_LABELS[term.type] ?? term.type}
                              </span>
                              <span className="text-[10px] font-semibold text-gold">{term.weightPct}%</span>
                              {term.isBoardConducted && (
                                <span className="text-[10px] bg-coral/10 text-coral px-1.5 py-0.5 rounded-full">Board</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400">{term.subjectConfigs.length} subjects</span>
                          {expandedTerms.has(term.sequence)
                            ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                            : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                        </div>
                      </button>

                      {expandedTerms.has(term.sequence) && (
                        <div className="p-3">
                          <table className="w-full text-xs">
                            <thead>
                              <tr>
                                <th className="text-left text-gray-400 font-medium pb-1.5 pl-1">Subject</th>
                                <th className="text-left text-gray-400 font-medium pb-1.5">Components</th>
                                <th className="text-center text-gray-400 font-medium pb-1.5 pr-1">Max</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {term.subjectConfigs.map((sc) => {
                                const totalMax = sc.components.reduce((s, c) => s + c.maxMarks, 0);
                                return (
                                  <tr key={sc.subjectId} className="hover:bg-gray-50/50">
                                    <td className="py-1.5 pl-1 font-medium text-gray-700">{sc.subjectName}</td>
                                    <td className="py-1.5">
                                      <div className="flex flex-wrap gap-1">
                                        {sc.components.map((c) => (
                                          <span key={c.name} className="bg-navy/5 text-navy px-1.5 py-0.5 rounded text-[10px]">
                                            {c.name} {c.maxMarks}
                                          </span>
                                        ))}
                                      </div>
                                    </td>
                                    <td className="py-1.5 pr-1 text-center font-bold text-navy">{totalMax}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {totalWeight !== 100 && (
                <div className="flex items-center gap-2 bg-coral/5 border border-coral/20 rounded-xl px-4 py-3 text-xs text-coral">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Term weights sum to {totalWeight}% instead of 100%. Consider regenerating.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <div>
            {step === 'preview' && (
              <button
                onClick={() => setStep('configure')}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                ← Start over
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-2">
              Cancel
            </button>
            {step === 'configure' && (
              <button
                onClick={generate}
                disabled={!selectedGradeIds.length || !ayId}
                className="flex items-center gap-2 bg-gold text-navy font-semibold text-xs px-5 py-2.5 rounded-lg hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate with AI
              </button>
            )}
            {step === 'preview' && (
              <button
                onClick={apply}
                disabled={applying || totalWeight !== 100}
                className="flex items-center gap-2 bg-navy text-white font-semibold text-xs px-5 py-2.5 rounded-lg hover:bg-navyMid disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {applying ? 'Saving…' : 'Apply & Save Scheme'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

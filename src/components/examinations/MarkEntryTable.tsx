'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Types ─────────────────────────────────────────────────────────────────────

type ComponentDef = { name: string; maxMarks: number; passMarks: number };

interface Subject {
  id: string;
  name: string;
  maxMarks: number;
  components: ComponentDef[];
}

type MarkCell = { id: string; marksObtained: number | null; isAbsent: boolean };

interface StudentMark {
  id: string;
  name: string;
  rollNo: string;
  admissionNo: string;
  // marks[subjectId][componentName]
  marks: Record<string, Record<string, MarkCell>>;
}

interface MarksData {
  students: StudentMark[];
  subjects: Subject[];
  linkedTermId: string | null;
}

// localMarks[studentId][subjectId][componentName]
type LocalMark = { val: string; absent: boolean };
type LocalMarks = Record<string, Record<string, Record<string, LocalMark>>>;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function pctColor(pct: number) {
  if (pct >= 60) return 'text-green font-semibold';
  if (pct >= 40) return 'text-amber font-semibold';
  return 'text-coral font-semibold';
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function MarkEntryTable({ examId, gradeId }: { examId: string; gradeId: string }) {
  const [data, setData] = useState<MarksData | null>(null);
  const [loading, setLoading] = useState(false);
  const [localMarks, setLocalMarks] = useState<LocalMarks>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!examId || !gradeId) return;
    setLoading(true);
    fetch(`/api/examinations/${examId}/marks?gradeId=${gradeId}`)
      .then((r) => r.json())
      .then((d: MarksData) => {
        setData(d);
        // Pre-populate local state from saved entries
        const init: LocalMarks = {};
        d.students.forEach((stu) => {
          init[stu.id] = {};
          d.subjects.forEach((sub) => {
            init[stu.id][sub.id] = {};
            sub.components.forEach((comp) => {
              const cell = stu.marks[sub.id]?.[comp.name];
              init[stu.id][sub.id][comp.name] = {
                val: cell?.marksObtained != null ? String(cell.marksObtained) : '',
                absent: cell?.isAbsent ?? false,
              };
            });
          });
        });
        setLocalMarks(init);
      })
      .catch(() => toast.error('Failed to load marks'))
      .finally(() => setLoading(false));
  }, [examId, gradeId]);

  function setMarkVal(stuId: string, subId: string, compName: string, val: string) {
    setLocalMarks((prev) => ({
      ...prev,
      [stuId]: {
        ...prev[stuId],
        [subId]: {
          ...prev[stuId]?.[subId],
          [compName]: { val, absent: false },
        },
      },
    }));
  }

  function setAbsent(stuId: string, subId: string, compName: string, absent: boolean) {
    setLocalMarks((prev) => ({
      ...prev,
      [stuId]: {
        ...prev[stuId],
        [subId]: {
          ...prev[stuId]?.[subId],
          [compName]: { val: '', absent },
        },
      },
    }));
  }

  async function saveMarks() {
    if (!data) return;
    const entries: { studentId: string; subjectId: string; componentName: string; marksObtained: number | null; isAbsent: boolean }[] = [];

    data.students.forEach((stu) => {
      data.subjects.forEach((sub) => {
        sub.components.forEach((comp) => {
          const m = localMarks[stu.id]?.[sub.id]?.[comp.name];
          if (m !== undefined) {
            entries.push({
              studentId: stu.id,
              subjectId: sub.id,
              componentName: comp.name,
              marksObtained: m.absent ? null : (parseFloat(m.val) || 0),
              isAbsent: m.absent,
            });
          }
        });
      });
    });

    setSaving(true);
    try {
      const res = await fetch(`/api/examinations/${examId}/marks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) throw new Error('Save failed');
      const { saved } = await res.json();
      toast.success(`Saved ${saved} mark entries`);
    } catch {
      toast.error('Failed to save marks');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="space-y-2 py-4">
      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
    </div>
  );

  if (!data) return null;

  if (data.subjects.length === 0) {
    return (
      <div className="flex items-center gap-3 bg-amber/10 border border-amber/20 rounded-xl p-4 text-sm text-amber">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        No subjects found for this exam + grade. Link this exam to an Assessment Plan term, or add subjects via the Timetable module.
      </div>
    );
  }

  // Total max marks across all subjects+components
  const grandMax = data.subjects.reduce((s, sub) => s + sub.maxMarks, 0);

  // Whether any subject has >1 component (affects header rendering)
  const hasMultiComponent = data.subjects.some((s) => s.components.length > 1);

  return (
    <div>
      {data.linkedTermId && (
        <div className="flex items-center gap-2 mb-3 bg-teal/10 border border-teal/20 rounded-xl px-4 py-2.5">
          <span className="text-xs font-semibold text-teal">
            Assessment Plan linked — component-level marks enabled
          </span>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10">
            {/* Row 1: subject group headers (only when multi-component) */}
            {hasMultiComponent && (
              <tr>
                {/* Student + Roll fixed columns */}
                <th className="px-4 py-2 text-left min-w-[160px] border-b border-gray-100" rowSpan={2}>
                  <span className="text-xs uppercase tracking-wide text-gray-400 font-medium">Student</span>
                </th>
                <th className="px-3 py-2 text-center min-w-[64px] border-b border-gray-100" rowSpan={2}>
                  <span className="text-xs uppercase tracking-wide text-gray-400 font-medium">Roll</span>
                </th>
                {data.subjects.map((sub) => (
                  <th
                    key={sub.id}
                    colSpan={sub.components.length}
                    className="px-2 py-2 text-center border-b border-l border-gray-100"
                  >
                    <div className="text-xs font-semibold text-navy">{sub.name}</div>
                    <div className="text-[9px] text-gray-400 font-normal">/{sub.maxMarks}</div>
                  </th>
                ))}
                <th className="px-3 py-2 text-center border-b border-l border-gray-100 min-w-[72px]" rowSpan={2}>
                  <span className="text-xs uppercase tracking-wide text-gray-400 font-medium">Total</span>
                </th>
                <th className="px-3 py-2 text-center border-b border-gray-100 min-w-[52px]" rowSpan={2}>
                  <span className="text-xs uppercase tracking-wide text-gray-400 font-medium">%</span>
                </th>
              </tr>
            )}

            {/* Row 2 (or only row): component-level headers */}
            <tr>
              {!hasMultiComponent && (
                <>
                  <th className="text-left text-xs uppercase tracking-wide text-gray-400 px-4 py-3 font-medium sticky left-0 bg-gray-50 min-w-[160px] border-b border-gray-100">Student</th>
                  <th className="text-center text-xs uppercase tracking-wide text-gray-400 px-3 py-3 font-medium min-w-[64px] border-b border-gray-100">Roll</th>
                </>
              )}
              {data.subjects.map((sub) =>
                sub.components.map((comp, ci) => (
                  <th
                    key={`${sub.id}-${comp.name}`}
                    className={`text-center text-xs uppercase tracking-wide text-gray-400 px-2 py-2 font-medium min-w-[80px] border-b border-gray-100 ${ci === 0 && hasMultiComponent ? 'border-l' : ''}`}
                  >
                    <div>{comp.name}</div>
                    <div className="text-[9px] text-gray-300 normal-case tracking-normal font-normal">/{comp.maxMarks}</div>
                  </th>
                ))
              )}
              {!hasMultiComponent && (
                <>
                  <th className="text-center text-xs uppercase tracking-wide text-gray-400 px-3 py-3 font-medium min-w-[72px] border-b border-gray-100 border-l">Total</th>
                  <th className="text-center text-xs uppercase tracking-wide text-gray-400 px-3 py-3 font-medium min-w-[52px] border-b border-gray-100">%</th>
                </>
              )}
            </tr>
          </thead>

          <tbody>
            {data.students.map((stu, rowIdx) => {
              // Compute grand total for this student
              let grandObt = 0;
              data.subjects.forEach((sub) => {
                sub.components.forEach((comp) => {
                  const m = localMarks[stu.id]?.[sub.id]?.[comp.name];
                  if (m && !m.absent) grandObt += parseFloat(m.val) || 0;
                });
              });
              const pct = grandMax > 0 ? Math.round((grandObt / grandMax) * 100) : 0;

              return (
                <tr key={stu.id} className={`border-t border-gray-50 hover:bg-gray-50/40 ${rowIdx % 2 === 0 ? '' : 'bg-gray-50/20'}`}>
                  <td className="px-4 py-2 font-semibold text-gray-800 sticky left-0 bg-inherit text-sm">{stu.name}</td>
                  <td className="px-3 py-2 text-center text-gray-500 text-xs">{stu.rollNo}</td>

                  {data.subjects.map((sub, si) =>
                    sub.components.map((comp, ci) => {
                      const m = localMarks[stu.id]?.[sub.id]?.[comp.name];
                      const isFirst = ci === 0 && si > 0;
                      return (
                        <td key={`${sub.id}-${comp.name}`} className={`px-1.5 py-2 text-center ${isFirst && hasMultiComponent ? 'border-l border-gray-100' : ''}`}>
                          {m?.absent ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-[10px] bg-coral/10 text-coral font-bold px-2 py-0.5 rounded-full">AB</span>
                              <button onClick={() => setAbsent(stu.id, sub.id, comp.name, false)}
                                className="text-[9px] text-gray-400 hover:text-gray-600 underline">undo</button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-0.5">
                              <input
                                type="number"
                                value={m?.val ?? ''}
                                onChange={(e) => setMarkVal(stu.id, sub.id, comp.name, e.target.value)}
                                min={0}
                                max={comp.maxMarks}
                                placeholder="—"
                                className="w-14 text-center text-sm font-semibold border border-gray-200 rounded-lg py-0.5 focus:outline-none focus:ring-1 focus:ring-navy"
                              />
                              <button onClick={() => setAbsent(stu.id, sub.id, comp.name, true)}
                                className="text-[9px] text-coral hover:text-coral/80 underline">absent</button>
                            </div>
                          )}
                        </td>
                      );
                    })
                  )}

                  <td className={`px-3 py-2 text-center font-bold text-navy text-xs ${hasMultiComponent ? 'border-l border-gray-100' : ''}`}>
                    {grandObt}/{grandMax}
                  </td>
                  <td className={`px-3 py-2 text-center text-xs ${pctColor(pct)}`}>{pct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={saveMarks}
          disabled={saving}
          className="bg-gold text-navy font-semibold text-sm px-5 py-2 rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Marks'}
        </button>
      </div>
    </div>
  );
}

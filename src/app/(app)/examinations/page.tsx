'use client';

import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import StatCard from '@/components/shared/StatCard';
import { toast } from 'sonner';
import {
  ClipboardList, CalendarCheck, PlayCircle, CheckCircle2,
  Plus, Trash2, MoreVertical, Ticket, FileText, Printer,
  ChevronDown, X, BookOpen, AlertCircle, Info,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAcademicYearSafe } from '@/context/AcademicYearContext';

// ─── Types ─────────────────────────────────────────────────────────────────────

type ExamStatus = 'SCHEDULED' | 'ONGOING' | 'RESULTS_DECLARED';

interface AcademicYear { id: string; label: string; isCurrent: boolean; }

interface ExamSchedule {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: ExamStatus;
  isPreBoard: boolean;
  isBoardExam: boolean;
  semesterNo: number | null;
  gradeBands: string[];
  academicYear: { id: string; label: string };
  _count: { markEntries: number; hallTickets: number; items: number };
}

interface Grade { id: string; name: string; displayOrder: number; sections: { id: string; name: string }[] }

interface ExamItem {
  id: string;
  gradeId: string;
  subjectId: string;
  examDate: string;
  startTime: string;
  endTime: string;
  maxMarks: number;
  passMarks: number;
  grade: { id: string; name: string };
  subject: { id: string; name: string };
}

interface StudentMark {
  id: string;
  name: string;
  rollNo: string;
  admissionNo: string;
  marks: Record<string, { id: string; marksObtained: number; isAbsent: boolean }>;
}

interface MarksData {
  students: StudentMark[];
  subjects: { id: string; name: string; maxMarks: number }[];
}

interface HallTicket {
  id: string;
  rollNo: string;
  examCentre: string;
  student: { id: string; name: string; admissionNo: string; rollNo: string; grade: { name: string }; section: { name: string } };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const sStr = s.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const eStr = e.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${sStr} – ${eStr}`;
}

function pctColor(pct: number) {
  if (pct >= 60) return 'text-green font-semibold';
  if (pct >= 40) return 'text-amber font-semibold';
  return 'text-coral font-semibold';
}

function pctBg(pct: number) {
  if (pct >= 60) return 'bg-green/10 text-green';
  if (pct >= 40) return 'bg-amber/10 text-amber';
  return 'bg-coral/10 text-coral';
}

function statusBadgeCls(status: ExamStatus) {
  if (status === 'SCHEDULED') return 'bg-blue-100 text-blue-700';
  if (status === 'ONGOING') return 'bg-amber/10 text-amber';
  return 'bg-green/10 text-green';
}

function statusLabel(status: ExamStatus) {
  if (status === 'SCHEDULED') return 'Scheduled';
  if (status === 'ONGOING') return 'Ongoing';
  return 'Results Declared';
}

const GRADE_BANDS = ['Nursery-UKG', 'Class I-IV', 'Class V-VII', 'Class VIII-X', 'Class XI-XII', 'All Classes'];

const EXAM_TYPES = [
  { value: 'unit_test', label: 'Unit Test' },
  { value: 'half_yearly', label: 'Half-Yearly' },
  { value: 'annual', label: 'Annual' },
  { value: 'pre_board', label: 'Pre-Board' },
  { value: 'board_exam', label: 'Board Exam' },
  { value: 'wb_hs_semester', label: 'WB HS Semester' },
];

const SEMESTER_LABELS: Record<number, string> = {
  1: 'Sem 1 (Class XI – I Half)',
  2: 'Sem 2 (Class XI – II Half)',
  3: 'Sem 3 (Class XII – I Half)',
  4: 'Sem 4 (Class XII – II Half)',
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function CreateExamModal({
  open,
  onClose,
  onCreated,
  academicYears,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (exam: ExamSchedule) => void;
  academicYears: AcademicYear[];
}) {
  const [name, setName] = useState('');
  const [examType, setExamType] = useState('unit_test');
  const [semesterNo, setSemesterNo] = useState<number>(1);
  const [selectedBands, setSelectedBands] = useState<string[]>([]);
  const [academicYearId, setAcademicYearId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const cur = academicYears.find((y) => y.isCurrent);
      if (cur) setAcademicYearId(cur.id);
    }
  }, [open, academicYears]);

  function toggleBand(band: string) {
    setSelectedBands((prev) =>
      prev.includes(band) ? prev.filter((b) => b !== band) : [...prev, band]
    );
  }

  async function handleSubmit() {
    if (!name.trim()) { toast.error('Exam name is required'); return; }
    if (!startDate || !endDate) { toast.error('Start and end dates are required'); return; }
    if (!academicYearId) { toast.error('Academic year is required'); return; }
    if (selectedBands.length === 0) { toast.error('Select at least one grade band'); return; }

    const isPreBoard = examType === 'pre_board';
    const isBoardExam = examType === 'board_exam';
    const sNo = examType === 'wb_hs_semester' ? semesterNo : null;

    setSaving(true);
    try {
      const res = await fetch('/api/examinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          academicYearId,
          startDate,
          endDate,
          gradeBands: selectedBands,
          isPreBoard,
          isBoardExam,
          semesterNo: sNo,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error ?? 'Failed to create exam');
      }
      const created: ExamSchedule = await res.json();
      onCreated(created);
      toast.success(`Exam "${created.name}" created`);
      onClose();
      // Reset
      setName(''); setExamType('unit_test'); setSemesterNo(1);
      setSelectedBands([]); setStartDate(''); setEndDate('');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to create exam');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-sora font-semibold text-navy text-lg">Create Exam Schedule</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Exam Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Half-Yearly Examination 2025"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
            />
          </div>

          {/* Exam Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Exam Type</label>
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
            >
              {EXAM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Semester selector */}
          {examType === 'wb_hs_semester' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Semester Number</label>
              <select
                value={semesterNo}
                onChange={(e) => setSemesterNo(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>{SEMESTER_LABELS[n]}</option>
                ))}
              </select>
            </div>
          )}

          {/* Grade Bands */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">Grade Bands</label>
            <div className="flex flex-wrap gap-2">
              {GRADE_BANDS.map((band) => (
                <button
                  key={band}
                  type="button"
                  onClick={() => toggleBand(band)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    selectedBands.includes(band)
                      ? 'bg-navy text-white border-navy'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-navy/50'
                  }`}
                >
                  {band}
                </button>
              ))}
            </div>
          </div>

          {/* Academic Year */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Academic Year</label>
            <select
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
            >
              <option value="">Select year…</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>{y.label}{y.isCurrent ? ' (Current)' : ''}</option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 text-sm font-semibold py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 bg-gold text-navy text-sm font-semibold py-2 rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-60"
          >
            {saving ? 'Creating…' : 'Create Exam'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Exam Card ─────────────────────────────────────────────────────────────────

function ExamCard({
  exam,
  onGoTab,
  onStatusChange,
  onDelete,
}: {
  exam: ExamSchedule;
  onGoTab: (tab: string, examId: string) => void;
  onStatusChange: (id: string, status: ExamStatus) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [changing, setChanging] = useState(false);

  async function changeStatus(status: ExamStatus) {
    setMenuOpen(false);
    setChanging(true);
    try {
      await onStatusChange(exam.id, status);
    } finally {
      setChanging(false);
    }
  }

  async function handleDelete() {
    setMenuOpen(false);
    if (!confirm(`Delete "${exam.name}"? This cannot be undone.`)) return;
    await onDelete(exam.id);
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow relative ${
      exam.isPreBoard ? 'border-gold ring-1 ring-gold/20' : exam.isBoardExam ? 'border-coral ring-1 ring-coral/20' : 'border-gray-100'
    }`}>
      {/* Header badges */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {exam.semesterNo != null && (
          <span className="text-[10px] font-bold bg-teal text-white px-2 py-0.5 rounded-full">
            Sem {exam.semesterNo}
          </span>
        )}
        {exam.isPreBoard && (
          <span className="text-[10px] font-bold bg-amber/10 text-amber px-2 py-0.5 rounded-full border border-amber/20">
            Pre-Board
          </span>
        )}
        {exam.isBoardExam && (
          <span className="text-[10px] font-bold bg-coral/10 text-coral px-2 py-0.5 rounded-full border border-coral/20">
            Board Exam
          </span>
        )}
      </div>

      {/* Name */}
      <h3 className="font-sora font-semibold text-navy text-sm mb-1 leading-snug">{exam.name}</h3>
      <p className="text-xs text-gray-500 mb-1">{fmtDateRange(exam.startDate, exam.endDate)}</p>

      {/* Grade bands */}
      <div className="flex flex-wrap gap-1 mb-3">
        {exam.gradeBands.map((b) => (
          <span key={b} className="text-[9px] bg-iceLight text-navy px-1.5 py-0.5 rounded-full">{b}</span>
        ))}
      </div>

      {/* Count chips */}
      <div className="flex gap-2 mb-3">
        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
          {exam._count.items} subjects
        </span>
        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
          {exam._count.markEntries} marks
        </span>
        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
          {exam._count.hallTickets} tickets
        </span>
      </div>

      {/* Status */}
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadgeCls(exam.status)}`}>
        {changing ? 'Updating…' : statusLabel(exam.status)}
      </span>

      {/* Action buttons */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
        <button
          onClick={() => onGoTab('marks', exam.id)}
          className="flex-1 text-[10px] font-semibold text-navy border border-navy/20 rounded-lg py-1.5 hover:bg-navy/5 transition-colors"
        >
          Mark Entry
        </button>
        <button
          onClick={() => onGoTab('tickets', exam.id)}
          className="flex-1 text-[10px] font-semibold text-teal border border-teal/20 rounded-lg py-1.5 hover:bg-teal/5 transition-colors"
        >
          Hall Tickets
        </button>
        <button
          onClick={() => onGoTab('results', exam.id)}
          className="flex-1 text-[10px] font-semibold text-green border border-green/20 rounded-lg py-1.5 hover:bg-green/5 transition-colors"
        >
          Results
        </button>

        {/* More menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <MoreVertical className="w-3.5 h-3.5 text-gray-500" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[160px] py-1">
              {(['SCHEDULED', 'ONGOING', 'RESULTS_DECLARED'] as ExamStatus[])
                .filter((s) => s !== exam.status)
                .map((s) => (
                  <button
                    key={s}
                    onClick={() => changeStatus(s)}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Set: {statusLabel(s)}
                  </button>
                ))}
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-3 py-2 text-xs text-coral hover:bg-coral/5 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Mark Entry Table ──────────────────────────────────────────────────────────

function MarkEntryTable({ examId, gradeId }: { examId: string; gradeId: string }) {
  const [data, setData] = useState<MarksData | null>(null);
  const [loading, setLoading] = useState(false);
  const [localMarks, setLocalMarks] = useState<Record<string, Record<string, { val: string; absent: boolean }>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!examId || !gradeId) return;
    setLoading(true);
    fetch(`/api/examinations/${examId}/marks?gradeId=${gradeId}`)
      .then((r) => r.json())
      .then((d: MarksData) => {
        setData(d);
        // Pre-populate local state
        const init: Record<string, Record<string, { val: string; absent: boolean }>> = {};
        d.students.forEach((stu) => {
          init[stu.id] = {};
          d.subjects.forEach((sub) => {
            const m = stu.marks[sub.id];
            init[stu.id][sub.id] = {
              val: m ? String(m.marksObtained) : '',
              absent: m?.isAbsent ?? false,
            };
          });
        });
        setLocalMarks(init);
      })
      .catch(() => toast.error('Failed to load marks'))
      .finally(() => setLoading(false));
  }, [examId, gradeId]);

  function setMark(stuId: string, subId: string, val: string) {
    setLocalMarks((prev) => ({
      ...prev,
      [stuId]: { ...prev[stuId], [subId]: { ...prev[stuId]?.[subId], val, absent: false } },
    }));
  }

  function setAbsent(stuId: string, subId: string, absent: boolean) {
    setLocalMarks((prev) => ({
      ...prev,
      [stuId]: { ...prev[stuId], [subId]: { ...prev[stuId]?.[subId], val: '', absent } },
    }));
  }

  async function saveMarks() {
    if (!data) return;
    const entries: { studentId: string; subjectId: string; marksObtained: number; isAbsent: boolean }[] = [];
    data.students.forEach((stu) => {
      data.subjects.forEach((sub) => {
        const m = localMarks[stu.id]?.[sub.id];
        if (m) {
          entries.push({
            studentId: stu.id,
            subjectId: sub.id,
            marksObtained: m.absent ? 0 : parseFloat(m.val) || 0,
            isAbsent: m.absent,
          });
        }
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
        No subjects scheduled for this exam + grade. Add subject schedule first.
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="text-left text-xs uppercase tracking-wide text-gray-400 px-4 py-3 font-medium sticky left-0 bg-gray-50 min-w-[160px]">
                Student
              </th>
              <th className="text-center text-xs uppercase tracking-wide text-gray-400 px-3 py-3 font-medium min-w-[72px]">
                Roll No
              </th>
              {data.subjects.map((sub) => (
                <th key={sub.id} className="text-center text-xs uppercase tracking-wide text-gray-400 px-3 py-3 font-medium min-w-[96px]">
                  <div>{sub.name}</div>
                  <div className="text-[9px] text-gray-300 normal-case tracking-normal">/{sub.maxMarks}</div>
                </th>
              ))}
              <th className="text-center text-xs uppercase tracking-wide text-gray-400 px-3 py-3 font-medium min-w-[72px]">Total</th>
              <th className="text-center text-xs uppercase tracking-wide text-gray-400 px-3 py-3 font-medium min-w-[56px]">%</th>
            </tr>
          </thead>
          <tbody>
            {data.students.map((stu, i) => {
              const totalMax = data.subjects.reduce((a, s) => a + s.maxMarks, 0);
              const totalObt = data.subjects.reduce((a, sub) => {
                const m = localMarks[stu.id]?.[sub.id];
                if (!m || m.absent) return a;
                return a + (parseFloat(m.val) || 0);
              }, 0);
              const pct = totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : 0;

              return (
                <tr key={stu.id} className={`border-t border-gray-50 hover:bg-gray-50/50 ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                  <td className="px-4 py-2.5 font-semibold text-gray-800 sticky left-0 bg-inherit">{stu.name}</td>
                  <td className="px-3 py-2.5 text-center text-gray-500 text-xs">{stu.rollNo}</td>
                  {data.subjects.map((sub) => {
                    const m = localMarks[stu.id]?.[sub.id];
                    return (
                      <td key={sub.id} className="px-2 py-2 text-center">
                        {m?.absent ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[10px] bg-coral/10 text-coral font-bold px-2 py-0.5 rounded-full">AB</span>
                            <button
                              onClick={() => setAbsent(stu.id, sub.id, false)}
                              className="text-[9px] text-gray-400 hover:text-gray-600 underline"
                            >
                              undo
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5">
                            <input
                              type="number"
                              value={m?.val ?? ''}
                              onChange={(e) => setMark(stu.id, sub.id, e.target.value)}
                              min={0}
                              max={sub.maxMarks}
                              placeholder="—"
                              className="w-14 text-center text-sm font-semibold border border-gray-200 rounded-lg py-0.5 focus:outline-none focus:ring-1 focus:ring-navy"
                            />
                            <button
                              onClick={() => setAbsent(stu.id, sub.id, true)}
                              className="text-[9px] text-coral hover:text-coral/80 underline"
                            >
                              absent
                            </button>
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-center font-bold text-navy">{totalObt}/{totalMax}</td>
                  <td className={`px-3 py-2.5 text-center text-xs ${pctColor(pct)}`}>{pct}%</td>
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

// ─── Hall Ticket Preview ────────────────────────────────────────────────────────

function HallTicketPreview({ ticket, examName, items }: {
  ticket: HallTicket;
  examName: string;
  items: ExamItem[];
}) {
  const gradeItems = items.filter((it) => it.gradeId === ticket.student.grade.name || true); // all items
  return (
    <div className="border-2 border-navy rounded-xl overflow-hidden print:break-inside-avoid">
      <div className="bg-navy text-white text-center py-3">
        <p className="font-sora font-bold text-sm">{'{{School Name}}'}</p>
        <p className="text-xs text-ice mt-0.5">ADMIT CARD</p>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-4">
          <div><span className="text-gray-400">Student:</span> <span className="font-semibold text-navy">{ticket.student.name}</span></div>
          <div><span className="text-gray-400">Adm No:</span> <span className="font-semibold">{ticket.student.admissionNo}</span></div>
          <div><span className="text-gray-400">Class:</span> <span className="font-semibold">{ticket.student.grade.name} – {ticket.student.section.name}</span></div>
          <div><span className="text-gray-400">Roll No:</span> <span className="font-semibold">{ticket.rollNo || ticket.student.rollNo}</span></div>
          <div><span className="text-gray-400">Exam:</span> <span className="font-semibold">{examName}</span></div>
          <div><span className="text-gray-400">Centre:</span> <span className="font-semibold">{ticket.examCentre || 'School Campus'}</span></div>
        </div>
        {gradeItems.length > 0 && (
          <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-1.5 text-gray-400 font-medium">Subject</th>
                <th className="text-left px-3 py-1.5 text-gray-400 font-medium">Date</th>
                <th className="text-left px-3 py-1.5 text-gray-400 font-medium">Time</th>
                <th className="text-right px-3 py-1.5 text-gray-400 font-medium">Max</th>
              </tr>
            </thead>
            <tbody>
              {gradeItems.map((it) => (
                <tr key={it.id} className="border-t border-gray-100">
                  <td className="px-3 py-1.5 font-medium">{it.subject.name}</td>
                  <td className="px-3 py-1.5 text-gray-600">{fmtDate(it.examDate)}</td>
                  <td className="px-3 py-1.5 text-gray-600">{it.startTime} – {it.endTime}</td>
                  <td className="px-3 py-1.5 text-right font-semibold">{it.maxMarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Results Table ─────────────────────────────────────────────────────────────

function ResultsTable({ examId, gradeId, semesterNo }: { examId: string; gradeId: string; semesterNo: number | null }) {
  const [data, setData] = useState<MarksData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!examId || !gradeId) return;
    setLoading(true);
    fetch(`/api/examinations/${examId}/marks?gradeId=${gradeId}`)
      .then((r) => r.json())
      .then((d: MarksData) => setData(d))
      .catch(() => toast.error('Failed to load results'))
      .finally(() => setLoading(false));
  }, [examId, gradeId]);

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
        No results available. Mark entry has not been completed yet.
      </div>
    );
  }

  const totalMax = data.subjects.reduce((a, s) => a + s.maxMarks, 0);
  const DEFAULT_PASS_PCT = 0.33;

  interface StudentResult {
    stu: StudentMark;
    totalObt: number;
    pct: number;
    passed: boolean;
    subScores: Record<string, number | null>;
  }

  const rows: StudentResult[] = data.students.map((stu) => {
    const subScores: Record<string, number | null> = {};
    let totalObt = 0;
    let passed = true;
    data.subjects.forEach((sub) => {
      const m = stu.marks[sub.id];
      if (!m || m.isAbsent) {
        subScores[sub.id] = null;
        passed = false;
      } else {
        subScores[sub.id] = m.marksObtained;
        totalObt += m.marksObtained;
        if (m.marksObtained < sub.maxMarks * DEFAULT_PASS_PCT) passed = false;
      }
    });
    const pct = totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : 0;
    return { stu, totalObt, pct, passed, subScores };
  });

  rows.sort((a, b) => b.totalObt - a.totalObt);

  const classAvg = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length) : 0;
  const highest = rows.length > 0 ? rows[0].pct : 0;
  const lowest = rows.length > 0 ? rows[rows.length - 1].pct : 0;
  const passPct = rows.length > 0 ? Math.round((rows.filter((r) => r.passed).length / rows.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {semesterNo != null && (
        <div className="flex items-center gap-3 bg-teal/10 border border-teal/20 rounded-xl p-4 text-sm text-teal">
          <Info className="w-5 h-5 flex-shrink-0" />
          Semester {semesterNo} Examination — Marks contribute to cumulative HS result.
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="text-left text-xs uppercase tracking-wide text-gray-400 px-3 py-3 font-medium w-10">Rank</th>
              <th className="text-left text-xs uppercase tracking-wide text-gray-400 px-4 py-3 font-medium">Student</th>
              <th className="text-center text-xs uppercase tracking-wide text-gray-400 px-3 py-3 font-medium">Roll</th>
              {data.subjects.map((sub) => (
                <th key={sub.id} className="text-center text-xs uppercase tracking-wide text-gray-400 px-2 py-3 font-medium min-w-[72px]">
                  <div>{sub.name}</div>
                  <div className="text-[9px] text-gray-300 normal-case tracking-normal">/{sub.maxMarks}</div>
                </th>
              ))}
              <th className="text-center text-xs uppercase tracking-wide text-gray-400 px-3 py-3 font-medium">Total</th>
              <th className="text-center text-xs uppercase tracking-wide text-gray-400 px-3 py-3 font-medium">%</th>
              <th className="text-center text-xs uppercase tracking-wide text-gray-400 px-3 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ stu, totalObt, pct, passed, subScores }, idx) => (
              <tr key={stu.id} className={`border-t border-gray-50 hover:bg-gray-50/50 ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                <td className="px-3 py-2.5 text-center font-bold text-navy text-xs">#{idx + 1}</td>
                <td className="px-4 py-2.5 font-semibold text-gray-800">{stu.name}</td>
                <td className="px-3 py-2.5 text-center text-gray-500 text-xs">{stu.rollNo}</td>
                {data.subjects.map((sub) => {
                  const score = subScores[sub.id];
                  return (
                    <td key={sub.id} className="px-2 py-2.5 text-center text-xs">
                      {score == null ? (
                        <span className="text-coral font-bold">AB</span>
                      ) : (
                        <span className={score >= sub.maxMarks * DEFAULT_PASS_PCT ? 'text-gray-700' : 'text-coral font-semibold'}>{score}</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-2.5 text-center font-bold text-navy text-xs">{totalObt}/{totalMax}</td>
                <td className={`px-3 py-2.5 text-center text-xs ${pctColor(pct)}`}>{pct}%</td>
                <td className="px-3 py-2.5 text-center">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${passed ? 'bg-green/10 text-green' : 'bg-coral/10 text-coral'}`}>
                    {passed ? 'Pass' : 'Fail'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Class Average', value: `${classAvg}%`, cls: pctBg(classAvg) },
          { label: 'Highest', value: `${highest}%`, cls: 'bg-green/10 text-green' },
          { label: 'Lowest', value: `${lowest}%`, cls: pctBg(lowest) },
          { label: 'Pass Rate', value: `${passPct}%`, cls: passPct >= 60 ? 'bg-green/10 text-green' : 'bg-coral/10 text-coral' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-4 text-center ${s.cls}`}>
            <p className="text-xs font-medium opacity-70 mb-1">{s.label}</p>
            <p className="font-sora font-bold text-xl">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ExaminationsPage() {
  const ayCtx = useAcademicYearSafe();
  const [exams, setExams] = useState<ExamSchedule[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState('schedules');

  // Cross-tab selection state
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedGradeId, setSelectedGradeId] = useState('');

  // Hall tickets state
  const [tickets, setTickets] = useState<HallTicket[]>([]);
  const [examItems, setExamItems] = useState<ExamItem[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketGradeIds, setTicketGradeIds] = useState<string[]>([]);
  const [ticketCentre, setTicketCentre] = useState('');
  const [generatingTickets, setGeneratingTickets] = useState(false);

  // ─── Fetch ────────────────────────────────────────────────────────────────────

  const fetchExams = useCallback(async () => {
    setLoadingExams(true);
    try {
      const res = await fetch('/api/examinations');
      if (!res.ok) throw new Error('Failed');
      const data: ExamSchedule[] = await res.json();
      setExams(data);
    } catch {
      toast.error('Failed to load exam schedules');
    } finally {
      setLoadingExams(false);
    }
  }, []);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  useEffect(() => {
    fetch('/api/grades')
      .then((r) => r.json())
      .then((d: Grade[]) => setGrades(d.sort((a, b) => a.displayOrder - b.displayOrder)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const years = ayCtx?.years ?? [];
    setAcademicYears(years);
  }, [ayCtx?.years]);

  // Fetch hall tickets when exam selected (tickets tab)
  useEffect(() => {
    if (activeTab !== 'tickets' || !selectedExamId) { setTickets([]); setExamItems([]); return; }
    setLoadingTickets(true);
    Promise.all([
      fetch(`/api/examinations/${selectedExamId}/hall-tickets`).then((r) => r.json()),
      fetch(`/api/examinations/${selectedExamId}/items`).then((r) => r.json()),
    ])
      .then(([t, items]: [HallTicket[], ExamItem[]]) => { setTickets(t); setExamItems(items); })
      .catch(() => toast.error('Failed to load hall tickets'))
      .finally(() => setLoadingTickets(false));
  }, [activeTab, selectedExamId]);

  // ─── Derived stats ────────────────────────────────────────────────────────────

  const stats = {
    total: exams.length,
    scheduled: exams.filter((e) => e.status === 'SCHEDULED').length,
    ongoing: exams.filter((e) => e.status === 'ONGOING').length,
    declared: exams.filter((e) => e.status === 'RESULTS_DECLARED').length,
  };

  const selectedExam = exams.find((e) => e.id === selectedExamId) ?? null;

  // ─── Handlers ─────────────────────────────────────────────────────────────────

  function handleGoTab(tab: string, examId: string) {
    setSelectedExamId(examId);
    setSelectedGradeId('');
    setActiveTab(tab);
  }

  async function handleStatusChange(id: string, status: ExamStatus) {
    const res = await fetch(`/api/examinations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) { toast.error('Failed to update status'); return; }
    const updated: ExamSchedule = await res.json();
    setExams((prev) => prev.map((e) => (e.id === id ? { ...e, status: updated.status } : e)));
    toast.success(`Status updated to: ${statusLabel(status)}`);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/examinations/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Failed to delete exam'); return; }
    setExams((prev) => prev.filter((e) => e.id !== id));
    toast.success('Exam schedule deleted');
  }

  async function generateTickets() {
    if (!selectedExamId || ticketGradeIds.length === 0) {
      toast.error('Select at least one grade');
      return;
    }
    setGeneratingTickets(true);
    try {
      const res = await fetch(`/api/examinations/${selectedExamId}/hall-tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gradeIds: ticketGradeIds, examCentre: ticketCentre || undefined }),
      });
      if (!res.ok) throw new Error('Failed');
      const { generated } = await res.json();
      toast.success(`${generated} hall tickets generated`);
      setShowTicketModal(false);
      // Re-fetch
      const t: HallTicket[] = await fetch(`/api/examinations/${selectedExamId}/hall-tickets`).then((r) => r.json());
      setTickets(t);
    } catch {
      toast.error('Failed to generate hall tickets');
    } finally {
      setGeneratingTickets(false);
    }
  }

  function toggleTicketGrade(gradeId: string) {
    setTicketGradeIds((prev) =>
      prev.includes(gradeId) ? prev.filter((g) => g !== gradeId) : [...prev, gradeId]
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-sora font-semibold text-navy text-2xl">Examinations</h1>
            <p className="text-sm text-gray-500 mt-0.5 font-dm-sans">Manage exam schedules, marks, hall tickets, and results</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-gold text-navy font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-gold/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create Exam
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard title="Total Exams" value={stats.total} icon={ClipboardList} iconBg="bg-navyMid" />
          <StatCard title="Scheduled" value={stats.scheduled} icon={CalendarCheck} iconBg="bg-blue-500" />
          <StatCard title="Ongoing" value={stats.ongoing} icon={PlayCircle} iconBg="bg-amber" />
          <StatCard title="Results Declared" value={stats.declared} icon={CheckCircle2} iconBg="bg-green" />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-100 rounded-xl p-1 h-auto">
            <TabsTrigger value="schedules" className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-navy data-[state=active]:shadow-sm">
              Schedules
            </TabsTrigger>
            <TabsTrigger value="marks" className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-navy data-[state=active]:shadow-sm">
              Mark Entry
            </TabsTrigger>
            <TabsTrigger value="tickets" className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-navy data-[state=active]:shadow-sm">
              Hall Tickets
            </TabsTrigger>
            <TabsTrigger value="results" className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-navy data-[state=active]:shadow-sm">
              Results
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: Schedules ─────────────────────────────────────────────────── */}
          <TabsContent value="schedules" className="mt-5">
            {loadingExams ? (
              <div className="grid grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
              </div>
            ) : exams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-iceLight rounded-full flex items-center justify-center mb-4">
                  <ClipboardList className="w-8 h-8 text-navyMid" />
                </div>
                <h3 className="font-sora font-semibold text-navy text-lg mb-2">No Exam Schedules Yet</h3>
                <p className="text-sm text-gray-500 mb-5">Create your first exam schedule to get started</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="bg-gold text-navy font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-gold/90 transition-colors"
                >
                  <Plus className="w-4 h-4 inline mr-1.5" />Create Exam
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {exams.map((exam) => (
                  <ExamCard
                    key={exam.id}
                    exam={exam}
                    onGoTab={handleGoTab}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Mark Entry ────────────────────────────────────────────────── */}
          <TabsContent value="marks" className="mt-5">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-4 mb-5 flex-wrap">
                <div className="flex-1 min-w-[220px]">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Exam Schedule</label>
                  <div className="relative">
                    <select
                      value={selectedExamId}
                      onChange={(e) => { setSelectedExamId(e.target.value); setSelectedGradeId(''); }}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-navy/30 pr-8"
                    >
                      <option value="">Select exam…</option>
                      {exams.map((e) => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Grade</label>
                  <div className="relative">
                    <select
                      value={selectedGradeId}
                      onChange={(e) => setSelectedGradeId(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-navy/30 pr-8"
                    >
                      <option value="">Select grade…</option>
                      {grades.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>
              </div>

              {selectedExamId && selectedGradeId ? (
                <MarkEntryTable examId={selectedExamId} gradeId={selectedGradeId} />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <BookOpen className="w-10 h-10 text-gray-300 mb-3" />
                  <p className="text-sm text-gray-400">Select an exam schedule and grade to enter marks</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Tab: Hall Tickets ──────────────────────────────────────────────── */}
          <TabsContent value="tickets" className="mt-5">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-4 mb-5 flex-wrap">
                <div className="flex-1 min-w-[220px]">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Exam Schedule</label>
                  <div className="relative">
                    <select
                      value={selectedExamId}
                      onChange={(e) => { setSelectedExamId(e.target.value); setSelectedGradeId(''); }}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-navy/30 pr-8"
                    >
                      <option value="">Select exam…</option>
                      {exams.map((e) => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>
                {selectedExamId && (
                  <div className="flex items-center gap-3 mt-5">
                    <span className="text-sm text-gray-500">
                      {loadingTickets ? 'Loading…' : `${tickets.length} tickets generated`}
                    </span>
                    <button
                      onClick={() => setShowTicketModal(true)}
                      className="flex items-center gap-2 bg-navy text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-navyMid transition-colors"
                    >
                      <Ticket className="w-4 h-4" />
                      Generate Hall Tickets
                    </button>
                    {tickets.length > 0 && (
                      <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 border border-gray-200 text-gray-600 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Printer className="w-4 h-4" /> Print All
                      </button>
                    )}
                  </div>
                )}
              </div>

              {!selectedExamId ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Ticket className="w-10 h-10 text-gray-300 mb-3" />
                  <p className="text-sm text-gray-400">Select an exam schedule to manage hall tickets</p>
                </div>
              ) : loadingTickets ? (
                <div className="grid grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
                </div>
              ) : tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="w-10 h-10 text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500 font-semibold mb-1">No hall tickets generated yet</p>
                  <p className="text-xs text-gray-400">Click &ldquo;Generate Hall Tickets&rdquo; to create tickets for selected grades</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 print:grid-cols-1">
                  {tickets.slice(0, 6).map((ticket) => (
                    <HallTicketPreview
                      key={ticket.id}
                      ticket={ticket}
                      examName={selectedExam?.name ?? ''}
                      items={examItems}
                    />
                  ))}
                  {tickets.length > 6 && (
                    <div className="col-span-2 text-center py-3 text-sm text-gray-400">
                      Showing 6 of {tickets.length} tickets. Use Print All to print the complete set.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Generate tickets modal */}
            {showTicketModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="font-sora font-semibold text-navy text-lg">Generate Hall Tickets</h2>
                    <button onClick={() => setShowTicketModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-2">Select Grades</label>
                      <div className="flex flex-wrap gap-2">
                        {grades.map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => toggleTicketGrade(g.id)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                              ticketGradeIds.includes(g.id)
                                ? 'bg-navy text-white border-navy'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-navy/50'
                            }`}
                          >
                            {g.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Exam Centre (optional)</label>
                      <input
                        value={ticketCentre}
                        onChange={(e) => setTicketCentre(e.target.value)}
                        placeholder="e.g. Hall A, Main Campus"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowTicketModal(false)}
                      className="flex-1 border border-gray-200 text-gray-600 text-sm font-semibold py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={generateTickets}
                      disabled={generatingTickets || ticketGradeIds.length === 0}
                      className="flex-1 bg-navy text-white text-sm font-semibold py-2 rounded-lg hover:bg-navyMid transition-colors disabled:opacity-60"
                    >
                      {generatingTickets ? 'Generating…' : 'Generate'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Results ───────────────────────────────────────────────────── */}
          <TabsContent value="results" className="mt-5">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-4 mb-5 flex-wrap">
                <div className="flex-1 min-w-[220px]">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Exam Schedule</label>
                  <div className="relative">
                    <select
                      value={selectedExamId}
                      onChange={(e) => { setSelectedExamId(e.target.value); setSelectedGradeId(''); }}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-navy/30 pr-8"
                    >
                      <option value="">Select exam…</option>
                      {exams.map((e) => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Grade</label>
                  <div className="relative">
                    <select
                      value={selectedGradeId}
                      onChange={(e) => setSelectedGradeId(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-navy/30 pr-8"
                    >
                      <option value="">Select grade…</option>
                      {grades.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>
              </div>

              {selectedExamId && selectedGradeId ? (
                <ResultsTable
                  examId={selectedExamId}
                  gradeId={selectedGradeId}
                  semesterNo={selectedExam?.semesterNo ?? null}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CheckCircle2 className="w-10 h-10 text-gray-300 mb-3" />
                  <p className="text-sm text-gray-400">Select an exam schedule and grade to view results</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Exam Modal */}
      <CreateExamModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(exam) => setExams((prev) => [exam, ...prev])}
        academicYears={academicYears}
      />
    </PageWrapper>
  );
}

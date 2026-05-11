'use client';

import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  Search, Plus, Users, AlertTriangle, UserCheck, UserX,
  LayoutGrid, List, X, Phone, Calendar,
  ChevronRight, Download, GraduationCap, TrendingUp,
  MoreVertical, Edit2, Trash2, ArrowUpRight, UserMinus, RefreshCw, Filter,
} from 'lucide-react';
import { useAcademicYearSafe } from '@/context/AcademicYearContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiStudent {
  id: string;
  admissionNo: string;
  name: string;
  rollNo: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  bloodGroup: string | null;
  house: string | null;
  address: string | null;
  city: string | null;
  isActive: boolean;
  admissionDate: string;
  grade: { name: string; academicYearId: string } | null;
  section: { name: string } | null;
  feeAccount: { status: string; balance: number } | null;
  parents: Array<{ parent: { fatherName: string | null; motherName: string | null; phone: string | null } }>;
}

interface ApiGrade {
  id: string;
  name: string;
  displayOrder: number;
  academicYearId: string;
  sections: Array<{ id: string; name: string }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const feeColors: Record<string, string> = {
  PAID:    'bg-green/10 text-green border-green/20',
  PENDING: 'bg-amber/10 text-amber border-amber/20',
  OVERDUE: 'bg-coral/10 text-coral border-coral/20',
  PARTIAL: 'bg-blue-50 text-blue-700 border-blue-200',
};

const houseColors: Record<string, string> = {
  Tagore:  'bg-blue-50 text-blue-700 border-blue-200',
  Bose:    'bg-purple-50 text-purple-700 border-purple-200',
  Roy:     'bg-amber-50 text-amber-700 border-amber-200',
  Teresa:  'bg-rose-50 text-rose-700 border-rose-200',
};

const genderIcon = (g: string | null) => g === 'FEMALE' ? '♀' : g === 'MALE' ? '♂' : '—';

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function avatarColor(name: string) {
  const colors = ['bg-navy', 'bg-teal', 'bg-purple', 'bg-coral', 'bg-green'];
  return colors[name.charCodeAt(0) % colors.length];
}

// ─── Field wrapper (must live outside StudentDrawer to avoid remount on re-render) ─

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-700 mb-1.5 block">{label}</label>
      {children}
      {error && <p className="text-xs text-coral mt-1">{error}</p>}
    </div>
  );
}

// ─── Add / Edit Student Drawer ────────────────────────────────────────────────

interface StudentDrawerProps {
  mode: 'add' | 'edit';
  student?: ApiStudent;
  grades: ApiGrade[];
  onClose: () => void;
  onSaved: () => void;
}

function StudentDrawer({ mode, student, grades, onClose, onSaved }: StudentDrawerProps) {
  const [form, setForm] = useState({
    admissionNo: student?.admissionNo ?? '',
    name: student?.name ?? '',
    gender: student?.gender ?? 'MALE',
    dateOfBirth: student?.dateOfBirth ? student.dateOfBirth.slice(0, 10) : '',
    bloodGroup: student?.bloodGroup ?? '',
    house: student?.house ?? 'Tagore',
    gradeId: '',
    sectionId: '',
    rollNo: student?.rollNo ?? '',
    address: student?.address ?? '',
    city: student?.city ?? '',
    fatherName: student?.parents[0]?.parent.fatherName ?? '',
    motherName: student?.parents[0]?.parent.motherName ?? '',
    phone: student?.parents[0]?.parent.phone ?? '',
    admissionDate: student?.admissionDate ? student.admissionDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [feeGuard, setFeeGuard] = useState<'idle' | 'checking' | 'ok' | 'missing'>('idle');
  const [admNoMode, setAdmNoMode] = useState<'auto' | 'manual'>('auto');
  const [admNoLoading, setAdmNoLoading] = useState(false);

  const availableSections = grades.find(g => g.id === form.gradeId)?.sections ?? [];

  // Enrollment guard — check if an active fee plan covers the selected grade
  useEffect(() => {
    if (mode !== 'add' || !form.gradeId) { setFeeGuard('idle'); return; }
    const grade = grades.find(g => g.id === form.gradeId);
    if (!grade) { setFeeGuard('idle'); return; }
    setFeeGuard('checking');
    fetch(`/api/fee/plans?gradeId=${form.gradeId}&academicYearId=${grade.academicYearId}&active=true`)
      .then(r => r.json())
      .then((data: unknown[]) => setFeeGuard(Array.isArray(data) && data.length > 0 ? 'ok' : 'missing'))
      .catch(() => setFeeGuard('idle'));
  }, [form.gradeId, mode, grades]);

  useEffect(() => {
    if (mode === 'edit' && student) {
      const g = grades.find(gr => gr.name === student.grade?.name);
      if (g) {
        const sec = g.sections.find(s => s.name === student.section?.name);
        setForm(f => ({ ...f, gradeId: g.id, sectionId: sec?.id ?? '' }));
      }
    }
  }, [mode, student, grades]);

  const fetchNextAdmNo = useCallback(async () => {
    setAdmNoLoading(true);
    try {
      const res = await fetch('/api/students/next-admission-no');
      if (res.ok) {
        const data = await res.json();
        setForm(f => ({ ...f, admissionNo: data.admissionNo ?? '' }));
      }
    } finally {
      setAdmNoLoading(false);
    }
  }, []);

  // Auto-fetch when drawer opens in add mode with auto mode selected
  useEffect(() => {
    if (mode === 'add' && admNoMode === 'auto') fetchNextAdmNo();
  }, [mode, admNoMode, fetchNextAdmNo]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Required';
    if (mode === 'add' && !form.admissionNo.trim()) e.admissionNo = 'Required';
    if (!form.gradeId) e.gradeId = 'Required';
    if (!form.sectionId) e.sectionId = 'Required';
    if (!form.admissionDate) e.admissionDate = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const url = mode === 'add' ? '/api/students' : `/api/students/${student!.id}`;
      const method = mode === 'add' ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        let msg = `Server error (${res.status})`;
        try {
          const body = await res.json();
          msg = body.error ?? msg;
        } catch { /* response wasn't JSON */ }
        toast.error(msg);
        return;
      }
      toast.success(mode === 'add' ? `${form.name} enrolled successfully` : 'Student updated');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Network error — please try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-fadeIn">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-sora font-bold text-navy text-lg">
              {mode === 'add' ? 'Enrol New Student' : 'Edit Student'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {mode === 'add' ? 'Fill in student details' : `Editing ${student?.name}`}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {mode === 'add' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-700">Student Code / Admission No. *</label>
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setAdmNoMode('auto')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${admNoMode === 'auto' ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    Auto-generate
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdmNoMode('manual')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${admNoMode === 'manual' ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    Manual
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder={admNoMode === 'auto' ? 'Generating...' : 'e.g. STU2025-001'}
                  value={form.admissionNo}
                  readOnly={admNoMode === 'auto'}
                  onChange={admNoMode === 'manual' ? e => setForm(f => ({ ...f, admissionNo: e.target.value })) : undefined}
                  className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 pr-10 ${errors.admissionNo ? 'border-coral' : 'border-gray-200'} ${admNoMode === 'auto' ? 'bg-gray-50 text-gray-600 cursor-default' : ''}`}
                />
                {admNoMode === 'auto' && (
                  <button
                    type="button"
                    onClick={fetchNextAdmNo}
                    disabled={admNoLoading}
                    title="Refresh suggestion"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-navy transition-colors disabled:opacity-40">
                    <RefreshCw className={`w-3.5 h-3.5 ${admNoLoading ? 'animate-spin' : ''}`} />
                  </button>
                )}
              </div>
              {errors.admissionNo && <p className="text-xs text-coral mt-1">{errors.admissionNo}</p>}
              {admNoMode === 'auto' && (
                <p className="text-[10px] text-gray-400 mt-1">Suggested next number — click <RefreshCw className="w-2.5 h-2.5 inline" /> to regenerate</p>
              )}
            </div>
          )}

          <Field label="Student Name *" error={errors.name}>
            <input type="text" placeholder="Full name" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 ${errors.name ? 'border-coral' : 'border-gray-200'}`} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Class *" error={errors.gradeId}>
              <select value={form.gradeId}
                onChange={e => setForm(f => ({ ...f, gradeId: e.target.value, sectionId: '' }))}
                className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 ${errors.gradeId ? 'border-coral' : 'border-gray-200'}`}>
                <option value="">Select...</option>
                {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </Field>
            <Field label="Section *" error={errors.sectionId}>
              <select value={form.sectionId}
                onChange={e => setForm(f => ({ ...f, sectionId: e.target.value }))}
                disabled={!form.gradeId}
                className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 disabled:opacity-50 ${errors.sectionId ? 'border-coral' : 'border-gray-200'}`}>
                <option value="">Select...</option>
                {availableSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of Birth">
              <input type="date" value={form.dateOfBirth}
                onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20" />
            </Field>
            <Field label="Gender">
              <select value={form.gender}
                onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-navy/20">
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Blood Group">
              <select value={form.bloodGroup}
                onChange={e => setForm(f => ({ ...f, bloodGroup: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-navy/20">
                <option value="">Select...</option>
                {([
                  ['O_POS','O+'],['O_NEG','O-'],
                  ['A_POS','A+'],['A_NEG','A-'],
                  ['B_POS','B+'],['B_NEG','B-'],
                  ['AB_POS','AB+'],['AB_NEG','AB-'],
                ] as [string,string][]).map(([val,label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="House">
              <select value={form.house}
                onChange={e => setForm(f => ({ ...f, house: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-navy/20">
                {['Tagore','Bose','Roy','Teresa'].map(h => <option key={h}>{h}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Roll Number">
              <input type="text" placeholder="e.g. X-A-01" value={form.rollNo}
                onChange={e => setForm(f => ({ ...f, rollNo: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20" />
            </Field>
            <Field label="Admission Date *" error={errors.admissionDate}>
              <input type="date" value={form.admissionDate}
                onChange={e => setForm(f => ({ ...f, admissionDate: e.target.value }))}
                className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 ${errors.admissionDate ? 'border-coral' : 'border-gray-200'}`} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Father's Name">
              <input type="text" placeholder="Father's name" value={form.fatherName}
                onChange={e => setForm(f => ({ ...f, fatherName: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20" />
            </Field>
            <Field label="Mother's Name">
              <input type="text" placeholder="Mother's name" value={form.motherName}
                onChange={e => setForm(f => ({ ...f, motherName: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20" />
            </Field>
          </div>

          <Field label="Parent Phone">
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="tel" placeholder="10-digit mobile number" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20" />
            </div>
          </Field>

          <Field label="Address">
            <textarea rows={2} placeholder="Home address" value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none" />
          </Field>
        </div>

        {/* Fee structure guard — only shown during new enrollment when no plan exists */}
        {mode === 'add' && feeGuard === 'missing' && (
          <div className="mx-5 mb-3 flex items-start gap-3 bg-coral/8 border border-coral/25 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-coral flex-shrink-0 mt-0.5" />
            <div className="text-xs text-coral">
              <p className="font-semibold">No active fee plan for this class.</p>
              <p className="mt-0.5 text-coral/80">
                Set up a fee plan before enrolling students.{' '}
                <a href="/fee" className="underline font-semibold hover:text-coral">
                  Go to Fee Structure →
                </a>
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3 p-5 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || feeGuard === 'missing' || feeGuard === 'checking'}
            className="flex-1 py-2.5 text-sm font-bold bg-gold text-navy rounded-xl hover:bg-gold/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? 'Saving...' : feeGuard === 'checking' ? 'Checking fee plan…' : mode === 'add' ? 'Enrol Student' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Promote Modal ────────────────────────────────────────────────────────────

interface PromoteModalProps {
  student: ApiStudent;
  grades: ApiGrade[];
  onClose: () => void;
  onDone: () => void;
}

function PromoteModal({ student, grades, onClose, onDone }: PromoteModalProps) {
  const [toGradeId, setToGradeId] = useState('');
  const [toSectionId, setToSectionId] = useState('');
  const [saving, setSaving] = useState(false);

  const availableSections = grades.find(g => g.id === toGradeId)?.sections ?? [];

  const handlePromote = async () => {
    if (!toGradeId || !toSectionId) { toast.error('Select grade and section'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/students/${student.id}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toGradeId, toSectionId }),
      });
      if (!res.ok) { const b = await res.json(); toast.error(b.error ?? 'Failed'); return; }
      const targetGrade = grades.find(g => g.id === toGradeId);
      const targetSection = availableSections.find(s => s.id === toSectionId);
      toast.success(`${student.name} promoted to ${targetGrade?.name} – ${targetSection?.name}`);
      onDone();
      onClose();
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-fadeIn">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-sora font-bold text-navy text-lg">Promote Student</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {student.name} — {student.grade?.name} / {student.section?.name}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Move to Class</label>
            <select value={toGradeId} onChange={e => { setToGradeId(e.target.value); setToSectionId(''); }}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-navy/20">
              <option value="">Select class...</option>
              {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Section</label>
            <select value={toSectionId} onChange={e => setToSectionId(e.target.value)}
              disabled={!toGradeId}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 disabled:opacity-50">
              <option value="">Select section...</option>
              {availableSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handlePromote} disabled={saving}
            className="flex-1 py-2.5 text-sm font-bold bg-navy text-white rounded-xl hover:bg-navy/90 disabled:opacity-60">
            {saving ? 'Promoting...' : 'Promote'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Row Actions Menu ─────────────────────────────────────────────────────────

interface ActionsMenuProps {
  student: ApiStudent;
  onEdit: () => void;
  onPromote: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}

function ActionsMenu({ student, onEdit, onPromote, onToggleActive, onDelete }: ActionsMenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="w-8 h-8 flex items-center justify-center text-gray-700 bg-gray-100 hover:bg-gray-200 hover:text-navy rounded-lg transition-colors">
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
            <button onClick={() => { setOpen(false); onEdit(); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
            <button onClick={() => { setOpen(false); onPromote(); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
              <ArrowUpRight className="w-3.5 h-3.5" /> Promote
            </button>
            <button onClick={() => { setOpen(false); onToggleActive(); }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left ${student.isActive ? 'text-amber' : 'text-green'}`}>
              {student.isActive ? <UserMinus className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {student.isActive ? 'Deactivate' : 'Reactivate'}
            </button>
            <div className="border-t border-gray-100" />
            <button onClick={() => { setOpen(false); onDelete(); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-coral hover:bg-coral/5 transition-colors text-left">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 bg-navy/8 text-navy text-xs rounded-full font-semibold">
      {label}
      <button onClick={onRemove} className="hover:text-coral transition-colors">
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StudentsPage() {
  const router = useRouter();
  const ayCtx = useAcademicYearSafe();

  const [students, setStudents] = useState<ApiStudent[]>([]);
  const [grades, setGrades] = useState<ApiGrade[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterGradeId, setFilterGradeId] = useState('');
  const [filterSectionId, setFilterSectionId] = useState('');
  const [filterFee, setFilterFee] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [page, setPage] = useState(1);
  const LIMIT = 50;

  const [showAdd, setShowAdd] = useState(false);
  const [editingStudent, setEditingStudent] = useState<ApiStudent | null>(null);
  const [promotingStudent, setPromotingStudent] = useState<ApiStudent | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ApiStudent | null>(null);

  const viewingYearId = ayCtx?.viewingYear?.id;
  const yearLabel = ayCtx?.viewingYear?.label ?? '';
  const isHistorical = ayCtx && ayCtx.viewingYear?.id !== ayCtx.dbCurrentYear?.id;

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (filterGradeId) params.set('gradeId', filterGradeId);
      if (filterSectionId) params.set('sectionId', filterSectionId);
      if (viewingYearId) params.set('academicYearId', viewingYearId);
      if (includeInactive) params.set('includeInactive', 'true');
      params.set('page', String(page));
      params.set('limit', String(LIMIT));

      const res = await fetch(`/api/students?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      let list: ApiStudent[] = data.data ?? [];
      if (filterFee) list = list.filter(s => s.feeAccount?.status === filterFee);
      setStudents(list);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [search, filterGradeId, filterSectionId, filterFee, includeInactive, viewingYearId, page]);

  useEffect(() => {
    fetch('/api/grades').then(r => r.json()).then((data: ApiGrade[]) => {
      const filtered = viewingYearId ? data.filter(g => g.academicYearId === viewingYearId) : data;
      setGrades(filtered);
    });
  }, [viewingYearId]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);
  useEffect(() => { setPage(1); }, [search, filterGradeId, filterSectionId, filterFee, includeInactive, viewingYearId]);

  const handleToggleActive = async (student: ApiStudent) => {
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !student.isActive }),
      });
      if (!res.ok) { toast.error('Failed to update'); return; }
      toast.success(student.isActive ? `${student.name} deactivated` : `${student.name} reactivated`);
      fetchStudents();
    } catch { toast.error('Network error'); }
  };

  const handleDelete = async (student: ApiStudent) => {
    try {
      const res = await fetch(`/api/students/${student.id}`, { method: 'DELETE' });
      if (!res.ok) { toast.error('Failed to delete'); return; }
      toast.success(`${student.name} removed`);
      setDeleteConfirm(null);
      fetchStudents();
    } catch { toast.error('Network error'); }
  };

  const totalActive = students.filter(s => s.isActive).length;
  const feeOverdue = students.filter(s => s.feeAccount?.status === 'OVERDUE').length;
  const sectionOptions = grades.find(g => g.id === filterGradeId)?.sections ?? [];

  return (
    <PageWrapper>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-sora font-bold text-navy text-2xl leading-tight">Student Management</h1>
          <p className="text-sm text-gray-500 mt-1 font-dm-sans flex items-center gap-2">
            {loading ? 'Loading...' : `${total} students`}
            {yearLabel && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isHistorical ? 'bg-amber/10 text-amber' : 'bg-green/10 text-green'}`}>
                {yearLabel}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchStudents()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gold text-navy text-sm font-bold rounded-lg hover:bg-gold/90 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Enrol Student
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Students', value: total, icon: Users, color: 'text-navy', bg: 'bg-navy/8' },
          { label: 'Active', value: totalActive, icon: UserCheck, color: 'text-green', bg: 'bg-green/8' },
          { label: 'Inactive', value: total - totalActive, icon: UserX, color: 'text-amber', bg: 'bg-amber/8' },
          { label: 'Fee Overdue', value: feeOverdue, icon: AlertTriangle, color: 'text-coral', bg: 'bg-coral/8' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className={`font-sora font-bold text-2xl ${color}`}>{loading ? '—' : value}</p>
              <p className="text-xs text-gray-500 font-dm-sans">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by name, admission no, roll no..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/20" />
          </div>

          <select value={filterGradeId}
            onChange={e => { setFilterGradeId(e.target.value); setFilterSectionId(''); }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-navy/20">
            <option value="">All Classes</option>
            {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>

          <select value={filterSectionId} onChange={e => setFilterSectionId(e.target.value)}
            disabled={!filterGradeId}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 disabled:opacity-50">
            <option value="">All Sections</option>
            {sectionOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <select value={filterFee} onChange={e => setFilterFee(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-navy/20">
            <option value="">All Fee Status</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="OVERDUE">Overdue</option>
            <option value="PARTIAL">Partial</option>
          </select>

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={includeInactive}
              onChange={e => setIncludeInactive(e.target.checked)}
              className="rounded" />
            Show inactive
          </label>

          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden ml-auto">
            <button onClick={() => setView('list')}
              className={`px-2.5 py-2 transition-colors ${view === 'list' ? 'bg-navy text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setView('grid')}
              className={`px-2.5 py-2 transition-colors ${view === 'grid' ? 'bg-navy text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {(search || filterGradeId || filterSectionId || filterFee || includeInactive) && (
          <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400 flex items-center gap-1"><Filter className="w-3 h-3" /> Filters:</span>
            {search && <FilterChip label={`"${search}"`} onRemove={() => setSearch('')} />}
            {filterGradeId && <FilterChip label={grades.find(g => g.id === filterGradeId)?.name ?? ''} onRemove={() => { setFilterGradeId(''); setFilterSectionId(''); }} />}
            {filterSectionId && <FilterChip label={`Sec ${sectionOptions.find(s => s.id === filterSectionId)?.name ?? ''}`} onRemove={() => setFilterSectionId('')} />}
            {filterFee && <FilterChip label={filterFee} onRemove={() => setFilterFee('')} />}
            {includeInactive && <FilterChip label="Incl. Inactive" onRemove={() => setIncludeInactive(false)} />}
            <button onClick={() => { setSearch(''); setFilterGradeId(''); setFilterSectionId(''); setFilterFee(''); setIncludeInactive(false); }}
              className="text-xs text-coral hover:underline ml-1">Clear all</button>
          </div>
        )}
      </div>

      {/* List View */}
      {view === 'list' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Student</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Class</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Admission No</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">House</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Fee</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Parent</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Status</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: j === 0 ? '120px' : '60px' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-gray-400">
                      <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="font-semibold text-gray-500">No students found</p>
                      <p className="text-sm mt-1">Try adjusting your filters or enrol a new student</p>
                    </td>
                  </tr>
                ) : (
                  students.map(student => (
                    <tr key={student.id}
                      className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                      onClick={() => router.push(`/academics/${student.id}`)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${avatarColor(student.name)} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                            {initials(student.name)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800 leading-tight">{student.name}</p>
                            <p className="text-[11px] text-gray-400">{genderIcon(student.gender)} · Roll {student.rollNo ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">{student.grade?.name ?? '—'}</span>
                        <span className="text-xs text-gray-400 ml-1">/ {student.section?.name ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-gray-500 font-mono">{student.admissionNo}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {student.house ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${houseColors[student.house] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            {student.house}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {student.feeAccount ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${feeColors[student.feeAccount.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            {student.feeAccount.status}
                          </span>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {student.parents[0] ? (
                          <div>
                            <p className="text-xs text-gray-700">{student.parents[0].parent.fatherName ?? student.parents[0].parent.motherName ?? '—'}</p>
                            <p className="text-[10px] text-gray-400">{student.parents[0].parent.phone ?? '—'}</p>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${student.isActive ? 'bg-green/10 text-green' : 'bg-gray-100 text-gray-500'}`}>
                          {student.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <ActionsMenu
                          student={student}
                          onEdit={() => setEditingStudent(student)}
                          onPromote={() => setPromotingStudent(student)}
                          onToggleActive={() => handleToggleActive(student)}
                          onDelete={() => setDeleteConfirm(student)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {total > LIMIT && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
              </p>
              <div className="flex items-center gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">
                  Prev
                </button>
                <button disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid View */}
      {view === 'grid' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm animate-pulse">
                <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3" />
                <div className="h-4 bg-gray-100 rounded mb-2" />
                <div className="h-3 bg-gray-100 rounded w-2/3 mx-auto" />
              </div>
            ))
          ) : students.length === 0 ? (
            <div className="col-span-full text-center py-16 text-gray-400">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-gray-500">No students found</p>
            </div>
          ) : students.map(student => (
            <div key={student.id}
              className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => router.push(`/academics/${student.id}`)}>
              <div className={`w-12 h-12 rounded-full ${avatarColor(student.name)} flex items-center justify-center text-white font-bold text-sm mx-auto mb-3`}>
                {initials(student.name)}
              </div>
              <p className="text-sm font-semibold text-navy text-center leading-tight truncate">{student.name}</p>
              <p className="text-xs text-gray-400 text-center mt-0.5">{student.grade?.name} · {student.section?.name}</p>
              <div className="flex items-center justify-center gap-2 mt-3">
                {student.feeAccount && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${feeColors[student.feeAccount.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {student.feeAccount.status}
                  </span>
                )}
                {student.house && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${houseColors[student.house] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {student.house}
                  </span>
                )}
              </div>
              <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <button onClick={() => setEditingStudent(student)}
                  className="flex-1 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
                  Edit
                </button>
                <button onClick={() => router.push(`/academics/${student.id}`)}
                  className="flex-1 py-1 text-xs bg-navy/5 text-navy rounded-lg hover:bg-navy/10 transition-colors font-semibold">
                  Profile <ChevronRight className="w-3 h-3 inline" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <StudentDrawer mode="add" grades={grades} onClose={() => setShowAdd(false)} onSaved={fetchStudents} />
      )}
      {editingStudent && (
        <StudentDrawer mode="edit" student={editingStudent} grades={grades} onClose={() => setEditingStudent(null)} onSaved={fetchStudents} />
      )}
      {promotingStudent && (
        <PromoteModal student={promotingStudent} grades={grades} onClose={() => setPromotingStudent(null)} onDone={fetchStudents} />
      )}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fadeIn">
            <div className="w-12 h-12 bg-coral/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-coral" />
            </div>
            <h3 className="font-sora font-bold text-navy text-center text-lg mb-2">Remove Student</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Are you sure you want to remove <strong>{deleteConfirm.name}</strong>? This soft-deletes the record.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 text-sm font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 text-sm font-bold bg-coral text-white rounded-xl hover:bg-coral/90 transition-colors">
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 text-xs text-gray-400 font-dm-sans">
        <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Click any row to view 360° profile</span>
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Session: {yearLabel || 'Loading...'}</span>
      </div>
    </PageWrapper>
  );
}

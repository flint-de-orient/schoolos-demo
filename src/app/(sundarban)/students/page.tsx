'use client';

import { useState } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  Search, Plus, Users, AlertTriangle, CreditCard,
  LayoutGrid, List, X, Phone, MapPin, Calendar, BookOpen,
  ChevronRight, Filter, Download, GraduationCap, Heart
} from 'lucide-react';
import studentsData from '@/data/students.json';

type Student = typeof studentsData[number];

// ─── Filters ─────────────────────────────────────────────────────────────────

const feeColors: Record<string, string> = {
  paid:    'bg-green/10 text-green border-green/20',
  pending: 'bg-amber/10 text-amber border-amber/20',
  overdue: 'bg-coral/10 text-coral border-coral/20',
};

const houseColors: Record<string, string> = {
  Tagore:  'bg-blue-50 text-blue-700 border-blue-200',
  Bose:    'bg-purple-50 text-purple-700 border-purple-200',
  Roy:     'bg-amber-50 text-amber-700 border-amber-200',
  Teresa:  'bg-rose-50 text-rose-700 border-rose-200',
};

const attendanceColor = (pct: number) =>
  pct >= 90 ? 'text-green' : pct >= 75 ? 'text-amber' : 'text-coral';

// ─── New Student Modal ────────────────────────────────────────────────────────

function NewStudentModal({ onClose, onAdd }: { onClose: () => void; onAdd: (s: Partial<Student>) => void }) {
  const [form, setForm] = useState({
    name: '', class: '', section: 'A', gender: 'Male',
    dob: '', fatherName: '', motherName: '', phone: '', address: '',
    bloodGroup: '', house: 'Tagore',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const classOptions = ['Nursery','LKG','UKG','Class I','Class II','Class III','Class IV','Class V','Class VI','Class VII','Class VIII','Class IX','Class X','Class XI','Class XII'];

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.class) e.class = 'Required';
    if (!form.dob) e.dob = 'Required';
    if (!form.fatherName.trim() && !form.motherName.trim()) e.fatherName = 'At least one parent name required';
    if (!form.phone.trim() || !/^\d{10}$/.test(form.phone)) e.phone = 'Valid 10-digit number required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const id = `STU${Date.now()}`;
    onAdd({
      id,
      name: form.name.trim(),
      class: form.class,
      section: form.section,
      rollNo: `${form.class.replace('Class ', '')}-${form.section}-NEW`,
      dob: form.dob,
      gender: form.gender,
      bloodGroup: form.bloodGroup || 'O+',
      address: form.address,
      house: form.house,
      feeStatus: 'pending',
      attendancePercent: 100,
      admissionDate: new Date().toISOString().split('T')[0],
      parent: {
        father: form.fatherName,
        mother: form.motherName,
        phone: form.phone,
        email: '',
        occupation: '',
      },
      academicScore: { english: 0, mathematics: 0, science: 0, history: 0, geography: 0, bengali: 0 },
      predictedBoardScore: 0,
      learningStyle: 'Visual',
      achievements: [],
      libraryBooksIssued: 0,
      medicalNotes: '',
      photo: null,
    });
    toast.success(`${form.name} enrolled successfully`, { description: `${form.class} · Section ${form.section}` });
    onClose();
  };

  const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
    <div>
      <label className="text-xs font-semibold text-gray-700 mb-1.5 block">{label}</label>
      {children}
      {error && <p className="text-xs text-coral mt-1">{error}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="font-sora font-bold text-navy text-lg">Enrol New Student</h2>
            <p className="text-xs text-gray-400 mt-0.5">Fill in the student details below</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Student name */}
          <Field label="Student Name *" error={errors.name}>
            <input type="text" placeholder="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 ${errors.name ? 'border-coral' : 'border-gray-200'}`} />
          </Field>

          {/* Class + Section */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Class *" error={errors.class}>
              <select value={form.class} onChange={e => setForm(f => ({ ...f, class: e.target.value }))}
                className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 ${errors.class ? 'border-coral' : 'border-gray-200'}`}>
                <option value="">Select...</option>
                {classOptions.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Section">
              <select value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-navy/20">
                {['A','B','C','D'].map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          {/* DOB + Gender */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of Birth *" error={errors.dob}>
              <input type="date" value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))}
                className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 ${errors.dob ? 'border-coral' : 'border-gray-200'}`} />
            </Field>
            <Field label="Gender">
              <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-navy/20">
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </Field>
          </div>

          {/* Blood Group + House */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Blood Group">
              <select value={form.bloodGroup} onChange={e => setForm(f => ({ ...f, bloodGroup: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-navy/20">
                {['O+','O-','A+','A-','B+','B-','AB+','AB-'].map(g => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="House">
              <select value={form.house} onChange={e => setForm(f => ({ ...f, house: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-navy/20">
                {['Tagore','Bose','Roy','Teresa'].map(h => <option key={h}>{h}</option>)}
              </select>
            </Field>
          </div>

          {/* Parent names */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Father's Name" error={errors.fatherName}>
              <input type="text" placeholder="Father's name" value={form.fatherName} onChange={e => setForm(f => ({ ...f, fatherName: e.target.value }))}
                className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 ${errors.fatherName ? 'border-coral' : 'border-gray-200'}`} />
            </Field>
            <Field label="Mother's Name">
              <input type="text" placeholder="Mother's name" value={form.motherName} onChange={e => setForm(f => ({ ...f, motherName: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20" />
            </Field>
          </div>

          {/* Phone */}
          <Field label="Parent Phone *" error={errors.phone}>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="tel" placeholder="10-digit mobile number" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g,'').slice(0,10) }))}
                className={`w-full pl-9 pr-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 ${errors.phone ? 'border-coral' : 'border-gray-200'}`} />
            </div>
          </Field>

          {/* Address */}
          <Field label="Address">
            <textarea rows={2} placeholder="Home address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none" />
          </Field>
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} className="flex-1 py-2.5 text-sm font-semibold bg-gold text-navy rounded-xl hover:bg-gold/90 transition-colors">
            Enrol Student
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Student Detail Drawer ────────────────────────────────────────────────────

function StudentDrawer({ student, onClose }: { student: Student & { isNew?: boolean }; onClose: () => void }) {
  const router = useRouter();
  const avg = Math.round(Object.values(student.academicScore).reduce((a, b) => a + b, 0) / 6);
  const feeCfg = feeColors[student.feeStatus] ?? feeColors.pending;
  const houseCfg = houseColors[student.house] ?? 'bg-gray-50 text-gray-600 border-gray-200';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end" onClick={onClose}>
      <div className="bg-white w-full max-w-sm h-full overflow-y-auto shadow-2xl animate-slideIn" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="gradient-navy text-white p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-ice/60">{student.rollNo}</span>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-gold flex items-center justify-center mb-3">
            <span className="text-navy font-bold text-lg font-sora">
              {student.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </span>
          </div>
          <h2 className="font-sora font-bold text-lg">{student.name}</h2>
          <p className="text-ice/70 text-sm">{student.class} · Section {student.section}</p>
          <div className="flex gap-2 mt-3">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${houseCfg}`}>{student.house} House</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${feeCfg}`}>{student.feeStatus}</span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
          {[
            { label: 'Attendance', value: `${student.attendancePercent}%`, color: attendanceColor(student.attendancePercent) },
            { label: 'Avg Score', value: avg || '—', color: 'text-navy' },
            { label: 'Books Out', value: student.libraryBooksIssued, color: 'text-teal' },
          ].map(stat => (
            <div key={stat.label} className="p-3 text-center">
              <div className={`text-lg font-sora font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Info rows */}
        <div className="p-4 space-y-3 border-b border-gray-100">
          {[
            { icon: Calendar, label: 'Date of Birth', value: student.dob },
            { icon: Heart, label: 'Blood Group', value: student.bloodGroup },
            { icon: Phone, label: 'Parent Phone', value: student.parent.phone },
            { icon: MapPin, label: 'Address', value: student.address },
            { icon: BookOpen, label: 'Admission Date', value: student.admissionDate },
          ].map(row => {
            const Icon = row.icon;
            return (
              <div key={row.label} className="flex gap-2.5">
                <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-[10px] text-gray-400">{row.label}</div>
                  <div className="text-xs font-semibold text-gray-700 truncate">{row.value}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Medical notes */}
        {student.medicalNotes && (
          <div className="p-4 border-b border-gray-100">
            <div className="bg-amber/8 border border-amber/20 rounded-xl p-3 flex gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-700">{student.medicalNotes}</p>
            </div>
          </div>
        )}

        {/* Parent info */}
        <div className="p-4 border-b border-gray-100 space-y-1.5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Parents</p>
          {student.parent.father && <div className="text-xs text-gray-700"><span className="text-gray-400">Father:</span> {student.parent.father}</div>}
          {student.parent.mother && <div className="text-xs text-gray-700"><span className="text-gray-400">Mother:</span> {student.parent.mother}</div>}
          {student.parent.occupation && <div className="text-xs text-gray-500">Occupation: {student.parent.occupation}</div>}
        </div>

        {/* Actions */}
        <div className="p-4 space-y-2">
          <button
            onClick={() => { router.push(`/academics/${student.id}`); onClose(); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-navy text-white rounded-xl hover:bg-navyMid transition-colors"
          >
            <GraduationCap className="w-4 h-4" /> View Full Profile
          </button>
          <button
            onClick={() => { toast.success(`TC generated for ${student.name}`); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" /> Generate Transfer Certificate
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StudentsPage() {
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [feeFilter, setFeeFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newStudents, setNewStudents] = useState<Partial<Student>[]>([]);
  const [selected, setSelected] = useState<(Student & { isNew?: boolean }) | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const allStudents = [...(newStudents as Student[]), ...studentsData];
  const classes = ['All', ...new Set(studentsData.map(s => s.class))].sort((a, b) => a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b));

  const filtered = allStudents.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNo?.toLowerCase().includes(search.toLowerCase()) ||
      s.parent?.father?.toLowerCase().includes(search.toLowerCase());
    const matchClass = classFilter === 'All' || s.class === classFilter;
    const matchFee = feeFilter === 'All' || s.feeStatus === feeFilter;
    return matchSearch && matchClass && matchFee;
  });

  // Stats
  const totalPaid    = allStudents.filter(s => s.feeStatus === 'paid').length;
  const totalPending = allStudents.filter(s => s.feeStatus === 'pending').length;
  const totalOverdue = allStudents.filter(s => s.feeStatus === 'overdue').length;
  const atRiskCount  = allStudents.filter(s => s.attendancePercent < 75).length;

  return (
    <PageWrapper>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Students', value: allStudents.length, color: 'text-navy', bg: 'bg-navy/10', icon: Users },
          { label: 'Fee Paid', value: totalPaid, color: 'text-green', bg: 'bg-green/10', icon: CreditCard },
          { label: 'Fee Pending/Overdue', value: totalPending + totalOverdue, color: 'text-coral', bg: 'bg-coral/10', icon: CreditCard },
          { label: 'Low Attendance', value: atRiskCount, color: 'text-amber', bg: 'bg-amber/10', icon: AlertTriangle },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <div className={`text-2xl font-sora font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-gray-500 mt-0.5 leading-tight">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, roll no, or parent..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl border transition-colors ${showFilters ? 'bg-navy text-white border-navy' : 'text-gray-600 border-gray-200 hover:border-gray-300'}`}
            >
              <Filter className="w-4 h-4" /> Filters
            </button>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-navy' : 'text-gray-500'}`}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-navy' : 'text-gray-500'}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 bg-gold text-navy font-semibold text-sm px-4 py-2 rounded-xl hover:bg-gold/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Enrol Student
            </button>
          </div>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-100">
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Class</label>
              <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 text-gray-700">
                {classes.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Fee Status</label>
              <div className="flex gap-1.5">
                {['All', 'paid', 'pending', 'overdue'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFeeFilter(f)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors capitalize ${
                      feeFilter === f ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-end">
              <span className="text-xs text-gray-500">{filtered.length} results</span>
            </div>
          </div>
        )}
      </div>

      {/* Student list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-semibold">No students found</p>
          <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(s => {
            const feeCfg = feeColors[s.feeStatus] ?? feeColors.pending;
            const houseCfg = houseColors[s.house] ?? 'bg-gray-50 text-gray-600 border-gray-200';
            return (
              <button
                key={s.id}
                onClick={() => setSelected(s as Student)}
                className="text-left bg-white hover:shadow-md border border-gray-100 hover:border-gray-200 rounded-2xl p-4 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-navy flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold font-sora">
                        {s.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-gray-800">{s.name}</div>
                      <div className="text-xs text-gray-400">{s.rollNo}</div>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 mb-3">{s.class} · Section {s.section}</div>

                {/* Attendance bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-gray-400">Attendance</span>
                    <span className={`font-bold ${attendanceColor(s.attendancePercent)}`}>{s.attendancePercent}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.attendancePercent >= 90 ? 'bg-green' : s.attendancePercent >= 75 ? 'bg-amber' : 'bg-coral'}`}
                      style={{ width: `${s.attendancePercent}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${feeCfg}`}>{s.feeStatus}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${houseCfg}`}>{s.house}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Student', 'Class', 'Roll No', 'Father', 'Phone', 'Attendance', 'Fee', 'House', ''].map(h => (
                    <th key={h} className="text-left text-xs uppercase tracking-wide text-gray-400 px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const feeCfg = feeColors[s.feeStatus] ?? feeColors.pending;
                  const houseCfg = houseColors[s.house] ?? 'bg-gray-50 text-gray-600 border-gray-200';
                  return (
                    <tr
                      key={s.id}
                      className={`border-b border-gray-50 hover:bg-gray-50/80 transition-colors cursor-pointer ${i % 2 !== 0 ? 'bg-gray-50/30' : ''}`}
                      onClick={() => setSelected(s as Student)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-navy flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-[10px] font-bold font-sora">{s.name.split(' ').map(n => n[0]).slice(0,2).join('')}</span>
                          </div>
                          <span className="font-semibold text-sm text-gray-800">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.class}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{s.rollNo}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{s.parent?.father || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{s.parent?.phone}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold ${attendanceColor(s.attendancePercent)}`}>{s.attendancePercent}%</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${feeCfg}`}>{s.feeStatus}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${houseCfg}`}>{s.house}</span>
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">Showing {filtered.length} of {allStudents.length} students</span>
            <button
              onClick={() => toast.success('Student list exported as CSV')}
              className="flex items-center gap-1.5 text-xs font-semibold text-navyMid hover:text-navy transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showNewModal && (
        <NewStudentModal
          onClose={() => setShowNewModal(false)}
          onAdd={s => setNewStudents(prev => [s, ...prev])}
        />
      )}
      {selected && (
        <StudentDrawer student={selected} onClose={() => setSelected(null)} />
      )}
    </PageWrapper>
  );
}

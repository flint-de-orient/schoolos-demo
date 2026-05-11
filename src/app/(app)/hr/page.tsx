'use client';

import { useState, useMemo, useEffect } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { toast } from 'sonner';
import { getInitials } from '@/lib/utils';
import {
  Users, UserPlus, LayoutGrid, List, Search, Filter,
  X, Phone, Mail, Calendar, BookOpen, Award, Check,
  ChevronRight, Download, DollarSign, Clock, TrendingUp,
  Building2, BarChart3, Banknote, FileText, AlertCircle,
  CheckCircle2, XCircle, Plus, Briefcase, Star,
  Brain, CalendarClock, BookMarked, Zap, RefreshCw,
  UserCheck, UserX, AlertOctagon, AlertTriangle, Layers,
  Pencil, Loader2
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import TeacherProfileSheet from '@/components/hr/TeacherProfileSheet';
// ─── Types ────────────────────────────────────────────────────────────────────

type Staff = {
  id: string; name: string; photo: null; designation: string; department: string;
  subject: string | null; joiningDate: string; qualification: string; phone: string;
  email: string; salary: number; leaveBalance: number; status: 'active' | 'on-leave';
  employmentType: string; teachingCapacity: string[];
  weeklyAvailability?: null; weeklyLoad?: { current: number; target: number };
  monthlyLoad?: number; annualLoad?: number;
  _sourceType: 'teacher' | 'staff';
};

type LeaveRequest = {
  id: string; staffId: string; name: string; designation: string;
  type: string; from: string; to: string; days: number;
  reason: string; status: 'Pending' | 'Approved' | 'Rejected';
};

type Tab = 'directory' | 'leave' | 'payroll' | 'analytics' | 'availability';

// ─── Config ───────────────────────────────────────────────────────────────────

const deptConfig: Record<string, { color: string; bg: string; border: string }> = {
  'Administration': { color: 'text-navy',    bg: 'bg-navy/8',    border: 'border-navy/20' },
  'Science & Maths':{ color: 'text-purple',  bg: 'bg-purple/8',  border: 'border-purple/20' },
  'Languages':      { color: 'text-teal',    bg: 'bg-teal/8',    border: 'border-teal/20' },
  'Humanities':     { color: 'text-amber',   bg: 'bg-amber/8',   border: 'border-amber/20' },
  'Technology':     { color: 'text-blue-700',bg: 'bg-blue-50',   border: 'border-blue-200' },
  'Sports':         { color: 'text-green',   bg: 'bg-green/8',   border: 'border-green/20' },
  'Arts':           { color: 'text-pink',    bg: 'bg-pink/8',    border: 'border-pink/20' },
  'Library':        { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  'Health':         { color: 'text-rose-600',bg: 'bg-rose-50',   border: 'border-rose-200' },
  'Support':        { color: 'text-gray-600',bg: 'bg-gray-100',  border: 'border-gray-200' },
  'Accounts':       { color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
};

const getDept = (d: string) => deptConfig[d] ?? { color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200' };

const CHART_COLORS = ['#1E2761','#028090','#F5C542','#534AB7','#D85A30','#3B6D11','#993556','#BA7517','#2563eb','#6b7280'];

const LEAVE_TYPES = ['Casual Leave', 'Medical Leave', 'Earned Leave', 'Maternity Leave', 'Paternity Leave', 'Emergency Leave'];

const seedLeave: LeaveRequest[] = [
  { id: 'LV001', staffId: 'STF005', name: 'Mr. Arijit Das',      designation: 'Teacher',        type: 'Medical Leave',  from: '2026-04-10', to: '2026-04-12', days: 3, reason: 'Fever and flu', status: 'Approved' },
  { id: 'LV002', staffId: 'STF012', name: 'Mrs. Ranjana Bhaduri',designation: 'Teacher',        type: 'Casual Leave',   from: '2026-04-18', to: '2026-04-18', days: 1, reason: 'Family function', status: 'Pending' },
  { id: 'LV003', staffId: 'STF009', name: 'Mr. Tapas Mukherjee', designation: 'Teacher',        type: 'Earned Leave',   from: '2026-04-22', to: '2026-04-24', days: 3, reason: 'Vacation travel', status: 'Pending' },
  { id: 'LV004', staffId: 'STF010', name: 'Mrs. Swapna Dey',     designation: 'Teacher',        type: 'Casual Leave',   from: '2026-03-28', to: '2026-03-28', days: 1, reason: 'Personal work', status: 'Approved' },
  { id: 'LV005', staffId: 'STF014', name: 'Mrs. Priyanka Mondal',designation: 'Teacher',        type: 'Medical Leave',  from: '2026-04-05', to: '2026-04-07', days: 3, reason: 'Surgery follow-up', status: 'Rejected' },
  { id: 'LV006', staffId: 'STF007', name: 'Mr. Prosenjit Chatterjee', designation: 'Teacher',   type: 'Emergency Leave',from: '2026-04-15', to: '2026-04-15', days: 1, reason: 'Family emergency', status: 'Pending' },
];

// ─── Staff Profile Drawer ─────────────────────────────────────────────────────

type DrawerSalarySettings = { hraPercent: number; daPercent: number; taFlat: number; medicalFlat: number; specialAllowancePercent: number; pfPercent: number; professionalTax: number };
type DrawerSalaryGrade = { id: string; name: string; category: string; basicMin: number; basicMax: number };

function computePayslip(basic: number, ss: DrawerSalarySettings) {
  const hra     = Math.round(basic * ss.hraPercent / 100);
  const da      = Math.round(basic * ss.daPercent / 100);
  const ta      = ss.taFlat;
  const medical = ss.medicalFlat;
  const special = Math.round(basic * ss.specialAllowancePercent / 100);
  const gross   = basic + hra + da + ta + medical + special;
  const pf      = Math.round(basic * ss.pfPercent / 100);
  const pt      = ss.professionalTax;
  const net     = gross - pf - pt;
  return { hra, da, ta, medical, special, gross, pf, pt, net };
}

function StaffDrawer({ staff, onClose, onSalaryUpdate }: { staff: Staff; onClose: () => void; onSalaryUpdate?: (id: string, salary: number) => void }) {
  const dept = getDept(staff.department);
  const yearsOfService = new Date().getFullYear() - new Date(staff.joiningDate).getFullYear();
  const [basicSalary, setBasicSalary] = useState(staff.salary);
  const [editingSalary, setEditingSalary] = useState(false);
  const [salaryInput, setSalaryInput] = useState(String(staff.salary || ''));
  const [savingSalary, setSavingSalary] = useState(false);
  const [salaryGrades, setSalaryGrades] = useState<DrawerSalaryGrade[]>([]);
  const [salarySettings, setSalarySettings] = useState<DrawerSalarySettings>({ hraPercent: 20, daPercent: 0, taFlat: 0, medicalFlat: 0, specialAllowancePercent: 0, pfPercent: 12, professionalTax: 200 });
  const [selectedGradeId, setSelectedGradeId] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/hr/salary-grades').then(r => r.json()),
      fetch('/api/hr/salary-settings').then(r => r.json()),
    ]).then(([g, s]) => {
      setSalaryGrades((g.grades ?? []).map((x: DrawerSalaryGrade) => ({ ...x, basicMin: Number(x.basicMin), basicMax: Number(x.basicMax) })));
      const ss = s.settings ?? {};
      setSalarySettings({
        hraPercent: Number(ss.hraPercent ?? 20), daPercent: Number(ss.daPercent ?? 0),
        taFlat: Number(ss.taFlat ?? 0), medicalFlat: Number(ss.medicalFlat ?? 0),
        specialAllowancePercent: Number(ss.specialAllowancePercent ?? 0),
        pfPercent: Number(ss.pfPercent ?? 12), professionalTax: Number(ss.professionalTax ?? 200),
      });
    });
  }, []);

  const payslip = computePayslip(basicSalary, salarySettings);
  const previewPayslip = computePayslip(Number(salaryInput) || 0, salarySettings);

  const handleSaveSalary = async () => {
    const val = Number(salaryInput);
    if (!val || val < 0) { toast.error('Enter a valid salary'); return; }
    setSavingSalary(true);
    const res = await fetch(`/api/hr/staff/${staff.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ salary: val }),
    });
    setSavingSalary(false);
    if (res.ok) {
      setBasicSalary(val);
      setEditingSalary(false);
      onSalaryUpdate?.(staff.id, val);
      toast.success(`Salary updated for ${staff.name}`);
    } else {
      const d = await res.json();
      toast.error(d.error || 'Failed to update salary');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end" onClick={onClose}>
      <div className="bg-white w-full max-w-sm h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="gradient-navy text-white p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-ice/60">{staff.id}</span>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20">
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-gold flex items-center justify-center mb-3 shadow-lg">
            <span className="text-navy font-bold text-xl font-sora">{getInitials(staff.name)}</span>
          </div>
          <h2 className="font-sora font-bold text-lg leading-tight">{staff.name}</h2>
          <p className="text-ice/70 text-sm">{staff.designation}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${dept.bg} ${dept.color} ${dept.border}`}>
              {staff.department}
            </span>
            {staff.subject && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/15 text-white border border-white/20">
                {staff.subject}
              </span>
            )}
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${staff.status === 'active' ? 'bg-green/10 text-green border-green/20' : 'bg-amber/10 text-amber border-amber/20'}`}>
              {staff.status === 'active' ? 'Active' : 'On Leave'}
            </span>
            {'employmentType' in staff && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${staff.employmentType === 'part-time' ? 'bg-purple/15 text-purple border-purple/25' : 'bg-teal/10 text-teal border-teal/20'}`}>
                {staff.employmentType === 'part-time' ? 'Part-Time' : 'Full-Time'}
              </span>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
          {[
            { label: 'Years', value: yearsOfService },
            { label: 'Leave Left', value: staff.leaveBalance },
            { label: 'Net Pay', value: basicSalary > 0 ? `₹${Math.round(payslip.net / 1000)}k` : '—' },
          ].map(s => (
            <div key={s.label} className="p-3 text-center">
              <div className="text-lg font-sora font-bold text-navy">{s.value}</div>
              <div className="text-[10px] text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Details */}
        <div className="p-4 space-y-3 border-b border-gray-100">
          {[
            { icon: Phone,    label: 'Phone',       value: staff.phone },
            { icon: Mail,     label: 'Email',       value: staff.email },
            { icon: Calendar, label: 'Joined',      value: staff.joiningDate },
            { icon: BookOpen, label: 'Qualification', value: staff.qualification },
            { icon: Award,    label: 'Experience',  value: `${yearsOfService} years at Sundarban Academy` },
          ].map(row => {
            const Icon = row.icon;
            return (
              <div key={row.label} className="flex gap-2.5">
                <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] text-gray-400">{row.label}</div>
                  <div className="text-xs font-semibold text-gray-700 break-all">{row.value}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Teaching capacity */}
        {'teachingCapacity' in staff && Array.isArray(staff.teachingCapacity) && staff.teachingCapacity.length > 0 && (
          <div className="p-4 border-b border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <BookMarked className="w-3 h-3" /> Teaching Capacity
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(staff.teachingCapacity as string[]).map((subj: string) => (
                <span key={subj} className={`text-[10px] font-semibold px-2 py-1 rounded-lg border ${subj === staff.subject ? 'bg-navy/10 text-navy border-navy/20' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                  {subj === staff.subject ? '★ ' : ''}{subj}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">★ = Primary subject</p>
          </div>
        )}

        {/* Weekly availability (part-time) */}
        {'weeklyAvailability' in staff && staff.weeklyAvailability && (
          <div className="p-4 border-b border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <CalendarClock className="w-3 h-3" /> Weekly Availability
            </p>
            <div className="space-y-2">
              {(staff.weeklyAvailability as { day: string; slots: string[] }[]).map((avail) => (
                <div key={avail.day} className="flex items-start gap-2">
                  <span className="text-[10px] font-bold text-purple w-20 flex-shrink-0 mt-0.5">{avail.day.slice(0,3)}</span>
                  <div className="flex flex-wrap gap-1">
                    {avail.slots.map((slot: string) => (
                      <span key={slot} className="text-[10px] bg-purple/8 text-purple border border-purple/20 px-1.5 py-0.5 rounded-md font-medium">{slot}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workload */}
        {'weeklyLoad' in staff && (staff.weeklyLoad as { target: number }).target > 0 && (
          <div className="p-4 border-b border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Layers className="w-3 h-3" /> Teaching Load
            </p>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[
                { label: 'Weekly', value: (staff.weeklyLoad as { current: number }).current, target: (staff.weeklyLoad as { target: number }).target },
                { label: 'Monthly', value: staff.monthlyLoad as number },
                { label: 'Annual', value: staff.annualLoad as number },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-lg p-2 text-center">
                  <div className="text-sm font-sora font-bold text-navy">{s.value}</div>
                  <div className="text-[9px] text-gray-400">{s.label} periods</div>
                </div>
              ))}
            </div>
            {(() => {
              const curr = (staff.weeklyLoad as { current: number }).current;
              const tgt = (staff.weeklyLoad as { target: number }).target;
              const diff = curr - tgt;
              if (diff > 3) return <p className="text-[10px] text-coral font-semibold flex items-center gap-1"><AlertOctagon className="w-3 h-3" />Overloaded by {diff} periods/week</p>;
              if (diff < -3) return <p className="text-[10px] text-amber font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Underloaded by {Math.abs(diff)} periods/week</p>;
              return <p className="text-[10px] text-green font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Load balanced</p>;
            })()}
          </div>
        )}

        {/* Salary */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Salary</p>
            {!editingSalary && (
              <button onClick={() => { setSalaryInput(String(basicSalary)); setEditingSalary(true); }}
                className="text-[10px] font-semibold text-navy border border-navy/30 px-2 py-0.5 rounded-lg hover:bg-navy/5 flex items-center gap-1">
                <Pencil className="w-2.5 h-2.5" /> Edit
              </button>
            )}
          </div>

          {editingSalary ? (
            <div className="space-y-2.5">
              {/* Pay Band picker */}
              {salaryGrades.length > 0 && (
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Pay Band <span className="text-gray-300">(optional — auto-fills basic)</span></label>
                  <select
                    value={selectedGradeId}
                    onChange={e => {
                      setSelectedGradeId(e.target.value);
                      const g = salaryGrades.find(x => x.id === e.target.value);
                      if (g) setSalaryInput(String(Math.round((g.basicMin + g.basicMax) / 2)));
                    }}
                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20"
                  >
                    <option value="">Select pay band…</option>
                    {salaryGrades.map(g => (
                      <option key={g.id} value={g.id}>{g.name} — ₹{g.basicMin.toLocaleString('en-IN')} to ₹{g.basicMax.toLocaleString('en-IN')}</option>
                    ))}
                  </select>
                </div>
              )}
              {/* Basic input */}
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Basic Salary (₹ / month)</label>
                <input
                  type="number" min={0} value={salaryInput}
                  onChange={e => { setSalaryInput(e.target.value); setSelectedGradeId(''); }}
                  className="w-full text-sm border-2 border-navy/30 rounded-xl px-3 py-2 focus:outline-none focus:border-navy font-semibold text-navy"
                  autoFocus
                />
              </div>
              {/* Live payslip preview */}
              {Number(salaryInput) > 0 && (
                <div className="bg-iceLight rounded-xl p-3 text-xs space-y-1">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Payslip Preview</p>
                  <div className="flex justify-between text-gray-600"><span>Basic Pay</span><span className="font-semibold">₹{Number(salaryInput).toLocaleString('en-IN')}</span></div>
                  {previewPayslip.hra > 0 && <div className="flex justify-between text-green"><span>HRA ({salarySettings.hraPercent}%)</span><span className="font-semibold">+₹{previewPayslip.hra.toLocaleString('en-IN')}</span></div>}
                  {previewPayslip.da > 0 && <div className="flex justify-between text-green"><span>DA ({salarySettings.daPercent}%)</span><span className="font-semibold">+₹{previewPayslip.da.toLocaleString('en-IN')}</span></div>}
                  {previewPayslip.ta > 0 && <div className="flex justify-between text-green"><span>TA (flat)</span><span className="font-semibold">+₹{previewPayslip.ta.toLocaleString('en-IN')}</span></div>}
                  {previewPayslip.medical > 0 && <div className="flex justify-between text-green"><span>Medical (flat)</span><span className="font-semibold">+₹{previewPayslip.medical.toLocaleString('en-IN')}</span></div>}
                  {previewPayslip.special > 0 && <div className="flex justify-between text-green"><span>Special ({salarySettings.specialAllowancePercent}%)</span><span className="font-semibold">+₹{previewPayslip.special.toLocaleString('en-IN')}</span></div>}
                  <div className="flex justify-between font-semibold text-gray-700 border-t border-navy/10 pt-1"><span>Gross</span><span>₹{previewPayslip.gross.toLocaleString('en-IN')}</span></div>
                  {previewPayslip.pf > 0 && <div className="flex justify-between text-coral"><span>PF ({salarySettings.pfPercent}%)</span><span className="font-semibold">−₹{previewPayslip.pf.toLocaleString('en-IN')}</span></div>}
                  {previewPayslip.pt > 0 && <div className="flex justify-between text-coral"><span>Prof. Tax</span><span className="font-semibold">−₹{previewPayslip.pt.toLocaleString('en-IN')}</span></div>}
                  <div className="flex justify-between font-bold text-navy border-t border-navy/10 pt-1"><span>Net Pay</span><span>₹{previewPayslip.net.toLocaleString('en-IN')}</span></div>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setEditingSalary(false)} className="flex-1 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
                <button onClick={handleSaveSalary} disabled={savingSalary} className="flex-1 py-1.5 text-xs font-semibold bg-navy text-white rounded-xl hover:bg-navyMid disabled:opacity-50 flex items-center justify-center gap-1">
                  {savingSalary ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {basicSalary === 0 ? (
                <div className="text-center py-3 border-2 border-dashed border-gray-200 rounded-xl">
                  <p className="text-xs text-gray-400">No salary assigned</p>
                  <button onClick={() => { setSalaryInput(''); setEditingSalary(true); }} className="text-xs text-navy font-semibold mt-1 hover:underline">Set salary →</button>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Basic Pay</span><span className="font-semibold text-gray-700">₹{basicSalary.toLocaleString('en-IN')}</span></div>
                  {payslip.hra > 0 && <div className="flex justify-between text-xs"><span className="text-gray-500">HRA ({salarySettings.hraPercent}%)</span><span className="font-semibold text-green">+₹{payslip.hra.toLocaleString('en-IN')}</span></div>}
                  {payslip.da > 0 && <div className="flex justify-between text-xs"><span className="text-gray-500">DA ({salarySettings.daPercent}%)</span><span className="font-semibold text-green">+₹{payslip.da.toLocaleString('en-IN')}</span></div>}
                  {payslip.ta > 0 && <div className="flex justify-between text-xs"><span className="text-gray-500">TA (flat)</span><span className="font-semibold text-green">+₹{payslip.ta.toLocaleString('en-IN')}</span></div>}
                  {payslip.medical > 0 && <div className="flex justify-between text-xs"><span className="text-gray-500">Medical</span><span className="font-semibold text-green">+₹{payslip.medical.toLocaleString('en-IN')}</span></div>}
                  {payslip.special > 0 && <div className="flex justify-between text-xs"><span className="text-gray-500">Special Allowance</span><span className="font-semibold text-green">+₹{payslip.special.toLocaleString('en-IN')}</span></div>}
                  <div className="flex justify-between text-xs font-semibold text-gray-600 border-t border-gray-100 pt-1.5"><span>Gross</span><span>₹{payslip.gross.toLocaleString('en-IN')}</span></div>
                  {payslip.pf > 0 && <div className="flex justify-between text-xs"><span className="text-gray-500">PF ({salarySettings.pfPercent}%)</span><span className="font-semibold text-coral">−₹{payslip.pf.toLocaleString('en-IN')}</span></div>}
                  {payslip.pt > 0 && <div className="flex justify-between text-xs"><span className="text-gray-500">Prof. Tax</span><span className="font-semibold text-coral">−₹{payslip.pt.toLocaleString('en-IN')}</span></div>}
                  <div className="flex justify-between text-sm pt-1.5 border-t border-gray-100">
                    <span className="font-bold text-gray-700">Net Pay</span>
                    <span className="font-bold text-navy">₹{payslip.net.toLocaleString('en-IN')}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 space-y-2">
          <button
            onClick={() => toast.success(`Payslip generated for ${staff.name}`)}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-navy text-white rounded-xl hover:bg-navyMid transition-colors"
          >
            <FileText className="w-4 h-4" /> Generate Payslip
          </button>
          <button
            onClick={() => toast.success(`Profile of ${staff.name} exported`)}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" /> Export Profile
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Staff Modal ──────────────────────────────────────────────────────────

function FieldWrapper({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-700 mb-1.5 block">{label}</label>
      {children}
      {error && <p className="text-xs text-coral mt-1">{error}</p>}
    </div>
  );
}

function AddStaffModal({ onClose, onAdd }: { onClose: () => void; onAdd: (s: Staff) => void }) {
  const depts = Object.keys(deptConfig);
  const [form, setForm] = useState({ name: '', designation: '', department: '', subject: '', phone: '', email: '', qualification: '', salary: '', joiningDate: '', isTeacher: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.designation.trim()) e.designation = 'Required';
    if (!form.department) e.department = 'Required';
    if (!form.phone || !/^\d{10}$/.test(form.phone)) e.phone = 'Valid 10-digit number';
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'Valid email required';
    if (!form.isTeacher && (!form.salary || Number(form.salary) < 1)) e.salary = 'Required';
    if (!form.joiningDate) e.joiningDate = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAdd = async () => {
    if (!validate()) return;
    setSaving(true);
    const res = await fetch('/api/hr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(), designation: form.designation.trim(),
        department: form.department, phone: form.phone, email: form.email.trim(),
        qualification: form.qualification || null,
        salary: form.isTeacher ? null : Number(form.salary),
        joiningDate: form.joiningDate, isTeacher: form.isTeacher,
      }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? 'Failed to add staff'); return; }
    const d = await res.json();
    onAdd({
      id: d.id ?? `STF${Date.now()}`,
      name: form.name.trim(), photo: null,
      designation: form.designation.trim(), department: form.department,
      subject: form.subject || null, joiningDate: form.joiningDate,
      qualification: form.qualification || 'Not specified',
      phone: form.phone, email: form.email.trim(),
      salary: Number(form.salary) || 45000, leaveBalance: 15,
      status: 'active', employmentType: 'full-time',
      teachingCapacity: form.subject ? [form.subject] : [],
      _sourceType: form.isTeacher ? 'teacher' : 'staff',
    });
    toast.success(`${form.name} added to staff directory`);
    onClose();
  };

  const inp = (field: keyof typeof form, placeholder: string, type = 'text', extra?: string) => (
    <input type={type} placeholder={placeholder} value={form[field] as string}
      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
      className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 ${errors[field] ? 'border-coral' : 'border-gray-200'} ${extra ?? ''}`} />
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fadeIn">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <div>
            <h2 className="font-sora font-bold text-navy text-lg">Add New Staff Member</h2>
            <p className="text-xs text-gray-400 mt-0.5">Fill in the employee details</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Type toggle */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <span className="text-xs font-semibold text-gray-600">Type:</span>
            {[{ v: false, l: 'Non-Teaching Staff' }, { v: true, l: 'Teaching Staff' }].map(opt => (
              <button key={String(opt.v)} onClick={() => setForm(f => ({ ...f, isTeacher: opt.v }))}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${form.isTeacher === opt.v ? 'bg-navy text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                {opt.l}
              </button>
            ))}
          </div>
          <FieldWrapper label="Full Name *" error={errors.name}>{inp('name', 'e.g. Mrs. Ananya Bose')}</FieldWrapper>
          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Designation *" error={errors.designation}>{inp('designation', form.isTeacher ? 'e.g. Senior Teacher' : 'e.g. Admin Officer')}</FieldWrapper>
            <FieldWrapper label="Department *" error={errors.department}>
              <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 ${errors.department ? 'border-coral' : 'border-gray-200'}`}>
                <option value="">Select...</option>
                {depts.map(d => <option key={d}>{d}</option>)}
              </select>
            </FieldWrapper>
          </div>
          {form.isTeacher && (
            <FieldWrapper label="Subject"><input type="text" placeholder="e.g. Mathematics" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20" /></FieldWrapper>
          )}
          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper label="Phone *" error={errors.phone}>{inp('phone', '10-digit mobile')}</FieldWrapper>
            <FieldWrapper label="Email *" error={errors.email}>{inp('email', 'work email', 'email')}</FieldWrapper>
          </div>
          <FieldWrapper label="Qualification">{inp('qualification', 'e.g. M.Sc Mathematics, B.Ed')}</FieldWrapper>
          <div className="grid grid-cols-2 gap-3">
            {!form.isTeacher && <FieldWrapper label="Basic Salary (₹) *" error={errors.salary}>{inp('salary', 'Monthly basic', 'number')}</FieldWrapper>}
            <FieldWrapper label="Joining Date *" error={errors.joiningDate}>{inp('joiningDate', '', 'date')}</FieldWrapper>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={handleAdd} disabled={saving} className="flex-1 py-2.5 text-sm font-semibold bg-gold text-navy rounded-xl hover:bg-gold/90 transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Add Staff Member'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Apply Leave Modal ────────────────────────────────────────────────────────

function ApplyLeaveModal({ staff, onClose, onApply }: { staff: Staff[]; onClose: () => void; onApply: (l: LeaveRequest) => void }) {
  const [form, setForm] = useState({ staffId: '', type: '', from: '', to: '', reason: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const days = form.from && form.to
    ? Math.max(1, Math.ceil((new Date(form.to).getTime() - new Date(form.from).getTime()) / 86400000) + 1)
    : 0;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.staffId) e.staffId = 'Required';
    if (!form.type) e.type = 'Required';
    if (!form.from) e.from = 'Required';
    if (!form.to) e.to = 'Required';
    else if (form.from && new Date(form.to) < new Date(form.from)) e.to = 'Must be after start date';
    if (!form.reason.trim()) e.reason = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleApply = () => {
    if (!validate()) return;
    const s = staff.find(x => x.id === form.staffId)!;
    onApply({
      id: `LV${Date.now()}`,
      staffId: form.staffId,
      name: s.name,
      designation: s.designation,
      type: form.type,
      from: form.from,
      to: form.to,
      days,
      reason: form.reason.trim(),
      status: 'Pending',
    });
    toast.success(`Leave request submitted for ${s.name}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fadeIn">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div><h2 className="font-sora font-bold text-navy text-lg">Apply for Leave</h2><p className="text-xs text-gray-400 mt-0.5">Submit a leave request</p></div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Staff Member *</label>
            <select value={form.staffId} onChange={e => setForm(f => ({ ...f, staffId: e.target.value }))}
              className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 ${errors.staffId ? 'border-coral' : 'border-gray-200'}`}>
              <option value="">Select staff...</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name} — {s.designation}</option>)}
            </select>
            {errors.staffId && <p className="text-xs text-coral mt-1">{errors.staffId}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Leave Type *</label>
            <div className="grid grid-cols-2 gap-2">
              {LEAVE_TYPES.map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all ${form.type === t ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200 hover:border-navy/40'}`}>
                  {t}
                </button>
              ))}
            </div>
            {errors.type && <p className="text-xs text-coral mt-1">{errors.type}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">From *</label>
              <input type="date" value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))}
                className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 ${errors.from ? 'border-coral' : 'border-gray-200'}`} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">To *</label>
              <input type="date" value={form.to} min={form.from} onChange={e => setForm(f => ({ ...f, to: e.target.value }))}
                className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 ${errors.to ? 'border-coral' : 'border-gray-200'}`} />
            </div>
          </div>
          {days > 0 && (
            <div className="bg-iceLight border border-ice rounded-xl px-3 py-2 text-xs text-navy font-semibold">
              Duration: {days} day{days > 1 ? 's' : ''}
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Reason *</label>
            <textarea rows={3} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Brief reason for leave..."
              className={`w-full px-3 py-2.5 text-sm border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-navy/20 ${errors.reason ? 'border-coral' : 'border-gray-200'}`} />
            {errors.reason && <p className="text-xs text-coral mt-1">{errors.reason}</p>}
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={handleApply} className="flex-1 py-2.5 text-sm font-semibold bg-navy text-white rounded-xl hover:bg-navyMid transition-colors">Submit Request</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function mapTeacher(t: any): Staff {
  const subjectName = t.subjects?.[0]?.subject?.name ?? null;
  const dept = subjectName
    ? (subjectName.match(/maths|math|physics|chemistry|biology/i) ? 'Science & Maths'
      : subjectName.match(/english|bengali|hindi|sanskrit/i) ? 'Languages'
      : subjectName.match(/history|geography|civics|economics/i) ? 'Humanities'
      : subjectName.match(/computer|it|technology/i) ? 'Technology'
      : subjectName.match(/physical|sports/i) ? 'Sports'
      : subjectName.match(/music|art|drawing/i) ? 'Arts'
      : 'Science & Maths')
    : (t.department ?? 'Academic');
  return {
    id: t.id, name: t.name, photo: null,
    designation: t.designation ?? 'Teacher',
    department: dept,
    subject: subjectName,
    joiningDate: t.joiningDate?.split('T')[0] ?? '',
    qualification: t.qualification ?? 'B.Ed.',
    phone: t.phone ?? '', email: t.email ?? '',
    salary: Number(t.salary ?? 45000),
    leaveBalance: 12 - (t.leaveRequests?.length ?? 0),
    status: t.isActive ? 'active' : 'on-leave',
    employmentType: t.type === 'PART_TIME' ? 'part-time' : 'full-time',
    teachingCapacity: t.subjects?.map((s: any) => s.subject?.name).filter(Boolean) ?? [],
    _sourceType: 'teacher',
  };
}

function mapStaff(s: any): Staff {
  return {
    id: s.id, name: s.name, photo: null,
    designation: s.designation ?? 'Staff',
    department: s.department ?? 'Administration',
    subject: null,
    joiningDate: s.joiningDate?.split('T')[0] ?? '',
    qualification: s.qualification ?? 'Graduate',
    phone: s.phone ?? '', email: s.email ?? '',
    salary: Number(s.salary ?? 35000),
    leaveBalance: 12,
    status: s.isActive ? 'active' : 'on-leave',
    employmentType: 'full-time',
    teachingCapacity: [],
    _sourceType: 'staff',
  };
}

export default function HRPage() {
  const [activeTab, setActiveTab] = useState<Tab>('directory');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStaff = () =>
    fetch('/api/hr')
      .then(r => r.json())
      .then(data => {
        const merged = [
          ...(data.teachers ?? []).map(mapTeacher),
          ...(data.staff ?? []).map(mapStaff),
        ];
        setStaffList(merged);
      });

  const loadLeave = () =>
    fetch('/api/hr/leave')
      .then(r => r.json())
      .then(data => {
        setLeaveRequests((data ?? []).map((r: any) => ({
          id: r.id,
          staffId: r.teacherId ?? r.staffId ?? '',
          name: r.teacher?.name ?? r.staff?.name ?? 'Unknown',
          designation: r.teacher?.designation ?? r.staff?.designation ?? 'Staff',
          type: r.leaveType,
          from: r.fromDate?.split('T')[0] ?? '',
          to: r.toDate?.split('T')[0] ?? '',
          days: r.days,
          reason: r.reason ?? '',
          status: r.status === 'APPROVED' ? 'Approved' : r.status === 'REJECTED' ? 'Rejected' : 'Pending',
        })));
      });

  useEffect(() => {
    Promise.all([loadStaff(), loadLeave()]).finally(() => setLoading(false));
  }, []);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showApplyLeave, setShowApplyLeave] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);

  // Directory state
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Leave state
  const [leaveSearch, setLeaveSearch] = useState('');
  const [leaveFilter, setLeaveFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');

  // Payroll state
  const [payrollMonth, setPayrollMonth] = useState('April 2026');
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  const [payrollSearch, setPayrollSearch] = useState('');
  type DBPayroll = { id: string; staffId: string; month: number; year: number; basic: number; allowances: number; pfDeduction: number; tdsDeduction: number; netPay: number; status: string; staff: { id: string; name: string; designation: string; department: string | null } };
  const [dbPayrolls, setDbPayrolls] = useState<DBPayroll[]>([]);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [payrollGenerated, setPayrollGenerated] = useState(false);

  // Availability state
  type AvailEntry = { id: string; teacherId: string; name: string; type: 'absence' | 'extra'; date: string; reason: string; substitute?: string };
  type WeeklySlot = { id: string; teacherId: string; teacherName: string; teacherType: string; designation: string; subject: string | null; day: string; startTime: string; endTime: string };
  type WorkloadEntry = { id: string; name: string; type: string; designation: string | null; subject: string | null; periodsPerWeek: number; maxPeriodsWeek: number };
  const [availEntries, setAvailEntries] = useState<AvailEntry[]>([]);
  const [weeklySlots, setWeeklySlots] = useState<WeeklySlot[]>([]);
  const [workloadData, setWorkloadData] = useState<WorkloadEntry[]>([]);
  const [availLoading, setAvailLoading] = useState(false);
  const [showAvailModal, setShowAvailModal] = useState(false);
  const [availForm, setAvailForm] = useState({ staffId: '', type: 'absence' as 'absence' | 'extra', date: '', endDate: '', period: 'full-day' as 'full-day' | 'partial' | 'multi-day', timeFrom: '', timeTo: '', reason: '' });
  const [savingAvail, setSavingAvail] = useState(false);
  const [rebalancing, setRebalancing] = useState(false);
  const [rebalanced, setRebalanced] = useState(false);
  const [workloadView, setWorkloadView] = useState<'week' | 'month' | 'year'>('week');

  // ── Derived ──
  const depts = useMemo(() => ['All', ...new Set(staffList.map(s => s.department))].sort(), [staffList]);
  const activeCount = useMemo(() => staffList.filter(s => s.status === 'active').length, [staffList]);
  const onLeaveCount = useMemo(() => staffList.filter(s => s.status === 'on-leave').length, [staffList]);
  const pendingLeaveCount = useMemo(() => leaveRequests.filter(l => l.status === 'Pending').length, [leaveRequests]);

  const filteredStaff = useMemo(() => staffList.filter(s => {
    const ms = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.designation.toLowerCase().includes(search.toLowerCase()) ||
      (s.subject ?? '').toLowerCase().includes(search.toLowerCase());
    const md = deptFilter === 'All' || s.department === deptFilter;
    const mx = statusFilter === 'All' || (statusFilter === 'active' ? s.status === 'active' : s.status === 'on-leave');
    return ms && md && mx;
  }), [staffList, search, deptFilter, statusFilter]);

  const filteredLeave = useMemo(() => leaveRequests.filter(l => {
    const ms = l.name.toLowerCase().includes(leaveSearch.toLowerCase()) || l.type.toLowerCase().includes(leaveSearch.toLowerCase());
    const mf = leaveFilter === 'All' || l.status === leaveFilter;
    return ms && mf;
  }).sort((a, b) => (a.status === 'Pending' ? -1 : b.status === 'Pending' ? 1 : 0)), [leaveRequests, leaveSearch, leaveFilter]);

  const filteredPayroll = useMemo(() => staffList.filter(s =>
    s.name.toLowerCase().includes(payrollSearch.toLowerCase())
  ), [staffList, payrollSearch]);

  // ── Actions ──
  const handleLeaveAction = async (id: string, action: 'Approved' | 'Rejected') => {
    const req = leaveRequests.find(l => l.id === id)!;
    const dbStatus = action === 'Approved' ? 'APPROVED' : 'REJECTED';
    await fetch('/api/hr/leave', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: dbStatus }),
    });
    setLeaveRequests(prev => prev.map(l => l.id === id ? { ...l, status: action } : l));
    if (action === 'Approved') {
      setStaffList(prev => prev.map(s => s.id === req.staffId ? { ...s, leaveBalance: Math.max(0, s.leaveBalance - req.days) } : s));
    }
    toast.success(`${req.name}'s leave ${action.toLowerCase()}`, {
      description: `${req.type} · ${req.days} day${req.days > 1 ? 's' : ''}`,
    });
  };

  const processPayroll = async (payrollId: string, name: string) => {
    await fetch('/api/hr/payroll', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: payrollId, status: 'PAID' }),
    });
    setProcessedIds(prev => new Set([...prev, payrollId]));
    toast.success(`Payroll processed for ${name}`, { description: `${payrollMonth}` });
  };

  const processAllPayroll = async () => {
    const pendingIds = dbPayrolls.filter(p => p.status !== 'PAID').map(p => p.id);
    if (pendingIds.length === 0) { toast.info('All payrolls already processed'); return; }
    await fetch('/api/hr/payroll', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: pendingIds, status: 'PAID' }),
    });
    setProcessedIds(new Set(dbPayrolls.map(p => p.id)));
    toast.success(`Payroll processed for all ${pendingIds.length} staff`, { description: payrollMonth });
  };

  // ── Payroll loading ──
  const loadPayroll = (monthLabel: string) => {
    const MONTH_MAP: Record<string, number> = { January:1,February:2,March:3,April:4,May:5,June:6,July:7,August:8,September:9,October:10,November:11,December:12 };
    const parts = monthLabel.split(' ');
    const m = MONTH_MAP[parts[0]] ?? new Date().getMonth() + 1;
    const y = parseInt(parts[1]) || new Date().getFullYear();
    setPayrollLoading(true);
    fetch(`/api/hr/payroll?month=${m}&year=${y}`)
      .then(r => r.json())
      .then(d => {
        const records: DBPayroll[] = (d.payrolls ?? []).map((p: any) => ({
          id: p.id, staffId: p.staffId, month: p.month, year: p.year,
          basic: Number(p.basic), allowances: Number(p.allowances),
          pfDeduction: Number(p.pfDeduction), tdsDeduction: Number(p.tdsDeduction),
          netPay: Number(p.netPay), status: p.status,
          staff: p.staff,
        }));
        setDbPayrolls(records);
        setProcessedIds(new Set(records.filter(p => p.status === 'PAID').map(p => p.id)));
        setPayrollGenerated(records.length > 0);
      })
      .finally(() => setPayrollLoading(false));
  };

  useEffect(() => { if (activeTab === 'payroll') loadPayroll(payrollMonth); }, [activeTab, payrollMonth]);

  const loadAvailability = () => {
    setAvailLoading(true);
    Promise.all([
      fetch('/api/hr/availability').then(r => r.json()),
      fetch('/api/hr/workload').then(r => r.json()),
    ]).then(([avData, wkData]) => {
      const overrides: AvailEntry[] = (avData.overrides ?? []).map((o: any) => ({
        id: o.id,
        teacherId: o.teacherId,
        name: o.teacher?.name ?? 'Unknown',
        type: o.isAvailable ? 'extra' : 'absence',
        date: o.date?.split('T')[0] ?? '',
        reason: o.reason ?? '',
      }));
      setAvailEntries(overrides);

      const slots: WeeklySlot[] = (avData.weeklySlots ?? []).map((s: any) => ({
        id: s.id, teacherId: s.teacherId,
        teacherName: s.teacher?.name ?? '',
        teacherType: s.teacher?.type ?? '',
        designation: s.teacher?.designation ?? '',
        subject: s.teacher?.subjects?.[0]?.subject?.name ?? null,
        day: s.day, startTime: s.startTime, endTime: s.endTime,
      }));
      setWeeklySlots(slots);

      setWorkloadData(wkData.workload ?? []);
    }).finally(() => setAvailLoading(false));
  };

  useEffect(() => { if (activeTab === 'availability') loadAvailability(); }, [activeTab]);

  const generatePayroll = async () => {
    const MONTH_MAP: Record<string, number> = { January:1,February:2,March:3,April:4,May:5,June:6,July:7,August:8,September:9,October:10,November:11,December:12 };
    const parts = payrollMonth.split(' ');
    const m = MONTH_MAP[parts[0]] ?? new Date().getMonth() + 1;
    const y = parseInt(parts[1]) || new Date().getFullYear();
    const res = await fetch('/api/hr/payroll', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: m, year: y }),
    });
    const d = await res.json();
    if (res.ok) {
      toast.success(`Payroll generated for ${d.generated} staff members`, { description: payrollMonth });
      loadPayroll(payrollMonth);
    } else {
      toast.error(d.error ?? 'Failed to generate payroll');
    }
  };

  // ── Analytics data ──
  const deptData = useMemo(() => {
    const counts: Record<string, number> = {};
    staffList.forEach(s => { counts[s.department] = (counts[s.department] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [staffList]);

  const salaryData = useMemo(() => [
    { range: '< 20k', count: staffList.filter(s => s.salary < 20000).length },
    { range: '20–40k', count: staffList.filter(s => s.salary >= 20000 && s.salary < 40000).length },
    { range: '40–60k', count: staffList.filter(s => s.salary >= 40000 && s.salary < 60000).length },
    { range: '60–80k', count: staffList.filter(s => s.salary >= 60000 && s.salary < 80000).length },
    { range: '> 80k', count: staffList.filter(s => s.salary >= 80000).length },
  ], [staffList]);

  const totalPayroll = useMemo(() => staffList.reduce((sum, s) => {
    const net = s.salary + Math.round(s.salary * 0.2) - Math.round(s.salary * 0.12);
    return sum + net;
  }, 0), [staffList]);

  const tabs: { id: Tab; label: string; icon: React.ElementType; badge?: number; ai?: boolean }[] = [
    { id: 'directory',   label: 'Staff Directory',    icon: Users, badge: staffList.length },
    { id: 'leave',       label: 'Leave Management',   icon: Calendar, badge: pendingLeaveCount },
    { id: 'availability',label: 'Availability & Workload', icon: CalendarClock, ai: true },
    { id: 'payroll',     label: 'Payroll',             icon: Banknote },
    { id: 'analytics',   label: 'Analytics',           icon: BarChart3 },
  ];

  const MONTHS = ['April 2026','March 2026','February 2026','January 2026','December 2025'];

  return (
    <PageWrapper>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Staff', value: staffList.length, color: 'text-navy', bg: 'bg-navy/10', icon: Users },
          { label: 'Active', value: activeCount, color: 'text-green', bg: 'bg-green/10', icon: CheckCircle2 },
          { label: 'On Leave', value: onLeaveCount, color: 'text-amber', bg: 'bg-amber/10', icon: Clock },
          { label: 'Monthly Payroll', value: `₹${(totalPayroll / 100000).toFixed(1)}L`, color: 'text-teal', bg: 'bg-teal/10', icon: DollarSign },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <div className={`text-2xl font-sora font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center justify-between border-b border-gray-100 pr-4">
          <div className="flex overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold font-dm-sans whitespace-nowrap transition-all border-b-2 ${
                    activeTab === tab.id ? 'border-navy text-navy bg-navy/3' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}>
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.badge !== undefined && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      tab.id === 'leave' && (tab.badge ?? 0) > 0 ? 'bg-amber/15 text-amber' : 'bg-gray-100 text-gray-600'
                    }`}>{tab.badge}</span>
                  )}
                  {tab.ai && (
                    <span className="text-[9px] font-bold bg-teal text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <Brain className="w-2.5 h-2.5" />AI
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {/* Global CTA */}
          <div className="flex gap-2 flex-shrink-0">
            {activeTab === 'leave' && (
              <button onClick={() => setShowApplyLeave(true)}
                className="flex items-center gap-1.5 bg-navy text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-navyMid transition-colors">
                <Plus className="w-3.5 h-3.5" /> Apply Leave
              </button>
            )}
            {activeTab === 'directory' && (
              <button onClick={() => setShowAddStaff(true)}
                className="flex items-center gap-1.5 bg-gold text-navy text-xs font-semibold px-3 py-2 rounded-xl hover:bg-gold/90 transition-colors">
                <UserPlus className="w-3.5 h-3.5" /> Add Staff
              </button>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-5">

          {/* ── Directory ── */}
          {activeTab === 'directory' && (
            <div>
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Search by name, designation, or subject..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20" />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold rounded-xl border transition-colors ${showFilters ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                    <Filter className="w-4 h-4" /> Filter
                  </button>
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                    <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-navy' : 'text-gray-500'}`}><LayoutGrid className="w-4 h-4" /></button>
                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-navy' : 'text-gray-500'}`}><List className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>

              {/* Filter drawer */}
              {showFilters && (
                <div className="flex flex-wrap gap-4 mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Department</label>
                    <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                      className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 text-gray-700">
                      {depts.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Status</label>
                    <div className="flex gap-1.5">
                      {['All','active','on-leave'].map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                          className={`px-3 py-2 text-xs font-semibold rounded-xl border capitalize transition-colors ${statusFilter === s ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                          {s === 'on-leave' ? 'On Leave' : s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-end">
                    <span className="text-xs text-gray-400">{filteredStaff.length} of {staffList.length} staff</span>
                  </div>
                </div>
              )}

              {/* Grid view */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filteredStaff.map(s => (
                      <button key={s.id} onClick={() => s._sourceType === 'teacher' ? setSelectedTeacherId(s.id) : setSelectedStaff(s)}
                        className="text-left bg-gray-50 hover:bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md rounded-2xl p-4 transition-all group text-center">
                        <div className={`w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center text-white font-bold text-sm font-sora shadow-sm ${s.status === 'active' ? 'gradient-navy' : 'bg-gray-300'}`}>
                          {getInitials(s.name)}
                        </div>
                        <p className="font-semibold text-sm text-gray-800 leading-tight truncate">{s.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{s.designation}</p>
                        {s.subject && <p className="text-[10px] text-navyMid mt-0.5 truncate">{s.subject}</p>}
                        <div className="mt-2.5 flex justify-center gap-1 flex-wrap">
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${'employmentType' in s && s.employmentType === 'part-time' ? 'bg-purple/10 text-purple border-purple/20' : 'bg-teal/8 text-teal border-teal/15'}`}>
                            {'employmentType' in s && s.employmentType === 'part-time' ? 'Part-Time' : 'Full-Time'}
                          </span>
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${s.status === 'active' ? 'bg-green/8 text-green border-green/20' : 'bg-amber/8 text-amber border-amber/20'}`}>
                            {s.status === 'active' ? 'Active' : 'On Leave'}
                          </span>
                        </div>
                        {'teachingCapacity' in s && Array.isArray(s.teachingCapacity) && s.teachingCapacity.length > 0 && (
                          <p className="text-[9px] text-gray-400 mt-1 truncate">
                            {(s.teachingCapacity as string[]).slice(0, 2).join(' · ')}{(s.teachingCapacity as string[]).length > 2 ? ` +${(s.teachingCapacity as string[]).length - 2}` : ''}
                          </p>
                        )}
                        <div className="mt-2 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-0.5">
                          {s._sourceType === 'teacher'
                            ? <span className="text-teal font-semibold flex items-center gap-0.5"><BookOpen className="w-2.5 h-2.5" /> Subjects & Availability</span>
                            : <span className="text-gray-400 flex items-center gap-0.5">View profile <ChevronRight className="w-3 h-3" /></span>
                          }
                        </div>
                      </button>
                  ))}
                </div>
              ) : (
                /* List view */
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full min-w-[700px]">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['Staff Member','Designation','Department','Subject','Phone','Leave Balance','Status',''].map(h => (
                          <th key={h} className="text-left text-xs uppercase tracking-wide text-gray-400 px-4 py-3 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStaff.map((s, i) => {
                        const dept = getDept(s.department);
                        return (
                          <tr key={s.id} onClick={() => s._sourceType === 'teacher' ? setSelectedTeacherId(s.id) : setSelectedStaff(s)}
                            className={`border-b border-gray-50 hover:bg-gray-50/80 transition-colors cursor-pointer ${i % 2 !== 0 ? 'bg-gray-50/30' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold font-sora flex-shrink-0 ${s.status === 'active' ? 'bg-navy' : 'bg-gray-300'}`}>
                                  {getInitials(s.name)}
                                </div>
                                <div>
                                  <div className="font-semibold text-sm text-gray-800">{s.name}</div>
                                  <div className="text-[10px] text-gray-400">{s.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{s.designation}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${dept.bg} ${dept.color} ${dept.border}`}>{s.department}</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">{s.subject ?? '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{s.phone}</td>
                            <td className="px-4 py-3">
                              <span className={`text-sm font-bold ${s.leaveBalance <= 5 ? 'text-coral' : s.leaveBalance <= 10 ? 'text-amber' : 'text-green'}`}>{s.leaveBalance}</span>
                              <span className="text-xs text-gray-400"> days</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${s.status === 'active' ? 'bg-green/8 text-green border-green/20' : 'bg-amber/8 text-amber border-amber/20'}`}>
                                {s.status === 'active' ? 'Active' : 'On Leave'}
                              </span>
                            </td>
                            <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-gray-400" /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Showing {filteredStaff.length} of {staffList.length} staff</span>
                    <button onClick={() => toast.success('Staff directory exported')} className="flex items-center gap-1.5 text-xs font-semibold text-navyMid hover:text-navy transition-colors">
                      <Download className="w-3.5 h-3.5" /> Export CSV
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Leave Management ── */}
          {activeTab === 'leave' && (
            <div>
              {/* Leave balance quick view */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Pending Requests', value: leaveRequests.filter(l => l.status === 'Pending').length, color: 'text-amber', bg: 'bg-amber/10' },
                  { label: 'Approved This Month', value: leaveRequests.filter(l => l.status === 'Approved').length, color: 'text-green', bg: 'bg-green/10' },
                  { label: 'Rejected', value: leaveRequests.filter(l => l.status === 'Rejected').length, color: 'text-coral', bg: 'bg-coral/10' },
                  { label: 'Staff on Leave Today', value: onLeaveCount, color: 'text-navy', bg: 'bg-navy/10' },
                ].map(stat => (
                  <div key={stat.label} className={`${stat.bg} rounded-xl p-4`}>
                    <div className={`text-2xl font-sora font-bold ${stat.color}`}>{stat.value}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Search by name or leave type..."
                    value={leaveSearch} onChange={e => setLeaveSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20" />
                </div>
                <div className="flex gap-1">
                  {(['All','Pending','Approved','Rejected'] as const).map(f => (
                    <button key={f} onClick={() => setLeaveFilter(f)}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${leaveFilter === f ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Leave cards */}
              <div className="space-y-3">
                {filteredLeave.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-2xl text-sm text-gray-400">No leave requests found</div>
                ) : filteredLeave.map(l => (
                  <div key={l.id} className={`bg-white border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all ${
                    l.status === 'Pending' ? 'border-amber/30 bg-amber/3' :
                    l.status === 'Approved' ? 'border-green/20' : 'border-gray-100'
                  }`}>
                    {/* Staff avatar + info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl gradient-navy flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold font-sora">{getInitials(l.name)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-800">{l.name}</p>
                        <p className="text-xs text-gray-500">{l.designation}</p>
                      </div>
                    </div>

                    {/* Leave details */}
                    <div className="flex flex-wrap gap-3 flex-shrink-0 text-xs">
                      <div className="bg-gray-50 rounded-xl px-3 py-2">
                        <div className="text-gray-400 text-[10px] mb-0.5">Type</div>
                        <div className="font-semibold text-gray-700">{l.type}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl px-3 py-2">
                        <div className="text-gray-400 text-[10px] mb-0.5">Duration</div>
                        <div className="font-semibold text-gray-700">{l.from} → {l.to}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl px-3 py-2">
                        <div className="text-gray-400 text-[10px] mb-0.5">Days</div>
                        <div className="font-bold text-navy">{l.days}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl px-3 py-2 max-w-[160px]">
                        <div className="text-gray-400 text-[10px] mb-0.5">Reason</div>
                        <div className="font-medium text-gray-600 truncate">{l.reason}</div>
                      </div>
                    </div>

                    {/* Status + actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        l.status === 'Approved' ? 'bg-green/10 text-green border-green/20' :
                        l.status === 'Rejected' ? 'bg-coral/10 text-coral border-coral/20' :
                        'bg-amber/10 text-amber border-amber/20'
                      }`}>
                        {l.status === 'Approved' ? <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{l.status}</span> :
                         l.status === 'Rejected' ? <span className="flex items-center gap-1"><XCircle className="w-3 h-3" />{l.status}</span> :
                         <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" />{l.status}</span>}
                      </span>
                      {l.status === 'Pending' && (
                        <>
                          <button onClick={() => handleLeaveAction(l.id, 'Approved')}
                            className="w-8 h-8 bg-green/10 text-green rounded-xl flex items-center justify-center hover:bg-green/20 transition-colors border border-green/20" title="Approve">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleLeaveAction(l.id, 'Rejected')}
                            className="w-8 h-8 bg-coral/10 text-coral rounded-xl flex items-center justify-center hover:bg-coral/20 transition-colors border border-coral/20" title="Reject">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Leave balance table */}
              <div className="mt-6">
                <h3 className="font-sora font-semibold text-navy mb-3 text-sm">Leave Balance — All Staff</h3>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full min-w-[500px]">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['Staff Member','Designation','Annual Entitlement','Used','Remaining','Status'].map(h => (
                          <th key={h} className="text-left text-xs uppercase tracking-wide text-gray-400 px-4 py-3 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {staffList.map((s, i) => {
                        const used = 20 - s.leaveBalance;
                        const pct = Math.round((s.leaveBalance / 20) * 100);
                        return (
                          <tr key={s.id} className={`border-b border-gray-50 hover:bg-gray-50/80 ${i % 2 !== 0 ? 'bg-gray-50/30' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-navy flex items-center justify-center flex-shrink-0">
                                  <span className="text-white text-[10px] font-bold font-sora">{getInitials(s.name)}</span>
                                </div>
                                <span className="font-semibold text-sm text-gray-800">{s.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">{s.designation}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 font-medium">20 days</td>
                            <td className="px-4 py-3 text-sm font-semibold text-amber">{used}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${pct > 50 ? 'bg-green' : pct > 25 ? 'bg-amber' : 'bg-coral'}`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className={`text-sm font-bold ${s.leaveBalance <= 5 ? 'text-coral' : s.leaveBalance <= 10 ? 'text-amber' : 'text-green'}`}>{s.leaveBalance}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.leaveBalance <= 5 ? 'bg-coral/10 text-coral' : s.leaveBalance <= 10 ? 'bg-amber/10 text-amber' : 'bg-green/10 text-green'}`}>
                                {s.leaveBalance <= 5 ? 'Critical' : s.leaveBalance <= 10 ? 'Low' : 'Healthy'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Payroll ── */}
          {activeTab === 'payroll' && (() => {
            const filteredDB = dbPayrolls.filter(p =>
              !payrollSearch || p.staff.name.toLowerCase().includes(payrollSearch.toLowerCase())
            );
            const gross = dbPayrolls.reduce((s, p) => s + p.basic + p.allowances, 0);
            const deductions = dbPayrolls.reduce((s, p) => s + p.pfDeduction + p.tdsDeduction, 0);
            const net = dbPayrolls.reduce((s, p) => s + p.netPay, 0);
            return (
              <div>
                {/* Header controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-3">
                    <select value={payrollMonth} onChange={e => setPayrollMonth(e.target.value)}
                      className="text-sm font-semibold border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 text-navy">
                      {MONTHS.map(m => <option key={m}>{m}</option>)}
                    </select>
                    {dbPayrolls.length > 0 && (
                      <div className="text-sm text-gray-500">
                        Net: <span className="font-bold text-navy">₹{net.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" placeholder="Search staff..." value={payrollSearch} onChange={e => setPayrollSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 w-48" />
                    </div>
                    {!payrollGenerated ? (
                      <button onClick={generatePayroll}
                        className="flex items-center gap-1.5 bg-gold text-navy text-xs font-semibold px-3 py-2 rounded-xl hover:bg-gold/90 transition-colors">
                        <Banknote className="w-3.5 h-3.5" /> Generate Payroll
                      </button>
                    ) : (
                      <button onClick={processAllPayroll}
                        className="flex items-center gap-1.5 bg-green text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-green/80 transition-colors">
                        <Banknote className="w-3.5 h-3.5" /> Process All
                      </button>
                    )}
                    <button onClick={() => toast.success('Payroll report downloaded')}
                      className="flex items-center gap-1.5 bg-white text-navyMid border border-gray-200 text-xs font-semibold px-3 py-2 rounded-xl hover:border-navy transition-colors">
                      <Download className="w-3.5 h-3.5" /> Export
                    </button>
                  </div>
                </div>

                {/* Summary cards */}
                {dbPayrolls.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { label: 'Gross Payroll', value: `₹${gross.toLocaleString('en-IN')}`, color: 'text-white', icon: Briefcase },
                      { label: 'Total Deductions', value: `₹${deductions.toLocaleString('en-IN')}`, color: 'text-coral', icon: TrendingUp },
                      { label: 'Net Disbursement', value: `₹${net.toLocaleString('en-IN')}`, color: 'text-green', icon: DollarSign },
                    ].map(s => {
                      const Icon = s.icon;
                      return (
                        <div key={s.label} className="bg-gradient-to-br from-navy to-navyMid rounded-xl p-4 text-white">
                          <Icon className="w-4 h-4 text-gold mb-2" />
                          <div className={`text-xl font-sora font-bold ${s.color}`}>{s.value}</div>
                          <div className="text-xs text-ice/70 mt-0.5">{s.label}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Payroll table */}
                {payrollLoading ? (
                  <div className="space-y-2">{Array.from({length:5}).map((_,i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>
                ) : filteredDB.length === 0 ? (
                  <div className="text-center py-14 text-sm text-gray-400">
                    <Banknote className="w-8 h-8 mx-auto mb-3 text-gray-200" />
                    {payrollGenerated ? 'No payroll records match your search.' : 'Click "Generate Payroll" to create entries for all active staff.'}
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full min-w-[800px]">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          {['Staff','Designation','Basic Pay','HRA + TA','PF + TDS','Net Pay','Status','Action'].map(h => (
                            <th key={h} className="text-left text-xs uppercase tracking-wide text-gray-400 px-4 py-3 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDB.map((p, i) => {
                          const processed = processedIds.has(p.id);
                          return (
                            <tr key={p.id} className={`border-b border-gray-50 hover:bg-gray-50/80 ${i % 2 !== 0 ? 'bg-gray-50/30' : ''}`}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-navy flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-[10px] font-bold font-sora">{getInitials(p.staff.name)}</span>
                                  </div>
                                  <span className="font-semibold text-sm text-gray-800">{p.staff.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-500">{p.staff.designation}</td>
                              <td className="px-4 py-3 text-sm text-gray-700 font-medium">₹{p.basic.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-green">+₹{p.allowances.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-coral">−₹{(p.pfDeduction + p.tdsDeduction).toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 text-sm font-bold text-navy">₹{p.netPay.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${processed ? 'bg-green/10 text-green border-green/20' : 'bg-amber/10 text-amber border-amber/20'}`}>
                                  {processed ? 'Processed' : 'Pending'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-1.5">
                                  {!processed && (
                                    <button onClick={() => processPayroll(p.id, p.staff.name)}
                                      className="text-xs text-green hover:text-green/70 font-semibold border border-green/20 px-2.5 py-1.5 rounded-lg hover:bg-green/5 transition-colors">
                                      Process
                                    </button>
                                  )}
                                  <button onClick={() => toast.success(`Payslip generated for ${p.staff.name}`)}
                                    className="text-xs text-navyMid hover:text-navy font-semibold border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1">
                                    <FileText className="w-3 h-3" /> Slip
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Analytics ── */}
          {activeTab === 'analytics' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Dept distribution */}
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                  <h3 className="font-sora font-semibold text-navy text-sm mb-4">Staff by Department</h3>
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width={150} height={150}>
                      <PieChart>
                        <Pie data={deptData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                          {deptData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ fontFamily: 'DM Sans', fontSize: 11, borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1.5">
                      {deptData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-2 text-xs">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-gray-600 truncate">{d.name}</span>
                          <span className="ml-auto font-bold text-gray-700">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Salary distribution */}
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                  <h3 className="font-sora font-semibold text-navy text-sm mb-4">Salary Distribution</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={salaryData} margin={{ top: 4, right: 4, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="range" tick={{ fontSize: 10, fontFamily: 'DM Sans' }} />
                      <YAxis tick={{ fontSize: 10, fontFamily: 'DM Sans' }} />
                      <Tooltip contentStyle={{ fontFamily: 'DM Sans', fontSize: 11, borderRadius: 8 }} />
                      <Bar dataKey="count" fill="#1E2761" radius={[4, 4, 0, 0]} name="Staff" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Avg Tenure', value: staffList.length ? `${Math.round(staffList.reduce((s, x) => s + (new Date().getFullYear() - new Date(x.joiningDate).getFullYear()), 0) / staffList.length)} yrs` : '— yrs', icon: Star, color: 'text-gold' },
                  { label: 'Avg Salary', value: staffList.length ? `₹${Math.round(staffList.reduce((s, x) => s + x.salary, 0) / staffList.length / 1000)}k` : '₹—', icon: DollarSign, color: 'text-green' },
                  { label: 'Qualified Teachers', value: staffList.filter(s => s.qualification.includes('B.Ed') || s.qualification.includes('M.Ed') || s.qualification.includes('PhD')).length, icon: Award, color: 'text-teal' },
                  { label: 'Departments', value: new Set(staffList.map(s => s.department)).size, icon: Building2, color: 'text-purple' },
                ].map(stat => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="bg-gradient-to-br from-navy to-navyMid rounded-xl p-4 text-white">
                      <Icon className={`w-4 h-4 mb-2 ${stat.color}`} />
                      <div className="text-2xl font-sora font-bold">{stat.value}</div>
                      <div className="text-xs text-ice/70 mt-0.5">{stat.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Top earners */}
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                <h3 className="font-sora font-semibold text-navy text-sm mb-4">Top Earners</h3>
                <div className="space-y-2.5">
                  {staffList.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No staff records yet</p>}
                  {[...staffList].sort((a, b) => b.salary - a.salary).slice(0, 5).map((s, i) => {
                    const net = s.salary + Math.round(s.salary * 0.2) - Math.round(s.salary * 0.12);
                    const topSalary = staffList[0]?.salary ?? s.salary;
                    const maxNet = topSalary + Math.round(topSalary * 0.2) - Math.round(topSalary * 0.12);
                    const pct = maxNet > 0 ? Math.round((net / maxNet) * 100) : 0;
                    return (
                      <div key={s.id} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                        <div className="w-7 h-7 rounded-lg bg-navy flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-[10px] font-bold font-sora">{getInitials(s.name)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-semibold text-gray-800 truncate">{s.name}</span>
                            <span className="font-bold text-navy ml-2 flex-shrink-0">₹{net.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-navy to-navyMid rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Availability & Workload ── */}
          {activeTab === 'availability' && (
            <div className="space-y-6">

              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-sora font-semibold text-navy flex items-center gap-2">
                    Availability & Workload Manager
                    <span className="text-[9px] font-bold bg-teal text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Brain className="w-2.5 h-2.5" />AI</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Log sudden absences, extra availability, and review class assignment workload</p>
                </div>
                <button onClick={() => setShowAvailModal(true)}
                  className="flex items-center gap-1.5 bg-gold text-navy font-sora font-bold text-xs px-3 py-2 rounded-xl hover:bg-gold/90 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Log Availability Change
                </button>
              </div>

              {/* Summary pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Absences (next 14d)', value: availEntries.filter(a => a.type === 'absence').length, color: 'text-coral', bg: 'bg-coral/8', icon: UserX },
                  { label: 'Extra Available', value: availEntries.filter(a => a.type === 'extra').length, color: 'text-green', bg: 'bg-green/8', icon: UserCheck },
                  { label: 'Overloaded', value: workloadData.filter(w => w.periodsPerWeek > w.maxPeriodsWeek + 3).length, color: 'text-amber', bg: 'bg-amber/8', icon: AlertTriangle },
                  { label: 'Part-Time', value: workloadData.filter(w => w.type === 'PART_TIME').length, color: 'text-purple', bg: 'bg-purple/8', icon: CalendarClock },
                ].map(stat => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className={`${stat.bg} rounded-xl p-4 flex items-center gap-3`}>
                      <Icon className={`w-5 h-5 ${stat.color} flex-shrink-0`} />
                      <div>
                        <div className={`text-2xl font-sora font-bold ${stat.color}`}>{stat.value}</div>
                        <div className="text-xs text-gray-500">{stat.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Active availability overrides */}
              <div>
                <h4 className="font-sora font-semibold text-navy text-sm mb-3">Active Availability Changes</h4>
                {availLoading ? (
                  <div className="space-y-2">{Array.from({length:3}).map((_,i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
                ) : (
                  <div className="space-y-3">
                    {availEntries.map(entry => {
                      const isAbsence = entry.type === 'absence';
                      return (
                        <div key={entry.id} className={`border rounded-2xl p-4 ${isAbsence ? 'border-coral/20 bg-coral/3' : 'border-green/20 bg-green/3'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isAbsence ? 'bg-coral/15' : 'bg-green/15'}`}>
                                {isAbsence ? <UserX className="w-4 h-4 text-coral" /> : <UserCheck className="w-4 h-4 text-green" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-semibold text-gray-800">{entry.name}</p>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isAbsence ? 'bg-coral/15 text-coral' : 'bg-green/15 text-green'}`}>
                                    {isAbsence ? 'ABSENT' : 'EXTRA AVAILABLE'}
                                  </span>
                                  <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{entry.date}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">{entry.reason}</p>
                                {entry.substitute && (
                                  <div className="flex items-center gap-1.5 mt-1.5">
                                    <CheckCircle2 className="w-3 h-3 text-green" />
                                    <span className="text-[10px] text-green font-semibold">AI Substitute: {entry.substitute}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {isAbsence && !entry.substitute && (
                                <button
                                  onClick={() => {
                                    setAvailEntries(prev => prev.map(e => e.id === entry.id ? { ...e, substitute: 'AI-Assigned' } : e));
                                    toast.success('AI assigned substitute teacher', { description: 'WhatsApp notification sent to substitute' });
                                  }}
                                  className="text-[10px] font-semibold bg-teal/10 text-teal border border-teal/20 px-2 py-1 rounded-lg hover:bg-teal/20 transition-colors flex items-center gap-1">
                                  <Brain className="w-3 h-3" /> Assign Sub
                                </button>
                              )}
                              <button
                                onClick={async () => {
                                  await fetch(`/api/hr/availability/${entry.id}`, { method: 'DELETE' });
                                  setAvailEntries(prev => prev.filter(e => e.id !== entry.id));
                                  toast.success('Entry removed');
                                }}
                                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {availEntries.length === 0 && (
                      <div className="text-center py-8 bg-gray-50 rounded-2xl border border-gray-100">
                        <CheckCircle2 className="w-8 h-8 text-green/40 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No availability changes logged for the next 14 days</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Part-time weekly availability grid */}
              {(() => {
                const partTimeTeachers = [...new Map(
                  weeklySlots.filter(s => s.teacherType === 'PART_TIME').map(s => [s.teacherId, s])
                ).values()];
                if (partTimeTeachers.length === 0) return null;
                return (
                  <div>
                    <h4 className="font-sora font-semibold text-navy text-sm mb-3">Part-Time Teacher Weekly Availability</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {partTimeTeachers.map(t => {
                        const slots = weeklySlots.filter(s => s.teacherId === t.teacherId);
                        const dept = getDept(t.teacherName);
                        const days = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
                        return (
                          <div key={t.teacherId} className="border border-gray-100 rounded-2xl overflow-hidden">
                            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                              <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-[10px] font-bold font-sora">{getInitials(t.teacherName)}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{t.teacherName}</p>
                                <p className="text-[10px] text-gray-400">{t.subject ?? t.designation} · <span className="text-purple font-semibold">Part-Time</span></p>
                              </div>
                            </div>
                            <div className="p-3 space-y-2">
                              {days.map(day => {
                                const daySlots = slots.filter(s => s.day === day);
                                if (daySlots.length === 0) return null;
                                return (
                                  <div key={day} className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-gray-500 w-8">{day.slice(0,3)}</span>
                                    <div className="flex flex-wrap gap-1.5 flex-1">
                                      {daySlots.map(s => (
                                        <span key={s.id} className="text-[10px] bg-purple/8 text-purple border border-purple/15 px-2 py-1 rounded-lg font-medium">
                                          {s.startTime}–{s.endTime}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Workload balance */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-sora font-semibold text-navy text-sm flex items-center gap-2">
                    Class Assignment Workload Balance
                    <span className="text-[9px] font-bold bg-teal text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Brain className="w-2.5 h-2.5" />AI</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-gray-100 rounded-lg p-0.5">
                      {(['week', 'month', 'year'] as const).map(v => (
                        <button key={v} onClick={() => setWorkloadView(v)}
                          className={`px-2.5 py-1 text-[10px] font-semibold rounded-md capitalize transition-all ${workloadView === v ? 'bg-white shadow-sm text-navy' : 'text-gray-500'}`}>
                          {v}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        setRebalancing(true);
                        setTimeout(() => { setRebalancing(false); setRebalanced(true); toast.success('AI rebalanced class assignments', { description: '3 teachers adjusted · Timetable updated' }); }, 2200);
                      }}
                      disabled={rebalancing}
                      className="flex items-center gap-1.5 bg-navy text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-navyMid disabled:opacity-60 transition-all">
                      {rebalancing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                      {rebalancing ? 'Rebalancing…' : 'Auto Re-balance'}
                    </button>
                  </div>
                </div>

                {rebalanced && (
                  <div className="bg-green/5 border border-green/20 rounded-xl p-3 mb-3 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-green">AI Rebalanced Successfully</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">Workload redistributed across {workloadData.length} teachers. Timetable regenerated and notifications sent.</p>
                    </div>
                  </div>
                )}

                {workloadData.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-400">
                    No teachers found. Add teaching staff to see workload distribution.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full min-w-[600px]">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          {['Teacher', 'Type', 'Subject', 'Current Periods', 'Target', 'Balance', 'Status'].map(h => (
                            <th key={h} className="text-left text-xs uppercase tracking-wide text-gray-400 px-4 py-3 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {workloadData.map((w, i) => {
                          const current = workloadView === 'week' ? w.periodsPerWeek : workloadView === 'month' ? w.periodsPerWeek * 4 : w.periodsPerWeek * 40;
                          const target = workloadView === 'week' ? w.maxPeriodsWeek : workloadView === 'month' ? w.maxPeriodsWeek * 4 : w.maxPeriodsWeek * 40;
                          const diff = w.periodsPerWeek - w.maxPeriodsWeek;
                          return (
                            <tr key={w.id} className={`border-b border-gray-50 hover:bg-gray-50/60 ${i % 2 !== 0 ? 'bg-gray-50/20' : ''}`}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-navy flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-[10px] font-bold">{getInitials(w.name)}</span>
                                  </div>
                                  <span className="text-sm font-semibold text-gray-800">{w.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${w.type === 'PART_TIME' ? 'bg-purple/10 text-purple' : 'bg-teal/8 text-teal'}`}>
                                  {w.type === 'PART_TIME' ? 'Part-Time' : w.type === 'CONTRACT' ? 'Contract' : 'Full-Time'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-500">{w.subject ?? '—'}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all ${diff > 3 ? 'bg-coral' : diff < -3 ? 'bg-amber' : 'bg-green'}`}
                                      style={{ width: `${Math.min(target > 0 ? (current / (target * 1.3)) * 100 : 0, 100)}%` }} />
                                  </div>
                                  <span className="text-sm font-bold text-gray-700 tabular-nums">{current}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">{target}</td>
                              <td className="px-4 py-3">
                                <span className={`text-xs font-bold tabular-nums ${diff > 0 ? 'text-coral' : diff < 0 ? 'text-amber' : 'text-green'}`}>
                                  {diff > 0 ? `+${diff}` : diff < 0 ? diff : '±0'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {diff > 3 ? (
                                  <span className="text-[10px] font-semibold bg-coral/10 text-coral px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><AlertOctagon className="w-3 h-3" /> Overloaded</span>
                                ) : diff < -3 ? (
                                  <span className="text-[10px] font-semibold bg-amber/10 text-amber px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><AlertTriangle className="w-3 h-3" /> Underloaded</span>
                                ) : (
                                  <span className="text-[10px] font-semibold bg-green/10 text-green px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3" /> Balanced</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>

      {/* Drawers & Modals */}
      {selectedStaff && <StaffDrawer staff={selectedStaff} onClose={() => setSelectedStaff(null)} onSalaryUpdate={(id, sal) => setStaffList(prev => prev.map(s => s.id === id ? { ...s, salary: sal } : s))} />}
      <TeacherProfileSheet teacherId={selectedTeacherId} onClose={() => setSelectedTeacherId(null)} />
      {showAddStaff && <AddStaffModal onClose={() => setShowAddStaff(false)} onAdd={s => setStaffList(prev => [s, ...prev])} />}
      {showApplyLeave && <ApplyLeaveModal staff={staffList} onClose={() => setShowApplyLeave(false)} onApply={l => setLeaveRequests(prev => [l, ...prev])} />}

      {/* Log Availability Modal */}
      {showAvailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-sora font-bold text-navy text-lg">Log Availability Change</h2>
                <p className="text-xs text-gray-400 mt-0.5">Record sudden absence or extra availability</p>
              </div>
              <button onClick={() => setShowAvailModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Type toggle */}
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Change Type</label>
                <div className="flex gap-2">
                  {(['absence', 'extra'] as const).map(t => (
                    <button key={t} onClick={() => setAvailForm(f => ({ ...f, type: t }))}
                      className={`flex-1 py-2.5 text-sm font-semibold rounded-xl border transition-all ${availForm.type === t
                        ? t === 'absence' ? 'bg-coral text-white border-coral' : 'bg-green text-white border-green'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                      {t === 'absence' ? '🚫 Sudden Absence' : '✅ Extra Availability'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Staff */}
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Staff Member</label>
                <select value={availForm.staffId} onChange={e => setAvailForm(f => ({ ...f, staffId: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-navy/20">
                  <option value="">Select teacher...</option>
                  {staffList.filter(s => s.subject).map(s => <option key={s.id} value={s.id}>{s.name} — {s.subject}</option>)}
                </select>
              </div>

              {/* Period */}
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Duration</label>
                <div className="flex gap-2">
                  {(['full-day', 'partial', 'multi-day'] as const).map(p => (
                    <button key={p} onClick={() => setAvailForm(f => ({ ...f, period: p }))}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl border capitalize transition-all ${availForm.period === p ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {p === 'full-day' ? 'Full Day' : p === 'partial' ? 'Partial' : 'Multi-Day'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date(s) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">{availForm.period === 'multi-day' ? 'From' : 'Date'}</label>
                  <input type="date" value={availForm.date} onChange={e => setAvailForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20" />
                </div>
                {availForm.period === 'multi-day' ? (
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">To</label>
                    <input type="date" value={availForm.endDate} onChange={e => setAvailForm(f => ({ ...f, endDate: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20" />
                  </div>
                ) : availForm.period === 'partial' ? (
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Until Time</label>
                    <input type="time" value={availForm.timeTo} onChange={e => setAvailForm(f => ({ ...f, timeTo: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20" />
                  </div>
                ) : null}
              </div>

              {/* Reason */}
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Reason</label>
                <input type="text" placeholder="Brief reason..." value={availForm.reason} onChange={e => setAvailForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20" />
              </div>

              {availForm.type === 'absence' && (
                <div className="bg-teal/5 border border-teal/20 rounded-xl p-3 flex items-start gap-2">
                  <Brain className="w-4 h-4 text-teal flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-600">AI will automatically find a substitute from teachers with matching subject capacity and flag affected periods for reassignment.</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowAvailModal(false)} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button
                disabled={savingAvail}
                onClick={async () => {
                  if (!availForm.staffId || !availForm.date) { toast.error('Please fill in all required fields'); return; }
                  const s = staffList.find(x => x.id === availForm.staffId)!;
                  setSavingAvail(true);
                  try {
                    const res = await fetch('/api/hr/availability', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        teacherId: availForm.staffId,
                        date: availForm.date,
                        endDate: availForm.period === 'multi-day' ? availForm.endDate : undefined,
                        isAvailable: availForm.type === 'extra',
                        reason: availForm.reason,
                        period: availForm.period,
                        timeTo: availForm.timeTo || undefined,
                      }),
                    });
                    if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Failed to save'); return; }
                    await loadAvailability();
                    setShowAvailModal(false);
                    setAvailForm({ staffId: '', type: 'absence', date: '', endDate: '', period: 'full-day', timeFrom: '', timeTo: '', reason: '' });
                    toast.success(`${availForm.type === 'absence' ? 'Absence logged' : 'Availability logged'} for ${s.name}`, {
                      description: availForm.type === 'absence' ? 'AI is finding substitute · Affected periods flagged' : 'Timetable updated with extra slots',
                    });
                  } finally {
                    setSavingAvail(false);
                  }
                }}
                className="flex-1 py-2.5 text-sm font-semibold bg-navy text-white rounded-xl hover:bg-navyMid transition-colors disabled:opacity-60">
                {savingAvail ? 'Saving…' : 'Log Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

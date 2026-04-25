'use client';

import { useState, useMemo } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { toast } from 'sonner';
import { getInitials } from '@/lib/utils';
import {
  Users, UserPlus, LayoutGrid, List, Search, Filter,
  X, Phone, Mail, Calendar, BookOpen, Award, Check,
  ChevronRight, Download, DollarSign, Clock, TrendingUp,
  Building2, BarChart3, Banknote, FileText, AlertCircle,
  CheckCircle2, XCircle, Plus, Briefcase, Star
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import staffData from '@/data/staff.json';

// ─── Types ────────────────────────────────────────────────────────────────────

type Staff = typeof staffData[number];

type LeaveRequest = {
  id: string; staffId: string; name: string; designation: string;
  type: string; from: string; to: string; days: number;
  reason: string; status: 'Pending' | 'Approved' | 'Rejected';
};

type Tab = 'directory' | 'leave' | 'payroll' | 'analytics';

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

function StaffDrawer({ staff, onClose }: { staff: Staff; onClose: () => void }) {
  const dept = getDept(staff.department);
  const yearsOfService = new Date().getFullYear() - new Date(staff.joiningDate).getFullYear();
  const allowance = Math.round(staff.salary * 0.2);
  const deduction = Math.round(staff.salary * 0.12);
  const net = staff.salary + allowance - deduction;

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
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
          {[
            { label: 'Years', value: yearsOfService },
            { label: 'Leave Left', value: staff.leaveBalance },
            { label: 'Net Pay', value: `₹${Math.round(net / 1000)}k` },
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

        {/* Salary breakdown */}
        <div className="p-4 border-b border-gray-100">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Salary Breakdown</p>
          <div className="space-y-2">
            {[
              { label: 'Basic Pay', value: staff.salary, color: 'text-gray-700', prefix: '' },
              { label: 'HRA + TA (20%)', value: allowance, color: 'text-green', prefix: '+' },
              { label: 'PF + TDS (12%)', value: Math.round(staff.salary * 0.12), color: 'text-coral', prefix: '−' },
            ].map(row => (
              <div key={row.label} className="flex justify-between text-xs">
                <span className="text-gray-500">{row.label}</span>
                <span className={`font-semibold ${row.color}`}>{row.prefix}₹{row.value.toLocaleString('en-IN')}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
              <span className="font-bold text-gray-700">Net Pay</span>
              <span className="font-bold text-navy">₹{net.toLocaleString('en-IN')}</span>
            </div>
          </div>
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

function AddStaffModal({ onClose, onAdd }: { onClose: () => void; onAdd: (s: Staff) => void }) {
  const depts = Object.keys(deptConfig);
  const [form, setForm] = useState({ name: '', designation: '', department: '', subject: '', phone: '', email: '', qualification: '', salary: '', joiningDate: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.designation.trim()) e.designation = 'Required';
    if (!form.department) e.department = 'Required';
    if (!form.phone || !/^\d{10}$/.test(form.phone)) e.phone = 'Valid 10-digit number';
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'Valid email required';
    if (!form.salary || Number(form.salary) < 1) e.salary = 'Required';
    if (!form.joiningDate) e.joiningDate = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAdd = () => {
    if (!validate()) return;
    onAdd({
      id: `STF${Date.now()}`,
      name: form.name.trim(),
      designation: form.designation.trim(),
      department: form.department,
      subject: form.subject || null,
      phone: form.phone,
      email: form.email.trim(),
      qualification: form.qualification || 'Not specified',
      salary: Number(form.salary),
      leaveBalance: 15,
      joiningDate: form.joiningDate,
      status: 'active',
      photo: null,
    });
    toast.success(`${form.name} added to staff directory`);
    onClose();
  };

  const F = ({ label, error, half, children }: { label: string; error?: string; half?: boolean; children: React.ReactNode }) => (
    <div className={half ? '' : ''}>
      <label className="text-xs font-semibold text-gray-700 mb-1.5 block">{label}</label>
      {children}
      {error && <p className="text-xs text-coral mt-1">{error}</p>}
    </div>
  );

  const inp = (field: keyof typeof form, placeholder: string, type = 'text', extra?: string) => (
    <input type={type} placeholder={placeholder} value={form[field]}
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
          <F label="Full Name *" error={errors.name}>{inp('name', 'e.g. Mrs. Ananya Bose')}</F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Designation *" error={errors.designation}>{inp('designation', 'e.g. Senior Teacher')}</F>
            <F label="Department *" error={errors.department}>
              <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 ${errors.department ? 'border-coral' : 'border-gray-200'}`}>
                <option value="">Select...</option>
                {depts.map(d => <option key={d}>{d}</option>)}
              </select>
            </F>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Subject (if teacher)"><input type="text" placeholder="e.g. Mathematics" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20" /></F>
            <F label="Phone *" error={errors.phone}>{inp('phone', '10-digit mobile')}</F>
          </div>
          <F label="Email *" error={errors.email}>{inp('email', 'work email address', 'email')}</F>
          <F label="Qualification">{inp('qualification', 'e.g. M.Sc Mathematics, B.Ed')}</F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Basic Salary (₹) *" error={errors.salary}>{inp('salary', 'Monthly basic', 'number')}</F>
            <F label="Joining Date *" error={errors.joiningDate}>{inp('joiningDate', '', 'date')}</F>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
          <button onClick={handleAdd} className="flex-1 py-2.5 text-sm font-semibold bg-gold text-navy rounded-xl hover:bg-gold/90 transition-colors">Add Staff Member</button>
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

export default function HRPage() {
  const [activeTab, setActiveTab] = useState<Tab>('directory');
  const [staffList, setStaffList] = useState<Staff[]>(staffData as Staff[]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(seedLeave);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showApplyLeave, setShowApplyLeave] = useState(false);

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
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set(['STF001','STF002','STF003']));
  const [payrollSearch, setPayrollSearch] = useState('');

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
  const handleLeaveAction = (id: string, action: 'Approved' | 'Rejected') => {
    const req = leaveRequests.find(l => l.id === id)!;
    setLeaveRequests(prev => prev.map(l => l.id === id ? { ...l, status: action } : l));
    if (action === 'Approved') {
      setStaffList(prev => prev.map(s => s.id === req.staffId ? { ...s, leaveBalance: Math.max(0, s.leaveBalance - req.days) } : s));
    }
    toast.success(`${req.name}'s leave ${action.toLowerCase()}`, {
      description: `${req.type} · ${req.days} day${req.days > 1 ? 's' : ''}`,
    });
  };

  const processPayroll = (staffId: string, name: string) => {
    setProcessedIds(prev => new Set([...prev, staffId]));
    toast.success(`Payroll processed for ${name}`, { description: `${payrollMonth}` });
  };

  const processAllPayroll = () => {
    setProcessedIds(new Set(staffList.map(s => s.id)));
    toast.success(`Payroll processed for all ${staffList.length} staff`, { description: payrollMonth });
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

  const tabs: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'directory', label: 'Staff Directory', icon: Users, badge: staffList.length },
    { id: 'leave',     label: 'Leave Management', icon: Calendar, badge: pendingLeaveCount },
    { id: 'payroll',   label: 'Payroll', icon: Banknote },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
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
                  {filteredStaff.map(s => {
                    const dept = getDept(s.department);
                    return (
                      <button key={s.id} onClick={() => setSelectedStaff(s)}
                        className="text-left bg-gray-50 hover:bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md rounded-2xl p-4 transition-all group text-center">
                        <div className={`w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center text-white font-bold text-sm font-sora shadow-sm ${s.status === 'active' ? 'gradient-navy' : 'bg-gray-300'}`}>
                          {getInitials(s.name)}
                        </div>
                        <p className="font-semibold text-sm text-gray-800 leading-tight truncate">{s.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{s.designation}</p>
                        {s.subject && <p className="text-[10px] text-navyMid mt-0.5 truncate">{s.subject}</p>}
                        <div className="mt-2.5 flex justify-center gap-1.5 flex-wrap">
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${dept.bg} ${dept.color} ${dept.border}`}>{s.department}</span>
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${s.status === 'active' ? 'bg-green/8 text-green border-green/20' : 'bg-amber/8 text-amber border-amber/20'}`}>
                            {s.status === 'active' ? 'Active' : 'On Leave'}
                          </span>
                        </div>
                        <div className="mt-2 text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-0.5">
                          View profile <ChevronRight className="w-3 h-3" />
                        </div>
                      </button>
                    );
                  })}
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
                          <tr key={s.id} onClick={() => setSelectedStaff(s)}
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
          {activeTab === 'payroll' && (
            <div>
              {/* Header controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <select value={payrollMonth} onChange={e => setPayrollMonth(e.target.value)}
                    className="text-sm font-semibold border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 text-navy">
                    {MONTHS.map(m => <option key={m}>{m}</option>)}
                  </select>
                  <div className="text-sm text-gray-500">
                    Total: <span className="font-bold text-navy">₹{totalPayroll.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Search staff..." value={payrollSearch} onChange={e => setPayrollSearch(e.target.value)}
                      className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 w-48" />
                  </div>
                  <button onClick={processAllPayroll}
                    className="flex items-center gap-1.5 bg-green text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-green/80 transition-colors">
                    <Banknote className="w-3.5 h-3.5" /> Process All
                  </button>
                  <button onClick={() => toast.success('Payroll report downloaded')}
                    className="flex items-center gap-1.5 bg-white text-navyMid border border-gray-200 text-xs font-semibold px-3 py-2 rounded-xl hover:border-navy transition-colors">
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                </div>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Gross Payroll', value: `₹${staffList.reduce((s, x) => s + x.salary + Math.round(x.salary * 0.2), 0).toLocaleString('en-IN')}`, color: 'text-navy', icon: Briefcase },
                  { label: 'Total Deductions', value: `₹${staffList.reduce((s, x) => s + Math.round(x.salary * 0.12), 0).toLocaleString('en-IN')}`, color: 'text-coral', icon: TrendingUp },
                  { label: 'Net Disbursement', value: `₹${totalPayroll.toLocaleString('en-IN')}`, color: 'text-green', icon: DollarSign },
                ].map(s => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="bg-gradient-to-br from-navy to-navyMid rounded-xl p-4 text-white">
                      <Icon className="w-4 h-4 text-gold mb-2" />
                      <div className={`text-xl font-sora font-bold ${s.color === 'text-coral' ? 'text-coral' : s.color === 'text-green' ? 'text-green' : 'text-white'}`}>{s.value}</div>
                      <div className="text-xs text-ice/70 mt-0.5">{s.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Payroll table */}
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
                    {filteredPayroll.map((s, i) => {
                      const allowance = Math.round(s.salary * 0.2);
                      const deduction = Math.round(s.salary * 0.12);
                      const net = s.salary + allowance - deduction;
                      const processed = processedIds.has(s.id);
                      return (
                        <tr key={s.id} className={`border-b border-gray-50 hover:bg-gray-50/80 ${i % 2 !== 0 ? 'bg-gray-50/30' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-navy flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-[10px] font-bold font-sora">{getInitials(s.name)}</span>
                              </div>
                              <span className="font-semibold text-sm text-gray-800">{s.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{s.designation}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 font-medium">₹{s.salary.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-green">+₹{allowance.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-coral">−₹{deduction.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 text-sm font-bold text-navy">₹{net.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${processed ? 'bg-green/10 text-green border-green/20' : 'bg-amber/10 text-amber border-amber/20'}`}>
                              {processed ? 'Processed' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5">
                              {!processed && (
                                <button onClick={() => processPayroll(s.id, s.name)}
                                  className="text-xs text-green hover:text-green/70 font-semibold border border-green/20 px-2.5 py-1.5 rounded-lg hover:bg-green/5 transition-colors">
                                  Process
                                </button>
                              )}
                              <button onClick={() => toast.success(`Payslip generated for ${s.name}`)}
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
            </div>
          )}

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
                  { label: 'Avg Tenure', value: `${Math.round(staffList.reduce((s, x) => s + (new Date().getFullYear() - new Date(x.joiningDate).getFullYear()), 0) / staffList.length)} yrs`, icon: Star, color: 'text-gold' },
                  { label: 'Avg Salary', value: `₹${Math.round(staffList.reduce((s, x) => s + x.salary, 0) / staffList.length / 1000)}k`, icon: DollarSign, color: 'text-green' },
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
                  {[...staffList].sort((a, b) => b.salary - a.salary).slice(0, 5).map((s, i) => {
                    const net = s.salary + Math.round(s.salary * 0.2) - Math.round(s.salary * 0.12);
                    const maxNet = staffList[0].salary + Math.round(staffList[0].salary * 0.2) - Math.round(staffList[0].salary * 0.12);
                    const pct = Math.round((net / maxNet) * 100);
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

        </div>
      </div>

      {/* Drawers & Modals */}
      {selectedStaff && <StaffDrawer staff={selectedStaff} onClose={() => setSelectedStaff(null)} />}
      {showAddStaff && <AddStaffModal onClose={() => setShowAddStaff(false)} onAdd={s => setStaffList(prev => [s, ...prev])} />}
      {showApplyLeave && <ApplyLeaveModal staff={staffList} onClose={() => setShowApplyLeave(false)} onApply={l => setLeaveRequests(prev => [l, ...prev])} />}
    </PageWrapper>
  );
}

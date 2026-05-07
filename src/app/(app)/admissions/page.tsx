'use client';

import { useState, useEffect } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { Input } from '@/components/ui/input';
import EmptyState from '@/components/shared/EmptyState';
import { toast } from 'sonner';
import {
  Search, Plus, UserPlus, CheckCircle2, Clock, FileCheck,
  Handshake, XCircle, ChevronRight, TrendingUp, Users,
  LayoutGrid, List, X, Phone, BookOpen, CalendarCheck,
  BadgeCheck, AlertTriangle, CalendarDays
} from 'lucide-react';
import InterviewScheduleModal from '@/components/admissions/InterviewScheduleModal';
import InterviewScheduleTab from '@/components/admissions/InterviewScheduleTab';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
// ─── Types ───────────────────────────────────────────────────────────────────

type Applicant = {
  id: string;
  name: string;
  applyingForClass: string;
  parentName: string;
  phone: string;
  stage: string;
  inquiryDate: string;
  source: string;
  daysInStage: number;
};

// ─── DB ↔ UI mappings ────────────────────────────────────────────────────────

const STAGE_FROM_DB: Record<string, string> = {
  INQUIRY:              'Inquiry',
  APPLICATION_RECEIVED: 'Application Received',
  DOCUMENTS_VERIFIED:   'Documents Verified',
  INTERVIEW_SCHEDULED:  'Interview Scheduled',
  OFFER_MADE:           'Offer Made',
  ENROLLED:             'Enrolled',
  REJECTED:             'Rejected',
};
const STAGE_TO_DB: Record<string, string> = Object.fromEntries(
  Object.entries(STAGE_FROM_DB).map(([k, v]) => [v, k])
);

const SOURCE_FROM_DB: Record<string, string> = {
  WALK_IN:       'Walk-in',
  SCHOOL_WEBSITE:'School website',
  REFERRAL:      'Referral',
  CAMPAIGN:      'Campaign',
  SOCIAL_MEDIA:  'Social media',
  OTHER:         'Other',
};
const SOURCE_TO_DB: Record<string, string> = Object.fromEntries(
  Object.entries(SOURCE_FROM_DB).map(([k, v]) => [v, k])
);

// ─── Stage Config ─────────────────────────────────────────────────────────────

const stageConfig: Record<string, {
  color: string; bg: string; border: string; icon: React.ElementType;
  action?: string; actionIcon?: React.ElementType; actionColor?: string;
  rejectable?: boolean;
}> = {
  'Inquiry':              { color: 'text-gray-600',  bg: 'bg-gray-100',   border: 'border-gray-200',  icon: UserPlus,      action: 'Submit Application', actionIcon: FileCheck,    actionColor: 'bg-navy text-white hover:bg-navyMid' },
  'Application Received': { color: 'text-teal',      bg: 'bg-teal/10',    border: 'border-teal/30',   icon: FileCheck,     action: 'Verify Documents',   actionIcon: BadgeCheck,  actionColor: 'bg-teal text-white hover:bg-teal/80' },
  'Documents Verified':   { color: 'text-purple',    bg: 'bg-purple/10',  border: 'border-purple/30', icon: BadgeCheck,    action: 'Schedule Interview', actionIcon: CalendarCheck, actionColor: 'bg-purple text-white hover:bg-purple/80' },
  'Interview Scheduled':  { color: 'text-amber',     bg: 'bg-amber/10',   border: 'border-amber/30',  icon: CalendarCheck, action: 'Make Offer',         actionIcon: Handshake,   actionColor: 'bg-amber text-white hover:bg-amber/80', rejectable: true },
  'Offer Made':           { color: 'text-teal',        bg: 'bg-teal/10',     border: 'border-teal/30',    icon: Handshake,   action: 'Confirm Enrollment', actionIcon: CheckCircle2, actionColor: 'bg-teal text-white hover:bg-teal/80', rejectable: true },
  'Enrolled':             { color: 'text-green',       bg: 'bg-green/10',    border: 'border-green/30',   icon: CheckCircle2 },
  'Rejected':             { color: 'text-coral',       bg: 'bg-coral/10',    border: 'border-coral/30',   icon: XCircle },
};

const actionMessages: Record<string, string> = {
  'Inquiry':              'Application submitted successfully',
  'Application Received': 'Documents verified and approved',
  'Documents Verified':   'Interview scheduled and confirmed',
  'Interview Scheduled':  'Offer made to family',
  'Offer Made':           'Enrollment confirmed — welcome to Sundarban Academy!',
};

const stageOrder = ['Inquiry', 'Application Received', 'Documents Verified', 'Interview Scheduled', 'Offer Made', 'Enrolled', 'Rejected'];
const sourceColors: Record<string, string> = {
  'Walk-in': '#1E2761', 'School website': '#F5C542', 'Referral': '#028090', 'Campaign': '#534AB7',
};
const classOptions = ['Nursery', 'LKG', 'UKG', 'Class I', 'Class II', 'Class III', 'Class IV', 'Class V', 'Class VI', 'Class VII', 'Class VIII', 'Class IX', 'Class X', 'Class XI', 'Class XII'];

type Tab = 'pipeline' | 'table' | 'analytics' | 'interviews';

// ─── New Inquiry Modal ────────────────────────────────────────────────────────

function NewInquiryModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', applyingForClass: '', parentName: '', phone: '', source: 'Walk-in' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Student name is required';
    if (!form.applyingForClass) e.applyingForClass = 'Please select a class';
    if (!form.parentName.trim()) e.parentName = 'Parent name is required';
    if (!form.phone.trim() || !/^\d{10}$/.test(form.phone)) e.phone = 'Enter a valid 10-digit phone';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName:     form.name.trim(),
          parentName:      form.parentName.trim(),
          phone:           form.phone.trim(),
          applyingForGrade: form.applyingForClass,
          source:          SOURCE_TO_DB[form.source] ?? 'WALK_IN',
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? 'Failed to create inquiry');
        return;
      }
      toast.success(`New inquiry created for ${form.name}`, { description: 'Added to Inquiry stage' });
      onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-sora font-bold text-navy text-lg">New Admission Inquiry</h2>
            <p className="text-xs text-gray-400 mt-0.5">Fill details to start the admission process</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* Student Name */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Student Name <span className="text-coral">*</span></label>
            <div className="relative">
              <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="e.g. Arjun Chatterjee"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className={`w-full pl-9 pr-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 ${errors.name ? 'border-coral' : 'border-gray-200'}`}
              />
            </div>
            {errors.name && <p className="text-xs text-coral mt-1">{errors.name}</p>}
          </div>

          {/* Class */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Applying for Class <span className="text-coral">*</span></label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={form.applyingForClass}
                onChange={e => setForm(f => ({ ...f, applyingForClass: e.target.value }))}
                className={`w-full pl-9 pr-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white appearance-none ${errors.applyingForClass ? 'border-coral' : 'border-gray-200'}`}
              >
                <option value="">Select class...</option>
                {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {errors.applyingForClass && <p className="text-xs text-coral mt-1">{errors.applyingForClass}</p>}
          </div>

          {/* Parent Name + Phone side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Parent Name <span className="text-coral">*</span></label>
              <input
                type="text"
                placeholder="Father / Mother"
                value={form.parentName}
                onChange={e => setForm(f => ({ ...f, parentName: e.target.value }))}
                className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 ${errors.parentName ? 'border-coral' : 'border-gray-200'}`}
              />
              {errors.parentName && <p className="text-xs text-coral mt-1">{errors.parentName}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Phone <span className="text-coral">*</span></label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="tel"
                  placeholder="10-digit"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  className={`w-full pl-8 pr-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 ${errors.phone ? 'border-coral' : 'border-gray-200'}`}
                />
              </div>
              {errors.phone && <p className="text-xs text-coral mt-1">{errors.phone}</p>}
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">How did they hear about us?</label>
            <div className="grid grid-cols-2 gap-2">
              {['Walk-in', 'School website', 'Referral', 'Campaign'].map(src => (
                <button
                  key={src}
                  onClick={() => setForm(f => ({ ...f, source: src }))}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                    form.source === src
                      ? 'bg-navy text-white border-navy'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-navy/40'
                  }`}
                >
                  {src}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 py-2.5 text-sm font-semibold bg-gold text-navy rounded-xl hover:bg-gold/90 transition-colors disabled:opacity-60">
            {saving ? 'Creating…' : 'Create Inquiry'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Applicant Detail Drawer ──────────────────────────────────────────────────

function ApplicantDrawer({
  applicant, stage, onClose, onAction, onReject, onScheduleInterview
}: {
  applicant: Applicant; stage: string;
  onClose: () => void;
  onAction: () => void;
  onReject: () => void;
  onScheduleInterview?: () => void;
}) {
  const cfg = stageConfig[stage];
  const ActionIcon = cfg.actionIcon ?? ChevronRight;
  const StageIcon = cfg.icon;

  const timeline = stageOrder.slice(0, stageOrder.indexOf('Rejected'));

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end" onClick={onClose}>
      <div className="bg-white w-full max-w-sm h-full flex flex-col shadow-2xl animate-slideIn" onClick={e => e.stopPropagation()}>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto">

        {/* Header */}
        <div className="gradient-navy text-white p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-ice/60 font-dm-sans">{applicant.id}</span>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-gold flex items-center justify-center mb-3">
            <span className="text-navy font-bold text-lg font-sora">
              {applicant.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
            </span>
          </div>
          <h2 className="font-sora font-bold text-lg">{applicant.name}</h2>
          <p className="text-ice/70 text-sm">{applicant.applyingForClass}</p>
        </div>

        {/* Stage Progress */}
        <div className="p-4 border-b border-gray-100">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Application Progress</p>
          <div className="relative">
            <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-gray-100" />
            <div className="space-y-3">
              {timeline.map((s, idx) => {
                const currentIdx = timeline.indexOf(stage);
                const isDone = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                return (
                  <div key={s} className="flex items-center gap-3 relative">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 transition-all ${
                      isDone ? 'bg-green border-green' : isCurrent ? 'bg-navy border-navy' : 'bg-white border-gray-200'
                    }`}>
                      {isDone
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        : <span className={`text-[10px] font-bold ${isCurrent ? 'text-white' : 'text-gray-300'}`}>{idx + 1}</span>
                      }
                    </div>
                    <span className={`text-xs font-semibold ${isDone ? 'text-green' : isCurrent ? 'text-navy' : 'text-gray-400'}`}>{s}</span>
                    {isCurrent && (
                      <span className="ml-auto text-[9px] bg-navy/10 text-navy px-1.5 py-0.5 rounded-full font-bold">Current</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-4 space-y-3 border-b border-gray-100">
          {[
            { label: 'Parent', value: applicant.parentName },
            { label: 'Phone', value: applicant.phone },
            { label: 'Source', value: applicant.source },
            { label: 'Inquiry Date', value: applicant.inquiryDate },
            { label: 'Days in stage', value: `${applicant.daysInStage} days` },
          ].map(row => (
            <div key={row.label} className="flex justify-between text-sm">
              <span className="text-gray-400 text-xs">{row.label}</span>
              <span className="text-gray-700 font-semibold text-xs">{row.value}</span>
            </div>
          ))}
        </div>

        {/* Current Stage Badge */}
        <div className="p-4">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${cfg.bg} ${cfg.border}`}>
            <StageIcon className={`w-4 h-4 ${cfg.color}`} />
            <span className={`text-xs font-semibold ${cfg.color}`}>{stage}</span>
          </div>
        </div>

        {/* Terminal states — inside scroll area */}
        {stage === 'Enrolled' && (
          <div className="p-4">
            <div className="bg-green/10 border border-green/20 rounded-xl p-3 text-center">
              <CheckCircle2 className="w-6 h-6 text-green mx-auto mb-1" />
              <p className="text-sm font-semibold text-green">Enrolled</p>
              <p className="text-xs text-gray-500 mt-0.5">Admission process complete</p>
            </div>
          </div>
        )}
        {stage === 'Rejected' && (
          <div className="p-4">
            <div className="bg-coral/10 border border-coral/20 rounded-xl p-3 text-center">
              <XCircle className="w-6 h-6 text-coral mx-auto mb-1" />
              <p className="text-sm font-semibold text-coral">Application Rejected</p>
              <p className="text-xs text-gray-500 mt-0.5">No further action needed</p>
            </div>
          </div>
        )}

        </div>{/* end scrollable */}

        {/* ── Sticky action footer — always visible ── */}
        {cfg.action && (
          <div className="border-t border-gray-100 bg-white p-4 space-y-2 flex-shrink-0">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Next Action</p>
            <button
              onClick={stage === 'Documents Verified' && onScheduleInterview ? onScheduleInterview : onAction}
              className={`w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl transition-colors ${cfg.actionColor}`}
            >
              <ActionIcon className="w-4 h-4" />
              {cfg.action}
            </button>
            {cfg.rejectable && (
              <button
                onClick={onReject}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-coral border border-coral/30 bg-coral/5 rounded-xl hover:bg-coral/10 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Reject Application
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdmissionsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('pipeline');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [interviewTarget, setInterviewTarget] = useState<Applicant | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);

  function mapApplicant(a: Record<string, string>): Applicant {
    const date = a.inquiryDate ? new Date(a.inquiryDate) : new Date();
    const updated = a.updatedAt ? new Date(a.updatedAt) : date;
    const daysInStage = Math.max(0, Math.floor((Date.now() - updated.getTime()) / 86_400_000));
    return {
      id: a.id,
      name: a.studentName,
      applyingForClass: a.applyingForGrade ?? a.applyingForClass ?? 'Class I',
      parentName: a.parentName,
      phone: a.phone,
      source: SOURCE_FROM_DB[a.source] ?? a.source ?? 'Walk-in',
      stage: STAGE_FROM_DB[a.stage] ?? a.stage ?? 'Inquiry',
      inquiryDate: date.toISOString().split('T')[0],
      daysInStage,
    };
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admissions?limit=100');
      if (!res.ok) return;
      const data = await res.json();
      setApplicants((data.data ?? []).map(mapApplicant));
    } catch {
      // leave empty
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const allApplicants = applicants;

  const getStage = (id: string, original: string) => {
    const a = applicants.find(x => x.id === id);
    return a ? a.stage : original;
  };

  const advanceStage = async (applicant: Applicant) => {
    const current = applicant.stage;
    const idx = stageOrder.indexOf(current);
    if (idx < 0 || idx >= stageOrder.length - 2) return;
    const next = stageOrder[idx + 1];
    // Optimistic update
    setApplicants(prev => prev.map(a => a.id === applicant.id ? { ...a, stage: next } : a));
    setSelectedApplicant(null);
    toast.success(actionMessages[current] ?? `Moved to ${next}`, { description: `${applicant.name} → ${next}` });
    try {
      const res = await fetch('/api/admissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: applicant.id, stage: STAGE_TO_DB[next] }),
      });
      if (!res.ok) {
        // Roll back on failure
        setApplicants(prev => prev.map(a => a.id === applicant.id ? { ...a, stage: current } : a));
        toast.error('Failed to update stage');
      }
    } catch {
      setApplicants(prev => prev.map(a => a.id === applicant.id ? { ...a, stage: current } : a));
    }
  };

  const rejectApplicant = async (applicant: Applicant) => {
    setApplicants(prev => prev.map(a => a.id === applicant.id ? { ...a, stage: 'Rejected' } : a));
    setSelectedApplicant(null);
    toast.error('Application rejected', { description: applicant.name });
    try {
      const res = await fetch('/api/admissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: applicant.id, stage: 'REJECTED' }),
      });
      if (!res.ok) {
        setApplicants(prev => prev.map(a => a.id === applicant.id ? { ...a, stage: applicant.stage } : a));
      }
    } catch {
      setApplicants(prev => prev.map(a => a.id === applicant.id ? { ...a, stage: applicant.stage } : a));
    }
  };

  const filtered = allApplicants.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.applyingForClass.toLowerCase().includes(search.toLowerCase()) ||
    a.parentName.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const enrolled   = allApplicants.filter(a => a.stage === 'Enrolled').length;
  const inProgress = allApplicants.filter(a => !['Enrolled', 'Rejected'].includes(a.stage)).length;
  const rejected   = allApplicants.filter(a => a.stage === 'Rejected').length;

  // Chart data
  const sourceData = Object.entries(
    allApplicants.reduce((acc, a) => { acc[a.source] = (acc[a.source] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const classData = Object.entries(
    allApplicants.reduce((acc, a) => { acc[a.applyingForClass] = (acc[a.applyingForClass] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

  const funnelData = [
    { stage: 'Inquiry',   count: allApplicants.filter(a => a.stage === 'Inquiry').length },
    { stage: 'Applied',   count: allApplicants.filter(a => ['Application Received', 'Documents Verified'].includes(a.stage)).length },
    { stage: 'Interview', count: allApplicants.filter(a => a.stage === 'Interview Scheduled').length },
    { stage: 'Offered',   count: allApplicants.filter(a => a.stage === 'Offer Made').length },
    { stage: 'Enrolled',  count: enrolled },
  ];

  const tabs = [
    { id: 'pipeline' as Tab, label: 'Pipeline', icon: LayoutGrid },
    { id: 'table' as Tab, label: 'All Applicants', icon: List },
    { id: 'analytics' as Tab, label: 'Analytics', icon: TrendingUp },
    { id: 'interviews' as Tab, label: 'Interview Schedule', icon: CalendarDays },
  ];

  return (
    <PageWrapper>
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
          {[
            { label: 'Total', value: allApplicants.length, color: 'text-navy', bg: 'bg-navy/10', icon: Users },
            { label: 'In Progress', value: inProgress, color: 'text-amber', bg: 'bg-amber/10', icon: Clock },
            { label: 'Enrolled', value: enrolled, color: 'text-green', bg: 'bg-green/10', icon: CheckCircle2 },
            { label: 'Rejected', value: rejected, color: 'text-coral', bg: 'bg-coral/10', icon: XCircle },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4.5 h-4.5 ${stat.color}`} />
                </div>
                <div>
                  <div className={`text-2xl font-sora font-bold leading-none ${stat.color}`}>{stat.value}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 bg-gold text-navy font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-gold/90 transition-colors shadow-sm flex-shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          New Inquiry
        </button>
      </div>

      {/* Tabs container */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Tab Bar */}
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold font-dm-sans whitespace-nowrap transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'border-navy text-navy bg-navy/3'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.id === 'table' && (
                  <span className="ml-1 text-[10px] bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5 font-bold">
                    {allApplicants.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-5">

          {/* ── Loading skeleton ── */}
          {loading && (
            <div className="space-y-3 py-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {/* ── Pipeline Tab ── */}
          {!loading && activeTab === 'pipeline' && (
            <div>
              <p className="text-xs text-gray-400 mb-4 font-dm-sans">Click any card to view details and take action at each stage.</p>
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                  {stageOrder.map(stage => {
                    const cfg = stageConfig[stage];
                    const StageIcon = cfg.icon;
                    const cards = allApplicants.filter(a => a.stage === stage);
                    return (
                      <div key={stage} className="w-48 flex-shrink-0">
                        {/* Stage Header */}
                        <div className={`flex items-center gap-1.5 mb-2.5 px-2.5 py-2 rounded-xl ${cfg.bg} border ${cfg.border}`}>
                          <StageIcon className={`w-3.5 h-3.5 ${cfg.color} flex-shrink-0`} />
                          <span className={`text-[11px] font-sora font-bold ${cfg.color} truncate`}>{stage}</span>
                          <span className={`ml-auto text-[10px] font-bold ${cfg.color} bg-white/70 rounded-full px-1.5 py-0.5 flex-shrink-0 border ${cfg.border}`}>
                            {cards.length}
                          </span>
                        </div>

                        {/* Cards */}
                        <div className="space-y-2 min-h-[80px]">
                          {cards.map(a => (
                            <button
                              key={a.id}
                              onClick={() => setSelectedApplicant(a)}
                              className="w-full text-left bg-gray-50 hover:bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md rounded-xl p-3 transition-all group"
                            >
                              <div className="flex items-center gap-2 mb-1.5">
                                <div className="w-7 h-7 rounded-lg bg-navy flex items-center justify-center flex-shrink-0">
                                  <span className="text-white text-[9px] font-bold font-sora">
                                    {a.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-xs text-gray-800 truncate">{a.name}</div>
                                  <div className="text-[10px] text-gray-400">{a.applyingForClass}</div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] bg-iceLight text-navy px-1.5 py-0.5 rounded-full font-semibold">{a.source}</span>
                                {cfg.action && (
                                  <span className="text-[9px] text-teal font-bold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Action <ChevronRight className="w-2.5 h-2.5" />
                                  </span>
                                )}
                              </div>
                              <div className="text-[9px] text-gray-400 mt-1.5">{a.daysInStage}d in stage</div>
                            </button>
                          ))}
                          {cards.length === 0 && (
                            <div className="border-2 border-dashed border-gray-200 rounded-xl h-16 flex items-center justify-center">
                              <span className="text-[10px] text-gray-300">Empty</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── All Applicants Tab ── */}
          {!loading && activeTab === 'table' && (
            <div>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, class, or parent..."
                    className="pl-9 h-10 text-sm"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 self-start">
                  <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-navy' : 'text-gray-500 hover:text-gray-700'}`}>
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-navy' : 'text-gray-500 hover:text-gray-700'}`}>
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {filtered.length === 0 ? (
                <EmptyState />
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filtered.map(a => {
                    const currentStage = a.stage;
                    const cfg = stageConfig[currentStage];
                    const StageIcon = cfg.icon;
                    return (
                      <button
                        key={a.id}
                        onClick={() => setSelectedApplicant(a)}
                        className="text-left bg-gray-50 hover:bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md rounded-2xl p-4 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="w-9 h-9 rounded-xl bg-navy flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold font-sora">
                              {a.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                            </span>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border} flex items-center gap-1`}>
                            <StageIcon className="w-2.5 h-2.5" />
                            {currentStage}
                          </span>
                        </div>
                        <div className="font-semibold text-sm text-gray-800 mb-0.5">{a.name}</div>
                        <div className="text-xs text-gray-500 mb-1">{a.applyingForClass}</div>
                        <div className="text-[11px] text-gray-400 mb-3">{a.parentName}</div>
                        <div className="flex items-center justify-between pt-2.5 border-t border-gray-100">
                          <span className="text-[10px] bg-iceLight text-navy px-2 py-0.5 rounded-full font-semibold">{a.source}</span>
                          {cfg.action && (
                            <span className="text-[11px] text-teal font-bold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {cfg.action} <ChevronRight className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full min-w-[640px]">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['Applicant', 'Class', 'Parent', 'Source', 'Stage', 'Date', 'Action'].map(h => (
                          <th key={h} className="text-left text-xs uppercase tracking-wide text-gray-400 px-4 py-3 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((a, i) => {
                        const currentStage = a.stage;
                        const cfg = stageConfig[currentStage];
                        const StageIcon = cfg.icon;
                        return (
                          <tr key={a.id} className={`border-b border-gray-50 hover:bg-gray-50/80 transition-colors cursor-pointer ${i % 2 !== 0 ? 'bg-gray-50/30' : ''}`} onClick={() => setSelectedApplicant(a)}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-navy flex items-center justify-center flex-shrink-0">
                                  <span className="text-white text-[10px] font-bold font-sora">
                                    {a.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                                  </span>
                                </div>
                                <span className="font-semibold text-sm text-gray-800">{a.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{a.applyingForClass}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{a.parentName}</td>
                            <td className="px-4 py-3">
                              <span className="text-xs bg-iceLight text-navy px-2 py-0.5 rounded-full font-semibold">{a.source}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 w-fit ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                                <StageIcon className="w-3 h-3" />
                                {currentStage}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-400">{a.inquiryDate}</td>
                            <td className="px-4 py-3">
                              {cfg.action ? (
                                <span className="text-xs text-teal font-semibold flex items-center gap-1">
                                  {cfg.action} <ChevronRight className="w-3 h-3" />
                                </span>
                              ) : (
                                <span className={`text-xs font-semibold ${cfg.color}`}>—</span>
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
          )}

          {/* ── Interview Schedule Tab ── */}
          {activeTab === 'interviews' && <InterviewScheduleTab />}

          {/* ── Analytics Tab ── */}
          {!loading && activeTab === 'analytics' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <h3 className="font-sora font-semibold text-navy text-sm mb-0.5">By Source</h3>
                  <p className="text-xs text-gray-400 mb-4">Where leads are coming from</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={false} labelLine={false}>
                        {sourceData.map(entry => (
                          <Cell key={entry.name} fill={sourceColors[entry.name] ?? '#ccc'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontFamily: 'DM Sans', fontSize: 12, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {sourceData.map(s => (
                      <div key={s.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: sourceColors[s.name] ?? '#ccc' }} />
                        {s.name} ({s.value})
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <h3 className="font-sora font-semibold text-navy text-sm mb-0.5">By Class</h3>
                  <p className="text-xs text-gray-400 mb-4">Most in-demand grades</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={classData} layout="vertical" margin={{ left: 10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fontSize: 10, fontFamily: 'DM Sans' }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fontFamily: 'DM Sans' }} width={65} />
                      <Tooltip contentStyle={{ fontFamily: 'DM Sans', fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="value" fill="#1E2761" radius={[0, 5, 5, 0]} name="Applications" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <h3 className="font-sora font-semibold text-navy text-sm mb-0.5">Conversion Funnel</h3>
                  <p className="text-xs text-gray-400 mb-4">Inquiry → Enrolled drop-off</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={funnelData} margin={{ top: 4, right: 4, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="stage" tick={{ fontSize: 9, fontFamily: 'DM Sans' }} />
                      <YAxis tick={{ fontSize: 10, fontFamily: 'DM Sans' }} />
                      <Tooltip contentStyle={{ fontFamily: 'DM Sans', fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="count" name="Applicants" fill="#F5C542" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Conversion metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Inquiry → Applied', rate: '72%', sub: '+4% vs last month', up: true },
                  { label: 'Applied → Interview', rate: '58%', sub: '+2% vs last month', up: true },
                  { label: 'Interview → Offer', rate: '81%', sub: '-1% vs last month', up: false },
                  { label: 'Offer → Enrolled', rate: '88%', sub: '+6% vs last month', up: true },
                ].map(item => (
                  <div key={item.label} className="bg-gradient-to-br from-navy to-navyMid rounded-xl p-4 text-white">
                    <div className="flex items-center gap-1 mb-2">
                      {item.up
                        ? <TrendingUp className="w-3.5 h-3.5 text-gold" />
                        : <AlertTriangle className="w-3.5 h-3.5 text-coral" />
                      }
                    </div>
                    <div className="text-2xl font-sora font-bold mb-1">{item.rate}</div>
                    <div className="text-xs text-ice/70 leading-tight">{item.label}</div>
                    <div className={`text-[11px] font-semibold mt-2 ${item.up ? 'text-green' : 'text-coral'}`}>{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Inquiry Modal */}
      {showNewModal && (
        <NewInquiryModal
          onClose={() => setShowNewModal(false)}
          onCreated={load}
        />
      )}

      {/* Applicant Detail Drawer */}
      {selectedApplicant && (() => {
        const live = applicants.find(a => a.id === selectedApplicant.id) ?? selectedApplicant;
        return (
          <ApplicantDrawer
            applicant={live}
            stage={live.stage}
            onClose={() => setSelectedApplicant(null)}
            onAction={() => advanceStage(live)}
            onReject={() => rejectApplicant(live)}
            onScheduleInterview={() => {
              setInterviewTarget(live);
              setSelectedApplicant(null);
            }}
          />
        );
      })()}

      {/* Interview Schedule Modal */}
      {interviewTarget && (
        <InterviewScheduleModal
          inquiry={{
            id: interviewTarget.id,
            studentName: interviewTarget.name,
            parentName: interviewTarget.parentName,
            phone: interviewTarget.phone,
            applyingForClass: interviewTarget.applyingForClass,
          }}
          onClose={() => setInterviewTarget(null)}
          onScheduled={() => {
            setInterviewTarget(null);
            load();
            setActiveTab('interviews');
          }}
        />
      )}
    </PageWrapper>
  );
}

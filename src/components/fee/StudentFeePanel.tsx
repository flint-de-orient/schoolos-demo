'use client';

import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, Clock, AlertCircle, Plus, RefreshCw, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Installment = {
  id: string;
  termLabel: string;
  amount: string;
  dueDate: string;
  paidAmount: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL' | 'WAIVED';
  lateFee: string;
};

type Transaction = {
  id: string;
  amount: string;
  paymentMode: string;
  transactedAt: string;
  receiptNo: string | null;
  remarks: string | null;
};

type FeeAccount = {
  id: string;
  totalDue: string;
  totalPaid: string;
  balance: string;
  status: string;
  isLocked: boolean;
  installments: Installment[];
  transactions: Transaction[];
};

type Concession = {
  id: string;
  concessionTemplate: { id: string; name: string; type: string; value: string };
};

type Assignment = {
  id: string;
  academicYear: { id: string; label: string };
  feePlan: {
    id: string;
    name: string;
    items: { id: string; amount: string; frequency: string; component: { id: string; name: string } }[];
  };
  studentCategory: { id: string; name: string } | null;
  concessions: Concession[];
  feeAccount: FeeAccount | null;
};

type AvailablePlan = { id: string; name: string };
type AcademicYear  = { id: string; label: string };

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: string | number) => Number(n).toLocaleString('en-IN');

const STATUS_STYLES: Record<string, string> = {
  PAID:    'bg-green/10 text-green border-green/20',
  PENDING: 'bg-amber/10 text-amber border-amber/20',
  OVERDUE: 'bg-coral/10 text-coral border-coral/20',
  PARTIAL: 'bg-blue-50 text-blue-700 border-blue-200',
  WAIVED:  'bg-gray-100 text-gray-500 border-gray-200',
};

const STATUS_ICON: Record<string, React.ElementType> = {
  PAID:    CheckCircle2,
  PENDING: Clock,
  OVERDUE: AlertCircle,
  PARTIAL: Clock,
  WAIVED:  CheckCircle2,
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING;
  const Icon = STATUS_ICON[status] ?? Clock;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${cls}`}>
      <Icon size={10} /> {status}
    </span>
  );
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 flex-1">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-sora font-bold ${color}`}>₹{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Manual Assign Form ────────────────────────────────────────────────────────

function AssignForm({ studentId, onAssigned }: { studentId: string; onAssigned: () => void }) {
  const [years, setYears]   = useState<AcademicYear[]>([]);
  const [plans, setPlans]   = useState<AvailablePlan[]>([]);
  const [yearId, setYearId] = useState('');
  const [planId, setPlanId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/academic-years').then(r => r.json()).then((d: AcademicYear[]) => {
      setYears(Array.isArray(d) ? d : []);
    });
  }, []);

  useEffect(() => {
    if (!yearId) { setPlans([]); setPlanId(''); return; }
    fetch(`/api/fee/plans?academicYearId=${yearId}`).then(r => r.json()).then(d => {
      setPlans(Array.isArray(d) ? d : (d.data ?? []));
      setPlanId('');
    });
  }, [yearId]);

  async function assign() {
    if (!planId || !yearId) { toast.error('Select academic year and fee plan'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/fee/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, feePlanId: planId, academicYearId: yearId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? 'Failed to assign');
        return;
      }
      toast.success('Fee plan assigned — installments generated');
      onAssigned();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-dashed border-gray-200 rounded-xl p-5 space-y-3">
      <p className="text-sm font-semibold text-gray-700">Assign Fee Plan Manually</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Academic Year</label>
          <select
            value={yearId}
            onChange={e => setYearId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy/20"
          >
            <option value="">Select year…</option>
            {years.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Fee Plan</label>
          <select
            value={planId}
            onChange={e => setPlanId(e.target.value)}
            disabled={!yearId || plans.length === 0}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 disabled:opacity-50"
          >
            <option value="">{plans.length === 0 ? (yearId ? 'No plans for this year' : 'Select year first…') : 'Select plan…'}</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>
      <button
        onClick={assign}
        disabled={saving || !planId}
        className="flex items-center gap-2 bg-navy text-white text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-50 hover:bg-navyMid transition-colors"
      >
        <Plus size={14} /> {saving ? 'Assigning…' : 'Assign Plan'}
      </button>
    </div>
  );
}

// ─── Main Panel ────────────────────────────────────────────────────────────────

export default function StudentFeePanel({ studentId }: { studentId: string }) {
  const [data, setData]       = useState<{ assignment: Assignment | null } | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${studentId}/fee`);
      if (!res.ok) { setData(null); return; }
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [studentId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  const assignment = data?.assignment ?? null;
  const account    = assignment?.feeAccount ?? null;

  // ── No assignment ─────────────────────────────────────────────────────────────
  if (!assignment) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center justify-center py-10 text-center bg-gray-50 rounded-2xl">
          <CreditCard className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-gray-600">No fee plan assigned</p>
          <p className="text-xs text-gray-400 mt-1">Auto-assign runs at enrolment. You can assign manually below.</p>
        </div>
        <AssignForm studentId={studentId} onAssigned={load} />
      </div>
    );
  }

  const installments  = account?.installments ?? [];
  const transactions  = account?.transactions ?? [];
  const overdue       = installments.filter(i => i.status === 'OVERDUE').length;
  const upcoming      = installments.find(i => i.status === 'PENDING');

  // ── Assigned ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Plan header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Fee Plan · {assignment.academicYear.label}</p>
          <p className="text-base font-sora font-bold text-navy">{assignment.feePlan.name}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {assignment.studentCategory && (
              <span className="text-xs bg-iceLight text-navyMid border border-ice rounded-full px-2 py-0.5 font-medium">
                {assignment.studentCategory.name}
              </span>
            )}
            {assignment.concessions.map(c => (
              <span key={c.id} className="text-xs bg-goldLight text-amber border border-gold/30 rounded-full px-2 py-0.5 font-medium">
                {c.concessionTemplate.name}
              </span>
            ))}
            {account?.isLocked && (
              <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 font-medium flex items-center gap-1">
                <Lock size={10} /> Locked
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {account && <StatusBadge status={account.status} />}
          <button
            onClick={load}
            title="Refresh"
            className="p-1.5 text-gray-400 hover:text-navy rounded-lg hover:bg-gray-100 transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Fee components (plan items) */}
      {assignment.feePlan.items.length > 0 && (
        <div className="bg-iceLight border border-ice rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-navyMid mb-2">Plan Components</p>
          <div className="flex flex-wrap gap-2">
            {assignment.feePlan.items.map(item => (
              <span key={item.id} className="text-xs bg-white border border-ice rounded-full px-2.5 py-1 text-navy font-medium">
                {item.component.name}
                <span className="text-gray-400 ml-1">₹{fmt(item.amount)} / {item.frequency.toLowerCase().replace('_', '-')}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Summary cards */}
      {account && (
        <div className="flex gap-3">
          <SummaryCard label="Total Due"  value={fmt(account.totalDue)}  color="text-navy"  />
          <SummaryCard label="Total Paid" value={fmt(account.totalPaid)} color="text-green" />
          <SummaryCard
            label="Balance"
            value={fmt(account.balance)}
            color={Number(account.balance) > 0 ? 'text-coral' : 'text-green'}
            sub={overdue > 0 ? `${overdue} overdue installment${overdue > 1 ? 's' : ''}` : upcoming ? `Next due: ${new Date(upcoming.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : undefined}
          />
        </div>
      )}

      {/* Installments */}
      {installments.length > 0 ? (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Installments</p>
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Term', 'Amount', 'Due Date', 'Paid', 'Status'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {installments.map(inst => (
                  <tr key={inst.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{inst.termLabel}</td>
                    <td className="px-4 py-2.5 font-semibold text-navy">₹{fmt(inst.amount)}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">
                      {new Date(inst.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-2.5 text-green font-semibold">
                      {Number(inst.paidAmount) > 0 ? `₹${fmt(inst.paidAmount)}` : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={inst.status} />
                      {Number(inst.lateFee) > 0 && (
                        <span className="ml-1 text-[10px] text-coral">+₹{fmt(inst.lateFee)} late fee</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : account ? (
        <div className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-xl">
          No installments generated yet.
        </div>
      ) : null}

      {/* Recent transactions */}
      {transactions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Payments</p>
          <div className="space-y-1.5">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-green">₹{fmt(tx.amount)}</p>
                  <p className="text-[11px] text-gray-400">
                    {tx.paymentMode} · {new Date(tx.transactedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {tx.receiptNo && ` · ${tx.receiptNo}`}
                  </p>
                </div>
                {tx.remarks && <p className="text-xs text-gray-400 max-w-[140px] text-right truncate">{tx.remarks}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { toast } from 'sonner';
import {
  CreditCard, TrendingDown, AlertCircle, CheckCircle2, Search,
  MessageSquare, Plus, X, Send, Edit2, Printer, Receipt,
  ChevronRight, Clock, Banknote, Smartphone, FileText,
  CheckCheck, IndianRupee, TrendingUp, Percent,
  Check, Building2, RefreshCw, Trash2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import AIBadge from '@/components/shared/AIBadge';
import FeeSetupTab from '@/components/fee/FeeSetupTab';

// ─── Types ────────────────────────────────────────────────────────────────────

type FeeStatus = 'paid' | 'pending' | 'overdue' | 'partial';
type Tab = 'overview' | 'records' | 'concessions' | 'reports' | 'setup';

type FeeRecord = {
  id: string;           // feeAccount.id
  studentId: string;
  studentName: string;
  admissionNo: string;
  grade: string;
  planName: string;
  totalDue: number;
  totalPaid: number;
  balance: number;
  status: FeeStatus;
  nextInstallmentId?: string;
  nextDueDate: string | null;
  lastPaymentDate: string | null;
  lastPaymentMode: string | null;
  receiptNo: string | null;
};

type ConcessionRow = {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  grade: string;
  academicYear: string;
  concessionName: string;
  type: string;
  value: number;
  maxAmount: number | null;
};

type Summary = {
  totalDue: number;
  totalPaid: number;
  balance: number;
  overdueCount: number;
};

type MonthlyData = { month: string; collected: number; target: number };
type GradeData   = { grade: string; collected: number; pending: number };
type ModeData    = { mode: string; count: number };

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_MODES = ['UPI', 'Cash', 'NEFT', 'Cheque', 'DD', 'Card'];

const MODE_TO_DB: Record<string, string> = {
  UPI: 'UPI', Cash: 'CASH', NEFT: 'NEFT', Cheque: 'CHEQUE', DD: 'DD', Card: 'CARD',
};
const MODE_FROM_DB: Record<string, string> = {
  UPI: 'UPI', CASH: 'Cash', NEFT: 'NEFT', CHEQUE: 'Cheque', DD: 'DD', CARD: 'Card', RAZORPAY: 'Razorpay',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtAmt  = (n: number) => '₹' + n.toLocaleString('en-IN');
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const today   = () => new Date().toISOString().split('T')[0];

function mapAccount(acc: any): FeeRecord {
  const pending = acc.installments?.find((i: any) => i.status !== 'PAID');
  const lastTx  = acc.transactions?.[0];
  return {
    id: acc.id,
    studentId: acc.student?.id ?? '',
    studentName: acc.student?.name ?? '—',
    admissionNo: acc.student?.admissionNo ?? '',
    grade: acc.grade?.name ?? '—',
    planName: acc.feePlan?.name ?? '—',
    totalDue: Number(acc.totalDue),
    totalPaid: Number(acc.totalPaid),
    balance: Number(acc.balance),
    status: (acc.status?.toLowerCase() ?? 'pending') as FeeStatus,
    nextInstallmentId: pending?.id,
    nextDueDate: pending?.dueDate?.split('T')[0] ?? null,
    lastPaymentDate: lastTx?.transactedAt?.split('T')[0] ?? null,
    lastPaymentMode: lastTx?.mode ? (MODE_FROM_DB[lastTx.mode] ?? lastTx.mode) : null,
    receiptNo: lastTx?.receiptNo ?? null,
  };
}

function StatusPill({ status }: { status: FeeStatus }) {
  const cfg: Record<string, { bg: string; text: string; border: string; label: string }> = {
    paid:    { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  label: 'Paid'    },
    pending: { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  label: 'Pending' },
    overdue: { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    label: 'Overdue' },
    partial: { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   label: 'Partial' },
  };
  const c = cfg[status] ?? cfg.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      {c.label}
    </span>
  );
}

function StatTile({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 font-dm-sans mb-0.5">{label}</p>
        <p className="text-2xl font-sora font-bold text-navy leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FeePage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Live data
  const [records,     setRecords]     = useState<FeeRecord[]>([]);
  const [concessions, setConcessions] = useState<ConcessionRow[]>([]);
  const [summary,     setSummary]     = useState<Summary>({ totalDue: 0, totalPaid: 0, balance: 0, overdueCount: 0 });
  const [monthly,     setMonthly]     = useState<MonthlyData[]>([]);
  const [gradeWise,   setGradeWise]   = useState<GradeData[]>([]);
  const [modeWise,    setModeWise]    = useState<ModeData[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [totalCount,  setTotalCount]  = useState(0);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [feeRes, analyticsRes, conRes] = await Promise.all([
        fetch('/api/fee?limit=200'),
        fetch('/api/fee/analytics'),
        fetch('/api/fee/student-concessions'),
      ]);
      const [feeData, analyticsData, conData] = await Promise.all([
        feeRes.json(), analyticsRes.json(), conRes.json(),
      ]);

      if (feeData.data) {
        setRecords(feeData.data.map(mapAccount));
        setTotalCount(feeData.total ?? feeData.data.length);
      }
      if (feeData.summary) {
        setSummary({
          totalDue:    Number(feeData.summary.totalDue   ?? 0),
          totalPaid:   Number(feeData.summary.totalPaid  ?? 0),
          balance:     Number(feeData.summary.balance    ?? 0),
          overdueCount: feeData.summary.overdueCount ?? 0,
        });
      }
      if (analyticsData.monthly)  setMonthly(analyticsData.monthly);
      if (analyticsData.gradeWise) setGradeWise(analyticsData.gradeWise);
      if (analyticsData.modeWise)  setModeWise(analyticsData.modeWise);
      if (Array.isArray(conData))  setConcessions(conData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Filters
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterGrade,  setFilterGrade]  = useState('all');

  // UI state
  const [drawerRecord,  setDrawerRecord]  = useState<FeeRecord | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<FeeRecord | null>(null);
  const [receiptRecord, setReceiptRecord] = useState<FeeRecord | null>(null);

  // ── Derived ──
  const grades = useMemo(() =>
    ['all', ...Array.from(new Set(records.map(r => r.grade))).sort()], [records]);

  const filtered = useMemo(() => records.filter(r => {
    const q = search.toLowerCase();
    return (
      (r.studentName.toLowerCase().includes(q) || r.admissionNo.toLowerCase().includes(q) || (r.receiptNo ?? '').toLowerCase().includes(q)) &&
      (filterStatus === 'all' || r.status === filterStatus) &&
      (filterGrade  === 'all' || r.grade  === filterGrade)
    );
  }), [records, search, filterStatus, filterGrade]);

  const collectionRate = summary.totalDue > 0
    ? Math.round((summary.totalPaid / summary.totalDue) * 100)
    : 0;

  // ── Record payment (saves to DB) ──
  const recordPayment = async (record: FeeRecord, mode: string, paidDate: string, notes: string) => {
    const amount = record.balance > 0 ? record.balance : record.totalDue;
    try {
      const res = await fetch('/api/fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feeAccountId: record.id,
          installmentId: record.nextInstallmentId,
          amount,
          mode: MODE_TO_DB[mode] ?? 'CASH',
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? 'Failed to record payment');
        return;
      }
      const tx = await res.json();
      toast.success('Payment recorded', { description: `Receipt ${tx.data?.receiptNo ?? ''}` });
      setPaymentTarget(null);
      setDrawerRecord(null);
      loadAll();
    } catch {
      toast.error('Network error');
    }
  };

  const sendReminder = (r: FeeRecord) => {
    toast.success(`Reminder sent to ${r.studentName}'s parent`, {
      description: `${fmtAmt(r.balance)} outstanding — via WhatsApp`,
    });
  };

  const bulkRemind = () => {
    const n = records.filter(r => r.status !== 'paid').length;
    toast.success(`${n} reminders dispatched`, { description: 'WhatsApp messages sent to all pending/overdue parents' });
  };

  const removeConcession = async (id: string) => {
    const res = await fetch('/api/fee/student-concessions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) { toast.error('Failed to remove'); return; }
    toast.success('Concession removed');
    loadAll();
  };

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'overview',    label: 'Overview' },
    { id: 'records',     label: 'Fee Records',  badge: totalCount || undefined },
    { id: 'concessions', label: 'Concessions',  badge: concessions.length || undefined },
    { id: 'reports',     label: 'Reports & Analytics' },
    { id: 'setup',       label: '⚙ Fee Structure' },
  ];

  return (
    <PageWrapper>
      {/* Tab bar */}
      <div className="flex items-end gap-0.5 mb-6 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all whitespace-nowrap border-b-2 -mb-px ${
              activeTab === t.id ? 'text-navy border-navy' : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}>
            {t.label}
            {t.badge !== undefined && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === t.id ? 'bg-navy text-white' : 'bg-gray-200 text-gray-600'}`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-2 pb-2">
          <button onClick={loadAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={async () => {
              toast.info('Syncing fee accounts…');
              const res = await fetch('/api/fee/sync-accounts', { method: 'POST' });
              const d = await res.json().catch(() => ({}));
              if (res.ok) {
                toast.success(`Sync complete — ${d.synced ?? 0} account(s) created`, {
                  description: d.skipped ? `${d.skipped} student(s) skipped (no matching fee plan)` : undefined,
                });
                if (d.synced > 0) loadAll();
              } else {
                toast.error(d.error ?? 'Sync failed');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-purple/40 text-purple rounded-lg hover:bg-purple/5 transition-colors"
            title="Re-run fee plan assignment for students who have no fee account yet">
            <RefreshCw className="w-3.5 h-3.5" /> Sync Accounts
          </button>
          {(activeTab === 'overview' || activeTab === 'records') && (
            <button onClick={bulkRemind}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-teal text-teal rounded-lg hover:bg-teal/5 transition-colors">
              <Send className="w-3.5 h-3.5" />Bulk Remind
            </button>
          )}
        </div>
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <OverviewTab
          summary={summary}
          collectionRate={collectionRate}
          records={records}
          monthly={monthly}
          loading={loading}
          onOpenRecords={() => setActiveTab('records')}
          onRecordPayment={r => setPaymentTarget(r)}
        />
      )}

      {/* ── Fee Records ── */}
      {activeTab === 'records' && (
        <div className={`grid gap-5 transition-all ${drawerRecord ? 'grid-cols-[1fr_380px]' : 'grid-cols-1'}`}>
          <RecordsTable
            records={filtered}
            loading={loading}
            search={search} setSearch={setSearch}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            filterGrade={filterGrade} setFilterGrade={setFilterGrade}
            grades={grades}
            selected={drawerRecord}
            onSelect={r => setDrawerRecord(drawerRecord?.id === r.id ? null : r)}
            onRemind={sendReminder}
            onRecordPayment={r => setPaymentTarget(r)}
            onViewReceipt={r => setReceiptRecord(r)}
          />
          {drawerRecord && (
            <FeeDrawer
              record={records.find(r => r.id === drawerRecord.id) ?? drawerRecord}
              onClose={() => setDrawerRecord(null)}
              onRecordPayment={() => setPaymentTarget(drawerRecord)}
              onRemind={() => sendReminder(drawerRecord)}
              onViewReceipt={() => setReceiptRecord(drawerRecord)}
            />
          )}
        </div>
      )}

      {/* ── Concessions ── */}
      {activeTab === 'concessions' && (
        <ConcessionsTab
          concessions={concessions}
          loading={loading}
          onRemove={removeConcession}
        />
      )}

      {/* ── Reports ── */}
      {activeTab === 'reports' && (
        <ReportsTab
          records={records}
          monthly={monthly}
          gradeWise={gradeWise}
          modeWise={modeWise}
          summary={summary}
          collectionRate={collectionRate}
        />
      )}

      {/* ── Fee Structure Setup ── */}
      {activeTab === 'setup' && <FeeSetupTab />}

      {/* ── Modals ── */}
      {paymentTarget && (
        <RecordPaymentModal
          record={paymentTarget}
          onSave={(mode, paidDate, notes) => recordPayment(paymentTarget, mode, paidDate, notes)}
          onClose={() => setPaymentTarget(null)}
        />
      )}
      {receiptRecord && receiptRecord.status === 'paid' && (
        <ReceiptModal
          record={receiptRecord}
          onClose={() => setReceiptRecord(null)}
          onPrint={() => { toast.success('Sent to printer'); setReceiptRecord(null); }}
        />
      )}
    </PageWrapper>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ summary, collectionRate, records, monthly, loading, onOpenRecords, onRecordPayment }: {
  summary: Summary; collectionRate: number;
  records: FeeRecord[]; monthly: MonthlyData[];
  loading: boolean;
  onOpenRecords: () => void; onRecordPayment: (r: FeeRecord) => void;
}) {
  const overdue = records.filter(r => r.status === 'overdue').slice(0, 5);
  const pending = records.filter(r => r.status === 'pending').slice(0, 4);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Collected"   value={fmtAmt(summary.totalPaid)}  sub={`${collectionRate}% collection rate`} icon={CheckCircle2} color="bg-green-600" />
        <StatTile label="Outstanding"        value={fmtAmt(summary.balance)}    sub="Remaining balance"                     icon={Clock}        color="bg-amber-500" />
        <StatTile label="Overdue Accounts"   value={String(summary.overdueCount)} sub="Immediate action required"           icon={AlertCircle}  color="bg-red-500"   />
        <StatTile label="Total Fee Due"      value={fmtAmt(summary.totalDue)}   sub="This academic year"                    icon={CreditCard}   color="bg-navy"      />
      </div>

      {/* Collection progress bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-sora font-semibold text-navy">Collection Progress</h3>
          <span className="text-sm font-bold text-green-600">{collectionRate}%</span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all" style={{ width: `${collectionRate}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>{fmtAmt(summary.totalPaid)} collected</span>
          <span>{fmtAmt(summary.balance)} remaining</span>
        </div>
      </div>

      {/* Monthly chart + AI panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-sora font-semibold text-navy mb-4">Monthly Collection vs Target (₹ in thousands)</h3>
          {monthly.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthly} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={40} />
                <Tooltip formatter={(v) => [`₹${Number(v)}K`, ""]} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Bar dataKey="target"    fill="#e5e7eb" radius={[3,3,0,0]} name="Target"    />
                <Bar dataKey="collected" fill="#1E2761" radius={[3,3,0,0]} name="Collected" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">
              {loading ? 'Loading...' : 'No data yet — create fee plans and record payments'}
            </div>
          )}
        </div>

        {/* AI Risk panel */}
        <div className="bg-white rounded-xl border border-orange-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <h4 className="font-sora font-semibold text-navy text-sm">Default Risk</h4>
            <AIBadge />
          </div>
          {records.filter(r => r.status === 'overdue').length === 0 ? (
            <p className="text-xs text-green-600 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />No overdue accounts detected.</p>
          ) : (
            <div className="space-y-2.5">
              {records.filter(r => r.status === 'overdue').slice(0, 3).map(r => (
                <div key={r.id}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="font-semibold text-gray-700 truncate max-w-[120px]">{r.studentName}</span>
                    <span className="text-red-600 font-bold">{fmtAmt(r.balance)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full">
                    <div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.min(100, Math.round((r.balance / r.totalDue) * 100))}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">{r.grade} · {r.nextDueDate ? `Due ${fmtDate(r.nextDueDate)}` : 'Overdue'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overdue + Pending */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-sora font-semibold text-navy flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />Overdue Accounts
            </h3>
            <button onClick={onOpenRecords} className="text-xs text-navy font-semibold hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : overdue.length === 0 ? (
            <p className="text-sm text-green-600 text-center py-6 flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4" />No overdue accounts</p>
          ) : (
            <div className="space-y-2">
              {overdue.map(r => (
                <div key={r.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xs font-bold flex-shrink-0">
                    {r.studentName.split(' ').map(n => n[0]).join('').slice(0,2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{r.studentName}</p>
                    <p className="text-[11px] text-gray-500">{r.grade}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-navy">{fmtAmt(r.balance)}</p>
                    <button onClick={() => onRecordPayment(r)} className="text-[10px] text-teal font-semibold hover:underline">Record Payment</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-amber-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-sora font-semibold text-navy flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />Pending Payments
            </h3>
            <button onClick={onOpenRecords} className="text-xs text-navy font-semibold hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : pending.length === 0 ? (
            <p className="text-sm text-green-600 text-center py-6 flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4" />All payments cleared</p>
          ) : (
            <div className="space-y-2">
              {pending.map(r => (
                <div key={r.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-xs font-bold flex-shrink-0">
                    {r.studentName.split(' ').map(n => n[0]).join('').slice(0,2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{r.studentName}</p>
                    <p className="text-[11px] text-gray-500">{r.grade} · {r.nextDueDate ? `Due ${fmtDate(r.nextDueDate)}` : '—'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-navy">{fmtAmt(r.balance)}</p>
                    <button onClick={() => onRecordPayment(r)} className="text-[10px] text-teal font-semibold hover:underline">Record Payment</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Records Table ────────────────────────────────────────────────────────────

function RecordsTable({ records, loading, search, setSearch, filterStatus, setFilterStatus, filterGrade, setFilterGrade, grades, selected, onSelect, onRemind, onRecordPayment, onViewReceipt }: {
  records: FeeRecord[]; loading: boolean;
  search: string; setSearch: (v: string) => void;
  filterStatus: string; setFilterStatus: (v: string) => void;
  filterGrade: string; setFilterGrade: (v: string) => void;
  grades: string[]; selected: FeeRecord | null;
  onSelect: (r: FeeRecord) => void; onRemind: (r: FeeRecord) => void;
  onRecordPayment: (r: FeeRecord) => void; onViewReceipt: (r: FeeRecord) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-gray-100 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input placeholder="Search student, admission no, receipt…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/20" />
          </div>
          <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy/20 text-gray-600">
            {grades.map(g => <option key={g} value={g}>{g === 'all' ? 'All Classes' : g}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {['all','paid','pending','overdue','partial'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 text-xs font-semibold rounded-full capitalize transition-colors ${
                filterStatus === s ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {s === 'all' ? 'All Status' : s}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-400">{records.length} accounts</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {['Student','Class','Fee Plan','Total Due','Paid','Balance','Status','Next Due','Actions'].map(h => (
                <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 px-4 py-3 first:pl-5 last:pr-5 last:text-right">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 9 }).map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: j === 0 ? 120 : 60 }} /></td>
                ))}</tr>
              ))
            ) : records.length === 0 ? (
              <tr><td colSpan={9} className="px-5 py-12 text-center text-sm text-gray-400">No records match the filters</td></tr>
            ) : records.map(r => (
              <tr key={r.id} onClick={() => onSelect(r)}
                className={`hover:bg-blue-50/30 cursor-pointer transition-colors ${selected?.id === r.id ? 'bg-blue-50/50 ring-1 ring-inset ring-navy/10' : ''}`}>
                <td className="px-5 py-3">
                  <p className="text-sm font-semibold text-gray-800">{r.studentName}</p>
                  <p className="text-xs text-gray-400 font-mono">{r.admissionNo}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{r.grade}</td>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap max-w-[120px] truncate">{r.planName}</td>
                <td className="px-4 py-3 text-sm font-bold text-navy whitespace-nowrap">{fmtAmt(r.totalDue)}</td>
                <td className="px-4 py-3 text-sm font-semibold text-green-600 whitespace-nowrap">{fmtAmt(r.totalPaid)}</td>
                <td className="px-4 py-3 text-sm font-bold whitespace-nowrap" style={{ color: r.balance > 0 ? '#D85A30' : '#3B6D11' }}>{fmtAmt(r.balance)}</td>
                <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(r.nextDueDate)}</td>
                <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    {r.status === 'paid' && (
                      <button onClick={() => onViewReceipt(r)} title="View receipt"
                        className="p-1.5 rounded-lg text-navy hover:bg-navy/10 transition-colors">
                        <Receipt className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {r.status !== 'paid' && (
                      <>
                        <button onClick={() => onRecordPayment(r)} title="Record payment"
                          className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors">
                          <IndianRupee className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onRemind(r)} title="Send reminder"
                          className="p-1.5 rounded-lg text-teal hover:bg-teal/10 transition-colors">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Fee Drawer ───────────────────────────────────────────────────────────────

function FeeDrawer({ record: r, onClose, onRecordPayment, onRemind, onViewReceipt }: {
  record: FeeRecord; onClose: () => void;
  onRecordPayment: () => void; onRemind: () => void; onViewReceipt: () => void;
}) {
  const initials = r.studentName.split(' ').map(n => n[0]).join('').slice(0,2);
  const daysOverdue = r.status === 'overdue' && r.nextDueDate
    ? Math.floor((Date.now() - new Date(r.nextDueDate).getTime()) / 86400000)
    : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-fit sticky top-20">
      <div className="bg-navy p-5 text-white">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gold flex items-center justify-center text-navy font-bold font-sora">
              {initials}
            </div>
            <div>
              <p className="font-sora font-semibold text-base leading-tight">{r.studentName}</p>
              <p className="text-ice/70 text-xs mt-0.5">{r.grade} · {r.admissionNo}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-ice/60 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: 'Total Due', value: fmtAmt(r.totalDue), color: 'text-gold' },
            { label: 'Paid',      value: fmtAmt(r.totalPaid), color: 'text-green-300' },
            { label: 'Balance',   value: fmtAmt(r.balance),  color: r.balance > 0 ? 'text-red-300' : 'text-green-300' },
          ].map(c => (
            <div key={c.label} className="bg-white/10 rounded-lg p-2.5">
              <p className="text-ice/60 text-[10px] uppercase tracking-wide mb-0.5">{c.label}</p>
              <p className={`font-sora font-bold text-sm ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-5 space-y-4 flex-1">
        {r.status === 'overdue' && daysOverdue > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-700">{daysOverdue} days overdue</p>
              <p className="text-[11px] text-red-500">Immediate parent notification recommended</p>
            </div>
          </div>
        )}

        <StatusPill status={r.status} />

        {[
          { label: 'Fee Plan',       value: r.planName },
          { label: 'Next Due',       value: fmtDate(r.nextDueDate) },
          { label: 'Last Payment',   value: fmtDate(r.lastPaymentDate) },
          { label: 'Payment Mode',   value: r.lastPaymentMode ?? '—' },
          { label: 'Last Receipt',   value: r.receiptNo ?? '—' },
        ].map(row => (
          <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
            <span className="text-xs text-gray-500">{row.label}</span>
            <span className="text-xs font-semibold text-gray-700">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-100 space-y-2">
        {r.status !== 'paid' && (
          <button onClick={onRecordPayment} className="w-full flex items-center justify-center gap-2 py-2.5 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navyMid transition-colors">
            <IndianRupee className="w-4 h-4" />Record Payment
          </button>
        )}
        {r.status === 'paid' && (
          <button onClick={onViewReceipt} className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors">
            <Receipt className="w-4 h-4" />View Receipt
          </button>
        )}
        {r.status !== 'paid' && (
          <button onClick={onRemind} className="w-full flex items-center justify-center gap-1.5 py-2 border border-teal text-teal text-sm font-semibold rounded-lg hover:bg-teal/5 transition-colors">
            <MessageSquare className="w-3.5 h-3.5" />Send Reminder
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Concessions Tab ──────────────────────────────────────────────────────────

function ConcessionsTab({ concessions, loading, onRemove }: {
  concessions: ConcessionRow[];
  loading: boolean;
  onRemove: (id: string) => void;
}) {
  const totalByType: Record<string, number> = {};
  concessions.forEach(c => { totalByType[c.concessionName] = (totalByType[c.concessionName] ?? 0) + 1; });

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Concessions"   value={String(concessions.length)}  sub="Applied to students"           icon={Percent}      color="bg-purple-600" />
        <StatTile label="Percentage-based"    value={String(concessions.filter(c => c.type === 'PERCENTAGE').length)} sub="Discount %" icon={TrendingDown} color="bg-teal" />
        <StatTile label="Fixed-amount"        value={String(concessions.filter(c => c.type === 'FIXED').length)}      sub="Flat discount" icon={IndianRupee}  color="bg-navy"  />
        <StatTile label="Unique Templates"    value={String(new Set(concessions.map(c => c.concessionName)).size)} sub="Types applied" icon={FileText}    color="bg-amber-500" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : concessions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <Percent className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-gray-500">No concessions applied yet</p>
          <p className="text-xs text-gray-400 mt-1">Assign concessions via Fee Structure → Plans → student assignment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {concessions.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-navy flex items-center justify-center text-white font-bold text-xs font-sora">
                    {c.studentName.split(' ').map(n => n[0]).join('').slice(0,2)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{c.studentName}</p>
                    <p className="text-xs text-gray-400">{c.grade} · {c.academicYear}</p>
                  </div>
                </div>
                <button onClick={() => onRemove(c.id)}
                  className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-400 mb-0.5">Concession</p>
                  <p className="text-xs font-semibold text-navy">{c.concessionName}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-400 mb-0.5">Discount</p>
                  <p className="text-xs font-semibold text-navy">
                    {c.type === 'PERCENTAGE' ? `${c.value}%` : fmtAmt(c.value)}
                    {c.maxAmount ? ` (max ${fmtAmt(c.maxAmount)})` : ''}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Reports Tab ──────────────────────────────────────────────────────────────

const CHART_COLORS = ['#1E2761', '#028090', '#F5C542', '#534AB7', '#D85A30', '#3B6D11'];

function ReportsTab({ records, monthly, gradeWise, modeWise, summary, collectionRate }: {
  records: FeeRecord[];
  monthly: MonthlyData[];
  gradeWise: GradeData[];
  modeWise: ModeData[];
  summary: Summary;
  collectionRate: number;
}) {
  const statusData = [
    { name: 'Paid',    value: records.filter(r => r.status === 'paid').length,    color: '#16a34a' },
    { name: 'Pending', value: records.filter(r => r.status === 'pending').length, color: '#d97706' },
    { name: 'Overdue', value: records.filter(r => r.status === 'overdue').length, color: '#dc2626' },
    { name: 'Partial', value: records.filter(r => r.status === 'partial').length, color: '#2563eb' },
  ].filter(d => d.value > 0);

  const upiCount   = records.filter(r => r.lastPaymentMode === 'UPI').length;
  const cashCount  = records.filter(r => r.lastPaymentMode === 'Cash').length;

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Collection Rate"  value={`${collectionRate}%`}            sub="Paid vs total due"         icon={TrendingUp}  color="bg-green-600"  />
        <StatTile label="Total Accounts"   value={String(records.length)}           sub="Fee accounts"              icon={FileText}    color="bg-navy"       />
        <StatTile label="UPI Payments"     value={String(upiCount)}                 sub="Digital adoption"          icon={Smartphone}  color="bg-teal"       />
        <StatTile label="Cash Payments"    value={String(cashCount)}                sub="Over the counter"          icon={Banknote}    color="bg-amber-500"  />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-sora font-semibold text-navy mb-4">Monthly Collection vs Target (₹K)</h3>
          {monthly.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={38} />
                <Tooltip formatter={(v) => [`₹${Number(v)}K`, ""]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="target"    fill="#e5e7eb" radius={[3,3,0,0]} name="Target"    />
                <Bar dataKey="collected" fill="#1E2761" radius={[3,3,0,0]} name="Collected" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No transaction data yet</div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-sora font-semibold text-navy mb-4">Payment Status Split</h3>
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {statusData.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [Number(v), 'accounts']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1.5 mt-2">
                {statusData.map(s => (
                  <div key={s.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                      <span className="text-xs text-gray-600">{s.name}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-700">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">No data</div>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-sora font-semibold text-navy mb-4">Collection by Class (₹K)</h3>
          {gradeWise.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={gradeWise} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="grade" type="category" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={65} />
                <Tooltip formatter={(v) => [`₹${Number(v).toFixed(0)}K`, '']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="collected" fill="#16a34a" radius={[0,3,3,0]} name="Collected" stackId="a" />
                <Bar dataKey="pending"   fill="#fbbf24" radius={[0,3,3,0]} name="Pending"   stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">No data</div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-sora font-semibold text-navy mb-4">Payment Mode Breakdown</h3>
          {modeWise.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={modeWise} cx="50%" cy="50%" outerRadius={80} dataKey="count" nameKey="mode" paddingAngle={2}>
                  {modeWise.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [Number(v), 'payments']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">No payment transactions recorded yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Record Payment Modal ─────────────────────────────────────────────────────

function RecordPaymentModal({ record: r, onSave, onClose }: {
  record: FeeRecord;
  onSave: (mode: string, paidDate: string, notes: string) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState('UPI');
  const [paidDate, setPaidDate] = useState(today());
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="bg-navy p-5 rounded-t-2xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-sora font-bold text-lg">Record Payment</h2>
              <p className="text-ice/70 text-sm">{r.studentName} · {r.grade}</p>
            </div>
            <button onClick={onClose} className="text-ice/60 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="bg-white/10 rounded-xl p-3">
              <span className="text-ice/70 text-xs block mb-0.5">Balance Due</span>
              <span className="text-gold font-sora font-bold text-xl">{fmtAmt(r.balance)}</span>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <span className="text-ice/70 text-xs block mb-0.5">Total Paid So Far</span>
              <span className="text-green-300 font-sora font-bold text-xl">{fmtAmt(r.totalPaid)}</span>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Payment Mode *</label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_MODES.map(m => {
                const icons: Record<string, React.ElementType> = { UPI: Smartphone, Cash: Banknote, NEFT: Building2, Cheque: FileText, DD: FileText, Card: CreditCard };
                const Icon = icons[m] ?? CreditCard;
                return (
                  <button key={m} onClick={() => setMode(m)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-semibold ${
                      mode === m ? 'border-navy bg-navy/5 text-navy' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    <Icon className="w-4 h-4" />{m}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Payment Date *</label>
            <input type="date" value={paidDate} max={today()} onChange={e => setPaidDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Notes (optional)</label>
            <textarea placeholder="Any remarks about this payment…" value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy/20" />
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={() => onSave(mode, paidDate, notes)}
              className="flex-1 py-2.5 bg-navy text-white text-sm font-semibold rounded-xl hover:bg-navyMid transition-colors flex items-center justify-center gap-2">
              <Check className="w-4 h-4" />Confirm Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Receipt Modal ────────────────────────────────────────────────────────────

function ReceiptModal({ record: r, onClose, onPrint }: {
  record: FeeRecord; onClose: () => void; onPrint: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="bg-navy p-5 rounded-t-2xl text-center text-white">
          <p className="text-[10px] tracking-widest text-ice/60 uppercase mb-1">Sundarban Academy, Kolkata</p>
          <h2 className="font-sora font-bold text-lg">Fee Receipt</h2>
          <p className="text-ice/70 text-xs mt-0.5 font-mono">{r.receiptNo ?? '—'}</p>
        </div>

        <div className="p-5 space-y-3">
          {[
            { label: 'Student Name',  value: r.studentName },
            { label: 'Class',         value: r.grade },
            { label: 'Admission No',  value: r.admissionNo },
            { label: 'Fee Plan',      value: r.planName },
            { label: 'Payment Date',  value: fmtDate(r.lastPaymentDate) },
            { label: 'Payment Mode',  value: r.lastPaymentMode ?? '—' },
          ].map(row => (
            <div key={row.label} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-500">{row.label}</span>
              <span className="text-xs font-semibold text-gray-800">{row.value}</span>
            </div>
          ))}

          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-3 text-center">
            <p className="text-xs text-green-600 font-semibold mb-1">Amount Paid</p>
            <p className="text-3xl font-sora font-bold text-green-700">{fmtAmt(r.totalPaid)}</p>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-600 font-semibold">Payment Confirmed</span>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 text-center mt-2">
            Computer-generated receipt. No signature required.
          </p>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">Close</button>
            <button onClick={onPrint} className="flex-1 py-2.5 bg-navy text-white text-sm font-semibold rounded-xl hover:bg-navyMid transition-colors flex items-center justify-center gap-2">
              <Printer className="w-4 h-4" />Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

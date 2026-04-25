'use client';

import { useState, useMemo } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { toast } from 'sonner';
import {
  CreditCard, TrendingDown, AlertCircle, CheckCircle2, Search,
  MessageSquare, Plus, X, Send, Edit2, Printer, Receipt,
  ChevronRight, Clock, Banknote, Smartphone, FileText,
  Users, CheckCheck, IndianRupee, TrendingUp, Percent,
  BarChart3, Check, RefreshCw, CalendarDays, Building2, Eye,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import feeData from '@/data/fee.json';
import studentsData from '@/data/students.json';
import AIBadge from '@/components/shared/AIBadge';

// ─── Types ────────────────────────────────────────────────────────────────────

type FeeStatus = 'paid' | 'pending' | 'overdue';
type Tab = 'overview' | 'records' | 'concessions' | 'reports';

type FeeRecord = {
  id: string; studentId: string; studentName: string; class: string;
  term: string; amount: number; dueDate: string; status: FeeStatus;
  paidDate: string | null; paymentMode: string | null; receiptNo: string | null;
  approvalStatus?: 'approved' | 'pending_approval' | null;
  concession?: number; notes?: string;
};

type Concession = {
  id: string; studentId: string; studentName: string; class: string;
  type: string; percentage: number; amount: number; reason: string;
  approvedBy: string; status: 'active' | 'pending' | 'expired';
};

// ─── Static data ──────────────────────────────────────────────────────────────

const PAYMENT_MODES = ['UPI', 'Cash', 'Net Banking', 'Cheque', 'DD', 'Card'];
const TERMS = ['Term 1 2024-25', 'Term 2 2024-25', 'Term 3 2024-25'];
const CONCESSION_TYPES = ['Merit', 'Financial Aid', 'Sports', 'Sibling', 'Staff Ward', 'Other'];

const MONTHLY_DATA = [
  { month: 'Apr', target: 920, collected: 885 },
  { month: 'May', target: 920, collected: 910 },
  { month: 'Jun', target: 920, collected: 875 },
  { month: 'Jul', target: 920, collected: 930 },
  { month: 'Aug', target: 920, collected: 895 },
  { month: 'Sep', target: 920, collected: 920 },
  { month: 'Oct', target: 920, collected: 870 },
  { month: 'Nov', target: 920, collected: 850 },
  { month: 'Dec', target: 920, collected: 940 },
  { month: 'Jan', target: 920, collected: 905 },
  { month: 'Feb', target: 920, collected: 880 },
  { month: 'Mar', target: 920, collected: 0 },
];

const INITIAL_CONCESSIONS: Concession[] = [
  { id: 'CON001', studentId: 'STU001', studentName: 'Arjun Chatterjee', class: 'Class X', type: 'Merit', percentage: 20, amount: 3700, reason: 'Academic excellence — top 3 in class', approvedBy: 'Principal Sharma', status: 'active' },
  { id: 'CON002', studentId: 'STU011', studentName: 'Rohan Pal', class: 'Class IX-B', type: 'Financial Aid', percentage: 50, amount: 9250, reason: 'Single parent — financial hardship documented', approvedBy: 'Vice Principal', status: 'pending' },
  { id: 'CON003', studentId: 'STU023', studentName: 'Abir Dey', class: 'Class IX-B', type: 'Sports', percentage: 15, amount: 2775, reason: 'State level cricket representation', approvedBy: 'Principal Sharma', status: 'active' },
  { id: 'CON004', studentId: 'STU026', studentName: 'Dipa Mandal', class: 'Class VIII-B', type: 'Sibling', percentage: 10, amount: 1600, reason: 'Elder sibling enrolled in Class XI', approvedBy: 'Accounts Dept', status: 'active' },
  { id: 'CON005', studentId: 'STU039', studentName: 'Arup Kundu', class: 'Class XII-B', type: 'Staff Ward', percentage: 25, amount: 5500, reason: 'Father is teaching staff — Physics dept', approvedBy: 'Principal Sharma', status: 'pending' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtAmt = (n: number) => '₹' + n.toLocaleString('en-IN');
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const today = () => new Date().toISOString().split('T')[0];

function StatusPill({ status }: { status: FeeStatus }) {
  const cfg = {
    paid:    { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  label: 'Paid' },
    pending: { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  label: 'Pending' },
    overdue: { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    label: 'Overdue' },
  }[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.label}
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
  const [records, setRecords] = useState<FeeRecord[]>(feeData.records as FeeRecord[]);
  const [concessions, setConcessions] = useState<Concession[]>(INITIAL_CONCESSIONS);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [filterTerm, setFilterTerm] = useState('all');

  // Drawers / modals
  const [drawerRecord, setDrawerRecord] = useState<FeeRecord | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<FeeRecord | null>(null);
  const [editTarget, setEditTarget] = useState<FeeRecord | null>(null);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [showConcessionModal, setShowConcessionModal] = useState(false);
  const [receiptRecord, setReceiptRecord] = useState<FeeRecord | null>(null);

  // ── Derived ──
  const stats = useMemo(() => {
    const paid    = records.filter(r => r.status === 'paid');
    const pending = records.filter(r => r.status === 'pending');
    const overdue = records.filter(r => r.status === 'overdue');
    return {
      paidAmt:    paid.reduce((s, r) => s + r.amount, 0),
      pendingAmt: [...pending, ...overdue].reduce((s, r) => s + r.amount, 0),
      overdueCount: overdue.length,
      paidCount:    paid.length,
      total:        records.length,
      rate:         Math.round((paid.length / Math.max(records.length, 1)) * 100),
      pendingApproval: records.filter(r => r.approvalStatus === 'pending_approval').length,
    };
  }, [records]);

  const classes = useMemo(() =>
    ['all', ...Array.from(new Set(records.map(r => r.class))).sort()], [records]);

  const filtered = useMemo(() => records.filter(r => {
    const q = search.toLowerCase();
    return (
      (r.studentName.toLowerCase().includes(q) || r.class.toLowerCase().includes(q) || (r.receiptNo ?? '').toLowerCase().includes(q)) &&
      (filterStatus === 'all' || r.status === filterStatus) &&
      (filterClass  === 'all' || r.class  === filterClass) &&
      (filterTerm   === 'all' || r.term   === filterTerm)
    );
  }), [records, search, filterStatus, filterClass, filterTerm]);

  // ── Actions ──
  const recordPayment = (id: string, mode: string, paidDate: string, notes: string) => {
    const recNo = `RCP${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const needsApproval = mode === 'Cheque' || mode === 'DD';
    setRecords(prev => prev.map(r => r.id !== id ? r : {
      ...r, status: 'paid' as FeeStatus, paymentMode: mode, paidDate,
      receiptNo: recNo,
      approvalStatus: needsApproval ? 'pending_approval' : 'approved',
      notes: notes || r.notes,
    }));
    toast.success(needsApproval ? 'Payment recorded — pending approval' : 'Payment recorded successfully', {
      description: `Receipt ${recNo} generated`,
    });
    setPaymentTarget(null);
    setDrawerRecord(null);
  };

  const approvePayment = (id: string) => {
    setRecords(prev => prev.map(r => r.id !== id ? r : { ...r, approvalStatus: 'approved' }));
    toast.success('Payment approved', { description: 'Record confirmed and receipt finalised' });
  };

  const updateRecord = (updated: FeeRecord) => {
    setRecords(prev => prev.map(r => r.id !== updated.id ? r : updated));
    toast.success('Fee record updated');
    setEditTarget(null);
    setDrawerRecord(updated);
  };

  const addRecord = (rec: Omit<FeeRecord, 'id' | 'receiptNo' | 'paidDate' | 'paymentMode'>) => {
    const newRec: FeeRecord = { ...rec, id: `FEE${Date.now()}`, receiptNo: null, paidDate: null, paymentMode: null };
    setRecords(prev => [...prev, newRec]);
    toast.success('Fee record created', { description: `New entry for ${rec.studentName}` });
    setShowNewEntry(false);
  };

  const sendReminder = (r: FeeRecord) => {
    toast.success(`Reminder sent to ${r.studentName}'s parent`, {
      description: `${fmtAmt(r.amount)} due since ${fmtDate(r.dueDate)} — via WhatsApp`,
    });
  };

  const bulkRemind = () => {
    const n = records.filter(r => r.status !== 'paid').length;
    toast.success(`${n} reminders dispatched`, { description: 'WhatsApp messages sent to all pending/overdue parents' });
  };

  const addConcession = (con: Omit<Concession, 'id'>) => {
    setConcessions(prev => [...prev, { ...con, id: `CON${Date.now()}` }]);
    toast.success('Concession submitted', { description: 'Pending Principal approval' });
    setShowConcessionModal(false);
  };

  const approveConcession = (id: string) => {
    setConcessions(prev => prev.map(c => c.id !== id ? c : { ...c, status: 'active' as const }));
    toast.success('Concession approved and activated');
  };

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'overview',    label: 'Overview' },
    { id: 'records',     label: 'Fee Records',  badge: records.length },
    { id: 'concessions', label: 'Concessions',  badge: concessions.filter(c => c.status === 'pending').length || undefined },
    { id: 'reports',     label: 'Reports & Analytics' },
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
        {/* Global CTAs */}
        <div className="flex items-center gap-2 pb-2">
          {(activeTab === 'overview' || activeTab === 'records') && (
            <button onClick={bulkRemind} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-teal text-teal rounded-lg hover:bg-teal/5 transition-colors">
              <Send className="w-3.5 h-3.5" />Bulk Remind
            </button>
          )}
          {activeTab === 'records' && (
            <button onClick={() => setShowNewEntry(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-navy text-white rounded-lg hover:bg-navyMid transition-colors">
              <Plus className="w-3.5 h-3.5" />New Entry
            </button>
          )}
          {activeTab === 'concessions' && (
            <button onClick={() => setShowConcessionModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-navy text-white rounded-lg hover:bg-navyMid transition-colors">
              <Plus className="w-3.5 h-3.5" />Add Concession
            </button>
          )}
        </div>
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && <OverviewTab stats={stats} records={records} onOpenRecords={() => setActiveTab('records')} onRecordPayment={r => { setPaymentTarget(r); }} />}

      {/* ── Fee Records ── */}
      {activeTab === 'records' && (
        <div className={`grid gap-5 transition-all ${drawerRecord ? 'grid-cols-[1fr_380px]' : 'grid-cols-1'}`}>
          <RecordsTable
            records={filtered}
            search={search} setSearch={setSearch}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            filterClass={filterClass} setFilterClass={setFilterClass}
            filterTerm={filterTerm} setFilterTerm={setFilterTerm}
            classes={classes}
            selected={drawerRecord}
            onSelect={r => setDrawerRecord(drawerRecord?.id === r.id ? null : r)}
            onRemind={sendReminder}
            onRecordPayment={r => setPaymentTarget(r)}
            onEdit={r => setEditTarget(r)}
            onViewReceipt={r => setReceiptRecord(r)}
            onApprove={approvePayment}
          />
          {drawerRecord && (
            <FeeDrawer
              record={records.find(r => r.id === drawerRecord.id) ?? drawerRecord}
              onClose={() => setDrawerRecord(null)}
              onRecordPayment={() => setPaymentTarget(drawerRecord)}
              onEdit={() => setEditTarget(drawerRecord)}
              onApprove={() => approvePayment(drawerRecord.id)}
              onRemind={() => sendReminder(drawerRecord)}
              onViewReceipt={() => setReceiptRecord(drawerRecord)}
            />
          )}
        </div>
      )}

      {/* ── Concessions ── */}
      {activeTab === 'concessions' && (
        <ConcessionsTab concessions={concessions} onApprove={approveConcession} />
      )}

      {/* ── Reports ── */}
      {activeTab === 'reports' && <ReportsTab records={records} />}

      {/* ── Modals ── */}
      {paymentTarget && (
        <RecordPaymentModal record={paymentTarget} onSave={recordPayment} onClose={() => setPaymentTarget(null)} />
      )}
      {editTarget && (
        <EditRecordModal record={editTarget} onSave={updateRecord} onClose={() => setEditTarget(null)} />
      )}
      {showNewEntry && (
        <NewFeeEntryModal onSave={addRecord} onClose={() => setShowNewEntry(false)} />
      )}
      {showConcessionModal && (
        <ConcessionModal onSave={addConcession} onClose={() => setShowConcessionModal(false)} />
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

function OverviewTab({ stats, records, onOpenRecords, onRecordPayment }: {
  stats: { paidAmt: number; pendingAmt: number; overdueCount: number; paidCount: number; total: number; rate: number; pendingApproval: number };
  records: FeeRecord[];
  onOpenRecords: () => void;
  onRecordPayment: (r: FeeRecord) => void;
}) {
  const overdue = records.filter(r => r.status === 'overdue').slice(0, 5);
  const pending = records.filter(r => r.status === 'pending').slice(0, 4);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Collected" value={fmtAmt(stats.paidAmt)} sub={`${stats.paidCount}/${stats.total} records — ${stats.rate}% rate`} icon={CheckCircle2} color="bg-green-600" />
        <StatTile label="Outstanding"     value={fmtAmt(stats.pendingAmt)} sub={`${stats.total - stats.paidCount} students yet to pay`} icon={Clock} color="bg-amber-500" />
        <StatTile label="Overdue Accounts" value={String(stats.overdueCount)} sub="Immediate action required" icon={AlertCircle} color="bg-red-500" />
        <StatTile label="Pending Approval" value={String(stats.pendingApproval)} sub="Cheque / DD payments" icon={FileText} color="bg-purple-600" />
      </div>

      {/* Collection progress bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-sora font-semibold text-navy">Term 2 Collection Progress</h3>
          <span className="text-sm font-bold text-green-600">{stats.rate}%</span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all" style={{ width: `${stats.rate}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>{fmtAmt(stats.paidAmt)} collected</span>
          <span>{fmtAmt(stats.pendingAmt)} remaining</span>
        </div>
      </div>

      {/* Monthly chart + panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Monthly bar chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-sora font-semibold text-navy mb-4">Monthly Collection (₹ in thousands)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MONTHLY_DATA} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip formatter={(v) => [`₹${Number(v)}K`, ""]} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
              <Bar dataKey="target" fill="#e5e7eb" radius={[3, 3, 0, 0]} name="Target" />
              <Bar dataKey="collected" fill="#1E2761" radius={[3, 3, 0, 0]} name="Collected" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* AI Risk + quick actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-orange-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <h4 className="font-sora font-semibold text-navy text-sm">Default Risk</h4>
              <AIBadge />
            </div>
            <p className="text-[11px] text-gray-500 mb-3">5 accounts likely to default next term.</p>
            <div className="space-y-2.5">
              {feeData.aiRiskStudents.slice(0, 3).map(s => (
                <div key={s.studentId}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="font-semibold text-gray-700">{s.name}</span>
                    <span className="text-red-600 font-bold">{s.riskScore}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full">
                    <div className="h-full bg-red-400 rounded-full" style={{ width: `${s.riskScore}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">{s.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Overdue + Pending tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Overdue */}
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-sora font-semibold text-navy flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />Overdue Accounts
            </h3>
            <button onClick={onOpenRecords} className="text-xs text-navy font-semibold hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {overdue.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xs font-bold flex-shrink-0">
                  {r.studentName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{r.studentName}</p>
                  <p className="text-[11px] text-gray-500">{r.class} · Due {fmtDate(r.dueDate)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-navy">{fmtAmt(r.amount)}</p>
                  <button onClick={() => onRecordPayment(r)} className="text-[10px] text-teal font-semibold hover:underline">Record Payment</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white rounded-xl border border-amber-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-sora font-semibold text-navy flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />Pending Payments
            </h3>
            <button onClick={onOpenRecords} className="text-xs text-navy font-semibold hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {pending.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-xs font-bold flex-shrink-0">
                  {r.studentName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{r.studentName}</p>
                  <p className="text-[11px] text-gray-500">{r.class} · Due {fmtDate(r.dueDate)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-navy">{fmtAmt(r.amount)}</p>
                  <button onClick={() => onRecordPayment(r)} className="text-[10px] text-teal font-semibold hover:underline">Record Payment</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Records Table ────────────────────────────────────────────────────────────

function RecordsTable({ records, search, setSearch, filterStatus, setFilterStatus, filterClass, setFilterClass, filterTerm, setFilterTerm, classes, selected, onSelect, onRemind, onRecordPayment, onEdit, onViewReceipt, onApprove }: {
  records: FeeRecord[]; search: string; setSearch: (v: string) => void;
  filterStatus: string; setFilterStatus: (v: string) => void;
  filterClass: string; setFilterClass: (v: string) => void;
  filterTerm: string; setFilterTerm: (v: string) => void;
  classes: string[]; selected: FeeRecord | null;
  onSelect: (r: FeeRecord) => void; onRemind: (r: FeeRecord) => void;
  onRecordPayment: (r: FeeRecord) => void; onEdit: (r: FeeRecord) => void;
  onViewReceipt: (r: FeeRecord) => void; onApprove: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-gray-100 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input placeholder="Search student, class, receipt no…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy" />
          </div>
          <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy/20 text-gray-600">
            {classes.map(c => <option key={c} value={c}>{c === 'all' ? 'All Classes' : c}</option>)}
          </select>
          <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy/20 text-gray-600">
            <option value="all">All Terms</option>
            {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {['all', 'paid', 'pending', 'overdue'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 text-xs font-semibold rounded-full capitalize transition-colors ${
                filterStatus === s ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {s === 'all' ? 'All Status' : s}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-400">{records.length} records</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {['Student', 'Term', 'Amount', 'Due Date', 'Status', 'Mode', 'Receipt', 'Actions'].map(h => (
                <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 px-4 py-3 first:pl-5 last:pr-5 last:text-right">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {records.length === 0 ? (
              <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-400">No records match the filters</td></tr>
            ) : records.map(r => (
              <tr key={r.id} onClick={() => onSelect(r)}
                className={`hover:bg-blue-50/30 cursor-pointer transition-colors ${selected?.id === r.id ? 'bg-blue-50/50 ring-1 ring-inset ring-navy/10' : ''}`}>
                <td className="px-5 py-3">
                  <p className="text-sm font-semibold text-gray-800">{r.studentName}</p>
                  <p className="text-xs text-gray-400">{r.class}</p>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{r.term}</td>
                <td className="px-4 py-3 text-sm font-bold text-navy whitespace-nowrap">
                  {fmtAmt(r.amount)}
                  {r.concession ? <span className="ml-1 text-[10px] text-green-600 font-semibold">-{r.concession}%</span> : null}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(r.dueDate)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <StatusPill status={r.status} />
                    {r.approvalStatus === 'pending_approval' && (
                      <span className="text-[9px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">Approval Pending</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{r.paymentMode ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-400 font-mono">{r.receiptNo ?? '—'}</td>
                <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    {r.status === 'paid' && r.approvalStatus === 'pending_approval' && (
                      <button onClick={() => onApprove(r.id)} title="Approve payment"
                        className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors">
                        <CheckCheck className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {r.status === 'paid' && (
                      <button onClick={() => onViewReceipt(r)} title="View receipt"
                        className="p-1.5 rounded-lg text-navy hover:bg-navy/10 transition-colors">
                        <Receipt className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {(r.status === 'pending' || r.status === 'overdue') && (
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
                    <button onClick={() => onEdit(r)} title="Edit record"
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
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

function FeeDrawer({ record: r, onClose, onRecordPayment, onEdit, onApprove, onRemind, onViewReceipt }: {
  record: FeeRecord; onClose: () => void;
  onRecordPayment: () => void; onEdit: () => void;
  onApprove: () => void; onRemind: () => void; onViewReceipt: () => void;
}) {
  const initials = r.studentName.split(' ').map(n => n[0]).join('').slice(0, 2);
  const student = studentsData.find(s => s.id === r.studentId);
  const daysOverdue = r.status === 'overdue'
    ? Math.floor((Date.now() - new Date(r.dueDate).getTime()) / 86400000)
    : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-fit sticky top-20">
      {/* Header */}
      <div className="bg-navy p-5 text-white">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gold flex items-center justify-center text-navy font-bold font-sora">
              {initials}
            </div>
            <div>
              <p className="font-sora font-semibold text-base leading-tight">{r.studentName}</p>
              <p className="text-ice/70 text-xs mt-0.5">{r.class} · {r.studentId}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-ice/60 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="bg-white/10 rounded-lg p-2.5">
            <p className="text-ice/60 text-[10px] uppercase tracking-wide mb-0.5">Fee Amount</p>
            <p className="text-gold font-sora font-bold text-lg">{fmtAmt(r.amount)}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2.5">
            <p className="text-ice/60 text-[10px] uppercase tracking-wide mb-0.5">Status</p>
            <div className="flex items-center gap-1.5 mt-1">
              <StatusPill status={r.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="p-5 space-y-4 flex-1">
        {/* Overdue warning */}
        {r.status === 'overdue' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-700">{daysOverdue} days overdue</p>
              <p className="text-[11px] text-red-500">Immediate parent notification recommended</p>
            </div>
          </div>
        )}

        {/* Approval pending */}
        {r.approvalStatus === 'pending_approval' && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-start gap-2">
            <FileText className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-purple-700">Awaiting payment approval</p>
              <p className="text-[11px] text-purple-500">Cheque/DD — verify and approve once cleared</p>
            </div>
          </div>
        )}

        {/* Record rows */}
        {[
          { label: 'Term', value: r.term },
          { label: 'Due Date', value: fmtDate(r.dueDate) },
          { label: 'Paid Date', value: fmtDate(r.paidDate) },
          { label: 'Payment Mode', value: r.paymentMode ?? '—' },
          { label: 'Receipt No', value: r.receiptNo ?? '—' },
          { label: 'Approval', value: r.approvalStatus === 'approved' ? 'Approved ✓' : r.approvalStatus === 'pending_approval' ? 'Pending' : '—' },
        ].map(row => (
          <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
            <span className="text-xs text-gray-500">{row.label}</span>
            <span className="text-xs font-semibold text-gray-700">{row.value}</span>
          </div>
        ))}

        {/* Parent contact */}
        {student && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Parent Contact</p>
            <p className="text-xs font-semibold text-gray-700">{student.parent.father} / {student.parent.mother}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1"><Smartphone className="w-3 h-3" />{student.parent.phone}</p>
          </div>
        )}

        {r.notes && (
          <div className="bg-amber-50 rounded-lg p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 mb-1">Notes</p>
            <p className="text-xs text-gray-600">{r.notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-100 space-y-2">
        {(r.status === 'pending' || r.status === 'overdue') && (
          <button onClick={onRecordPayment} className="w-full flex items-center justify-center gap-2 py-2.5 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navyMid transition-colors">
            <IndianRupee className="w-4 h-4" />Record Payment
          </button>
        )}
        {r.approvalStatus === 'pending_approval' && (
          <button onClick={onApprove} className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors">
            <CheckCheck className="w-4 h-4" />Approve Payment
          </button>
        )}
        {r.status === 'paid' && r.approvalStatus !== 'pending_approval' && (
          <button onClick={onViewReceipt} className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors">
            <Receipt className="w-4 h-4" />View Receipt
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          {r.status !== 'paid' && (
            <button onClick={onRemind} className="flex items-center justify-center gap-1.5 py-2 border border-teal text-teal text-sm font-semibold rounded-lg hover:bg-teal/5 transition-colors">
              <MessageSquare className="w-3.5 h-3.5" />Remind
            </button>
          )}
          <button onClick={onEdit} className={`flex items-center justify-center gap-1.5 py-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors ${r.status !== 'paid' ? '' : 'col-span-2'}`}>
            <Edit2 className="w-3.5 h-3.5" />Edit Record
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Concessions Tab ──────────────────────────────────────────────────────────

function ConcessionsTab({ concessions, onApprove }: {
  concessions: Concession[];
  onApprove: (id: string) => void;
}) {
  const total = concessions.filter(c => c.status === 'active').reduce((s, c) => s + c.amount, 0);
  const byType: Record<string, number> = {};
  concessions.forEach(c => { byType[c.type] = (byType[c.type] ?? 0) + 1; });

  const statusCfg = {
    active:  { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  label: 'Active' },
    pending: { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  label: 'Pending Approval' },
    expired: { bg: 'bg-gray-100',  text: 'text-gray-500',   border: 'border-gray-200',   label: 'Expired' },
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Total Concessions" value={String(concessions.length)} sub="All types" icon={Percent} color="bg-purple-600" />
        <StatTile label="Active Concessions" value={String(concessions.filter(c => c.status === 'active').length)} sub="Currently applied" icon={CheckCircle2} color="bg-green-600" />
        <StatTile label="Pending Approval" value={String(concessions.filter(c => c.status === 'pending').length)} sub="Awaiting Principal" icon={Clock} color="bg-amber-500" />
        <StatTile label="Total Waived" value={fmtAmt(total)} sub="Active concessions" icon={TrendingDown} color="bg-navy" />
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {concessions.map(c => {
          const cfg = statusCfg[c.status];
          return (
            <div key={c.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-navy flex items-center justify-center text-white font-bold text-xs font-sora">
                    {c.studentName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{c.studentName}</p>
                    <p className="text-xs text-gray-400">{c.class}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                  {cfg.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-400 mb-0.5">Type</p>
                  <p className="text-xs font-semibold text-navy">{c.type}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-400 mb-0.5">Discount</p>
                  <p className="text-xs font-semibold text-navy">{c.percentage}% · {fmtAmt(c.amount)}</p>
                </div>
              </div>

              <p className="text-xs text-gray-500 mb-3 italic">"{c.reason}"</p>
              <p className="text-[11px] text-gray-400">Approved by: {c.approvedBy}</p>

              {c.status === 'pending' && (
                <button onClick={() => onApprove(c.id)}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-navy text-white text-xs font-semibold rounded-lg hover:bg-navyMid transition-colors">
                  <Check className="w-3.5 h-3.5" />Approve Concession
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Reports Tab ──────────────────────────────────────────────────────────────

function ReportsTab({ records }: { records: FeeRecord[] }) {
  const statusData = [
    { name: 'Paid',    value: records.filter(r => r.status === 'paid').length,    color: '#16a34a' },
    { name: 'Pending', value: records.filter(r => r.status === 'pending').length, color: '#d97706' },
    { name: 'Overdue', value: records.filter(r => r.status === 'overdue').length, color: '#dc2626' },
  ];

  const classData = Object.entries(
    records.reduce<Record<string, { collected: number; pending: number }>>((acc, r) => {
      const cls = r.class.split('-')[0].trim();
      if (!acc[cls]) acc[cls] = { collected: 0, pending: 0 };
      if (r.status === 'paid') acc[cls].collected += r.amount / 1000;
      else acc[cls].pending += r.amount / 1000;
      return acc;
    }, {})
  ).map(([cls, d]) => ({ cls, ...d })).sort((a, b) => a.cls.localeCompare(b.cls));

  const modeData = Object.entries(
    records.filter(r => r.paymentMode).reduce<Record<string, number>>((acc, r) => {
      acc[r.paymentMode!] = (acc[r.paymentMode!] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([mode, count]) => ({ mode, count })).sort((a, b) => b.count - a.count);

  const COLORS = ['#1E2761', '#028090', '#F5C542', '#534AB7', '#D85A30'];

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Collection Rate"  value={`${Math.round((records.filter(r=>r.status==='paid').length/Math.max(records.length,1))*100)}%`} sub="Term 2 2024-25" icon={TrendingUp} color="bg-green-600" />
        <StatTile label="Total Records"    value={String(records.length)} sub="This term" icon={FileText} color="bg-navy" />
        <StatTile label="UPI Payments"     value={String(records.filter(r=>r.paymentMode==='UPI').length)} sub="Digital adoption" icon={Smartphone} color="bg-teal" />
        <StatTile label="Cash Payments"    value={String(records.filter(r=>r.paymentMode==='Cash').length)} sub="Over the counter" icon={Banknote} color="bg-amber-500" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Monthly collection */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-sora font-semibold text-navy mb-4">Monthly Collection vs Target (₹K)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MONTHLY_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={38} />
              <Tooltip formatter={(v) => [`₹${Number(v)}K`, ""]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="target" fill="#e5e7eb" radius={[3,3,0,0]} name="Target" />
              <Bar dataKey="collected" fill="#1E2761" radius={[3,3,0,0]} name="Collected" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status donut */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-sora font-semibold text-navy mb-4">Payment Status Split</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                {statusData.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie>
              <Tooltip formatter={(v) => [Number(v), 'students']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
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
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Class-wise */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-sora font-semibold text-navy mb-4">Collection by Class (₹K)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={classData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="cls" type="category" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={65} />
              <Tooltip formatter={(v) => [`₹${Number(v).toFixed(0)}K`, '']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="collected" fill="#16a34a" radius={[0,3,3,0]} name="Collected" stackId="a" />
              <Bar dataKey="pending"   fill="#fbbf24" radius={[0,3,3,0]} name="Pending"   stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment mode */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-sora font-semibold text-navy mb-4">Payment Mode Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={modeData} cx="50%" cy="50%" outerRadius={80} dataKey="count" nameKey="mode" paddingAngle={2}>
                {modeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => [Number(v), 'payments']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Record Payment Modal ─────────────────────────────────────────────────────

function RecordPaymentModal({ record: r, onSave, onClose }: {
  record: FeeRecord;
  onSave: (id: string, mode: string, paidDate: string, notes: string) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState('UPI');
  const [paidDate, setPaidDate] = useState(today());
  const [ref, setRef] = useState('');
  const [notes, setNotes] = useState('');
  const needsApproval = mode === 'Cheque' || mode === 'DD';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="bg-navy p-5 rounded-t-2xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-sora font-bold text-lg">Record Payment</h2>
              <p className="text-ice/70 text-sm">{r.studentName} · {r.class}</p>
            </div>
            <button onClick={onClose} className="text-ice/60 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          <div className="mt-3 flex items-center justify-between bg-white/10 rounded-xl p-3">
            <span className="text-ice/70 text-sm">Amount Due</span>
            <span className="text-gold font-sora font-bold text-xl">{fmtAmt(r.amount)}</span>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Payment mode */}
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Payment Mode *</label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_MODES.map(m => {
                const icons: Record<string, React.ElementType> = { UPI: Smartphone, Cash: Banknote, 'Net Banking': Building2, Cheque: FileText, DD: FileText, Card: CreditCard };
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

          {needsApproval && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">Cheque/DD payments require manual approval after clearing. Record will be marked <strong>Pending Approval</strong>.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Payment Date *</label>
              <input type="date" value={paidDate} max={today()} onChange={e => setPaidDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Ref / Transaction No</label>
              <input placeholder="e.g. UPI ref, cheque no" value={ref} onChange={e => setRef(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Notes (optional)</label>
            <textarea placeholder="Any remarks about this payment…" value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy/20" />
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={() => onSave(r.id, mode, paidDate, notes)}
              className="flex-1 py-2.5 bg-navy text-white text-sm font-semibold rounded-xl hover:bg-navyMid transition-colors flex items-center justify-center gap-2">
              <Check className="w-4 h-4" />Confirm Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Record Modal ────────────────────────────────────────────────────────

function EditRecordModal({ record, onSave, onClose }: {
  record: FeeRecord;
  onSave: (r: FeeRecord) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...record });
  const set = (k: keyof FeeRecord, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-sora font-bold text-navy text-lg">Edit Fee Record</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Student Name</label>
              <input value={form.studentName} onChange={e => set('studentName', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Class</label>
              <input value={form.class} onChange={e => set('class', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Term</label>
              <select value={form.term} onChange={e => set('term', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20">
                {TERMS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Amount (₹)</label>
              <input type="number" value={form.amount} onChange={e => set('amount', parseInt(e.target.value) || 0)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value as FeeStatus)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20">
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Payment Mode</label>
              <select value={form.paymentMode ?? ''} onChange={e => set('paymentMode', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20">
                <option value="">— None —</option>
                {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Paid Date</label>
              <input type="date" value={form.paidDate ?? ''} onChange={e => set('paidDate', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Notes</label>
            <textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy/20" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={() => onSave(form)} className="flex-1 py-2.5 bg-navy text-white text-sm font-semibold rounded-xl hover:bg-navyMid transition-colors">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── New Fee Entry Modal ──────────────────────────────────────────────────────

function NewFeeEntryModal({ onSave, onClose }: {
  onSave: (r: Omit<FeeRecord, 'id' | 'receiptNo' | 'paidDate' | 'paymentMode'>) => void;
  onClose: () => void;
}) {
  const [studentId, setStudentId] = useState('');
  const [term, setTerm] = useState('Term 2 2024-25');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<FeeStatus>('pending');
  const [notes, setNotes] = useState('');

  const student = studentsData.find(s => s.id === studentId);

  const autoAmount = () => {
    if (!student) return;
    const cls = student.class;
    const struct = feeData.feeStructure as Record<string, number>;
    if (cls.match(/I{1,3}$|IV|V(?!I)|Class I\b/)) return setAmount(String(struct['Class I-IV'] ?? ''));
    if (cls.match(/VI|VII|VIII/)) return setAmount(String(struct['Class V-VIII'] ?? ''));
    if (cls.match(/IX|X/)) return setAmount(String(struct['Class IX-X'] ?? ''));
    if (cls.match(/XI|XII/)) return setAmount(String(struct['Class XI-XII'] ?? ''));
  };

  const handleStudentChange = (id: string) => {
    setStudentId(id);
    const s = studentsData.find(x => x.id === id);
    if (s) {
      const struct = feeData.feeStructure as Record<string, number>;
      const cls = s.class;
      if (cls.match(/IX|X\b/))   setAmount(String(struct['Class IX-X'] ?? ''));
      else if (cls.match(/XI|XII/)) setAmount(String(struct['Class XI-XII'] ?? ''));
      else if (cls.match(/VI|VII|VIII/)) setAmount(String(struct['Class V-VIII'] ?? ''));
      else setAmount(String(struct['Class I-IV'] ?? ''));
    }
  };

  const valid = student && amount && dueDate;

  const submit = () => {
    if (!valid || !student) return;
    onSave({
      studentId: student.id,
      studentName: student.name,
      class: student.class,
      term, amount: parseInt(amount), dueDate, status, notes,
      approvalStatus: null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-sora font-bold text-navy text-lg">New Fee Entry</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Select Student *</label>
            <select value={studentId} onChange={e => handleStudentChange(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20">
              <option value="">— Choose student —</option>
              {studentsData.map(s => <option key={s.id} value={s.id}>{s.name} ({s.class})</option>)}
            </select>
          </div>

          {student && (
            <div className="bg-navy/5 rounded-lg p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-navy flex items-center justify-center text-white font-bold text-xs">
                {student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-semibold text-navy">{student.name}</p>
                <p className="text-xs text-gray-500">{student.class} · Roll {student.rollNo}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Term *</label>
              <select value={term} onChange={e => setTerm(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20">
                {TERMS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Amount (₹) *</label>
              <div className="relative">
                <input type="number" placeholder="Auto-filled by class" value={amount} onChange={e => setAmount(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 pr-14" />
                {student && <button onClick={autoAmount} className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-navy font-semibold hover:underline">Auto</button>}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Due Date *</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Initial Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as FeeStatus)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20">
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Notes (optional)</label>
            <input placeholder="Any additional remarks…" value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={submit} disabled={!valid}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 ${valid ? 'bg-navy text-white hover:bg-navyMid' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
              <Plus className="w-4 h-4" />Create Record
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Concession Modal ─────────────────────────────────────────────────────────

function ConcessionModal({ onSave, onClose }: {
  onSave: (c: Omit<Concession, 'id'>) => void;
  onClose: () => void;
}) {
  const [studentId, setStudentId] = useState('');
  const [type, setType] = useState('Merit');
  const [pct, setPct] = useState('');
  const [reason, setReason] = useState('');
  const student = studentsData.find(s => s.id === studentId);
  const feeBase = student ? (() => {
    const struct = feeData.feeStructure as Record<string, number>;
    const cls = student.class;
    if (cls.match(/IX|X\b/)) return struct['Class IX-X'];
    if (cls.match(/XI|XII/)) return struct['Class XI-XII'];
    if (cls.match(/VI|VII|VIII/)) return struct['Class V-VIII'];
    return struct['Class I-IV'] ?? 0;
  })() : 0;
  const discount = Math.round((feeBase * (parseInt(pct) || 0)) / 100);
  const valid = student && pct && reason && parseInt(pct) > 0 && parseInt(pct) <= 100;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-sora font-bold text-navy text-lg">Add Concession</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Student *</label>
            <select value={studentId} onChange={e => setStudentId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20">
              <option value="">— Select student —</option>
              {studentsData.map(s => <option key={s.id} value={s.id}>{s.name} ({s.class})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Concession Type *</label>
            <div className="flex flex-wrap gap-2">
              {CONCESSION_TYPES.map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${type === t ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Discount % *</label>
              <input type="number" placeholder="e.g. 25" min="1" max="100" value={pct} onChange={e => setPct(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Amount Waived</label>
              <div className="border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-sm text-navy font-semibold">
                {discount > 0 ? fmtAmt(discount) : '—'}
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Reason / Justification *</label>
            <textarea placeholder="Describe the reason for this concession…" value={reason} onChange={e => setReason(e.target.value)} rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy/20" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={() => valid && student && onSave({ studentId: student.id, studentName: student.name, class: student.class, type, percentage: parseInt(pct), amount: discount, reason, approvedBy: 'Pending', status: 'pending' })}
              disabled={!valid}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors ${valid ? 'bg-navy text-white hover:bg-navyMid' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
              Submit for Approval
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
  const student = studentsData.find(s => s.id === r.studentId);
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        {/* Receipt header */}
        <div className="bg-navy p-5 rounded-t-2xl text-center text-white">
          <p className="text-[10px] tracking-widest text-ice/60 uppercase mb-1">Sundarban Academy, Kolkata</p>
          <h2 className="font-sora font-bold text-lg">Fee Receipt</h2>
          <p className="text-ice/70 text-xs mt-0.5 font-mono">{r.receiptNo}</p>
        </div>

        <div className="p-5 space-y-3">
          {[
            { label: 'Student Name',   value: r.studentName },
            { label: 'Class',          value: r.class },
            { label: 'Roll No',        value: student?.rollNo ?? '—' },
            { label: 'Term',           value: r.term },
            { label: 'Payment Date',   value: fmtDate(r.paidDate) },
            { label: 'Payment Mode',   value: r.paymentMode ?? '—' },
          ].map(row => (
            <div key={row.label} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-500">{row.label}</span>
              <span className="text-xs font-semibold text-gray-800">{row.value}</span>
            </div>
          ))}

          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-3 text-center">
            <p className="text-xs text-green-600 font-semibold mb-1">Amount Paid</p>
            <p className="text-3xl font-sora font-bold text-green-700">{fmtAmt(r.amount)}</p>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-600 font-semibold">Payment Confirmed</span>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 text-center mt-2">
            This is a computer-generated receipt. No signature required.
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

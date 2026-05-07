'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Building2, CheckCircle2, XCircle, ToggleLeft, ToggleRight, User, Save } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const ALL_MODULES = [
  { id: 'dashboard',     label: 'Dashboard',       group: 'Core' },
  { id: 'admissions',    label: 'Admissions',       group: 'Core' },
  { id: 'attendance',    label: 'Attendance',       group: 'Core' },
  { id: 'timetable',     label: 'Timetable',        group: 'Core' },
  { id: 'academics',     label: 'Academics',        group: 'Core' },
  { id: 'examinations',  label: 'Examinations',     group: 'Core' },
  { id: 'fee',           label: 'Fee Management',   group: 'Finance' },
  { id: 'accounts',      label: 'Accounts',         group: 'Finance' },
  { id: 'scholarships',  label: 'Scholarships',     group: 'Finance' },
  { id: 'library',       label: 'Library',          group: 'Operations' },
  { id: 'transport',     label: 'Transport',        group: 'Operations' },
  { id: 'health',        label: 'Health',           group: 'Operations' },
  { id: 'hr',            label: 'HR & Staff',       group: 'People' },
  { id: 'id_cards',      label: 'ID Cards',         group: 'Identity' },
  { id: 'certificates',  label: 'Certificates',     group: 'Identity' },
  { id: 'gate',          label: 'Gate',             group: 'Identity' },
  { id: 'parent_app',    label: 'Parent App',       group: 'Parent Connect' },
  { id: 'school_shop',   label: 'School Shop',      group: 'Parent Connect' },
  { id: 'ptm',           label: 'PTM',              group: 'Parent Connect' },
  { id: 'communication', label: 'Communication',    group: 'Parent Connect' },
  { id: 'ai_advisor',    label: 'AI Advisor',       group: 'AI & Insights' },
  { id: 'analytics',     label: 'Analytics',        group: 'AI & Insights' },
  { id: 'chatbot',       label: 'AI Chatbot',       group: 'AI & Insights' },
  { id: 'settings',      label: 'Settings',         group: 'System' },
];

interface Tenant {
  id: string; slug: string; name: string; shortName: string; board: string;
  city: string; state: string; email: string; phone?: string; headTitle: string;
  headName: string; address?: string; isActive: boolean; plan: string; createdAt: string;
  modules: { module: string; isActive: boolean }[];
  users: { id: string; displayName: string; email: string; role: string; lastLoginAt?: string }[];
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModules, setActiveModules] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/superadmin/tenants/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setTenant(d);
        setActiveModules(new Set(d.modules.filter((m: { isActive: boolean }) => m.isActive).map((m: { module: string }) => m.module)));
        setLoading(false);
      });
  }, [id]);

  async function saveModules() {
    setSaving(true);
    const res = await fetch(`/api/superadmin/tenants/${id}/modules`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modules: [...activeModules] }),
    });
    setSaving(false);
    if (res.ok) toast.success('Modules updated');
    else toast.error('Failed to update modules');
  }

  async function toggleTenantStatus() {
    if (!tenant) return;
    const res = await fetch(`/api/superadmin/tenants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !tenant.isActive }),
    });
    if (res.ok) {
      setTenant({ ...tenant, isActive: !tenant.isActive });
      toast.success(tenant.isActive ? 'Tenant deactivated' : 'Tenant activated');
    }
  }

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-800 rounded-xl" />)}
    </div>;
  }

  if (!tenant) return <div className="text-gray-400">Tenant not found</div>;

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/superadmin/tenants" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-sora font-bold text-2xl text-white">{tenant.name}</h1>
            <p className="text-gray-400 text-sm mt-0.5">{tenant.slug} · {tenant.board} · {tenant.city}</p>
          </div>
        </div>
        <button
          onClick={toggleTenantStatus}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tenant.isActive ? 'bg-coral/10 text-coral hover:bg-coral/20' : 'bg-green/10 text-green hover:bg-green/20'
          }`}
        >
          {tenant.isActive ? <><XCircle className="w-4 h-4" /> Deactivate</> : <><CheckCircle2 className="w-4 h-4" /> Activate</>}
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-gold" />
          <h2 className="font-sora font-semibold text-white">School Details</h2>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          {[
            ['Email', tenant.email],
            ['Phone', tenant.phone ?? '—'],
            ['Board', tenant.board],
            ['Head', `${tenant.headTitle} ${tenant.headName}`],
            ['City', `${tenant.city}, ${tenant.state}`],
            ['Plan', tenant.plan],
            ['Status', tenant.isActive ? 'Active' : 'Inactive'],
            ['Created', new Date(tenant.createdAt).toLocaleDateString('en-IN')],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
              <p className="text-white font-dm-sans">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Module Management */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-sora font-semibold text-white">
            Modules <span className="text-gray-500 font-normal text-sm ml-2">({activeModules.size} active)</span>
          </h2>
          <button
            onClick={saveModules}
            disabled={saving}
            className="flex items-center gap-2 bg-gold text-navy font-sora font-semibold px-4 py-2 rounded-lg text-sm hover:bg-gold/90 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving…' : 'Save Modules'}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {ALL_MODULES.map((m) => {
            const locked = m.id === 'dashboard' || m.id === 'settings';
            const active = activeModules.has(m.id);
            return (
              <button
                key={m.id}
                onClick={() => {
                  if (locked) return;
                  setActiveModules((prev) => {
                    const next = new Set(prev);
                    if (active) { next.delete(m.id); } else { next.add(m.id); }
                    return next;
                  });
                }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  locked
                    ? 'bg-gray-800/50 cursor-default'
                    : active
                    ? 'bg-gold/10 border border-gold/20'
                    : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
                }`}
              >
                {active
                  ? <ToggleRight className={`w-4 h-4 flex-shrink-0 ${locked ? 'text-gray-500' : 'text-gold'}`} />
                  : <ToggleLeft className="w-4 h-4 flex-shrink-0 text-gray-600" />}
                <span className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-500'}`}>
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Users */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-gold" />
          <h2 className="font-sora font-semibold text-white">Users ({tenant.users.length})</h2>
        </div>
        <div className="space-y-2">
          {tenant.users.map((u) => (
            <div key={u.id} className="flex items-center justify-between py-2.5 px-3 bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-semibold text-white">{u.displayName}</p>
                <p className="text-xs text-gray-400">{u.email}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold px-2 py-0.5 bg-navy/40 text-ice rounded-full">{u.role}</span>
                {u.lastLoginAt && (
                  <p className="text-[10px] text-gray-500 mt-0.5">Last login {new Date(u.lastLoginAt).toLocaleDateString('en-IN')}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

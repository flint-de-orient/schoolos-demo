'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const ALL_MODULES = [
  { id: 'dashboard',     label: 'Dashboard',          group: 'Core' },
  { id: 'admissions',    label: 'Admissions',          group: 'Core' },
  { id: 'attendance',    label: 'Attendance',          group: 'Core' },
  { id: 'timetable',     label: 'Timetable',           group: 'Core' },
  { id: 'academics',     label: 'Academics',           group: 'Core' },
  { id: 'examinations',  label: 'Examinations',        group: 'Core' },
  { id: 'fee',           label: 'Fee Management',      group: 'Finance' },
  { id: 'accounts',      label: 'Accounts',            group: 'Finance' },
  { id: 'scholarships',  label: 'Scholarships',        group: 'Finance' },
  { id: 'library',       label: 'Library',             group: 'Operations' },
  { id: 'transport',     label: 'Transport',           group: 'Operations' },
  { id: 'health',        label: 'Health',              group: 'Operations' },
  { id: 'hr',            label: 'HR & Staff',          group: 'People' },
  { id: 'id_cards',      label: 'ID Cards',            group: 'Identity' },
  { id: 'certificates',  label: 'Certificates',        group: 'Identity' },
  { id: 'gate',          label: 'Gate Management',     group: 'Identity' },
  { id: 'parent_app',    label: 'Parent App',          group: 'Parent Connect' },
  { id: 'school_shop',   label: 'School Shop',         group: 'Parent Connect' },
  { id: 'ptm',           label: 'PTM',                 group: 'Parent Connect' },
  { id: 'communication', label: 'Communication',       group: 'Parent Connect' },
  { id: 'ai_advisor',    label: 'AI Advisor',          group: 'AI & Insights' },
  { id: 'analytics',     label: 'Analytics',           group: 'AI & Insights' },
  { id: 'chatbot',       label: 'AI Chatbot',          group: 'AI & Insights' },
  { id: 'settings',      label: 'Settings',            group: 'System' },
];

const GROUPS = [...new Set(ALL_MODULES.map((m) => m.group))];

export default function NewTenantPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(
    new Set(['dashboard', 'settings'])
  );

  const [form, setForm] = useState({
    name: '', shortName: '', board: 'CBSE', city: '', state: '',
    email: '', phone: '', headTitle: 'Principal', headName: '',
    address: '', adminEmail: '', adminPassword: '', adminName: '',
  });

  function toggleModule(id: string) {
    if (id === 'dashboard' || id === 'settings') return;
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  function selectGroup(group: string) {
    const groupModules = ALL_MODULES.filter((m) => m.group === group).map((m) => m.id);
    setSelectedModules((prev) => {
      const next = new Set(prev);
      groupModules.forEach((id) => next.add(id));
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, modules: [...selectedModules] }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Failed to create tenant'); return; }
      toast.success(`${form.name} created successfully`);
      router.push(`/superadmin/tenants/${data.id}`);
    } finally {
      setSaving(false);
    }
  }

  function field(key: keyof typeof form, label: string, type = 'text', placeholder = '') {
    return (
      <div>
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">{label}</label>
        <input
          type={type}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          placeholder={placeholder}
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold/50 placeholder-gray-600"
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/superadmin/tenants" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-sora font-bold text-2xl text-white">Add New School</h1>
          <p className="text-gray-400 text-sm mt-0.5">Onboard a school and assign their modules</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* School Info */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Building2 className="w-4 h-4 text-gold" />
            <h2 className="font-sora font-semibold text-white">School Information</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field('name', 'School Name', 'text', 'e.g. Springfield Public School')}
            {field('shortName', 'Short Name', 'text', 'e.g. SPS')}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">Board</label>
              <select
                value={form.board}
                onChange={(e) => setForm({ ...form, board: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold/50"
              >
                {['CBSE', 'CISCE', 'WBBSE', 'OTHER'].map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">Head Title</label>
              <select
                value={form.headTitle}
                onChange={(e) => setForm({ ...form, headTitle: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold/50"
              >
                {['Principal', 'Head Master', 'Head Mistress', 'Director', 'Rector'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            {field('headName', 'Head Name', 'text', 'e.g. Dr. Anjali Mehta')}
            {field('email', 'School Email', 'email', 'admin@school.edu.in')}
            {field('phone', 'Phone', 'tel', '+91 98310 00000')}
            {field('city', 'City', 'text', 'Kolkata')}
            {field('state', 'State', 'text', 'West Bengal')}
            <div className="col-span-2">
              {field('address', 'Address', 'text', '12, Park Street, Kolkata 700016')}
            </div>
          </div>
        </div>

        {/* Admin User */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="font-sora font-semibold text-white mb-5">Admin User</h2>
          <div className="grid grid-cols-2 gap-4">
            {field('adminName', 'Display Name', 'text', 'Principal Name')}
            {field('adminEmail', 'Login Email', 'email', 'admin@school.edu.in')}
            <div className="col-span-2">
              {field('adminPassword', 'Initial Password', 'password', 'Min 8 characters')}
            </div>
          </div>
        </div>

        {/* Modules */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-sora font-semibold text-white">
              Modules ({selectedModules.size} selected)
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedModules(new Set(ALL_MODULES.map((m) => m.id)))}
                className="text-xs text-gold hover:underline"
              >
                Select all
              </button>
              <span className="text-gray-600">·</span>
              <button
                type="button"
                onClick={() => setSelectedModules(new Set(['dashboard', 'settings']))}
                className="text-xs text-gray-400 hover:text-white"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="space-y-5">
            {GROUPS.map((group) => (
              <div key={group}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{group}</p>
                  <button type="button" onClick={() => selectGroup(group)} className="text-[10px] text-gold hover:underline">
                    Select all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ALL_MODULES.filter((m) => m.group === group).map((m) => {
                    const locked = m.id === 'dashboard' || m.id === 'settings';
                    const active = selectedModules.has(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleModule(m.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          locked
                            ? 'bg-gray-700 text-gray-400 cursor-default'
                            : active
                            ? 'bg-gold/10 text-gold border border-gold/30'
                            : 'bg-gray-800 text-gray-500 hover:text-gray-300 border border-gray-700'
                        }`}
                      >
                        {m.label}
                        {locked && ' 🔒'}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end">
          <Link
            href="/superadmin/tenants"
            className="px-5 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || !form.name || !form.email || !form.adminEmail || !form.adminPassword}
            className="px-6 py-2.5 bg-gold text-navy font-sora font-semibold rounded-xl text-sm hover:bg-gold/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <><div className="w-3.5 h-3.5 border-2 border-navy/30 border-t-navy rounded-full animate-spin" /> Creating…</> : 'Create School'}
          </button>
        </div>
      </form>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { Building, CalendarDays, ToggleLeft, Users, Bell, CreditCard, Plus, Pencil, Trash2, Check, Star, X, AlertTriangle, Plug, ChevronDown, ChevronUp, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, BookOpen, Palette, DollarSign, CalendarCheck, Info, LayoutList } from 'lucide-react';
import { toast } from 'sonner';
import { useAcademicYear } from '@/context/AcademicYearContext';
import type { AcademicYear } from '@/context/AcademicYearContext';
import WhatsAppConnect from '@/components/settings/WhatsAppConnect';

// ─── Module groups ────────────────────────────────────────────────────────────

const moduleGroups = [
  {
    pillar: 'School Operations',
    modules: [
      { id: 'admissions', name: 'Admissions Pipeline', desc: 'Kanban-style lead management', on: true },
      { id: 'attendance', name: 'Attendance Intelligence', desc: 'AI-powered attendance tracking', on: true },
      { id: 'timetable', name: 'Smart Timetable', desc: 'Auto-scheduling with substitution', on: true },
      { id: 'examinations', name: 'Examination Control', desc: 'Hall tickets, seating, results', on: true },
      { id: 'transport', name: 'Transport & GPS', desc: 'Live bus tracking + SOS alerts', on: true },
      { id: 'health', name: 'Health & Medical', desc: 'Nurse log, vaccination tracker', on: false },
    ],
  },
  {
    pillar: 'Learning',
    modules: [
      { id: 'academics', name: 'Academics & Assessment', desc: 'Syllabus tracker, report cards', on: true },
      { id: 'library', name: 'Library Management', desc: 'Book catalog, issue tracking', on: true },
      { id: 'homework', name: 'Homework Tracker', desc: 'Assignment management', on: false },
    ],
  },
  {
    pillar: 'Finance',
    modules: [
      { id: 'fee', name: 'Fee Management', desc: 'Billing, reminders, collections', on: true },
      { id: 'payroll', name: 'Payroll & Salary', desc: 'Staff payslip generation', on: true },
    ],
  },
  {
    pillar: 'AI & Analytics',
    modules: [
      { id: 'ai-advisor', name: 'AI Academic Advisor', desc: 'Predictive scoring, at-risk alerts', on: true },
      { id: 'analytics', name: 'Predictive Analytics', desc: 'Enrollment, revenue forecasts', on: true },
    ],
  },
  {
    pillar: 'Parent Connect',
    modules: [
      { id: 'parent-app', name: 'Parent App', desc: 'Mobile app for parents', on: true },
      { id: 'school-shop', name: 'School Shop', desc: 'Online store + wallet payments', on: false },
      { id: 'communication', name: 'Communication Hub', desc: 'Announcements and circulars', on: true },
    ],
  },
];

type Tab = 'profile' | 'sessions' | 'subjects' | 'salary' | 'leave' | 'modules' | 'roles' | 'notifications' | 'billing' | 'integrations';

// ─── Integrations Tab ─────────────────────────────────────────────────────────

type IntegrationRow = {
  provider: string;
  enabled: boolean;
  config: Record<string, string>;
  secretsConfigured: Record<string, string>;
  hasSecrets: boolean;
};

type ProviderDef = {
  id: string;
  name: string;
  logo: string;
  description: string;
  docsUrl: string;
  comingSoon?: boolean;
  embeddedSignup?: boolean;
  configFields: { key: string; label: string; placeholder: string; sensitive?: boolean; multiline?: boolean }[];
  secretFields: { key: string; label: string; placeholder: string }[];
};

const PROVIDERS: ProviderDef[] = [
  {
    id: 'smsgatehub',
    name: 'SMSGateHub',
    logo: '📱',
    description: 'Send transactional SMS to parents — interview schedules, fee reminders, attendance alerts.',
    docsUrl: 'https://smsgatehub.com/dashboard',
    configFields: [
      { key: 'senderId', label: 'Sender ID (DLT Header)', placeholder: 'e.g. SUNACM (6 chars, DLT registered)' },
    ],
    secretFields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'Your SMSGateHub API key' },
    ],
  },
  {
    id: 'zoom',
    name: 'Zoom',
    logo: '🎥',
    description: 'Auto-generate Zoom meeting links for online admission interviews.',
    docsUrl: 'https://marketplace.zoom.us/develop/create',
    configFields: [
      { key: 'accountId', label: 'Account ID', placeholder: 'From Zoom Server-to-Server OAuth app' },
      { key: 'clientId',  label: 'Client ID',  placeholder: 'From Zoom Server-to-Server OAuth app' },
    ],
    secretFields: [
      { key: 'clientSecret', label: 'Client Secret', placeholder: 'From Zoom Server-to-Server OAuth app' },
    ],
  },
  {
    id: 'gmeet',
    name: 'Google Meet',
    logo: '📹',
    description: 'Auto-generate Google Meet links via Calendar API using a Service Account.',
    docsUrl: 'https://console.cloud.google.com',
    configFields: [
      { key: 'serviceAccountEmail', label: 'Service Account Email', placeholder: 'xxx@project.iam.gserviceaccount.com' },
      { key: 'calendarId', label: 'Calendar ID', placeholder: 'primary  or  abc@group.calendar.google.com' },
    ],
    secretFields: [
      { key: 'privateKey', label: 'Private Key (PEM)', placeholder: '-----BEGIN RSA PRIVATE KEY-----\n...', },
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    logo: '💬',
    description: 'Send WhatsApp messages to parents via Meta Embedded Signup.',
    docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
    embeddedSignup: true,
    configFields: [],
    secretFields: [],
  },
];

// ─── Gate Notification Settings ───────────────────────────────────────────────

function GateNotificationSettings() {
  const [settings, setSettings] = useState({
    notifyTrigger: 'BOTH' as string,
    notifyChannel: 'WHATSAPP' as string,
    schoolStartTime: '08:00',
    schoolEndTime: '15:00',
    lateThresholdMins: 15,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/gate/settings').then(r => r.json()).then(d => {
      if (d.data) setSettings(s => ({ ...s, ...d.data }));
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const res = await fetch('/api/gate/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (res.ok) toast.success('Gate notification settings saved');
    else toast.error('Failed to save settings');
  };

  if (loading) return <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-sora font-semibold text-navy">Gate & RFID — Parent Notifications</h3>
          <p className="text-xs text-gray-400 mt-0.5">Choose when and how parents are notified when their child enters or exits school via RFID / face recognition.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Trigger */}
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-2 block">Notify parents on</label>
          <div className="grid grid-cols-2 gap-2">
            {([['ENTRY', 'Entry only'], ['EXIT', 'Exit only'], ['BOTH', 'Entry & Exit'], ['NONE', 'Disabled']] as const).map(([val, label]) => (
              <button key={val} onClick={() => setSettings(s => ({ ...s, notifyTrigger: val }))}
                className={`px-3 py-2.5 text-sm font-semibold rounded-xl border-2 transition-colors text-left ${settings.notifyTrigger === val ? 'border-navy bg-navy text-white' : 'border-gray-200 text-gray-600 hover:border-navy/30'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Channel */}
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-2 block">Notification channel</label>
          <div className="grid grid-cols-1 gap-2">
            {([['WHATSAPP', 'WhatsApp only'], ['SMS', 'SMS only'], ['BOTH', 'WhatsApp + SMS'], ['NONE', 'No notifications']] as const).map(([val, label]) => (
              <button key={val} onClick={() => setSettings(s => ({ ...s, notifyChannel: val }))}
                className={`px-3 py-2 text-sm font-semibold rounded-xl border-2 transition-colors text-left ${settings.notifyChannel === val ? 'border-teal bg-teal/10 text-teal' : 'border-gray-200 text-gray-600 hover:border-teal/30'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* School times */}
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-2 block">School start time</label>
          <input type="time" value={settings.schoolStartTime}
            onChange={e => setSettings(s => ({ ...s, schoolStartTime: e.target.value }))}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-2 block">School end time</label>
          <input type="time" value={settings.schoolEndTime}
            onChange={e => setSettings(s => ({ ...s, schoolEndTime: e.target.value }))}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20" />
        </div>

        {/* Late threshold */}
        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-gray-600 mb-2 block">
            Late arrival threshold: <span className="text-navy">{settings.lateThresholdMins} minutes</span> after school start
          </label>
          <input type="range" min={0} max={60} value={settings.lateThresholdMins}
            onChange={e => setSettings(s => ({ ...s, lateThresholdMins: Number(e.target.value) }))}
            className="w-full accent-navy" />
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>0 min (exact)</span><span>30 min</span><span>60 min</span>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-gray-100">
        <button onClick={save} disabled={saving}
          className="px-5 py-2.5 bg-navy text-white text-sm font-semibold rounded-xl hover:bg-navy/90 disabled:opacity-60 transition-colors">
          {saving ? 'Saving…' : 'Save Gate Settings'}
        </button>
      </div>
    </div>
  );
}

function IntegrationsTab() {
  const [rows, setRows]       = useState<IntegrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, { config: Record<string, string>; secrets: Record<string, string> }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/settings/integrations')
      .then(r => r.json())
      .then(d => {
        const data: IntegrationRow[] = Array.isArray(d) ? d : (d.data ?? []);
        setRows(data);
        // Pre-fill non-secret config into forms
        const initial: typeof forms = {};
        for (const row of data) {
          initial[row.provider] = { config: { ...row.config }, secrets: {} };
        }
        setForms(initial);
      })
      .catch(() => toast.error('Failed to load integrations'))
      .finally(() => setLoading(false));
  }, []);

  const getRow = (provider: string): IntegrationRow | undefined => rows.find(r => r.provider === provider);

  const getForm = (provider: string) => forms[provider] ?? { config: {}, secrets: {} };

  const setFormField = (provider: string, type: 'config' | 'secrets', key: string, value: string) => {
    setForms(prev => {
      const f = prev[provider] ?? { config: {}, secrets: {} };
      return {
        ...prev,
        [provider]: { ...f, [type]: { ...(f[type] ?? {}), [key]: value } },
      };
    });
  };

  const save = async (provider: string, enabled: boolean) => {
    setSaving(provider);
    const form = getForm(provider);
    try {
      const res = await fetch('/api/settings/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, enabled, config: form.config, secrets: form.secrets }),
      });
      if (!res.ok) { toast.error('Failed to save'); return; }
      const updated = await res.json();
      const updatedRow: IntegrationRow = updated.data ?? updated;
      setRows(prev => {
        const exists = prev.find(r => r.provider === provider);
        return exists ? prev.map(r => r.provider === provider ? updatedRow : r) : [...prev, updatedRow];
      });
      // Clear secret fields after save (they're stored, no need to show)
      setForms(prev => {
        const f = prev[provider] ?? { config: {}, secrets: {} };
        return { ...prev, [provider]: { ...f, secrets: {} } };
      });
      toast.success(`${PROVIDERS.find(p => p.id === provider)?.name} ${enabled ? 'connected' : 'disconnected'}`);
      setExpanded(null);
    } finally { setSaving(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-navy/40" />
    </div>
  );

  return (
    <div className="space-y-4">
      {PROVIDERS.map(provider => {
        const row     = getRow(provider.id);
        const isOpen  = expanded === provider.id;
        const form    = getForm(provider.id);
        const isSaving = saving === provider.id;
        const connected = row?.enabled && row.hasSecrets;

        return (
          <div key={provider.id} className={`bg-white rounded-xl border transition-all shadow-sm ${
            connected ? 'border-green/30' : 'border-gray-200'
          }`}>
            {/* Header row */}
            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                {provider.logo}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-sora font-semibold text-navy text-sm">{provider.name}</span>
                  {provider.comingSoon && (
                    <span className="text-[10px] bg-amber/10 text-amber border border-amber/30 px-1.5 py-0.5 rounded-full font-semibold">Coming Soon</span>
                  )}
                  {connected ? (
                    <span className="text-[10px] bg-green/10 text-green border border-green/30 px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />Connected
                    </span>
                  ) : (
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />Not configured
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{provider.description}</p>
              </div>
              <button
                onClick={() => !provider.comingSoon && setExpanded(isOpen ? null : provider.id)}
                disabled={provider.comingSoon ?? false}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors flex-shrink-0 ${
                  provider.comingSoon
                    ? 'text-gray-300 border-gray-100 cursor-not-allowed'
                    : isOpen
                    ? 'bg-navy text-white border-navy'
                    : 'text-navy border-navy/30 hover:bg-navy/5'
                }`}
              >
                {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {isOpen ? 'Close' : connected ? 'Edit' : 'Configure'}
              </button>
            </div>

            {/* Expanded config form */}
            {isOpen && !provider.comingSoon && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="pt-4 space-y-3">

                  {/* WhatsApp — Embedded Signup flow */}
                  {provider.embeddedSignup ? (
                    <WhatsAppConnect
                      connected={!!(row?.enabled && row.config?.phoneNumberId)}
                      wabaId={row?.config?.wabaId as string | undefined}
                      phoneNumberId={row?.config?.phoneNumberId as string | undefined}
                      businessName={row?.config?.businessName as string | undefined}
                      onConnected={() => {
                        fetch('/api/settings/integrations')
                          .then(r => r.json())
                          .then(d => setRows(Array.isArray(d) ? d : (d.data ?? [])));
                        setExpanded(null);
                      }}
                    />
                  ) : (
                  <>
                  {/* Setup guide link */}
                  <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-teal font-semibold hover:underline">
                    📖 Setup Guide — {provider.docsUrl}
                  </a>

                  {/* Non-sensitive config fields */}
                  {provider.configFields.map(field => (
                    <div key={field.key}>
                      <label className="text-xs font-semibold text-gray-700 mb-1.5 block">{field.label}</label>
                      {field.multiline ? (
                        <textarea rows={4} value={form.config[field.key] ?? ''}
                          onChange={e => setFormField(provider.id, 'config', field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none placeholder:text-gray-300" />
                      ) : (
                        <input type="text" value={form.config[field.key] ?? ''}
                          onChange={e => setFormField(provider.id, 'config', field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 placeholder:text-gray-300" />
                      )}
                    </div>
                  ))}

                  {/* Sensitive secret fields */}
                  {provider.secretFields.map(field => {
                    const showKey   = `${provider.id}_${field.key}`;
                    const isVisible = showSecret[showKey];
                    const existing  = row?.secretsConfigured?.[field.key];
                    return (
                      <div key={field.key}>
                        <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                          {field.label}
                          <span className="ml-1.5 text-[10px] font-normal text-coral bg-coral/10 px-1.5 py-0.5 rounded-full">Secret — never shown in full</span>
                        </label>
                        {existing && !form.secrets[field.key] && (
                          <div className="flex items-center gap-2 bg-green/5 border border-green/20 rounded-xl px-3 py-2 mb-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green flex-shrink-0" />
                            <span className="text-xs text-green font-mono">{existing}</span>
                            <span className="text-xs text-gray-400 ml-auto">Leave blank to keep</span>
                          </div>
                        )}
                        <div className="relative">
                          {field.key === 'privateKey' ? (
                            <textarea rows={4}
                              value={form.secrets[field.key] ?? ''}
                              onChange={e => setFormField(provider.id, 'secrets', field.key, e.target.value)}
                              placeholder={existing ? 'Leave blank to keep existing key' : field.placeholder}
                              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none placeholder:text-gray-300" />
                          ) : (
                            <input
                              type={isVisible ? 'text' : 'password'}
                              value={form.secrets[field.key] ?? ''}
                              onChange={e => setFormField(provider.id, 'secrets', field.key, e.target.value)}
                              placeholder={existing ? 'Leave blank to keep existing' : field.placeholder}
                              className="w-full border border-gray-200 rounded-xl pl-3 pr-10 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy/20 placeholder:text-gray-300" />
                          )}
                          {field.key !== 'privateKey' && (
                            <button type="button"
                              onClick={() => setShowSecret(prev => ({ ...prev, [showKey]: !isVisible }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy transition-colors">
                              {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setExpanded(null)}
                      className="flex-1 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                    {connected && (
                      <button onClick={() => save(provider.id, false)} disabled={!!isSaving}
                        className="px-4 py-2.5 text-sm font-semibold text-coral border border-coral/30 bg-coral/5 rounded-xl hover:bg-coral/10 transition-colors">
                        Disconnect
                      </button>
                    )}
                    <button onClick={() => save(provider.id, true)} disabled={!!isSaving}
                      className="flex-1 py-2.5 text-sm font-semibold bg-navy text-white rounded-xl hover:bg-navyMid transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      {isSaving ? 'Saving…' : connected ? 'Update Credentials' : 'Connect'}
                    </button>
                  </div>
                  </>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="bg-iceLight border border-ice rounded-xl p-4 text-xs text-navy/70 leading-relaxed">
        <strong className="text-navy">Security note:</strong> Secret keys (API keys, private keys, OAuth secrets) are stored server-side and never returned to the browser after saving. The interface shows only a masked preview. Credentials are used exclusively to generate meeting links and send SMS — never shared externally.
      </div>
    </div>
  );
}

// ─── Subjects tab ─────────────────────────────────────────────────────────────

const SUBJECT_COLORS = [
  '#1E2761', '#028090', '#534AB7', '#D85A30', '#3B6D11',
  '#993556', '#BA7517', '#F5C542', '#0369a1', '#7c3aed',
  '#be185d', '#065f46', '#9a3412', '#1e40af', '#4d7c0f',
];

type SubjectRow = {
  id: string; name: string; code: string | null; colorHex: string | null;
  isElective: boolean; isLanguage: boolean; isPractical: boolean;
  _count: { teacherSubjects: number; timetableEntries: number };
};

function SubjectsTab() {
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', code: '', colorHex: SUBJECT_COLORS[0],
    isElective: false, isLanguage: false, isPractical: false,
  });
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/hr/subjects');
    const json = await res.json();
    setSubjects(json.subjects ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditId(null);
    setForm({ name: '', code: '', colorHex: SUBJECT_COLORS[0], isElective: false, isLanguage: false, isPractical: false });
    setShowForm(true);
  };

  const openEdit = (s: SubjectRow) => {
    setEditId(s.id);
    setForm({ name: s.name, code: s.code ?? '', colorHex: s.colorHex ?? SUBJECT_COLORS[0], isElective: s.isElective, isLanguage: s.isLanguage, isPractical: s.isPractical });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Subject name is required'); return; }
    setSaving(true);
    try {
      const url = editId ? `/api/hr/subjects/${editId}` : '/api/hr/subjects';
      const method = editId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Failed'); return; }
      await load();
      setShowForm(false);
      toast.success(editId ? 'Subject updated' : 'Subject created');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s: SubjectRow) => {
    if (s._count.teacherSubjects > 0 || s._count.timetableEntries > 0) {
      toast.error('Cannot delete — subject is assigned to teachers or timetable');
      return;
    }
    const res = await fetch(`/api/hr/subjects/${s.id}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Failed'); return; }
    await load();
    toast.success(`${s.name} deleted`);
  };

  const filtered = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.code ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="font-sora font-semibold text-navy">Subjects</h3>
          <p className="text-xs text-gray-400 mt-0.5">Define all subjects taught in the school — used for timetable and teacher capability mapping</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 bg-navy text-white text-xs font-semibold rounded-xl hover:bg-navyMid transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Subject
        </button>
      </div>

      {/* Search */}
      <div className="relative mt-4 mb-4">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search subjects…"
          className="w-full text-sm border border-gray-200 rounded-xl pl-4 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-navy/20"
        />
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="bg-iceLight border border-ice rounded-2xl p-4 mb-4 space-y-3">
          <p className="text-xs font-semibold text-navy">{editId ? 'Edit Subject' : 'New Subject'}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Name *</label>
              <input
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Mathematics"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Short Code</label>
              <input
                value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                placeholder="e.g. MATH"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white"
              />
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-2">
              <Palette className="w-3 h-3 inline mr-1" />Colour (shown in timetable)
            </label>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setForm(f => ({ ...f, colorHex: c }))}
                  className={`w-7 h-7 rounded-lg transition-transform ${form.colorHex === c ? 'ring-2 ring-offset-1 ring-navy scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Flags */}
          <div className="flex gap-4">
            {([
              { key: 'isElective', label: 'Elective' },
              { key: 'isLanguage', label: 'Language' },
              { key: 'isPractical', label: 'Has Practical' },
            ] as const).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                  className="w-3.5 h-3.5 accent-navy"
                />
                {label}
              </label>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2 text-xs font-semibold bg-navy text-white rounded-xl hover:bg-navyMid transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {editId ? 'Update' : 'Create Subject'}
            </button>
          </div>
        </div>
      )}

      {/* Subject list */}
      {loading ? (
        <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-navy" /></div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-gray-400">
          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{search ? 'No subjects match your search' : 'No subjects yet — click Add Subject to get started'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => (
            <div key={s.id} className="flex items-center gap-3 border border-gray-100 rounded-xl px-4 py-3 hover:border-gray-200 transition-colors group">
              {/* Color dot */}
              <div className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-white" style={{ backgroundColor: s.colorHex ?? '#1E2761' }} />
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-800">{s.name}</span>
                  {s.code && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-mono">{s.code}</span>}
                  {s.isElective && <span className="text-[9px] bg-purple/10 text-purple border border-purple/20 px-1.5 py-0.5 rounded-full font-semibold">Elective</span>}
                  {s.isLanguage && <span className="text-[9px] bg-teal/10 text-teal border border-teal/20 px-1.5 py-0.5 rounded-full font-semibold">Language</span>}
                  {s.isPractical && <span className="text-[9px] bg-amber/10 text-amber border border-amber/20 px-1.5 py-0.5 rounded-full font-semibold">Practical</span>}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {s._count.teacherSubjects} teacher{s._count.teacherSubjects !== 1 ? 's' : ''} assigned
                  {s._count.timetableEntries > 0 && ` · ${s._count.timetableEntries} timetable entries`}
                </div>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(s)}
                  disabled={s._count.teacherSubjects > 0 || s._count.timetableEntries > 0}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title={s._count.teacherSubjects > 0 ? 'Cannot delete — assigned to teachers' : ''}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary footer */}
      {!loading && subjects.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
          <span>{subjects.length} total subjects</span>
          <span>{subjects.filter(s => !s.isElective).length} core</span>
          <span>{subjects.filter(s => s.isElective).length} elective</span>
          <span>{subjects.filter(s => s.isPractical).length} with practical</span>
        </div>
      )}
    </div>
  );
}

// ─── Salary Settings tab ──────────────────────────────────────────────────

const LEAVE_COLORS = [
  '#1E2761','#028090','#534AB7','#D85A30','#3B6D11',
  '#993556','#BA7517','#0369a1','#7c3aed','#be185d',
];

type SalaryGradeRow = { id: string; name: string; category: string; basicMin: number; basicMax: number; description: string | null };
type LeavePolicyRow = {
  id: string; leaveType: string; label: string | null; color: string | null;
  daysAllowed: number; isCarryOver: boolean; maxCarryOver: number | null;
  isPaid: boolean; isEncashable: boolean; requiresApproval: boolean;
  maxConsecutiveDays: number | null; minServiceDays: number | null;
  description: string | null; roleTypes: string[];
};

type SalaryForm = {
  hraPercent: number; daPercent: number; taFlat: number; medicalFlat: number;
  specialAllowancePercent: number; pfPercent: number; professionalTax: number;
  tdsThresholdAnnual: number; tdsPercent: number; payDay: number;
};

function SalarySettingsTab() {
  const [form, setForm] = useState<SalaryForm>({
    hraPercent: 20, daPercent: 0, taFlat: 0, medicalFlat: 0,
    specialAllowancePercent: 0, pfPercent: 12,
    professionalTax: 200, tdsThresholdAnnual: 500000, tdsPercent: 10, payDay: 28,
  });
  const [grades, setGrades] = useState<SalaryGradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showGradeForm, setShowGradeForm] = useState(false);
  const [editGradeId, setEditGradeId] = useState<string | null>(null);
  const [gradeForm, setGradeForm] = useState({ name: '', category: 'TEACHING', basicMin: '', basicMax: '', description: '' });
  const [savingGrade, setSavingGrade] = useState(false);

  const PREVIEW_BASIC = 40000;
  const hra = Math.round(PREVIEW_BASIC * Number(form.hraPercent) / 100);
  const da = Math.round(PREVIEW_BASIC * Number(form.daPercent) / 100);
  const ta = Number(form.taFlat);
  const med = Number(form.medicalFlat);
  const special = Math.round(PREVIEW_BASIC * Number(form.specialAllowancePercent) / 100);
  const grossPrev = PREVIEW_BASIC + hra + da + ta + med + special;
  const pfPrev = Math.round(PREVIEW_BASIC * Number(form.pfPercent) / 100);
  const ptPrev = Number(form.professionalTax);
  const netPrev = grossPrev - pfPrev - ptPrev;

  const load = async () => {
    setLoading(true);
    const [s, g] = await Promise.all([
      fetch('/api/hr/salary-settings').then(r => r.json()),
      fetch('/api/hr/salary-grades').then(r => r.json()),
    ]);
    if (s.settings) {
      setForm({
        hraPercent: Number(s.settings.hraPercent),
        daPercent: Number(s.settings.daPercent),
        taFlat: Number(s.settings.taFlat),
        medicalFlat: Number(s.settings.medicalFlat),
        specialAllowancePercent: Number(s.settings.specialAllowancePercent),
        pfPercent: Number(s.settings.pfPercent),
        professionalTax: Number(s.settings.professionalTax),
        tdsThresholdAnnual: Number(s.settings.tdsThresholdAnnual),
        tdsPercent: Number(s.settings.tdsPercent),
        payDay: Number(s.settings.payDay),
      });
    }
    setGrades(g.grades?.map((gr: any) => ({ ...gr, basicMin: Number(gr.basicMin), basicMax: Number(gr.basicMax) })) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const n = (field: keyof SalaryForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: Number(e.target.value) }));

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch('/api/hr/salary-settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) toast.success('Salary settings saved'); else toast.error('Failed to save');
  };

  const openNewGrade = () => {
    setEditGradeId(null);
    setGradeForm({ name: '', category: 'TEACHING', basicMin: '', basicMax: '', description: '' });
    setShowGradeForm(true);
  };

  const openEditGrade = (g: SalaryGradeRow) => {
    setEditGradeId(g.id);
    setGradeForm({ name: g.name, category: g.category, basicMin: String(g.basicMin), basicMax: String(g.basicMax), description: g.description ?? '' });
    setShowGradeForm(true);
  };

  const handleSaveGrade = async () => {
    if (!gradeForm.name || !gradeForm.basicMin || !gradeForm.basicMax) { toast.error('Fill all required fields'); return; }
    setSavingGrade(true);
    const url = editGradeId ? `/api/hr/salary-grades/${editGradeId}` : '/api/hr/salary-grades';
    const res = await fetch(url, {
      method: editGradeId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...gradeForm, basicMin: Number(gradeForm.basicMin), basicMax: Number(gradeForm.basicMax) }),
    });
    setSavingGrade(false);
    if (res.ok) { await load(); setShowGradeForm(false); toast.success(editGradeId ? 'Grade updated' : 'Grade created'); }
    else { const d = await res.json(); toast.error(d.error || 'Failed'); }
  };

  const handleDeleteGrade = async (id: string) => {
    const res = await fetch(`/api/hr/salary-grades/${id}`, { method: 'DELETE' });
    if (res.ok) { await load(); toast.success('Grade deleted'); } else toast.error('Failed');
  };

  const catColor = (c: string) => c === 'TEACHING' ? 'bg-teal/10 text-teal border-teal/20' : c === 'NON_TEACHING' ? 'bg-purple/10 text-purple border-purple/20' : 'bg-gray-100 text-gray-600 border-gray-200';

  if (loading) return <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-navy" /></div>;

  return (
    <div className="space-y-5">
      {/* ── Allowance Components ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-sora font-semibold text-navy mb-1">Allowance Components</h3>
        <p className="text-xs text-gray-400 mb-5">Applied to all staff during payroll generation. Percentages are of Basic Salary.</p>

        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          {/* Allowances */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Allowances</p>
            {([
              { key: 'hraPercent', label: 'HRA (House Rent Allowance)', unit: '% of Basic', max: 60 },
              { key: 'daPercent', label: 'DA (Dearness Allowance)', unit: '% of Basic', max: 50 },
              { key: 'specialAllowancePercent', label: 'Special Allowance', unit: '% of Basic', max: 30 },
              { key: 'taFlat', label: 'Travel Allowance (TA)', unit: '₹ flat/month', max: 10000 },
              { key: 'medicalFlat', label: 'Medical Allowance', unit: '₹ flat/month', max: 5000 },
            ] as { key: keyof SalaryForm; label: string; unit: string; max: number }[]).map(f => (
              <div key={f.key} className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-600 font-medium">{f.label}</label>
                  <p className="text-[10px] text-gray-400">{f.unit}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={0} max={f.max} step={0.5}
                    value={form[f.key]}
                    onChange={n(f.key)}
                    className="w-20 text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                  <span className="text-xs text-gray-400 w-14">{f.unit.startsWith('%') ? '%' : '₹'}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Deductions */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Deductions</p>
            {([
              { key: 'pfPercent', label: 'Provident Fund (PF)', unit: '% of Basic', note: 'Employee share' },
              { key: 'professionalTax', label: 'Professional Tax', unit: '₹ flat/month', note: 'State-specific' },
              { key: 'tdsPercent', label: 'TDS Rate', unit: '% of Basic (above threshold)', note: '' },
              { key: 'tdsThresholdAnnual', label: 'TDS Threshold', unit: '₹ annual basic', note: 'Above this → TDS applies' },
              { key: 'payDay', label: 'Salary Pay Day', unit: 'Day of month (1–31)', note: '' },
            ] as { key: keyof SalaryForm; label: string; unit: string; note: string }[]).map(f => (
              <div key={f.key} className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-600 font-medium">{f.label}</label>
                  <p className="text-[10px] text-gray-400">{f.note || f.unit}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={0}
                    value={form[f.key]}
                    onChange={n(f.key)}
                    className="w-24 text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live preview */}
        <div className="mt-5 border border-navy/10 rounded-2xl p-4 bg-iceLight">
          <p className="text-xs font-bold text-navy uppercase tracking-wide mb-3 flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> Live Preview — Basic ₹{PREVIEW_BASIC.toLocaleString('en-IN')}</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            <div className="text-gray-500">Basic</div><div className="font-semibold text-right">₹{PREVIEW_BASIC.toLocaleString('en-IN')}</div>
            {hra > 0 && <><div className="text-gray-500">+ HRA ({form.hraPercent}%)</div><div className="font-semibold text-right text-teal">₹{hra.toLocaleString('en-IN')}</div></>}
            {da > 0 && <><div className="text-gray-500">+ DA ({form.daPercent}%)</div><div className="font-semibold text-right text-teal">₹{da.toLocaleString('en-IN')}</div></>}
            {ta > 0 && <><div className="text-gray-500">+ TA</div><div className="font-semibold text-right text-teal">₹{ta.toLocaleString('en-IN')}</div></>}
            {med > 0 && <><div className="text-gray-500">+ Medical</div><div className="font-semibold text-right text-teal">₹{med.toLocaleString('en-IN')}</div></>}
            {special > 0 && <><div className="text-gray-500">+ Special ({form.specialAllowancePercent}%)</div><div className="font-semibold text-right text-teal">₹{special.toLocaleString('en-IN')}</div></>}
            <div className="border-t border-navy/10 pt-1 font-bold text-navy">Gross</div><div className="border-t border-navy/10 pt-1 font-bold text-navy text-right">₹{grossPrev.toLocaleString('en-IN')}</div>
            {pfPrev > 0 && <><div className="text-gray-500">− PF ({form.pfPercent}%)</div><div className="font-semibold text-right text-coral">₹{pfPrev.toLocaleString('en-IN')}</div></>}
            {ptPrev > 0 && <><div className="text-gray-500">− Prof. Tax</div><div className="font-semibold text-right text-coral">₹{ptPrev.toLocaleString('en-IN')}</div></>}
            <div className="border-t border-navy/10 pt-1 font-bold text-green">Net Pay</div><div className="border-t border-navy/10 pt-1 font-bold text-green text-right">₹{netPrev.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="mt-4 flex items-center gap-1.5 px-5 py-2 bg-navy text-white text-sm font-semibold rounded-xl hover:bg-navyMid transition-colors disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save Salary Settings
        </button>
      </div>

      {/* ── Salary Grades ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="font-sora font-semibold text-navy">Salary Grades</h3>
            <p className="text-xs text-gray-400 mt-0.5">Named pay bands — assign grades to staff for quick salary classification</p>
          </div>
          <button onClick={openNewGrade} className="flex items-center gap-1.5 px-3 py-2 bg-navy text-white text-xs font-semibold rounded-xl hover:bg-navyMid transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Grade
          </button>
        </div>

        {showGradeForm && (
          <div className="mt-4 mb-3 bg-iceLight border border-ice rounded-2xl p-4 space-y-3">
            <p className="text-xs font-semibold text-navy">{editGradeId ? 'Edit Grade' : 'New Salary Grade'}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Grade Name *</label>
                <input value={gradeForm.name} onChange={e => setGradeForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Teaching Senior Scale" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Applicable To</label>
                <select value={gradeForm.category} onChange={e => setGradeForm(f => ({ ...f, category: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20">
                  <option value="TEACHING">Teaching Staff</option>
                  <option value="NON_TEACHING">Non-Teaching Staff</option>
                  <option value="ALL">All Staff</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Basic Min (₹/month) *</label>
                <input type="number" value={gradeForm.basicMin} onChange={e => setGradeForm(f => ({ ...f, basicMin: e.target.value }))} placeholder="e.g. 30000" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Basic Max (₹/month) *</label>
                <input type="number" value={gradeForm.basicMax} onChange={e => setGradeForm(f => ({ ...f, basicMax: e.target.value }))} placeholder="e.g. 50000" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Description</label>
                <input value={gradeForm.description} onChange={e => setGradeForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional notes" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowGradeForm(false)} className="flex-1 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={handleSaveGrade} disabled={savingGrade} className="flex-1 py-2 text-xs font-semibold bg-navy text-white rounded-xl hover:bg-navyMid disabled:opacity-50 flex items-center justify-center gap-1.5">
                {savingGrade ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {editGradeId ? 'Update' : 'Create Grade'}
              </button>
            </div>
          </div>
        )}

        {grades.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm mt-4"><LayoutList className="w-6 h-6 mx-auto mb-2 opacity-30" />No salary grades yet</div>
        ) : (
          <div className="mt-4 space-y-2">
            {['TEACHING', 'NON_TEACHING', 'ALL'].map(cat => {
              const group = grades.filter(g => g.category === cat);
              if (group.length === 0) return null;
              const catLabel = cat === 'TEACHING' ? 'Teaching Staff' : cat === 'NON_TEACHING' ? 'Non-Teaching Staff' : 'All Staff';
              return (
                <div key={cat}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">{catLabel}</p>
                  {group.map(g => (
                    <div key={g.id} className="flex items-center gap-3 border border-gray-100 rounded-xl px-4 py-2.5 hover:border-gray-200 transition-colors group mb-1.5">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${catColor(g.category)}`}>{catLabel}</span>
                      <div className="flex-1">
                        <span className="font-semibold text-sm text-gray-800">{g.name}</span>
                        {g.description && <span className="text-xs text-gray-400 ml-2">{g.description}</span>}
                      </div>
                      <span className="text-xs font-mono text-navy">₹{g.basicMin.toLocaleString('en-IN')} – ₹{g.basicMax.toLocaleString('en-IN')}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditGrade(g)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteGrade(g.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Leave Policy tab ──────────────────────────────────────────────────────

const DEFAULT_LEAVE_TYPES = [
  { leaveType: 'CL', label: 'Casual Leave', color: '#028090', daysAllowed: 12, roleTypes: ['ALL'] },
  { leaveType: 'EL', label: 'Earned Leave', color: '#3B6D11', daysAllowed: 15, roleTypes: ['ALL'], isCarryOver: true, maxCarryOver: 30, isEncashable: true },
  { leaveType: 'SL', label: 'Sick Leave', color: '#D85A30', daysAllowed: 10, roleTypes: ['ALL'] },
  { leaveType: 'ML', label: 'Medical Leave', color: '#BA7517', daysAllowed: 30, roleTypes: ['ALL'], description: 'Requires medical certificate' },
  { leaveType: 'MatL', label: 'Maternity Leave', color: '#993556', daysAllowed: 180, roleTypes: ['TEACHING', 'NON_TEACHING'], isPaid: true, description: 'For female staff (govt. norms)' },
  { leaveType: 'PatL', label: 'Paternity Leave', color: '#534AB7', daysAllowed: 15, roleTypes: ['TEACHING', 'NON_TEACHING'] },
];

function LeavePolicyTab() {
  const [policies, setPolicies] = useState<LeavePolicyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    leaveType: '', label: '', color: LEAVE_COLORS[0],
    daysAllowed: 12, isCarryOver: false, maxCarryOver: '',
    isPaid: true, isEncashable: false, requiresApproval: true,
    maxConsecutiveDays: '', minServiceDays: '', description: '',
    roleTypes: ['ALL'] as string[],
  });

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/hr/leave-policies');
    const json = await res.json();
    setPolicies(json.policies ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditId(null);
    setForm({ leaveType: '', label: '', color: LEAVE_COLORS[0], daysAllowed: 12, isCarryOver: false, maxCarryOver: '', isPaid: true, isEncashable: false, requiresApproval: true, maxConsecutiveDays: '', minServiceDays: '', description: '', roleTypes: ['ALL'] });
    setShowForm(true);
  };

  const openEdit = (p: LeavePolicyRow) => {
    setEditId(p.id);
    setForm({
      leaveType: p.leaveType, label: p.label ?? p.leaveType, color: p.color ?? LEAVE_COLORS[0],
      daysAllowed: p.daysAllowed, isCarryOver: p.isCarryOver, maxCarryOver: p.maxCarryOver ? String(p.maxCarryOver) : '',
      isPaid: p.isPaid, isEncashable: p.isEncashable, requiresApproval: p.requiresApproval,
      maxConsecutiveDays: p.maxConsecutiveDays ? String(p.maxConsecutiveDays) : '',
      minServiceDays: p.minServiceDays ? String(p.minServiceDays) : '',
      description: p.description ?? '', roleTypes: p.roleTypes ?? ['ALL'],
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.leaveType.trim() || !form.label.trim()) { toast.error('Leave type code and label are required'); return; }
    setSaving(true);
    const url = editId ? `/api/hr/leave-policies/${editId}` : '/api/hr/leave-policies';
    const res = await fetch(url, {
      method: editId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        maxCarryOver: form.maxCarryOver ? Number(form.maxCarryOver) : null,
        maxConsecutiveDays: form.maxConsecutiveDays ? Number(form.maxConsecutiveDays) : null,
        minServiceDays: form.minServiceDays ? Number(form.minServiceDays) : null,
      }),
    });
    setSaving(false);
    if (res.ok) { await load(); setShowForm(false); toast.success(editId ? 'Policy updated' : 'Policy created'); }
    else { const d = await res.json(); toast.error(d.error || 'Failed'); }
  };

  const handleDelete = async (p: LeavePolicyRow) => {
    const res = await fetch(`/api/hr/leave-policies/${p.id}`, { method: 'DELETE' });
    if (res.ok) { await load(); toast.success(`${p.label ?? p.leaveType} policy deleted`); } else toast.error('Failed');
  };

  const seedDefaults = async () => {
    for (const d of DEFAULT_LEAVE_TYPES) {
      const existing = policies.find(p => p.leaveType === d.leaveType);
      if (!existing) {
        await fetch('/api/hr/leave-policies', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...d, isPaid: d.isPaid ?? true, isEncashable: d.isEncashable ?? false, requiresApproval: true }),
        });
      }
    }
    await load();
    toast.success('Default leave types added');
  };

  const toggleRole = (role: string) => {
    if (role === 'ALL') { setForm(f => ({ ...f, roleTypes: ['ALL'] })); return; }
    setForm(f => {
      const current = f.roleTypes.filter(r => r !== 'ALL');
      const next = current.includes(role) ? current.filter(r => r !== role) : [...current, role];
      return { ...f, roleTypes: next.length === 0 ? ['ALL'] : next };
    });
  };

  if (loading) return <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-navy" /></div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="font-sora font-semibold text-navy">Leave Policy</h3>
          <p className="text-xs text-gray-400 mt-0.5">Define leave types, entitlements, carry-forward and encashment rules per staff category</p>
        </div>
        <div className="flex gap-2">
          {policies.length === 0 && (
            <button onClick={seedDefaults} className="flex items-center gap-1.5 px-3 py-2 bg-gold text-navy text-xs font-semibold rounded-xl hover:bg-gold/90 transition-colors">
              <Star className="w-3.5 h-3.5" /> Load Defaults
            </button>
          )}
          <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 bg-navy text-white text-xs font-semibold rounded-xl hover:bg-navyMid transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Leave Type
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mt-4 mb-4 bg-iceLight border border-ice rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-navy">{editId ? 'Edit Leave Type' : 'New Leave Type'}</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Code * <span className="normal-case font-normal">(e.g. CL)</span></label>
              <input value={form.leaveType} onChange={e => setForm(f => ({ ...f, leaveType: e.target.value.toUpperCase() }))} disabled={!!editId} placeholder="CL" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 disabled:bg-gray-50" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Full Name *</label>
              <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Casual Leave" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Days / Year *</label>
              <input type="number" min={0} value={form.daysAllowed} onChange={e => setForm(f => ({ ...f, daysAllowed: Number(e.target.value) }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Max Consecutive Days</label>
              <input type="number" min={0} value={form.maxConsecutiveDays} onChange={e => setForm(f => ({ ...f, maxConsecutiveDays: e.target.value }))} placeholder="No limit" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Min. Service Days</label>
              <input type="number" min={0} value={form.minServiceDays} onChange={e => setForm(f => ({ ...f, minServiceDays: e.target.value }))} placeholder="No minimum" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20" />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-2">Badge Colour</label>
            <div className="flex gap-2 flex-wrap">
              {LEAVE_COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} className={`w-6 h-6 rounded-full transition-transform ${form.color === c ? 'ring-2 ring-offset-1 ring-navy scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          {/* Role types */}
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-2">Applicable To</label>
            <div className="flex gap-2">
              {['ALL', 'TEACHING', 'NON_TEACHING'].map(role => (
                <button key={role} onClick={() => toggleRole(role)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-colors ${form.roleTypes.includes(role) ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-600 hover:border-navy/40'}`}>
                  {role === 'ALL' ? 'All Staff' : role === 'TEACHING' ? 'Teaching' : 'Non-Teaching'}
                </button>
              ))}
            </div>
          </div>

          {/* Flags row */}
          <div className="flex flex-wrap gap-4">
            {([
              { key: 'isPaid', label: 'Paid Leave' },
              { key: 'isCarryOver', label: 'Carry Forward' },
              { key: 'isEncashable', label: 'Encashable' },
              { key: 'requiresApproval', label: 'Requires Approval' },
            ] as const).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-600">
                <input type="checkbox" checked={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} className="w-3.5 h-3.5 accent-navy" />
                {label}
              </label>
            ))}
          </div>

          {form.isCarryOver && (
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Max Carry-Forward Days</label>
              <input type="number" min={0} value={form.maxCarryOver} onChange={e => setForm(f => ({ ...f, maxCarryOver: e.target.value }))} placeholder="e.g. 30" className="w-32 text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20" />
            </div>
          )}

          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Notes / Description</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Requires medical certificate" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20" />
          </div>

          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2 text-xs font-semibold bg-navy text-white rounded-xl hover:bg-navyMid disabled:opacity-50 flex items-center justify-center gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {editId ? 'Update Policy' : 'Create Policy'}
            </button>
          </div>
        </div>
      )}

      {/* Policy list */}
      {policies.length === 0 ? (
        <div className="text-center py-10 text-gray-400 mt-4">
          <CalendarCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No leave policies defined yet</p>
          <p className="text-xs mt-1">Click &ldquo;Load Defaults&rdquo; to add standard Indian school leave types, or add manually</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {policies.map(p => (
            <div key={p.id} className="flex items-start gap-3 border border-gray-100 rounded-xl px-4 py-3 hover:border-gray-200 transition-colors group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold font-sora" style={{ backgroundColor: p.color ?? '#1E2761' }}>
                {p.leaveType}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-gray-800">{p.label ?? p.leaveType}</span>
                  <span className="text-xs font-bold text-navy">{p.daysAllowed} days/year</span>
                  {p.isPaid ? <span className="text-[9px] bg-green/10 text-green border border-green/20 px-1.5 py-0.5 rounded-full font-semibold">Paid</span> : <span className="text-[9px] bg-coral/10 text-coral border border-coral/20 px-1.5 py-0.5 rounded-full font-semibold">Unpaid</span>}
                  {p.isCarryOver && <span className="text-[9px] bg-teal/10 text-teal border border-teal/20 px-1.5 py-0.5 rounded-full font-semibold">Carry-fwd {p.maxCarryOver ? `(max ${p.maxCarryOver}d)` : ''}</span>}
                  {p.isEncashable && <span className="text-[9px] bg-gold/10 text-amber border border-amber/20 px-1.5 py-0.5 rounded-full font-semibold">Encashable</span>}
                  {(p.roleTypes ?? []).filter(r => r !== 'ALL').map(r => (
                    <span key={r} className={`text-[9px] border px-1.5 py-0.5 rounded-full font-semibold ${r === 'TEACHING' ? 'bg-teal/10 text-teal border-teal/20' : 'bg-purple/10 text-purple border-purple/20'}`}>{r === 'TEACHING' ? 'Teaching' : 'Non-Teaching'}</span>
                  ))}
                </div>
                <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-3 flex-wrap">
                  {p.maxConsecutiveDays && <span>Max {p.maxConsecutiveDays} consecutive days</span>}
                  {p.requiresApproval && <span>Requires approval</span>}
                  {p.description && <span className="italic">{p.description}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
                <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(p)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {policies.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex gap-5 text-xs text-gray-500">
          <span>{policies.length} leave types</span>
          <span>{policies.filter(p => p.isPaid).length} paid</span>
          <span>{policies.filter(p => p.isCarryOver).length} with carry-forward</span>
          <span>{policies.filter(p => p.isEncashable).length} encashable</span>
        </div>
      )}
    </div>
  );
}

// ─── Academic Sessions tab ─────────────────────────────────────────────────

function AcademicSessionsTab() {
  const { years, viewingYear, dbCurrentYear, setViewingYear, setAsCurrentYear, createYear, updateYear, deleteYear, loading } = useAcademicYear();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ label: '', startDate: '', endDate: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openCreate = () => {
    setEditId(null);
    setForm({ label: '', startDate: '', endDate: '' });
    setShowForm(true);
  };

  const openEdit = (y: AcademicYear) => {
    setEditId(y.id);
    setForm({
      label: y.label,
      startDate: y.startDate.split('T')[0],
      endDate: y.endDate.split('T')[0],
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.label.trim() || !form.startDate || !form.endDate) {
      toast.error('All fields are required');
      return;
    }
    if (new Date(form.endDate) <= new Date(form.startDate)) {
      toast.error('End date must be after start date');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await updateYear(editId, form);
        toast.success(`Session "${form.label}" updated`);
      } else {
        await createYear(form);
        toast.success(`Session "${form.label}" created`);
      }
      setShowForm(false);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSetCurrent = async (id: string, label: string) => {
    try {
      await setAsCurrentYear(id);
      toast.success(`"${label}" is now the active academic session`, {
        description: 'All modules will now show data for this session.',
      });
    } catch {
      toast.error('Failed to set active session');
    }
  };

  const handleSetViewing = (y: AcademicYear) => {
    setViewingYear(y);
    toast.success(`Now viewing "${y.label}"`, { description: 'Data across all modules will reflect this session.' });
  };

  const handleDelete = async (y: AcademicYear) => {
    setDeletingId(y.id);
    try {
      await deleteYear(y.id);
      toast.success(`Session "${y.label}" deleted`);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            Currently viewing: <span className="font-semibold text-navy">{viewingYear?.label ?? '—'}</span>
            {viewingYear?.id !== dbCurrentYear?.id && (
              <span className="ml-2 text-xs text-amber font-semibold bg-amber/10 px-2 py-0.5 rounded-full">Viewing historical data</span>
            )}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Active session (DB): <strong>{dbCurrentYear?.label ?? 'None set'}</strong></p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navyMid transition-colors"
        >
          <Plus className="w-4 h-4" /> New Session
        </button>
      </div>

      {/* Session cards */}
      {years.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">No academic sessions found.</div>
      ) : (
        <div className="space-y-3">
          {years.map((y) => {
            const isDbCurrent = y.isCurrent;
            const isViewing = y.id === viewingYear?.id;
            const isDeleting = deletingId === y.id;
            return (
              <div
                key={y.id}
                className={`rounded-xl border p-4 transition-all ${
                  isDbCurrent
                    ? 'border-teal/30 bg-teal/5'
                    : isViewing
                    ? 'border-navy/20 bg-iceLight'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDbCurrent ? 'bg-teal text-white' : 'bg-gray-100 text-gray-500'}`}>
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-sora font-semibold text-navy">{y.label}</h4>
                        {isDbCurrent && (
                          <span className="text-[10px] font-bold bg-teal text-white px-2 py-0.5 rounded-full uppercase tracking-wide">
                            Active Session
                          </span>
                        )}
                        {isViewing && (
                          <span className="text-[10px] font-bold bg-navy/10 text-navy px-2 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Viewing
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(y.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' → '}
                        {new Date(y.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      {(y.studentCount !== undefined || y.gradeCount !== undefined) && (
                        <p className="text-[11px] text-gray-400 mt-1">
                          {y.gradeCount} grades · {y.studentCount} students
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* View button */}
                    {!isViewing && (
                      <button
                        onClick={() => handleSetViewing(y)}
                        className="text-xs text-navy border border-navy/20 bg-navy/5 hover:bg-navy/10 px-3 py-1.5 rounded-lg font-semibold transition-colors"
                      >
                        View
                      </button>
                    )}
                    {/* Set as active (DB) */}
                    {!isDbCurrent && (
                      <button
                        onClick={() => handleSetCurrent(y.id, y.label)}
                        className="text-xs text-teal border border-teal/30 bg-teal/5 hover:bg-teal/10 px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1"
                      >
                        <Star className="w-3 h-3" /> Set Active
                      </button>
                    )}
                    {/* Edit */}
                    <button
                      onClick={() => openEdit(y)}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-navy hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {/* Delete */}
                    {!isDbCurrent && (
                      <button
                        disabled={isDeleting}
                        onClick={() => handleDelete(y)}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-coral hover:bg-coral/10 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isDeleting ? <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-coral rounded-full animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Warning */}
      <div className="flex items-start gap-2 p-3 bg-amber/10 border border-amber/20 rounded-lg text-xs text-gray-600">
        <AlertTriangle className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
        <p>
          <strong>View</strong> switches your personal browsing session without affecting others.{' '}
          <strong>Set Active</strong> changes the official current session for the entire school — this affects new enrollments, attendance marking, and fee structures.
        </p>
      </div>

      {/* Create / Edit form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-sora font-semibold text-navy text-lg">
                {editId ? 'Edit Session' : 'New Academic Session'}
              </h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Session Label</label>
                <input
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. 2025-26"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-navy text-white text-sm font-semibold rounded-xl hover:bg-navyMid transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {editId ? 'Save Changes' : 'Create Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [modules, setModules] = useState<Record<string, boolean>>(
    Object.fromEntries(moduleGroups.flatMap(g => g.modules.map(m => [m.id, m.on])))
  );

  const toggleModule = (id: string) => {
    setModules(prev => {
      const next = { ...prev, [id]: !prev[id] };
      toast.success(next[id] ? 'Module activated' : 'Module deactivated', {
        description: moduleGroups.flatMap(g => g.modules).find(m => m.id === id)?.name,
      });
      return next;
    });
  };

  const activeCount = Object.values(modules).filter(Boolean).length;

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'profile',       label: 'School Profile',  icon: Building },
    { id: 'sessions',      label: 'Sessions',        icon: CalendarDays },
    { id: 'subjects',      label: 'Subjects',        icon: BookOpen },
    { id: 'salary',        label: 'Salary',          icon: DollarSign },
    { id: 'leave',         label: 'Leave Policy',    icon: CalendarCheck },
    { id: 'modules',       label: 'Modules',         icon: ToggleLeft },
    { id: 'roles',         label: 'User Roles',      icon: Users },
    { id: 'notifications', label: 'Notifications',   icon: Bell },
    { id: 'integrations',  label: 'Integrations',    icon: Plug },
    { id: 'billing',       label: 'Billing',         icon: CreditCard },
  ];

  return (
    <PageWrapper>
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 overflow-x-auto">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === t.id
                  ? 'bg-navy text-white shadow-sm'
                  : 'text-gray-500 hover:text-navy hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2">

          {/* School Profile */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-sora font-semibold text-navy mb-4">School Profile</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'School Name',  val: 'Sundarban Academy' },
                  { label: 'Location',     val: 'Kolkata, West Bengal' },
                  { label: 'Affiliation',  val: 'CISCE Board' },
                  { label: 'UDISE Code',   val: '19010101001' },
                  { label: 'Principal',    val: 'Mrs. Ananya Sharma' },
                  { label: 'Email',        val: 'admin@sundarbanacademy.edu.in' },
                  { label: 'Phone',        val: '+91 98310 00001' },
                  { label: 'Address',      val: '12, Rabindra Sarani, Behala, Kolkata 700034' },
                ].map(f => (
                  <div key={f.label}>
                    <label className="text-xs text-gray-400 uppercase tracking-wide">{f.label}</label>
                    <input
                      defaultValue={f.val}
                      className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-navy/20"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => toast.success('School profile updated')}
                className="mt-4 px-5 py-2 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navyMid transition-colors"
              >
                Save Changes
              </button>
            </div>
          )}

          {/* Academic Sessions */}
          {activeTab === 'sessions' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-sora font-semibold text-navy mb-1">Academic Sessions</h3>
              <p className="text-xs text-gray-400 mb-5">Manage the school&apos;s academic years. Switch which session all modules display data for.</p>
              <AcademicSessionsTab />
            </div>
          )}

          {/* Subjects */}
          {activeTab === 'subjects' && <SubjectsTab />}

          {/* Salary Settings */}
          {activeTab === 'salary' && <SalarySettingsTab />}

          {/* Leave Policy */}
          {activeTab === 'leave' && <LeavePolicyTab />}

          {/* Module Activation */}
          {activeTab === 'modules' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-sora font-semibold text-navy">Module Activation</h3>
                <span className="text-sm text-gray-500">{activeCount} / {Object.keys(modules).length} active</span>
              </div>
              <div className="space-y-6">
                {moduleGroups.map(group => (
                  <div key={group.pillar}>
                    <p className="text-xs font-sora font-bold text-gray-400 uppercase tracking-wide mb-2">{group.pillar}</p>
                    <div className="grid grid-cols-2 gap-3">
                      {group.modules.map(m => (
                        <div key={m.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${modules[m.id] ? 'border-navy/20 bg-iceLight' : 'border-gray-200 bg-gray-50'}`}>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{m.name}</p>
                            <p className="text-[10px] text-gray-400 truncate">{m.desc}</p>
                          </div>
                          <button
                            onClick={() => toggleModule(m.id)}
                            className={`w-10 h-5 rounded-full transition-all flex-shrink-0 ml-2 relative ${modules[m.id] ? 'bg-teal' : 'bg-gray-300'}`}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${modules[m.id] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Roles */}
          {activeTab === 'roles' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-sora font-semibold text-navy mb-4">User Roles & Permissions</h3>
              <div className="space-y-3">
                {[
                  { role: 'Super Admin', users: 1, color: 'bg-navy/10 text-navy', perms: ['All access', 'Billing', 'Multi-tenant'] },
                  { role: 'Principal', users: 1, color: 'bg-purple/10 text-purple', perms: ['All modules', 'Reports', 'Staff management'] },
                  { role: 'Teacher', users: 14, color: 'bg-teal/10 text-teal', perms: ['Attendance', 'Academics', 'Homework'] },
                  { role: 'Admin Staff', users: 2, color: 'bg-amber/10 text-amber', perms: ['Admissions', 'Fee', 'ID Cards'] },
                  { role: 'Parent (App)', users: 380, color: 'bg-green/10 text-green', perms: ['View own child', 'Fee payment', 'Messages'] },
                ].map(r => (
                  <div key={r.role} className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 ${r.color}`}>{r.role}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-1.5 flex-wrap">
                        {r.perms.map(p => <span key={p} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{p}</span>)}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-600 flex-shrink-0">{r.users} {r.users === 1 ? 'user' : 'users'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="space-y-5">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-sora font-semibold text-navy mb-4">Notification Channels</h3>
                <div className="space-y-3">
                  {[
                    { name: 'WhatsApp Alerts', desc: 'Attendance, fee reminders, emergency', enabled: true },
                    { name: 'Email Reports', desc: 'Daily summary, weekly analytics', enabled: true },
                    { name: 'SMS (Bulk)', desc: 'Critical alerts only', enabled: true },
                    { name: 'In-App Push', desc: 'Real-time notifications in parent app', enabled: false },
                    { name: 'Daily Summary Email', desc: 'End-of-day report to principal', enabled: false },
                  ].map((n) => (
                    <div key={n.name} className="flex items-center justify-between p-3 rounded-xl border border-gray-100">
                      <div>
                        <p className="text-sm font-semibold text-gray-700">{n.name}</p>
                        <p className="text-[11px] text-gray-400">{n.desc}</p>
                      </div>
                      <button
                        onClick={() => toast.success(`${n.name} ${n.enabled ? 'disabled' : 'enabled'}`)}
                        className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${n.enabled ? 'bg-teal' : 'bg-gray-200'}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${n.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <GateNotificationSettings />
            </div>
          )}

          {/* Integrations */}
          {activeTab === 'integrations' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="mb-5">
                <h3 className="font-sora font-semibold text-navy">API Integrations</h3>
                <p className="text-xs text-gray-400 mt-0.5">Connect external services — SMS gateway, video meetings, and messaging platforms.</p>
              </div>
              <IntegrationsTab />
            </div>
          )}

          {/* Billing */}
          {activeTab === 'billing' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-sora font-semibold text-navy mb-4">Billing & Subscription</h3>
              <div className="bg-gradient-to-br from-navy to-navyMid rounded-xl p-5 text-white mb-4">
                <p className="text-gold font-sora font-bold text-xl mb-1">Growth Plan</p>
                <p className="text-white/80 text-3xl font-sora font-bold">₹3.2L<span className="text-sm font-normal text-white/60">/year</span></p>
                <p className="text-white/60 text-xs mt-1">Renews April 2026</p>
                <div className="mt-4 space-y-2 text-sm text-white/80">
                  <div className="flex justify-between"><span>Active Modules</span><span className="font-bold text-gold">{activeCount}</span></div>
                  <div className="flex justify-between"><span>Student Seats</span><span className="font-bold">600</span></div>
                  <div className="flex justify-between"><span>Staff Seats</span><span className="font-bold">50</span></div>
                </div>
              </div>
              <button onClick={() => toast.success('Opening billing portal…')} className="w-full py-2.5 bg-navy text-white font-semibold text-sm rounded-xl hover:bg-navyMid transition-colors">
                Manage Subscription
              </button>
            </div>
          )}

        </div>

        {/* Right sidebar — always visible */}
        <div className="space-y-5">
          <div className="bg-gradient-to-br from-navy to-navyMid rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5 text-gold" />
              <h3 className="font-sora font-semibold text-base">Current Plan</h3>
            </div>
            <p className="text-gold font-sora font-bold text-xl mb-0.5">Growth Plan</p>
            <p className="text-white/80 text-2xl font-sora font-bold">₹3.2L<span className="text-sm font-normal text-white/60">/year</span></p>
            <p className="text-white/60 text-xs mt-1 mb-4">Renews April 2026</p>
            <div className="space-y-1.5 text-sm text-white/80">
              <div className="flex justify-between"><span>Active Modules</span><span className="font-bold text-gold">{activeCount}</span></div>
              <div className="flex justify-between"><span>Student Seats</span><span className="font-bold">600</span></div>
              <div className="flex justify-between"><span>Support</span><span className="font-bold">Priority 24/7</span></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Quick Actions</p>
            <div className="space-y-2">
              {[
                { label: 'Backup Data', action: () => toast.success('Backup initiated — you\'ll receive an email when ready') },
                { label: 'Export School Data', action: () => toast.success('Export started') },
                { label: 'View Audit Log', action: () => toast.success('Opening audit log…') },
              ].map(a => (
                <button key={a.label} onClick={a.action} className="w-full text-left text-sm text-gray-600 py-2 px-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors">
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

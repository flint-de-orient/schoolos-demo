'use client';

import { useState, useEffect } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { Building, CalendarDays, ToggleLeft, Users, Bell, CreditCard, Plus, Pencil, Trash2, Check, Star, X, AlertTriangle, Plug, ChevronDown, ChevronUp, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAcademicYear } from '@/context/AcademicYearContext';
import type { AcademicYear } from '@/context/AcademicYearContext';

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

type Tab = 'profile' | 'sessions' | 'modules' | 'roles' | 'notifications' | 'billing' | 'integrations';

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
    description: 'Send WhatsApp messages to parents. Requires a Meta Business account with approved templates.',
    docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
    comingSoon: true,
    configFields: [
      { key: 'phoneNumberId', label: 'Phone Number ID', placeholder: 'From Meta for Developers dashboard' },
    ],
    secretFields: [
      { key: 'apiKey', label: 'API Token', placeholder: 'Permanent system token from Meta Business' },
    ],
  },
];

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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-sora font-semibold text-navy mb-4">Notification Channels</h3>
              <div className="space-y-3">
                {[
                  { name: 'WhatsApp Alerts', desc: 'Attendance, fee reminders, emergency', enabled: true },
                  { name: 'Email Reports', desc: 'Daily summary, weekly analytics', enabled: true },
                  { name: 'SMS (Bulk)', desc: 'Critical alerts only', enabled: true },
                  { name: 'In-App Push', desc: 'Real-time notifications in parent app', enabled: false },
                  { name: 'Daily Summary Email', desc: 'End-of-day report to principal', enabled: false },
                ].map((n, i) => (
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

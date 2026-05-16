'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, RefreshCw, Sun } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type GradeGroup = { id: string; name: string; periodsPerDay: number };

type HalfDayConfig = {
  id: string;
  gradeGroupId: string | null;
  gradeGroup: { id: string; name: string } | null;
  dayOfWeek: string;
  periodsPerDay: number;
  isActive: boolean;
};

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const DAY_LABEL: Record<string, string> = {
  MONDAY: 'Monday', TUESDAY: 'Tuesday', WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday', FRIDAY: 'Friday', SATURDAY: 'Saturday',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function HalfDaySetup() {
  const [configs, setConfigs]       = useState<HalfDayConfig[]>([]);
  const [groups, setGroups]         = useState<GradeGroup[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState({
    gradeGroupId: '' as string,   // '' = school-wide (null)
    dayOfWeek: 'SATURDAY',
    periodsPerDay: 4,
    isActive: true,
  });

  async function load() {
    setLoading(true);
    try {
      const [hdRes, ggRes] = await Promise.all([
        fetch('/api/timetable/half-day-config').then(r => r.json()),
        fetch('/api/timetable/grade-groups').then(r => r.json()),
      ]);
      setConfigs(hdRes.data?.configs ?? []);
      setGroups(ggRes.data?.groups ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/timetable/half-day-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gradeGroupId: form.gradeGroupId || null,
          dayOfWeek: form.dayOfWeek,
          periodsPerDay: form.periodsPerDay,
          isActive: form.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Failed to save'); return; }
      toast.success('Half-day rule saved');
      setShowForm(false);
      setForm({ gradeGroupId: '', dayOfWeek: 'SATURDAY', periodsPerDay: 4, isActive: true });
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/timetable/half-day-config?id=${id}`, { method: 'DELETE' });
      if (!res.ok) { toast.error('Failed to delete'); return; }
      toast.success('Half-day rule removed');
      setConfigs(prev => prev.filter(c => c.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  async function handleToggle(config: HalfDayConfig) {
    const res = await fetch('/api/timetable/half-day-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gradeGroupId: config.gradeGroupId,
        dayOfWeek: config.dayOfWeek,
        periodsPerDay: config.periodsPerDay,
        isActive: !config.isActive,
      }),
    });
    if (res.ok) {
      setConfigs(prev => prev.map(c => c.id === config.id ? { ...c, isActive: !c.isActive } : c));
    }
  }

  // When gradeGroupId changes in form, pre-fill periodsPerDay from that group's config
  function handleGroupChange(gid: string) {
    const group = groups.find(g => g.id === gid);
    const defaultPeriods = group ? Math.ceil(group.periodsPerDay / 2) : 4;
    setForm(f => ({ ...f, gradeGroupId: gid, periodsPerDay: defaultPeriods }));
  }

  const scopeLabel = (c: HalfDayConfig) =>
    c.gradeGroup ? c.gradeGroup.name : 'All Grade Groups';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sun className="w-5 h-5 text-amber-500" />
          <h2 className="text-base font-sora font-semibold text-navy">Half-Day Rules</h2>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold bg-navy text-white px-3 py-1.5 rounded-lg hover:bg-navyMid transition-colors">
          <Plus className="w-3.5 h-3.5" />
          Add Rule
        </button>
      </div>
      <p className="text-xs text-gray-400 font-dm-sans mb-4">
        Recurring half-days limit how many periods are scheduled on a specific weekday.
        Rules apply every week the timetable runs — override per grade group or set school-wide.
      </p>

      {showForm && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-4">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">New Half-Day Rule</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Grade Group
              </label>
              <select
                value={form.gradeGroupId}
                onChange={e => handleGroupChange(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-navy/20 font-dm-sans bg-white">
                <option value="">All Grade Groups (school-wide)</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Day of Week
              </label>
              <select
                value={form.dayOfWeek}
                onChange={e => setForm(f => ({ ...f, dayOfWeek: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-navy/20 font-dm-sans bg-white">
                {DAYS.map(d => <option key={d} value={d}>{DAY_LABEL[d]}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Periods on This Day
              </label>
              <input
                type="number"
                min={1}
                max={form.gradeGroupId ? (groups.find(g => g.id === form.gradeGroupId)?.periodsPerDay ?? 8) : 8}
                value={form.periodsPerDay}
                onChange={e => setForm(f => ({ ...f, periodsPerDay: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-navy/20 font-dm-sans" />
              {form.gradeGroupId && (
                <p className="text-xs text-gray-400 mt-1">
                  Full day = {groups.find(g => g.id === form.gradeGroupId)?.periodsPerDay ?? '?'} periods
                </p>
              )}
            </div>

            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                  className={`w-10 h-5 rounded-full transition-colors relative ${form.isActive ? 'bg-teal' : 'bg-gray-200'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm font-dm-sans text-gray-600">Active</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 bg-gold text-navy font-sora font-semibold rounded-lg px-4 py-2 text-sm hover:bg-gold/90 transition-colors disabled:opacity-50">
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              {saving ? 'Saving…' : 'Save Rule'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-sm font-dm-sans text-gray-400 hover:text-gray-600 px-3 py-2">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : configs.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm font-dm-sans">
          No half-day rules configured. All days will use the full period count.
        </div>
      ) : (
        <div className="space-y-2">
          {configs.map(config => (
            <div key={config.id}
              className={`flex items-center justify-between rounded-lg border px-4 py-3 ${config.isActive ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggle(config)}
                  className={`w-8 h-4 rounded-full transition-colors relative flex-shrink-0 ${config.isActive ? 'bg-teal' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${config.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <div>
                  <span className="text-sm font-semibold text-gray-700 font-dm-sans">
                    {DAY_LABEL[config.dayOfWeek]}
                  </span>
                  <span className="mx-2 text-gray-300">·</span>
                  <span className="text-sm text-gray-500 font-dm-sans">{scopeLabel(config)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-dm-sans">
                  {config.periodsPerDay} periods
                </span>
                <button
                  onClick={() => handleDelete(config.id)}
                  disabled={deleting === config.id}
                  className="text-gray-300 hover:text-red-400 transition-colors">
                  {deleting === config.id
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

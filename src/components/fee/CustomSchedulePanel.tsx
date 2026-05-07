'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, X, Calendar } from 'lucide-react';
import { toast } from 'sonner';

type Installment = {
  id: string; name: string; percentage: string; dueDay: number; dueMonth: number; displayOrder: number;
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function CustomSchedulePanel({ planId, onReload }: { planId: string; onReload: () => void }) {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', percentage: '', dueDay: '1', dueMonth: '4' });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/fee/plans/${planId}/custom-schedule`);
      const data = await res.json().catch(() => null);
      setInstallments(data?.installments ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [planId]);

  async function add() {
    if (!form.name.trim() || !form.percentage) { toast.error('Name and percentage are required'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/fee/plans/${planId}/custom-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          percentage: Number(form.percentage),
          dueDay: Number(form.dueDay),
          dueMonth: Number(form.dueMonth),
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error ?? `Failed (${res.status})`);
        return;
      }
      toast.success('Installment added');
      setShowForm(false);
      setForm({ name: '', percentage: '', dueDay: '1', dueMonth: '4' });
      load();
      onReload();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/fee/plans/${planId}/custom-schedule/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      toast.error(errData.error ?? 'Failed');
      return;
    }
    toast.success('Removed');
    load();
    onReload();
  }

  const totalPct = installments.reduce((s, t) => s + Number(t.percentage), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h5 className="text-sm font-semibold text-navy">Custom Payment Schedule</h5>
          <p className="text-xs text-gray-400">Optional — overrides auto schedule</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs text-navy hover:text-navyMid font-medium"
        >
          <Plus size={13} /> Add
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
          <input
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
            placeholder="Installment name (e.g. Term 1, First Half)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500">% of total</label>
              <input
                type="number" min={1} max={100} step={0.01}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm mt-0.5"
                placeholder="50"
                value={form.percentage}
                onChange={(e) => setForm({ ...form, percentage: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500">Due Day</label>
              <input
                type="number" min={1} max={31}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm mt-0.5"
                value={form.dueDay}
                onChange={(e) => setForm({ ...form, dueDay: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500">Due Month</label>
              <select
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm mt-0.5 bg-white"
                value={form.dueMonth}
                onChange={(e) => setForm({ ...form, dueMonth: e.target.value })}
              >
                {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="text-xs text-gray-500"><X size={12} className="inline" /> Cancel</button>
            <button onClick={add} disabled={saving} className="bg-navy text-white text-xs px-3 py-1.5 rounded font-medium disabled:opacity-50">
              {saving ? '…' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-1">{[1,2].map(i => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}</div>
      ) : installments.length === 0 ? (
        <div className="text-center py-4">
          <Calendar size={20} className="mx-auto text-gray-300 mb-1" />
          <p className="text-xs text-gray-400">No custom schedule — using auto schedule based on frequency.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {installments.map((t) => (
            <div key={t.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-gray-50">
              <div>
                <span className="font-medium text-gray-800">{t.name}</span>
                <span className="ml-2 text-xs text-gray-400">
                  Due {t.dueDay} {MONTHS[t.dueMonth - 1]}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-navy">{Number(t.percentage)}%</span>
                <button onClick={() => remove(t.id)} className="text-gray-300 hover:text-red-500">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
          <div className={`border-t border-gray-100 pt-2 flex justify-between text-xs font-semibold px-2 ${totalPct === 100 ? 'text-green-600' : 'text-amber-600'}`}>
            <span>Total coverage</span>
            <span>{totalPct}% {totalPct !== 100 && '⚠ should be 100%'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

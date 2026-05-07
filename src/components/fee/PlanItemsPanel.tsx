'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

type FeeComponent = { id: string; name: string };
type PlanItem = {
  id: string; componentId: string; amount: string;
  frequency: string; displayOrder: number;
  includeForNewAdmission: boolean;
  component: FeeComponent;
};

const FREQ_LABELS: Record<string, string> = {
  ONE_TIME: 'One-time', ANNUAL: 'Annual', HALF_YEARLY: 'Half-yearly',
  QUARTERLY: 'Quarterly', BI_MONTHLY: 'Bi-monthly', MONTHLY: 'Monthly',
};

export default function PlanItemsPanel({ planId, onReload }: { planId: string; onReload: () => void }) {
  const [items, setItems] = useState<PlanItem[]>([]);
  const [components, setComponents] = useState<FeeComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ componentId: '', amount: '', frequency: 'ANNUAL', includeForNewAdmission: true });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [itemsRes, compsRes] = await Promise.all([
        fetch(`/api/fee/plans/${planId}/items`),
        fetch('/api/fee/components'),
      ]);
      const [itemsData, compsData] = await Promise.all([itemsRes.json(), compsRes.json()]);
      setItems(Array.isArray(itemsData) ? itemsData : (itemsData.data ?? []));
      setComponents(Array.isArray(compsData) ? compsData : (compsData.data ?? []));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [planId]);

  async function add() {
    if (!form.componentId || !form.amount) { toast.error('Select a component and enter amount'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/fee/plans/${planId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: Number(form.amount), includeForNewAdmission: form.includeForNewAdmission }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error ?? `Failed (${res.status})`);
        return;
      }
      toast.success('Line item added');
      setShowForm(false);
      setForm({ componentId: '', amount: '', frequency: 'ANNUAL', includeForNewAdmission: true });
      load();
      onReload();
    } finally {
      setSaving(false);
    }
  }

  async function toggleAdmission(id: string, current: boolean) {
    const res = await fetch(`/api/fee/plans/${planId}/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ includeForNewAdmission: !current }),
    });
    if (!res.ok) { toast.error('Failed to update'); return; }
    load();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/fee/plans/${planId}/items/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      toast.error(errData.error ?? 'Failed');
      return;
    }
    toast.success('Removed');
    load();
    onReload();
  }

  const usedIds = items.map((i) => i.componentId);
  const available = components.filter((c) => !usedIds.includes(c.id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-semibold text-navy">Fee Components</h5>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs text-navy hover:text-navyMid font-medium"
        >
          <Plus size={13} /> Add
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
          <select
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm bg-white"
            value={form.componentId}
            onChange={(e) => setForm({ ...form, componentId: e.target.value })}
          >
            <option value="">Select component…</option>
            {available.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex gap-2">
            <input
              className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-sm"
              type="number"
              placeholder="Amount per occurrence (₹)"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <select
              className="border border-gray-200 rounded px-2 py-1.5 text-sm bg-white"
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
            >
              <option value="ONE_TIME">One-time</option>
              <option value="ANNUAL">Annual</option>
              <option value="HALF_YEARLY">Half-yearly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="BI_MONTHLY">Bi-monthly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setForm({ ...form, includeForNewAdmission: !form.includeForNewAdmission })}
              className={`relative w-8 h-4 rounded-full transition-colors ${!form.includeForNewAdmission ? 'bg-coral' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${!form.includeForNewAdmission ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs text-gray-600">
              {form.includeForNewAdmission ? 'Charged from Year 1 (admission)' : 'Deferred — charge from Year 2'}
            </span>
          </label>

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
      ) : items.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">No components added yet.</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-gray-50 group">
              <div>
                <span className="font-medium text-gray-800">{item.component.name}</span>
                <span className="ml-2 text-xs text-gray-400">{FREQ_LABELS[item.frequency]}</span>
                {!item.includeForNewAdmission && (
                  <span className="ml-2 text-xs bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-1.5 py-0.5 font-medium">
                    from yr 2
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-navy text-xs">₹{Number(item.amount).toLocaleString('en-IN')}</span>
                <button
                  title={item.includeForNewAdmission ? 'Skip for New Admission' : 'Include for New Admission'}
                  onClick={() => toggleAdmission(item.id, item.includeForNewAdmission)}
                  className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${!item.includeForNewAdmission ? 'bg-coral' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${!item.includeForNewAdmission ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <button onClick={() => remove(item.id)} className="text-gray-300 hover:text-red-500">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
          <div className="border-t border-gray-100 pt-2 flex justify-between text-xs font-semibold text-navy px-2">
            <span>Total (per occurrence sum)</span>
            <span>₹{items.reduce((s, i) => s + Number(i.amount), 0).toLocaleString('en-IN')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

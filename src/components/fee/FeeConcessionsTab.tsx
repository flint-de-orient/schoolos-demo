'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Percent } from 'lucide-react';
import { toast } from 'sonner';

type Concession = {
  id: string; name: string; type: string; value: string;
  applicableTo: string; isStackable: boolean; maxAmount: string | null;
};

const TYPE_LABELS: Record<string, string> = { PERCENTAGE: 'Percentage', FIXED_AMOUNT: 'Fixed Amount' };
const APPLICABLE_LABELS: Record<string, string> = {
  ALL_COMPONENTS: 'All components',
  SPECIFIC_COMPONENTS: 'Specific components',
  TUITION_ONLY: 'Tuition only',
};

export default function FeeConcessionsTab() {
  const [concessions, setConcessions] = useState<Concession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Concession | null>(null);
  const [form, setForm] = useState({
    name: '', type: 'PERCENTAGE', value: '', applicableTo: 'ALL_COMPONENTS', isStackable: false, maxAmount: '',
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/fee/concessions');
      const data = await res.json();
      setConcessions(Array.isArray(data) ? data : (data.data ?? []));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm({ name: '', type: 'PERCENTAGE', value: '', applicableTo: 'ALL_COMPONENTS', isStackable: false, maxAmount: '' });
    setShowForm(true);
  }

  function openEdit(c: Concession) {
    setEditing(c);
    setForm({
      name: c.name, type: c.type, value: String(Number(c.value)),
      applicableTo: c.applicableTo, isStackable: c.isStackable,
      maxAmount: c.maxAmount ? String(Number(c.maxAmount)) : '',
    });
    setShowForm(true);
  }

  async function save() {
    if (!form.name.trim() || !form.value) { toast.error('Name and value are required'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        type: form.type,
        value: Number(form.value),
        applicableTo: form.applicableTo,
        isStackable: form.isStackable,
        maxAmount: form.maxAmount ? Number(form.maxAmount) : null,
      };
      const url = editing ? `/api/fee/concessions/${editing.id}` : '/api/fee/concessions';
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error ?? `Failed (${res.status})`);
        return;
      }
      toast.success(editing ? 'Concession updated' : 'Concession created');
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: Concession) {
    if (!confirm(`Delete "${c.name}"?`)) return;
    const res = await fetch(`/api/fee/concessions/${c.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      toast.error(errData.error ?? 'Failed');
      return;
    }
    toast.success('Deleted');
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold font-sora text-navy">Concession Templates</h3>
          <p className="text-sm text-gray-500">Define school-wide concession types (Merit, Staff Ward, Sibling, RTE, etc.) applied per student.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-gold text-navy font-semibold px-4 py-2 rounded-lg text-sm hover:bg-amber-400 transition-colors">
          <Plus size={16} /> New Concession
        </button>
      </div>

      {showForm && (
        <div className="bg-iceLight border border-ice rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-navy font-sora">{editing ? 'Edit Concession' : 'New Concession'}</h4>
            <button onClick={() => setShowForm(false)}><X size={18} className="text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Name *</label>
              <input
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Staff Ward Concession"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Type *</label>
              <select
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy/20"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Value * {form.type === 'PERCENTAGE' ? '(%)' : '(₹)'}
              </label>
              <input
                type="number" min={0}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder={form.type === 'PERCENTAGE' ? '50' : '5000'}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Applicable To</label>
              <select
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy/20"
                value={form.applicableTo}
                onChange={(e) => setForm({ ...form, applicableTo: e.target.value })}
              >
                <option value="ALL_COMPONENTS">All components</option>
                <option value="TUITION_ONLY">Tuition only</option>
                <option value="SPECIFIC_COMPONENTS">Specific components</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Max Cap (₹, optional)</label>
              <input
                type="number" min={0}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                value={form.maxAmount}
                onChange={(e) => setForm({ ...form, maxAmount: e.target.value })}
                placeholder="No cap"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer pt-5 col-span-2">
              <input type="checkbox" checked={form.isStackable} onChange={(e) => setForm({ ...form, isStackable: e.target.checked })} className="rounded" />
              <span className="text-sm text-gray-700">Stackable (can combine with other concessions)</span>
            </label>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button onClick={save} disabled={saving} className="bg-navy text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : concessions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Percent size={36} className="mx-auto mb-3 opacity-40" />
          <p>No concessions defined yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-gray-500">Type</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-gray-500">Value</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-gray-500">Applicable To</th>
                <th className="text-center px-4 py-3 text-xs uppercase tracking-wide text-gray-500">Stackable</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {concessions.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-navy">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{TYPE_LABELS[c.type] ?? c.type}</td>
                  <td className="px-4 py-3 font-semibold text-green">
                    {c.type === 'PERCENTAGE'
                      ? `${Number(c.value)}%`
                      : `₹${Number(c.value).toLocaleString('en-IN')}`}
                    {c.maxAmount && (
                      <span className="text-xs text-gray-400 ml-1">(max ₹{Number(c.maxAmount).toLocaleString('en-IN')})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{APPLICABLE_LABELS[c.applicableTo] ?? c.applicableTo}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${c.isStackable ? 'bg-green-500' : 'bg-gray-200'}`} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-navy rounded"><Pencil size={14} /></button>
                      <button onClick={() => remove(c)} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

type FeeComponent = {
  id: string;
  name: string;
  description: string | null;
  isOptional: boolean;
  isRefundable: boolean;
  displayOrder: number;
};

export default function FeeComponentsTab() {
  const [components, setComponents] = useState<FeeComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FeeComponent | null>(null);
  const [form, setForm] = useState({ name: '', description: '', isOptional: false, isRefundable: false });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/fee/components');
      const data = await res.json();
      setComponents(Array.isArray(data) ? data : (data.data ?? []));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm({ name: '', description: '', isOptional: false, isRefundable: false });
    setShowForm(true);
  }

  function openEdit(c: FeeComponent) {
    setEditing(c);
    setForm({ name: c.name, description: c.description ?? '', isOptional: c.isOptional, isRefundable: c.isRefundable });
    setShowForm(true);
  }

  async function save() {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const url = editing ? `/api/fee/components/${editing.id}` : '/api/fee/components';
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error ?? `Failed to save (${res.status})`);
        return;
      }
      toast.success(editing ? 'Component updated' : 'Component created');
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: FeeComponent) {
    if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/fee/components/${c.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      toast.error(errData.error ?? 'Failed to delete');
      return;
    }
    toast.success('Component deleted');
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold font-sora text-navy">Fee Components</h3>
          <p className="text-sm text-gray-500">Building blocks used across all fee plans (e.g. Tuition, Lab, Library).</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-gold text-navy font-semibold px-4 py-2 rounded-lg text-sm hover:bg-amber-400 transition-colors">
          <Plus size={16} /> Add Component
        </button>
      </div>

      {showForm && (
        <div className="bg-iceLight border border-ice rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-navy font-sora">{editing ? 'Edit Component' : 'New Component'}</h4>
            <button onClick={() => setShowForm(false)}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Component Name *</label>
              <input
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Tuition Fee"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Description</label>
              <input
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isOptional} onChange={(e) => setForm({ ...form, isOptional: e.target.checked })} className="rounded" />
              <span className="text-sm text-gray-700">Optional (student can waive)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isRefundable} onChange={(e) => setForm({ ...form, isRefundable: e.target.checked })} className="rounded" />
              <span className="text-sm text-gray-700">Refundable</span>
            </label>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
            <button onClick={save} disabled={saving} className="bg-navy text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-navyMid disabled:opacity-50">
              {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : components.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <RotateCcw size={36} className="mx-auto mb-3 opacity-40" />
          <p>No components yet. Add your first fee component.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-gray-500">Description</th>
                <th className="text-center px-4 py-3 text-xs uppercase tracking-wide text-gray-500">Optional</th>
                <th className="text-center px-4 py-3 text-xs uppercase tracking-wide text-gray-500">Refundable</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {components.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-navy">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.description ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${c.isOptional ? 'bg-amber-400' : 'bg-gray-200'}`} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${c.isRefundable ? 'bg-green-500' : 'bg-gray-200'}`} />
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

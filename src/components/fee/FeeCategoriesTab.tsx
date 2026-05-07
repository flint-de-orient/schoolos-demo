'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Tag } from 'lucide-react';
import { toast } from 'sonner';

type Category = { id: string; name: string; description: string | null };

export default function FeeCategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/fee/categories');
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : (data.data ?? []));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm({ name: '', description: '' });
    setShowForm(true);
  }

  function openEdit(c: Category) {
    setEditing(c);
    setForm({ name: c.name, description: c.description ?? '' });
    setShowForm(true);
  }

  async function save() {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const url = editing ? `/api/fee/categories/${editing.id}` : '/api/fee/categories';
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
      toast.success(editing ? 'Category updated' : 'Category created');
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: Category) {
    if (!confirm(`Delete "${c.name}"?`)) return;
    const res = await fetch(`/api/fee/categories/${c.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      toast.error(errData.error ?? 'Failed to delete');
      return;
    }
    toast.success('Category deleted');
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold font-sora text-navy">Student Categories</h3>
          <p className="text-sm text-gray-500">Define student types for fee differentiation (e.g. Day Scholar, Hostelier, Staff Ward).</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-gold text-navy font-semibold px-4 py-2 rounded-lg text-sm hover:bg-amber-400 transition-colors">
          <Plus size={16} /> Add Category
        </button>
      </div>

      {showForm && (
        <div className="bg-iceLight border border-ice rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-navy font-sora">{editing ? 'Edit Category' : 'New Category'}</h4>
            <button onClick={() => setShowForm(false)}><X size={18} className="text-gray-400" /></button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Category Name *</label>
              <input
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Day Scholar"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Description</label>
              <input
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional"
              />
            </div>
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
      ) : categories.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Tag size={36} className="mx-auto mb-3 opacity-40" />
          <p>No categories yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-gray-500">Description</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-navy">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.description ?? '—'}</td>
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

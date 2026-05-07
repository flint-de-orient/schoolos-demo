'use client';

import { useState, useEffect } from 'react';
import {
  Plus, Pencil, Trash2, X, ChevronDown, ChevronRight, Layers,
  IndianRupee, Calendar, Check, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAcademicYear } from '@/context/AcademicYearContext';
import PlanItemsPanel from './PlanItemsPanel';
import CustomSchedulePanel from './CustomSchedulePanel';

type Grade = { id: string; name: string };
type Category = { id: string; name: string };
type PlanItem = {
  id: string; componentId: string; amount: string; frequency: string;
  displayOrder: number;
  component: { id: string; name: string };
};
type CustomInstallment = { id: string; name: string; percentage: string; dueDay: number; dueMonth: number };
type Plan = {
  id: string; name: string; isActive: boolean; academicYearId: string;
  studentCategoryId: string | null;
  studentCategory: Category | null;
  grades: { id: string; gradeId: string; grade: Grade }[];
  items: PlanItem[];
  customSchedule: { installments: CustomInstallment[] } | null;
  _count: { assignments: number };
};

export default function FeePlansTab() {
  const { viewingYear } = useAcademicYear();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', studentCategoryId: '', gradeIds: [] as string[], isActive: true });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const yearId = viewingYear?.id;
      const [plansRes, gradesRes, catsRes] = await Promise.all([
        fetch(`/api/fee/plans${yearId ? `?academicYearId=${yearId}` : ''}`),
        fetch('/api/grades'),
        fetch('/api/fee/categories'),
      ]);
      const [plansData, gradesData, catsData] = await Promise.all([
        plansRes.json(), gradesRes.json(), catsRes.json(),
      ]);
      setPlans(Array.isArray(plansData) ? plansData : (plansData.data ?? []));
      setGrades(Array.isArray(gradesData) ? gradesData : (gradesData.data ?? []));
      setCategories(Array.isArray(catsData) ? catsData : (catsData.data ?? []));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [viewingYear?.id]);

  function openNew() {
    setEditing(null);
    setForm({ name: '', studentCategoryId: '', gradeIds: [], isActive: true });
    setShowForm(true);
  }

  function openEdit(p: Plan) {
    setEditing(p);
    setForm({
      name: p.name,
      studentCategoryId: p.studentCategoryId ?? '',
      gradeIds: p.grades.map((g) => g.gradeId),
      isActive: p.isActive,
    });
    setShowForm(true);
  }

  function toggleGrade(id: string) {
    setForm((f) => ({
      ...f,
      gradeIds: f.gradeIds.includes(id) ? f.gradeIds.filter((g) => g !== id) : [...f.gradeIds, id],
    }));
  }

  async function save() {
    if (!form.name.trim()) { toast.error('Plan name is required'); return; }
    if (!viewingYear?.id && !editing) { toast.error('Select an academic year first'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        academicYearId: viewingYear?.id,
        studentCategoryId: form.studentCategoryId || null,
        gradeIds: form.gradeIds,
        isActive: form.isActive,
      };
      const url = editing ? `/api/fee/plans/${editing.id}` : '/api/fee/plans';
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error ?? `Failed to save (${res.status})`);
        return;
      }
      toast.success(editing ? 'Plan updated' : 'Plan created');
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Plan) {
    if (p._count.assignments > 0) {
      toast.error(`Cannot delete — ${p._count.assignments} student(s) assigned`);
      return;
    }
    if (!confirm(`Delete plan "${p.name}"?`)) return;
    const res = await fetch(`/api/fee/plans/${p.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      toast.error(errData.error ?? 'Failed');
      return;
    }
    toast.success('Plan deleted');
    load();
  }

  const totalAnnual = (plan: Plan) =>
    plan.items.reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold font-sora text-navy">Fee Plans</h3>
          <p className="text-sm text-gray-500">Create plans per academic year. Each plan bundles components + a payment schedule.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-gold text-navy font-semibold px-4 py-2 rounded-lg text-sm hover:bg-amber-400 transition-colors">
          <Plus size={16} /> New Plan
        </button>
      </div>

      {showForm && (
        <div className="bg-iceLight border border-ice rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-navy font-sora">{editing ? 'Edit Plan' : 'New Fee Plan'}</h4>
            <button onClick={() => setShowForm(false)}><X size={18} className="text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Plan Name *</label>
              <input
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Class IX–X Standard Plan 2025-26"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Student Category (optional)</label>
              <select
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white"
                value={form.studentCategoryId}
                onChange={(e) => setForm({ ...form, studentCategoryId: e.target.value })}
              >
                <option value="">All students</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer pt-6">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              <span className="text-sm text-gray-700">Active (visible for assignments)</span>
            </label>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Applicable Grades</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {grades.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGrade(g.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      form.gradeIds.includes(g.id)
                        ? 'bg-navy text-white border-navy'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-navy'
                    }`}
                  >
                    {form.gradeIds.includes(g.id) && <Check size={10} className="inline mr-1" />}
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button onClick={save} disabled={saving} className="bg-navy text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : editing ? 'Update' : 'Create Plan'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Layers size={36} className="mx-auto mb-3 opacity-40" />
          <p>No plans for this year. Create your first fee plan.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {/* Plan header */}
              <div className="flex items-center gap-4 px-5 py-4">
                <button
                  onClick={() => setExpandedId(expandedId === plan.id ? null : plan.id)}
                  className="text-gray-400 hover:text-navy transition-colors"
                >
                  {expandedId === plan.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-navy font-sora">{plan.name}</span>
                    {plan.isActive
                      ? <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Active</span>
                      : <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">Inactive</span>
                    }
                    {plan.studentCategory && (
                      <span className="px-2 py-0.5 bg-iceLight text-navyMid text-xs rounded-full">{plan.studentCategory.name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <IndianRupee size={11} />
                      {totalAnnual(plan).toLocaleString('en-IN')} / year
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {plan.customSchedule?.installments?.length
                        ? `${plan.customSchedule.installments.length} custom installment${plan.customSchedule.installments.length !== 1 ? 's' : ''}`
                        : 'Auto schedule'}
                    </span>
                    <span>{plan.grades.map((g) => g.grade.name).join(', ') || 'No grades linked'}</span>
                    {plan._count.assignments > 0 && (
                      <span className="text-purple-600">{plan._count.assignments} students assigned</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(plan)} className="p-2 text-gray-400 hover:text-navy rounded-lg hover:bg-gray-50">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => remove(plan)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-50">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Expanded panel */}
              {expandedId === plan.id && (
                <div className="border-t border-gray-100 grid grid-cols-2 divide-x divide-gray-100">
                  <div className="p-4">
                    <PlanItemsPanel planId={plan.id} onReload={load} />
                  </div>
                  <div className="p-4">
                    <CustomSchedulePanel planId={plan.id} onReload={load} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

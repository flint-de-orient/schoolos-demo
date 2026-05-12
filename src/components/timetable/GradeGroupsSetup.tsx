'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Plus, Trash2, RefreshCw, ChevronDown, ChevronUp, Users,
  CheckCircle2, Settings2, Copy,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type GradeRef   = { id: string; name: string; displayOrder: number };
type GradeGroup = {
  id: string; name: string; displayOrder: number;
  periodsPerDay: number; periodDuration: number;
  shortBreakEnabled: boolean; shortBreakAfterPeriod: number | null; shortBreakDuration: number;
  mainBreakAfterPeriod: number; mainBreakDuration: number;
  fillerType: string;
  grades: GradeRef[];
};

const FILLER_OPTIONS = [
  { value: 'STUDY_PERIOD',      label: 'Study Period' },
  { value: 'REVISION',          label: 'Revision Class' },
  { value: 'REPEAT_COMPULSORY', label: 'Repeat Compulsory Subject' },
  { value: 'LEAVE_EMPTY',       label: 'Leave Empty' },
];

// ── Main Component ─────────────────────────────────────────────────────────────

export default function GradeGroupsSetup() {
  const [groups, setGroups]       = useState<GradeGroup[]>([]);
  const [allGrades, setAllGrades] = useState<(GradeRef & { gradeGroupId: string | null })[]>([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState<Set<string>>(new Set());
  const [saving, setSaving]       = useState<string | null>(null); // groupId being saved
  const [newName, setNewName]     = useState('');
  const [creating, setCreating]   = useState(false);

  // Local edit state per group (draft edits before save)
  const [drafts, setDrafts] = useState<Record<string, Partial<GradeGroup>>>({});

  function draft(id: string): Partial<GradeGroup> { return drafts[id] ?? {}; }
  function setDraft(id: string, patch: Partial<GradeGroup>) {
    setDrafts(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function merged(g: GradeGroup): GradeGroup {
    return { ...g, ...draft(g.id) };
  }

  // ── Load ───────────────────────────────────────────────────────────────────
  function load() {
    setLoading(true);
    fetch('/api/timetable/grade-groups')
      .then(r => r.json())
      .then(d => {
        setGroups(d.data?.groups ?? d.groups ?? []);
        setAllGrades(d.data?.allGrades ?? d.allGrades ?? []);
      })
      .catch(() => toast.error('Failed to load grade groups'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  // ── Create ─────────────────────────────────────────────────────────────────
  function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    fetch('/api/timetable/grade-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) { toast.error(d.error); return; }
        toast.success(`Group "${newName.trim()}" created`);
        setNewName('');
        load();
      })
      .catch(() => toast.error('Failed to create group'))
      .finally(() => setCreating(false));
  }

  // ── Save group ─────────────────────────────────────────────────────────────
  function handleSave(g: GradeGroup, applyToAll?: string[]) {
    setSaving(g.id);
    const m = merged(g);
    const gradeIds = (m.grades ?? g.grades).map(gr => gr.id);
    fetch(`/api/timetable/grade-groups/${g.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: m.name,
        periodsPerDay: m.periodsPerDay,
        periodDuration: m.periodDuration,
        shortBreakEnabled: m.shortBreakEnabled,
        shortBreakAfterPeriod: m.shortBreakEnabled ? m.shortBreakAfterPeriod : null,
        shortBreakDuration: m.shortBreakDuration,
        mainBreakAfterPeriod: m.mainBreakAfterPeriod,
        mainBreakDuration: m.mainBreakDuration,
        fillerType: m.fillerType,
        gradeIds,
        applyToAll,
      }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) { toast.error(d.error); return; }
        toast.success(`"${m.name}" saved${applyToAll?.length ? ' — applied to all groups' : ''}`);
        setDrafts(prev => { const n = { ...prev }; delete n[g.id]; return n; });
        load();
      })
      .catch(() => toast.error('Failed to save'))
      .finally(() => setSaving(null));
  }

  // ── Delete group ───────────────────────────────────────────────────────────
  function handleDelete(g: GradeGroup) {
    if (!confirm(`Delete group "${g.name}"? Grades in this group will be unassigned.`)) return;
    fetch(`/api/timetable/grade-groups/${g.id}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(d => {
        if (d.error) { toast.error(d.error); return; }
        toast.success(`Group "${g.name}" deleted`);
        load();
      })
      .catch(() => toast.error('Failed to delete'));
  }

  // ── Grade assignment helpers ────────────────────────────────────────────────
  function toggleGradeInGroup(groupId: string, gradeId: string, currentGrades: GradeRef[]) {
    const isIn = currentGrades.some(g => g.id === gradeId);
    const newGrades = isIn
      ? currentGrades.filter(g => g.id !== gradeId)
      : [...currentGrades, allGrades.find(g => g.id === gradeId)!].filter(Boolean);
    setDraft(groupId, { grades: newGrades as GradeRef[] });
  }

  if (loading) return (
    <div className="flex items-center gap-2 py-8 justify-center text-sm text-gray-400">
      <RefreshCw className="w-4 h-4 animate-spin" /> Loading grade groups…
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-sora font-semibold text-navy">Grade Groups</h3>
          <p className="text-xs text-gray-400 font-dm-sans mt-0.5">
            Groups define periods per day, period length, and break configuration for each level of classes.
          </p>
        </div>
      </div>

      {/* Unassigned grades notice */}
      {allGrades.filter(g => !g.gradeGroupId).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 font-dm-sans">
          <strong>Unassigned grades:</strong>{' '}
          {allGrades.filter(g => !g.gradeGroupId).map(g => g.name).join(', ')} — assign them to a group below.
        </div>
      )}

      {/* Group cards */}
      {groups.map(g => {
        const m = merged(g);
        const isOpen = expanded.has(g.id);
        const isDirty = Object.keys(draft(g.id)).length > 0;

        return (
          <div key={g.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Group header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 bg-gray-50/60">
              <button onClick={() => setExpanded(prev => {
                const n = new Set(prev);
                if (n.has(g.id)) n.delete(g.id); else n.add(g.id);
                return n;
              })} className="flex items-center gap-2 flex-1 text-left">
                {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                <span className="font-sora font-semibold text-sm text-navy">{m.name}</span>
                <span className="text-xs text-gray-400 font-dm-sans">
                  {m.periodsPerDay} periods · {m.periodDuration}min · {m.grades.length} grade{m.grades.length !== 1 ? 's' : ''}
                </span>
                {isDirty && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">Unsaved</span>}
              </button>
              <button onClick={() => handleDelete(g)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Expanded config */}
            {isOpen && (
              <div className="p-5 space-y-5">
                {/* Grades assignment */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                    <Users className="w-3 h-3 inline mr-1" />Grades in this group
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {allGrades.map(grade => {
                      const inGroup = (draft(g.id).grades ?? g.grades).some(gg => gg.id === grade.id);
                      const inOtherGroup = !inGroup && grade.gradeGroupId && grade.gradeGroupId !== g.id;
                      return (
                        <button key={grade.id}
                          disabled={!!inOtherGroup}
                          onClick={() => toggleGradeInGroup(g.id, grade.id, draft(g.id).grades ?? g.grades)}
                          title={inOtherGroup ? `In another group` : undefined}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${inGroup ? 'bg-navy text-white border-navy' : inOtherGroup ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-500 border-gray-200 hover:border-navy/30'}`}>
                          {grade.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  {/* Periods per day */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Periods Per Day</label>
                    <input type="number" min={1} max={16} value={m.periodsPerDay}
                      onChange={e => setDraft(g.id, { periodsPerDay: Number(e.target.value) })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy font-sora font-semibold focus:outline-none focus:ring-2 focus:ring-navy/20" />
                  </div>

                  {/* Period duration */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Period Duration (min)</label>
                    <div className="flex items-center gap-2">
                      <input type="number" min={15} max={90} value={m.periodDuration}
                        onChange={e => setDraft(g.id, { periodDuration: Number(e.target.value) })}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-navy/20" />
                      <button
                        onClick={() => handleSave(g, ['periodDuration'])}
                        title="Apply this duration to all groups"
                        className="p-2 text-gray-400 hover:text-navy border border-gray-200 rounded-lg hover:border-navy/30 transition-colors">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Copy icon → apply to all groups</p>
                  </div>

                  {/* Main break */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Main Break After Period</label>
                    <div className="flex gap-1 flex-wrap">
                      {Array.from({ length: m.periodsPerDay }, (_, i) => i + 1).map(p => (
                        <button key={p}
                          onClick={() => setDraft(g.id, { mainBreakAfterPeriod: p })}
                          className={`w-8 h-8 rounded-lg text-xs font-bold border transition-colors ${m.mainBreakAfterPeriod === p ? 'bg-gold text-navy border-gold' : 'bg-white text-gray-500 border-gray-200 hover:border-navy/30'}`}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Main break duration */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Main Break Duration (min)</label>
                    <div className="flex items-center gap-2">
                      <input type="number" min={5} max={90} value={m.mainBreakDuration}
                        onChange={e => setDraft(g.id, { mainBreakDuration: Number(e.target.value) })}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-navy/20" />
                      <button
                        onClick={() => handleSave(g, ['mainBreakAfterPeriod', 'mainBreakDuration'])}
                        title="Apply break config to all groups"
                        className="p-2 text-gray-400 hover:text-navy border border-gray-200 rounded-lg hover:border-navy/30 transition-colors">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Short break */}
                <div className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={m.shortBreakEnabled}
                        onChange={e => setDraft(g.id, { shortBreakEnabled: e.target.checked })}
                        className="w-4 h-4 accent-navy" />
                      <span className="text-sm font-semibold text-gray-700 font-dm-sans">Short Break (Optional)</span>
                    </label>
                    {m.shortBreakEnabled && (
                      <button
                        onClick={() => handleSave(g, ['shortBreakEnabled', 'shortBreakAfterPeriod', 'shortBreakDuration'])}
                        title="Apply short break config to all groups"
                        className="ml-auto p-1.5 text-gray-400 hover:text-navy border border-gray-200 rounded-lg hover:border-navy/30 transition-colors">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {m.shortBreakEnabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Short Break After Period</label>
                        <div className="flex gap-1 flex-wrap">
                          {Array.from({ length: m.periodsPerDay }, (_, i) => i + 1).map(p => (
                            <button key={p}
                              onClick={() => setDraft(g.id, { shortBreakAfterPeriod: p === m.shortBreakAfterPeriod ? null : p })}
                              className={`w-8 h-8 rounded-lg text-xs font-bold border transition-colors ${m.shortBreakAfterPeriod === p ? 'bg-gold text-navy border-gold' : 'bg-white text-gray-500 border-gray-200 hover:border-navy/30'}`}>
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Short Break Duration (min)</label>
                        <input type="number" min={5} max={30} value={m.shortBreakDuration}
                          onChange={e => setDraft(g.id, { shortBreakDuration: Number(e.target.value) })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-navy/20" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Filler type */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                    Empty Slot Filler
                  </label>
                  <div className="flex items-center gap-2">
                    <select value={m.fillerType}
                      onChange={e => setDraft(g.id, { fillerType: e.target.value })}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-navy/20 font-dm-sans">
                      {FILLER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <button
                      onClick={() => handleSave(g, ['fillerType'])}
                      title="Apply filler type to all groups"
                      className="p-2 text-gray-400 hover:text-navy border border-gray-200 rounded-lg hover:border-navy/30 transition-colors">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">What to show when all subjects are scheduled but slots remain</p>
                </div>

                {/* Save button */}
                <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleSave(g)}
                    disabled={saving === g.id}
                    className="flex items-center gap-2 bg-gold text-navy font-sora font-semibold rounded-xl px-5 py-2.5 hover:bg-gold/90 transition-colors disabled:opacity-50 text-sm">
                    {saving === g.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {saving === g.id ? 'Saving…' : 'Save Group'}
                  </button>
                  {isDirty && (
                    <button onClick={() => setDrafts(prev => { const n = { ...prev }; delete n[g.id]; return n; })}
                      className="text-xs text-gray-400 hover:text-gray-600 font-dm-sans underline">
                      Discard changes
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Create new group */}
      <div className="bg-white rounded-xl border border-dashed border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          <Settings2 className="w-3 h-3 inline mr-1" />Add New Group
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="e.g. Pre Primary, Primary, Middle School, High School…"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-navy/20 font-dm-sans" />
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || creating}
            className="flex items-center gap-2 bg-navy text-white font-semibold rounded-xl px-4 py-2 hover:bg-navyMid transition-colors disabled:opacity-50 text-sm">
            {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

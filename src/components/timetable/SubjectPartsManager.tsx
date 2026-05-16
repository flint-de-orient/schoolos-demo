'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { RefreshCw, ChevronDown, ChevronRight, Plus, X, BookOpen, Tag } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

type SubjectPart = {
  id: string;
  name: string;
  partLabel: string | null;
  colorHex: string | null;
  isSubPart: boolean;
  parentSubjectId: string | null;
  subjectCategory: string;
  _count: { teacherSubjects: number };
};

type Subject = {
  id: string;
  name: string;
  code: string | null;
  colorHex: string | null;
  isElective: boolean;
  isLanguage: boolean;
  isPractical: boolean;
  isSubPart: boolean;
  parentSubjectId: string | null;
  partLabel: string | null;
  subjectCategory: string;
  parts: SubjectPart[];
  _count: { teacherSubjects: number; timetableEntries: number };
};

const CAT_LABEL: Record<string, string> = {
  CORE: 'Core', LANGUAGE: 'Language', ELECTIVE: 'Elective',
  PRACTICAL: 'Practical', SPORTS: 'Sports / PE', ARTS: 'Arts',
  TECHNOLOGY: 'Technology', VALUE_EDUCATION: 'Value Education',
  REMEDIAL: 'Remedial', ENRICHMENT: 'Enrichment',
};

const CAT_COLOR: Record<string, string> = {
  CORE: 'bg-blue-600', LANGUAGE: 'bg-green-600', ELECTIVE: 'bg-purple-600',
  PRACTICAL: 'bg-teal-600', SPORTS: 'bg-orange-500', ARTS: 'bg-pink-600',
  TECHNOLOGY: 'bg-indigo-600', VALUE_EDUCATION: 'bg-amber-600',
  REMEDIAL: 'bg-red-600', ENRICHMENT: 'bg-yellow-500',
};

const CAT_BADGE: Record<string, string> = {
  CORE: 'bg-blue-50 text-blue-700 border-blue-200',
  LANGUAGE: 'bg-green-50 text-green-700 border-green-200',
  ELECTIVE: 'bg-purple-50 text-purple-700 border-purple-200',
  PRACTICAL: 'bg-teal-50 text-teal-700 border-teal-200',
  SPORTS: 'bg-orange-50 text-orange-700 border-orange-200',
  ARTS: 'bg-pink-50 text-pink-700 border-pink-200',
  TECHNOLOGY: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  VALUE_EDUCATION: 'bg-amber-50 text-amber-700 border-amber-200',
  REMEDIAL: 'bg-red-50 text-red-700 border-red-200',
  ENRICHMENT: 'bg-yellow-50 text-yellow-700 border-yellow-200',
};

// ── Single subject card ────────────────────────────────────────────────────────

function SubjectCard({ subject, onPartsChanged }: {
  subject: Subject;
  onPartsChanged: () => void;
}) {
  const [expanded, setExpanded]     = useState(false);
  const [addingPart, setAddingPart] = useState(false);
  const [partLabel, setPartLabel]   = useState('');
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState<string | null>(null);

  const hasParts = subject.parts.length > 0;
  const badgeClass = CAT_BADGE[subject.subjectCategory] ?? CAT_BADGE.CORE;

  async function handleAddPart() {
    const label = partLabel.trim();
    if (!label) return;
    setSaving(true);
    try {
      const res = await fetch('/api/hr/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${subject.name} — ${label}`,
          colorHex: subject.colorHex,
          isElective: subject.isElective,
          isLanguage: subject.isLanguage,
          isPractical: subject.isPractical,
          subjectCategory: subject.subjectCategory,
          parentSubjectId: subject.id,
          partLabel: label,
          isSubPart: true,
        }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      toast.success(`Part "${label}" added to ${subject.name}`);
      setPartLabel('');
      setAddingPart(false);
      onPartsChanged();
    } catch {
      toast.error('Failed to add part');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePart(part: SubjectPart) {
    setDeleting(part.id);
    try {
      const res = await fetch(`/api/hr/subjects/${part.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      toast.success(`Part "${part.partLabel ?? part.name}" removed`);
      onPartsChanged();
    } catch {
      toast.error('Failed to delete part');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50/60 transition-colors">
        <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          {expanded
            ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            : <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          }
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-800 font-dm-sans">{subject.name}</span>
              {subject.code && <span className="text-[10px] font-mono text-gray-400">{subject.code}</span>}
              <span className={`text-[9px] border px-1.5 py-0.5 rounded-full font-semibold ${badgeClass}`}>
                {CAT_LABEL[subject.subjectCategory] ?? subject.subjectCategory}
              </span>
              {subject._count.teacherSubjects > 0 && (
                <span className="text-[9px] bg-navy/5 text-navy px-1.5 py-0.5 rounded-full font-semibold">
                  {subject._count.teacherSubjects}T
                </span>
              )}
            </div>
            {hasParts && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                {subject.parts.length} part{subject.parts.length !== 1 ? 's' : ''}: {subject.parts.map(p => p.partLabel ?? p.name).join(' · ')}
              </p>
            )}
          </div>
        </button>

        <button onClick={() => { setExpanded(true); setAddingPart(a => !a); }}
          className="flex items-center gap-1 text-[10px] font-semibold text-navy/60 hover:text-navy border border-dashed border-navy/20 hover:border-navy/40 px-2 py-1 rounded-lg transition-colors whitespace-nowrap flex-shrink-0">
          <Plus className="w-3 h-3" /> Add Part
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/40 px-4 py-3 space-y-2">
          {subject.parts.length === 0 && !addingPart && (
            <p className="text-xs text-gray-400 italic font-dm-sans">
              No parts yet. Parts let you split this subject into separately schedulable components — e.g. Literature, Grammar.
            </p>
          )}

          {subject.parts.map(part => (
            <div key={part.id} className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg px-3 py-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: part.colorHex ?? subject.colorHex ?? '#1E2761' }} />
              <Tag className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-gray-700 font-dm-sans">
                  {part.partLabel ?? part.name}
                </span>
                <span className="text-[10px] text-gray-400 ml-2">{part.name}</span>
                {part._count.teacherSubjects > 0 && (
                  <span className="text-[10px] text-navy/50 ml-2">
                    {part._count.teacherSubjects} teacher{part._count.teacherSubjects !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button onClick={() => handleDeletePart(part)} disabled={deleting === part.id}
                className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0 disabled:opacity-40">
                {deleting === part.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
              </button>
            </div>
          ))}

          {addingPart && (
            <div className="flex items-center gap-2 bg-white border border-navy/10 rounded-lg px-3 py-2">
              <Tag className="w-3.5 h-3.5 text-navy/40 flex-shrink-0" />
              <input type="text" placeholder="Part label, e.g. Literature"
                value={partLabel} onChange={e => setPartLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddPart(); if (e.key === 'Escape') { setAddingPart(false); setPartLabel(''); } }}
                autoFocus
                className="flex-1 text-xs border-none outline-none bg-transparent font-dm-sans placeholder:text-gray-300" />
              {partLabel.trim() && (
                <span className="text-[9px] text-gray-300 whitespace-nowrap">
                  {subject.name} — {partLabel}
                </span>
              )}
              <button onClick={handleAddPart} disabled={!partLabel.trim() || saving}
                className="flex items-center gap-1 bg-navy text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg hover:bg-navyMid disabled:opacity-40 transition-colors">
                {saving ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Plus className="w-2.5 h-2.5" />}
                Add
              </button>
              <button onClick={() => { setAddingPart(false); setPartLabel(''); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {!addingPart && (
            <button onClick={() => setAddingPart(true)}
              className="text-[10px] text-navy/50 hover:text-navy font-semibold flex items-center gap-1 transition-colors">
              <Plus className="w-3 h-3" /> Add {hasParts ? 'another' : 'a'} part
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SubjectPartsManager() {
  const [subjects, setSubjects]   = useState<Subject[]>([]);
  const [loading, setLoading]     = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function loadSubjects() {
    setLoading(true);
    fetch('/api/hr/subjects')
      .then(r => r.json())
      .then(d => {
        const list: Subject[] = (d.data ?? d).subjects ?? [];
        setSubjects(list.filter(s => !s.isSubPart));
      })
      .catch(() => toast.error('Failed to load subjects'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadSubjects(); }, []);

  const byCategory = subjects.reduce<Record<string, Subject[]>>((acc, s) => {
    const cat = s.subjectCategory;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const categories = Object.keys(byCategory).sort();

  if (loading) return (
    <div className="flex items-center justify-center gap-3 py-8">
      <RefreshCw className="w-4 h-4 text-gray-300 animate-spin" />
      <span className="text-sm text-gray-400 font-dm-sans">Loading subjects…</span>
    </div>
  );

  if (subjects.length === 0) return (
    <div className="py-8 text-center">
      <BookOpen className="w-8 h-8 text-gray-200 mx-auto mb-2" />
      <p className="text-sm text-gray-400 font-dm-sans">No subjects found. Add subjects in HR first.</p>
    </div>
  );

  return (
    <div className="space-y-1">
      <div className="bg-navy/5 border border-navy/10 rounded-xl p-3 mb-4 flex items-start gap-2">
        <Tag className="w-4 h-4 text-navy mt-0.5 flex-shrink-0" />
        <p className="text-xs text-navy/80 font-dm-sans">
          Split any subject into independently schedulable <strong>parts</strong> — e.g. English into Literature, Grammar, Comprehension.
          Each part gets its own teacher assignments and timetable slots.
          Schools that treat subjects as single units can ignore this section.
        </p>
      </div>

      {categories.map(cat => {
        const catSubjects = byCategory[cat] ?? [];
        const isCollapsed = collapsed.has(cat);
        const headerBg = CAT_COLOR[cat] ?? 'bg-gray-600';
        const partsCount = catSubjects.reduce((s, sub) => s + sub.parts.length, 0);
        return (
          <div key={cat} className="rounded-xl border border-gray-100 overflow-hidden">
            <button
              onClick={() => setCollapsed(prev => {
                const next = new Set(prev);
                if (next.has(cat)) next.delete(cat); else next.add(cat);
                return next;
              })}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-white ${headerBg} hover:opacity-90 transition-opacity`}>
              <span className="text-sm font-sora font-semibold flex-1 text-left">
                {CAT_LABEL[cat] ?? cat}
              </span>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                {catSubjects.length} subject{catSubjects.length !== 1 ? 's' : ''}
              </span>
              {partsCount > 0 && (
                <span className="text-[10px] bg-white/30 px-2 py-0.5 rounded-full font-bold">
                  {partsCount} part{partsCount !== 1 ? 's' : ''}
                </span>
              )}
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {!isCollapsed && (
              <div className="p-2 space-y-1 bg-gray-50/30">
                {catSubjects.map(subject => (
                  <SubjectCard key={subject.id} subject={subject} onPartsChanged={loadSubjects} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

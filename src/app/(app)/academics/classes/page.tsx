'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus, ChevronDown, Users, BookOpen, ToggleLeft, ToggleRight,
  Pencil, Check, X, Layers, AlertCircle, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectionData {
  id: string;
  name: string;
  roomNumber: string | null;
  isActive: boolean;
  _count: { students: number };
}

interface GradeData {
  id: string;
  name: string;
  displayOrder: number;
  isExamClass: boolean;
  isActive: boolean;
  academicYearId: string;
  _count: { students: number };
  sections: SectionData[];
}

interface AcademicYear {
  id: string;
  label: string;
  isCurrent: boolean;
}

const CISCE_GRADES = [
  'Nursery', 'LKG', 'UKG',
  'Class I', 'Class II', 'Class III', 'Class IV',
  'Class V', 'Class VI', 'Class VII', 'Class VIII',
  'Class IX', 'Class X', 'Class XI', 'Class XII',
];

const EXAM_CLASSES = new Set(['Class X', 'Class XII']);

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ClassesPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [grades, setGrades] = useState<GradeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [addClassOpen, setAddClassOpen] = useState(false);

  // Load academic years once
  useEffect(() => {
    fetch('/api/academic-years')
      .then((r) => r.json())
      .then((data: AcademicYear[]) => {
        setYears(data);
        const current = data.find((y) => y.isCurrent) ?? data[0];
        if (current) setSelectedYearId(current.id);
      });
  }, []);

  const loadGrades = useCallback(() => {
    if (!selectedYearId) return;
    setLoading(true);
    fetch(`/api/grades?academicYearId=${selectedYearId}`)
      .then((r) => r.json())
      .then((data: GradeData[]) => { setGrades(data); setLoading(false); });
  }, [selectedYearId]);

  useEffect(() => { loadGrades(); }, [loadGrades]);

  const visibleGrades = showInactive ? grades : grades.filter((g) => g.isActive);

  async function toggleGrade(grade: GradeData) {
    const res = await fetch(`/api/grades/${grade.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !grade.isActive }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? 'Failed to update class'); return; }
    setGrades((prev) => prev.map((g) => g.id === grade.id ? { ...g, ...data } : g));
    toast.success(grade.isActive ? `${grade.name} deactivated` : `${grade.name} activated`);
  }

  function onGradeCreated(grade: GradeData) {
    setGrades((prev) => [...prev, grade].sort((a, b) => a.displayOrder - b.displayOrder));
    setAddClassOpen(false);
    toast.success(`${grade.name} added`);
  }

  function onSectionAdded(gradeId: string, section: SectionData) {
    setGrades((prev) => prev.map((g) =>
      g.id === gradeId ? { ...g, sections: [...g.sections, section].sort((a, b) => a.name.localeCompare(b.name)) } : g
    ));
  }

  function onSectionUpdated(gradeId: string, section: SectionData) {
    setGrades((prev) => prev.map((g) =>
      g.id === gradeId ? { ...g, sections: g.sections.map((s) => s.id === section.id ? section : s) } : g
    ));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple/10 flex items-center justify-center">
            <Layers className="w-5 h-5 text-purple" />
          </div>
          <div>
            <h1 className="font-sora font-bold text-2xl text-gray-900">Classes &amp; Sections</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage your school's class structure and sections</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadGrades}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-gray-700 text-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setAddClassOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-navy text-white rounded-xl text-sm font-semibold hover:bg-navyMid transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Class
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Year selector */}
        <div className="relative">
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-xl pl-4 pr-9 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:border-navy/30 cursor-pointer"
          >
            {years.map((y) => (
              <option key={y.id} value={y.id}>{y.label}{y.isCurrent ? ' (Current)' : ''}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Show inactive toggle */}
        <button
          onClick={() => setShowInactive((v) => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
            showInactive ? 'bg-amber/10 border-amber/30 text-amber' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700'
          }`}
        >
          {showInactive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          Show Inactive
        </button>

        <span className="text-sm text-gray-400 ml-auto">
          {visibleGrades.length} class{visibleGrades.length !== 1 ? 'es' : ''} · {visibleGrades.reduce((s, g) => s + g.sections.filter(sec => showInactive || sec.isActive).length, 0)} sections
        </span>
      </div>

      {/* Grade cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : visibleGrades.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Layers className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No classes yet</p>
          <p className="text-sm text-gray-400 mt-1">Click "Add Class" to create the first class for this academic year.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {visibleGrades.map((grade) => (
            <GradeCard
              key={grade.id}
              grade={grade}
              showInactive={showInactive}
              onToggle={() => toggleGrade(grade)}
              onSectionAdded={(s) => onSectionAdded(grade.id, s)}
              onSectionUpdated={(s) => onSectionUpdated(grade.id, s)}
            />
          ))}
        </div>
      )}

      {/* Add Class Dialog */}
      <AddClassDialog
        open={addClassOpen}
        onClose={() => setAddClassOpen(false)}
        academicYearId={selectedYearId}
        existingNames={new Set(grades.map((g) => g.name))}
        onCreated={onGradeCreated}
      />
    </div>
  );
}

// ─── Grade Card ────────────────────────────────────────────────────────────────

function GradeCard({
  grade, showInactive, onToggle, onSectionAdded, onSectionUpdated,
}: {
  grade: GradeData;
  showInactive: boolean;
  onToggle: () => void;
  onSectionAdded: (s: SectionData) => void;
  onSectionUpdated: (s: SectionData) => void;
}) {
  const [addingSection, setAddingSection] = useState(false);
  const [sectionName, setSectionName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [savingSection, setSavingSection] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const visibleSections = showInactive ? grade.sections : grade.sections.filter((s) => s.isActive);

  async function addSection() {
    if (!sectionName.trim()) return;
    setSavingSection(true);
    const res = await fetch(`/api/grades/${grade.id}/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: sectionName.trim(), roomNumber: roomNumber.trim() || undefined }),
    });
    const data = await res.json();
    setSavingSection(false);
    if (!res.ok) { toast.error(data.error ?? 'Failed to add section'); return; }
    onSectionAdded(data);
    setSectionName('');
    setRoomNumber('');
    setAddingSection(false);
    toast.success(`Section ${data.name} added to ${grade.name}`);
  }

  async function toggleSection(section: SectionData) {
    setTogglingId(section.id);
    const res = await fetch(`/api/grades/${grade.id}/sections/${section.id}`, {  // gradeId + sectionId
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !section.isActive }),
    });
    const data = await res.json();
    setTogglingId(null);
    if (!res.ok) { toast.error(data.error ?? 'Failed to update section'); return; }
    onSectionUpdated(data);
    toast.success(section.isActive ? `Section ${section.name} deactivated` : `Section ${section.name} activated`);
  }

  return (
    <div className={`bg-white rounded-2xl border shadow-sm transition-all ${grade.isActive ? 'border-gray-100' : 'border-amber/20 bg-amber/5'}`}>
      {/* Grade header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold font-sora ${
            grade.isActive ? 'bg-navy text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            {grade.name.replace('Class ', '').slice(0, 3)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`font-sora font-semibold text-base ${grade.isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                {grade.name}
              </h3>
              {grade.isExamClass && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-gold/20 text-amber rounded-full">BOARD EXAM</span>
              )}
              {!grade.isActive && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber/20 text-amber rounded-full">INACTIVE</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {grade._count.students} students</span>
              <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {grade.sections.filter(s => s.isActive).length} active section{grade.sections.filter(s => s.isActive).length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAddingSection(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-navy/5 text-navy hover:bg-navy/10 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Section
          </button>
          <button
            onClick={onToggle}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              grade.isActive
                ? 'bg-amber/10 text-amber hover:bg-amber/20'
                : 'bg-green/10 text-green hover:bg-green/20'
            }`}
          >
            {grade.isActive
              ? <><ToggleLeft className="w-3.5 h-3.5" /> Deactivate</>
              : <><ToggleRight className="w-3.5 h-3.5" /> Activate</>}
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="px-5 py-3">
        {visibleSections.length === 0 && !addingSection ? (
          <p className="text-xs text-gray-400 italic py-1">No sections yet — click "Add Section" to create one.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {visibleSections.map((section) => (
              <SectionChip
                key={section.id}
                section={section}
                toggling={togglingId === section.id}
                onToggle={() => toggleSection(section)}
              />
            ))}
          </div>
        )}

        {/* Add section inline form */}
        {addingSection && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <input
              autoFocus
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              placeholder="Section name (e.g. A)"
              className="w-32 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-navy/40"
              onKeyDown={(e) => e.key === 'Enter' && addSection()}
            />
            <input
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="Room no. (optional)"
              className="w-44 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-navy/40"
              onKeyDown={(e) => e.key === 'Enter' && addSection()}
            />
            <button
              onClick={addSection}
              disabled={savingSection || !sectionName.trim()}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-navy text-white hover:bg-navyMid disabled:opacity-50"
            >
              {savingSection ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save
            </button>
            <button
              onClick={() => { setAddingSection(false); setSectionName(''); setRoomNumber(''); }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section Chip ──────────────────────────────────────────────────────────────

function SectionChip({
  section, toggling, onToggle,
}: {
  section: SectionData;
  toggling: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`group flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all ${
      section.isActive
        ? 'bg-iceLight border-ice text-navy'
        : 'bg-gray-100 border-gray-200 text-gray-400'
    }`}>
      <span className="font-semibold font-sora">{section.name}</span>
      <span className="text-xs opacity-60">{section._count.students} students</span>
      {section.roomNumber && (
        <span className="text-xs opacity-50">· {section.roomNumber}</span>
      )}
      <button
        onClick={onToggle}
        disabled={toggling}
        title={section.isActive ? 'Deactivate section' : 'Activate section'}
        className={`opacity-0 group-hover:opacity-100 transition-opacity text-xs px-1.5 py-0.5 rounded ${
          section.isActive
            ? 'text-amber hover:bg-amber/10'
            : 'text-green hover:bg-green/10'
        }`}
      >
        {toggling
          ? <RefreshCw className="w-3 h-3 animate-spin" />
          : section.isActive
          ? <ToggleLeft className="w-3.5 h-3.5" />
          : <ToggleRight className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

// ─── Add Class Dialog ──────────────────────────────────────────────────────────

function AddClassDialog({
  open, onClose, academicYearId, existingNames, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  academicYearId: string;
  existingNames: Set<string>;
  onCreated: (g: GradeData) => void;
}) {
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  const [selected, setSelected] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [isExamClass, setIsExamClass] = useState(false);
  const [saving, setSaving] = useState(false);

  const available = CISCE_GRADES.filter((n) => !existingNames.has(n));

  async function handleCreate() {
    const name = mode === 'preset' ? selected : customName.trim();
    if (!name) return;
    setSaving(true);
    const res = await fetch('/api/grades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ academicYearId, name, isExamClass }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast.error(data.error ?? 'Failed to create class'); return; }
    onCreated(data);
    setSelected('');
    setCustomName('');
    setIsExamClass(false);
  }

  const selectedName = mode === 'preset' ? selected : customName.trim();
  const alreadyExists = existingNames.has(selectedName);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-sora">Add New Class</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Mode tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 text-sm font-medium">
            <button
              onClick={() => setMode('preset')}
              className={`flex-1 py-2 rounded-lg transition-colors ${mode === 'preset' ? 'bg-white shadow-sm text-navy' : 'text-gray-500'}`}
            >
              Standard (CISCE)
            </button>
            <button
              onClick={() => setMode('custom')}
              className={`flex-1 py-2 rounded-lg transition-colors ${mode === 'custom' ? 'bg-white shadow-sm text-navy' : 'text-gray-500'}`}
            >
              Custom Name
            </button>
          </div>

          {mode === 'preset' ? (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Select Class</label>
              {available.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-amber bg-amber/10 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  All standard CISCE classes have been added.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {available.map((name) => (
                    <button
                      key={name}
                      onClick={() => { setSelected(name); setIsExamClass(EXAM_CLASSES.has(name)); }}
                      className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                        selected === name
                          ? 'bg-navy text-white border-navy'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-navy/40'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Class Name</label>
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Pre-Primary, Foundation Year"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-navy/40"
              />
            </div>
          )}

          {/* Exam class toggle */}
          <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-700">Board Exam Class</p>
              <p className="text-xs text-gray-400 mt-0.5">Results will be included in board predictions</p>
            </div>
            <button
              onClick={() => setIsExamClass((v) => !v)}
              className={`w-11 h-6 rounded-full transition-colors relative ${isExamClass ? 'bg-gold' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${isExamClass ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          {alreadyExists && selectedName && (
            <div className="flex items-center gap-2 text-sm text-coral bg-coral/10 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              This class already exists for the selected academic year.
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !selectedName || alreadyExists}
              className="flex-1 py-2.5 rounded-xl bg-navy text-white text-sm font-semibold hover:bg-navyMid disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Creating…</> : <><Plus className="w-3.5 h-3.5" /> Add Class</>}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

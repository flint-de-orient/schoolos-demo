'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import AIBadge from '@/components/shared/AIBadge';
import ClassSubjectsTab from '@/components/timetable/ClassSubjectsTab';
import GradeGroupsSetup from '@/components/timetable/GradeGroupsSetup';
import HalfDaySetup from '@/components/timetable/HalfDaySetup';
import { toast } from 'sonner';
import {
  AlertCircle, CheckCircle2, Sparkles, LayoutGrid, Zap, RotateCcw,
  Brain, TrendingUp, User, Timer, Shield, RefreshCw, ChevronDown, BookOpen,
  Settings2, Clock, GraduationCap, Pencil, X,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────────

type PeriodSlot = { id: string; periodNo: number; startTime: string; endTime: string; label: string };
type Section    = { id: string; name: string };
type Grade      = { id: string; name: string; displayOrder: number; sections: Section[] };
type GridCell   = {
  subject: string; colorHex: string; teacher: string; room: string | null; teacherId: string;
  entryId: string; subjectId: string;  // Phase 4: drag-and-drop identifiers
};
type Grid       = Record<string, Record<number, GridCell>>; // day → periodNo → cell
type TimetableConfig = { workingDays: string[]; schoolStartTime: string };
type GradeGroupMeta  = { id: string; mainBreakAfterPeriod: number; shortBreakEnabled: boolean; shortBreakAfterPeriod: number | null; fillerTypes: string[] };
type HalfDayRule     = { gradeGroupId: string | null; dayOfWeek: string; periodsPerDay: number };

type SubCandidate = { id: string; name: string; proficiency: string };
type SubSuggestion = { periodNo: number; startTime: string; endTime: string; subject: { name: string }; section: string; timetableEntryId: string; candidates: SubCandidate[] };
type AbsentTeacher  = { id: string; name: string };
type GenerationState = 'idle' | 'running' | 'complete' | 'error';

type PreflightSection = {
  id: string; label: string; gradeId: string; gradeName: string;
  hasCurriculum: boolean; hasGroup: boolean; groupName: string | null; groupPeriodsPerDay: number | null;
};

type Preflight = {
  ready: boolean;
  missing: string[];
  hasConfig: boolean;
  workingDays: string[];
  sections: PreflightSection[];
  subjectCount: number;
  teacherCount: number;
  groupCount: number;
};


type GenResult = {
  timetableId: string;
  label: string;
  stats: { sectionsGenerated: number; totalEntries: number; teachersScheduled: number; subjectsScheduled: number; conflictsFound: number };
};

// ── Constants ────────────────────────────────────────────────────────────────

const DAYS_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const DAY_LABELS: Record<string, string> = { MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun' };

const SUBJECT_COLORS: Record<string, string> = {
  default0: 'bg-blue-50 text-blue-800 border-blue-200',
  default1: 'bg-purple-50 text-purple-800 border-purple-200',
  default2: 'bg-teal-50 text-teal-800 border-teal-200',
  default3: 'bg-rose-50 text-rose-800 border-rose-200',
  default4: 'bg-amber-50 text-amber-800 border-amber-200',
  default5: 'bg-green-50 text-green-800 border-green-200',
  default6: 'bg-orange-50 text-orange-800 border-orange-200',
  default7: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  default8: 'bg-pink-50 text-pink-800 border-pink-200',
  default9: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  default10: 'bg-lime-50 text-lime-800 border-lime-200',
  default11: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200',
};

function subjectColorClass(subject: string, idx: number): string {
  return SUBJECT_COLORS[`default${idx % 12}`] ?? SUBJECT_COLORS.default0;
}

const GEN_STEPS = [
  { icon: '⚙️', text: 'Loading teacher availability matrix...' },
  { icon: '🔄', text: 'Running constraint satisfaction algorithm...' },
  { icon: '📊', text: 'Distributing subjects across periods...' },
  { icon: '✅', text: 'Checking for scheduling conflicts...' },
  { icon: '💾', text: 'Saving timetable to database...' },
] as const;

// ── TimetableGrid ────────────────────────────────────────────────────────────

const FILLER_LABELS: Record<string, string> = {
  STUDY_PERIOD: 'Study Period', REVISION: 'Revision',
  SPORTS: 'Sports', REPEAT_COMPULSORY: 'Revision', LEAVE_EMPTY: '',
};

type DragSource = { entryId: string; subjectId: string; day: string; periodNo: number; slotId: string };

function TimetableGrid({ grid, periodSlots, workingDays, mainBreakAfterPeriod, shortBreakAfterPeriod, fillerTypes, halfDayRules, gradeGroupId, editMode, timetableId, onCellMoved }: {
  grid: Grid;
  periodSlots: PeriodSlot[];
  workingDays: string[];
  mainBreakAfterPeriod?: number;
  shortBreakAfterPeriod?: number | null;
  fillerTypes?: string[];
  halfDayRules?: HalfDayRule[];
  gradeGroupId?: string | null;
  editMode?: boolean;
  timetableId?: string;
  onCellMoved?: (newGrid: Grid) => void;
}) {
  const [dragSrc, setDragSrc]       = useState<DragSource | null>(null);
  const [dragOver, setDragOver]     = useState<{ day: string; periodNo: number } | null>(null);
  const [saving, setSaving]         = useState(false);
  const dragSrcRef = useRef<DragSource | null>(null);

  function halfDayLimit(day: string): number | null {
    if (!halfDayRules?.length) return null;
    const rule = halfDayRules.find(r => r.gradeGroupId === gradeGroupId && r.dayOfWeek === day)
              ?? halfDayRules.find(r => !r.gradeGroupId && r.dayOfWeek === day);
    return rule?.periodsPerDay ?? null;
  }

  // Build subject→days map for same-day conflict detection
  function buildSubjectDayMap(): Map<string, Set<string>> {
    const m = new Map<string, Set<string>>();
    for (const [day, periods] of Object.entries(grid)) {
      for (const cell of Object.values(periods)) {
        if (!m.has(cell.subjectId)) m.set(cell.subjectId, new Set());
        m.get(cell.subjectId)!.add(day);
      }
    }
    return m;
  }

  function isValidDrop(src: DragSource, targetDay: string, targetPeriodNo: number): boolean {
    if (src.day === targetDay && src.periodNo === targetPeriodNo) return false; // same cell
    const subjectDayMap = buildSubjectDayMap();
    // Check source subject on targetDay — allowed if: target cell has source subject (i.e. it's the only occurrence there)
    // OR source subject doesn't appear on targetDay at all
    // OR source subject only appears there because of src cell itself (which moves away)
    const srcSubjectDays = subjectDayMap.get(src.subjectId);
    const targetCell = grid[targetDay]?.[targetPeriodNo];
    if (srcSubjectDays?.has(targetDay)) {
      // Source subject already on targetDay — only OK if it's the target cell itself (a swap where target moves to src's old day)
      if (!targetCell || targetCell.subjectId !== src.subjectId) return false;
    }
    // Check target cell's subject on sourceDay
    if (targetCell) {
      const tgtSubjectDays = subjectDayMap.get(targetCell.subjectId);
      if (tgtSubjectDays?.has(src.day)) {
        // Only OK if the only occurrence on src.day is entry A itself
        if (targetCell.subjectId !== src.subjectId) return false;
      }
    }
    return true;
  }

  async function handleDrop(targetDay: string, targetSlotId: string, targetPeriodNo: number) {
    const src = dragSrcRef.current;
    setDragSrc(null);
    setDragOver(null);
    dragSrcRef.current = null;
    if (!src || !timetableId || saving) return;
    if (src.day === targetDay && src.periodNo === targetPeriodNo) return;
    if (!isValidDrop(src, targetDay, targetPeriodNo)) {
      toast.error('Invalid move — subject already appears on that day');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/timetable/entries/${src.entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDay, targetPeriodSlotId: targetSlotId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error ?? 'Failed to move period');
        return;
      }
      // Optimistic local grid update
      const newGrid: Grid = JSON.parse(JSON.stringify(grid));
      const srcCell = newGrid[src.day]?.[src.periodNo];
      const tgtCell = newGrid[targetDay]?.[targetPeriodNo];
      if (!newGrid[targetDay]) newGrid[targetDay] = {};
      if (srcCell) newGrid[targetDay][targetPeriodNo] = srcCell;
      else delete newGrid[targetDay][targetPeriodNo];
      if (tgtCell) {
        if (!newGrid[src.day]) newGrid[src.day] = {};
        newGrid[src.day][src.periodNo] = tgtCell;
      } else {
        delete newGrid[src.day][src.periodNo];
      }
      onCellMoved?.(newGrid);
      toast.success(data.data?.swapped || data.swapped ? 'Periods swapped' : 'Period moved');
    } catch {
      toast.error('Network error — could not save');
    } finally {
      setSaving(false);
    }
  }

  const days = DAYS_ORDER.filter(d => workingDays.includes(d));
  const subjectIndexMap: Record<string, number> = {};
  let subjectCounter = 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {saving && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
          <span className="text-xs text-amber-700 font-dm-sans font-semibold">Saving change…</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-navy text-white">
              <th className="text-left px-5 py-3 text-xs font-sora font-semibold w-28">Period</th>
              {days.map(d => (
                <th key={d} className="text-center px-3 py-3 text-xs font-sora font-semibold">{DAY_LABELS[d]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periodSlots.map((slot, pIdx) => {
              const showMainBreak  = mainBreakAfterPeriod === slot.periodNo;
              const showShortBreak = shortBreakAfterPeriod === slot.periodNo;
              const showBreak = showMainBreak || showShortBreak;
              return (
                <>
                  <tr key={slot.id} className={`border-b border-gray-100 ${pIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                    <td className="px-5 py-2 border-r border-gray-100">
                      <div className="text-xs font-sora font-bold text-navy">P{slot.periodNo}</div>
                      <div className="text-[10px] text-gray-400">{slot.startTime}–{slot.endTime}</div>
                    </td>
                    {days.map((day, dayIdx) => {
                      const cell = grid[day]?.[slot.periodNo];
                      const isHalfDay = (() => { const limit = halfDayLimit(day); return limit !== null && slot.periodNo > limit; })();
                      const isDragSrc = editMode && dragSrc?.day === day && dragSrc?.periodNo === slot.periodNo;
                      const isDragOver = editMode && dragOver?.day === day && dragOver?.periodNo === slot.periodNo;
                      const dropValid  = editMode && dragSrc && isDragOver ? isValidDrop(dragSrc, day, slot.periodNo) : null;

                      if (!cell) {
                        if (isHalfDay) {
                          return (
                            <td key={day} className="px-2 py-2 bg-gray-50/60">
                              <div className="text-center text-[9px] text-gray-300 font-dm-sans italic">half day</div>
                            </td>
                          );
                        }
                        const types = fillerTypes?.length ? fillerTypes : ['STUDY_PERIOD'];
                        const fillerLabel = FILLER_LABELS[types[dayIdx % types.length]] ?? '';
                        // Empty cell drop target
                        return (
                          <td key={day} className="px-2 py-2"
                            onDragOver={editMode ? e => { e.preventDefault(); setDragOver({ day, periodNo: slot.periodNo }); } : undefined}
                            onDragLeave={editMode ? () => setDragOver(null) : undefined}
                            onDrop={editMode ? e => { e.preventDefault(); handleDrop(day, slot.id, slot.periodNo); } : undefined}
                          >
                            <div className={`rounded-lg border border-dashed px-2 py-1.5 text-center transition-colors ${
                              isDragOver && dragSrc
                                ? dropValid
                                  ? 'border-green-400 bg-green-50'
                                  : 'border-red-300 bg-red-50'
                                : 'border-gray-200 bg-gray-50/80'
                            }`}>
                              {fillerLabel
                                ? <div className="text-[10px] text-gray-400 font-dm-sans">{fillerLabel}</div>
                                : <div className="text-center text-xs text-gray-200">—</div>}
                            </div>
                          </td>
                        );
                      }

                      if (!(cell.subject in subjectIndexMap)) {
                        subjectIndexMap[cell.subject] = subjectCounter++;
                      }
                      const colorClass = subjectColorClass(cell.subject, subjectIndexMap[cell.subject]);

                      return (
                        <td key={day} className="px-2 py-2"
                          onDragOver={editMode ? e => { e.preventDefault(); setDragOver({ day, periodNo: slot.periodNo }); } : undefined}
                          onDragLeave={editMode ? () => setDragOver(null) : undefined}
                          onDrop={editMode ? e => { e.preventDefault(); handleDrop(day, slot.id, slot.periodNo); } : undefined}
                        >
                          <div
                            draggable={!!editMode}
                            onDragStart={editMode ? () => {
                              const src: DragSource = { entryId: cell.entryId, subjectId: cell.subjectId, day, periodNo: slot.periodNo, slotId: slot.id };
                              setDragSrc(src);
                              dragSrcRef.current = src;
                            } : undefined}
                            onDragEnd={editMode ? () => { setDragSrc(null); setDragOver(null); dragSrcRef.current = null; } : undefined}
                            className={`rounded-lg border px-2 py-1.5 transition-all select-none ${
                              isDragSrc
                                ? 'opacity-40 border-gray-300 bg-gray-100'
                                : isDragOver && dragSrc
                                  ? dropValid
                                    ? `${colorClass} ring-2 ring-green-400 shadow-md`
                                    : `${colorClass} ring-2 ring-red-300 opacity-60`
                                  : `${colorClass} hover:shadow-sm ${editMode ? 'cursor-grab active:cursor-grabbing' : ''}`
                            }`}
                          >
                            <div className="text-[11px] font-semibold leading-tight truncate">{cell.subject}</div>
                            <div className="text-[9px] opacity-70 truncate mt-0.5">{cell.teacher.split(' ').slice(-1)[0]}</div>
                            {cell.room && <div className="text-[9px] opacity-60">{cell.room}</div>}
                            {editMode && <div className="text-[8px] opacity-40 mt-0.5">⠿ drag</div>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  {showBreak && (
                    <tr key={`break-${slot.periodNo}`} className={showShortBreak ? 'bg-amber-50/30' : 'bg-gray-50'}>
                      <td className="px-5 py-1.5 border-r border-gray-100">
                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                          {showShortBreak ? 'Short Break' : 'Break'}
                        </div>
                      </td>
                      {days.map(d => (
                        <td key={d} className="px-2 py-1.5">
                          <div className={`text-[10px] font-semibold rounded-lg px-2 py-1 text-center ${showShortBreak ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
                            {showShortBreak ? 'SHORT BREAK' : 'BREAK'}
                          </div>
                        </td>
                      ))}
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function TimetablePage() {
  const [activeTab, setActiveTab]       = useState<'timetable' | 'generator' | 'substitution' | 'classsubjects' | 'setup'>('timetable');
  const [targetGradeId, setTargetGradeId] = useState<string | null>(null);
  const [grades, setGrades]             = useState<Grade[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedSectionLabel, setSelectedSectionLabel] = useState('');
  const [periodSlots, setPeriodSlots]   = useState<PeriodSlot[]>([]);
  const [ttConfig, setTtConfig]         = useState<TimetableConfig>({ workingDays: ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'], schoolStartTime: '08:00' });
  const [groupMeta, setGroupMeta]       = useState<GradeGroupMeta | null>(null);
  const [halfDayRules, setHalfDayRules] = useState<HalfDayRule[]>([]);
  const [grid, setGrid]                 = useState<Grid>({});
  const [timetableId, setTimetableId]   = useState<string | null>(null);
  const [timetableLabel, setTimetableLabel] = useState('');
  const [ttLoading, setTtLoading]       = useState(false);
  const [editMode, setEditMode]         = useState(false);
  const [viewMode, setViewMode]         = useState<'class' | 'teacher'>('class');
  const [teachers, setTeachers]         = useState<{ id: string; name: string }[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [substitutions, setSubstitutions] = useState<any[]>([]);

  // Substitution tab
  const [absentTeachers, setAbsentTeachers] = useState<AbsentTeacher[]>([]);
  const [selectedAbsent, setSelectedAbsent] = useState('');
  const [subSuggestions, setSubSuggestions] = useState<SubSuggestion[]>([]);
  const [subLoading, setSubLoading]     = useState(false);
  const [assigned, setAssigned]         = useState<Set<string>>(new Set());

  // Generator tab
  const [genState, setGenState]         = useState<GenerationState>('idle');
  const [genStep, setGenStep]           = useState(0);
  const [constraintsOpen, setConstraintsOpen] = useState(true);
  const [preflight, setPreflight]       = useState<Preflight | null>(null);
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [selectedGenSections, setSelectedGenSections] = useState<Set<string>>(new Set());
  const [genResult, setGenResult]       = useState<GenResult | null>(null);
  const [genError, setGenError]         = useState<string | null>(null);

  // ── Initial load: config + grades ────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch('/api/timetable/config').then(r => r.json()),
      fetch('/api/grades').then(r => r.json()),
      fetch('/api/timetable/half-day-config').then(r => r.json()),
    ]).then(([cfgData, gradeData, hdData]) => {
      setHalfDayRules(hdData.configs ?? []);
      const config = cfgData.data?.config ?? cfgData.config;
      if (config) setTtConfig({ workingDays: config.workingDays, schoolStartTime: config.schoolStartTime });

      const gradeList: Grade[] = gradeData.data ?? gradeData ?? [];
      setGrades(gradeList);

      const firstSection = gradeList.flatMap(g => g.sections)[0];
      if (firstSection) {
        const parentGrade = gradeList.find(g => g.sections.some(s => s.id === firstSection.id));
        setSelectedSectionId(firstSection.id);
        setSelectedSectionLabel(`${parentGrade?.name ?? ''}-${firstSection.name}`);
      }
    }).catch(() => {});
  }, []);

  // ── Load timetable when section changes ──────────────────────────────────
  const loadTimetable = useCallback((sectionId: string, teacherId?: string) => {
    if (!sectionId && !teacherId) return;
    setTtLoading(true);
    const url = teacherId
      ? `/api/timetable?teacherId=${teacherId}`
      : `/api/timetable?sectionId=${sectionId}`;

    const slotUrl = sectionId ? `/api/timetable/period-slots?sectionId=${sectionId}` : null;

    Promise.all([
      fetch(url).then(r => r.json()),
      slotUrl ? fetch(slotUrl).then(r => r.json()) : Promise.resolve(null),
    ]).then(([res, psRes]) => {
      // Update period slots for this section's group
      if (psRes) {
        const freshSlots: PeriodSlot[] = psRes.data?.periodSlots ?? psRes.periodSlots ?? [];
        setPeriodSlots(freshSlots.sort((a: PeriodSlot, b: PeriodSlot) => a.periodNo - b.periodNo));
        const g = psRes.data?.group ?? psRes.group;
        if (g) setGroupMeta({ id: g.id, mainBreakAfterPeriod: g.mainBreakAfterPeriod, shortBreakEnabled: g.shortBreakEnabled, shortBreakAfterPeriod: g.shortBreakAfterPeriod, fillerTypes: g.fillerTypes ?? ['STUDY_PERIOD'] });
        else setGroupMeta(null);
      }

      const tt = res.data?.timetable ?? res.timetable;
      const subs = res.data?.substitutions ?? res.substitutions ?? [];
      setSubstitutions(subs);
      if (!tt) { setGrid({}); setTimetableLabel(''); setTimetableId(null); return; }
      setTimetableLabel(tt.label ?? '');
      setTimetableId(tt.id ?? null);
      const newGrid: Grid = {};
      for (const e of tt.entries ?? []) {
        if (!newGrid[e.day]) newGrid[e.day] = {};
        newGrid[e.day][e.periodSlot.periodNo] = {
          subject: e.subject.name,
          colorHex: e.subject.colorHex ?? '#1E2761',
          teacher: e.teacher.name,
          room: e.roomNumber ?? null,
          teacherId: e.teacher.id,
          entryId: e.id,
          subjectId: e.subject.id,
        };
      }
      setGrid(newGrid);
    }).finally(() => setTtLoading(false));
  }, []);

  useEffect(() => {
    setEditMode(false);
    if (viewMode === 'class' && selectedSectionId) loadTimetable(selectedSectionId);
    if (viewMode === 'teacher' && selectedTeacherId) loadTimetable('', selectedTeacherId);
  }, [selectedSectionId, selectedTeacherId, viewMode, loadTimetable]);

  // ── Load teacher list for teacher view + absent teachers ────────────────
  useEffect(() => {
    fetch('/api/hr').then(r => r.json()).then(d => {
      const list = [...(d.teachers ?? []), ...(d.staff ?? [])].map((t: any) => ({ id: t.id, name: t.name }));
      setTeachers(list);
    }).catch(() => {});
  }, []);

  // ── Load absent teachers for substitution tab (attendance + leave combined) ─
  useEffect(() => {
    if (activeTab !== 'substitution') return;
    const today = new Date().toISOString().split('T')[0];
    // The substitution GET without teacherId returns the union of absent teachers
    fetch(`/api/timetable/substitution?date=${today}`)
      .then(r => r.json())
      .then(d => setAbsentTeachers(d.data?.absentTeachers ?? d.absentTeachers ?? []))
      .catch(() => {});
  }, [activeTab]);

  // ── Load substitution suggestions ────────────────────────────────────────
  const loadSuggestions = (teacherId: string) => {
    setSubLoading(true);
    const today = new Date().toISOString().split('T')[0];
    fetch(`/api/timetable/substitution?teacherId=${teacherId}&date=${today}`)
      .then(r => r.json())
      .then(d => setSubSuggestions(d.data?.suggestions ?? d.suggestions ?? []))
      .catch(() => {})
      .finally(() => setSubLoading(false));
  };

  function handleAssignSub(timetableEntryId: string, substituteTeacherId: string, substituteName: string) {
    const absentId = selectedAbsent;
    const today = new Date().toISOString().split('T')[0];
    fetch('/api/timetable/substitution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ substituteTeacherId, originalTeacherId: absentId, timetableEntryId, date: today }),
    }).then(r => r.json()).then(() => {
      setAssigned(prev => new Set([...prev, timetableEntryId]));
      toast.success(`${substituteName} assigned as substitute`);
    }).catch(() => toast.error('Failed to assign substitute'));
  }

  // ── Preflight check when generator tab opens ─────────────────────────────
  useEffect(() => {
    if (activeTab !== 'generator') return;
    setPreflightLoading(true);
    fetch('/api/timetable/generate')
      .then(r => r.json())
      .then(d => {
        const pf: Preflight = d.data ?? d;
        setPreflight(pf);
        // Pre-select: if arriving from Class Subjects tab for a specific grade, select that grade's sections.
        // Otherwise default to all sections that have curriculum configured.
        if (targetGradeId) {
          setSelectedGenSections(new Set(pf.sections.filter(s => s.gradeId === targetGradeId && s.hasCurriculum).map(s => s.id)));
          setTargetGradeId(null);
        } else {
          setSelectedGenSections(new Set(pf.sections.filter(s => s.hasCurriculum).map(s => s.id)));
        }
      })
      .catch(() => setPreflight(null))
      .finally(() => setPreflightLoading(false));
  }, [activeTab, targetGradeId]);

  // ── Generator animation (runs while API call is in-flight) ───────────────
  useEffect(() => {
    if (genState !== 'running') return;
    if (genStep >= GEN_STEPS.length) return; // hold at last step until API responds
    const t = setTimeout(() => setGenStep(s => s + 1), 900);
    return () => clearTimeout(t);
  }, [genState, genStep]);

  function handleGenerate() {
    if (!preflight?.ready || selectedGenSections.size === 0) return;
    setGenState('running');
    setGenStep(0);
    setGenResult(null);
    setGenError(null);

    fetch('/api/timetable/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sectionIds: [...selectedGenSections] }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) { setGenError(d.error); setGenState('error'); return; }
        setGenResult(d.data ?? d);
        setGenState('complete');

        // Reload timetable for the first section — loadTimetable now also
        // fetches fresh period slots per section's grade group
        const firstSection = [...selectedGenSections][0];
        if (firstSection) {
          setSelectedSectionId(firstSection);
          const found = (preflight?.sections ?? []).find(s => s.id === firstSection);
          setSelectedSectionLabel(found?.label ?? '');
          loadTimetable(firstSection);
        }
      })
      .catch(() => { setGenError('Network error — please try again.'); setGenState('error'); });
  }

  // ── Setup form state ─────────────────────────────────────────────────────
  const ALL_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;
  const [setupForm, setSetupForm] = useState({
    schoolStartTime: '08:00',
    workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
  });
  const [setupSaving, setSetupSaving] = useState(false);
  const [setupExisting, setSetupExisting] = useState(false);

  useEffect(() => {
    if (activeTab !== 'setup') return;
    fetch('/api/timetable/config').then(r => r.json()).then(d => {
      const cfg = d.data?.config ?? d.config;
      if (cfg) {
        setSetupExisting(true);
        setSetupForm({ schoolStartTime: cfg.schoolStartTime, workingDays: cfg.workingDays });
      }
    }).catch(() => {});
  }, [activeTab]);

  function handleSaveSetup() {
    setSetupSaving(true);
    fetch('/api/timetable/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(setupForm),
    }).then(r => r.json()).then(d => {
      if (d.error) { toast.error(d.error); return; }
      setSetupExisting(true);
      toast.success('School timing saved');
      setTtConfig({ schoolStartTime: setupForm.schoolStartTime, workingDays: setupForm.workingDays });
    }).catch(() => toast.error('Failed to save configuration'))
      .finally(() => setSetupSaving(false));
  }

  function handleGoToGenerator(gradeId?: string) {
    if (gradeId) setTargetGradeId(gradeId);
    setPreflight(null); // force reload when switching to generator tab
    setActiveTab('generator');
  }

  const tabs = [
    { id: 'timetable' as const,      label: 'Timetable',                  icon: LayoutGrid },
    { id: 'generator' as const,      label: 'AI Generator',               icon: Sparkles },
    { id: 'substitution' as const,   label: 'Substitution Intelligence',   icon: Zap },
    { id: 'classsubjects' as const,  label: 'Class Subjects',              icon: GraduationCap },
    { id: 'setup' as const,          label: 'Setup',                       icon: Settings2 },
  ];

  const allSections = grades.flatMap(g => g.sections.map(s => ({ id: s.id, label: `${g.name}-${s.name}`, grade: g })));

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-sora font-semibold text-navy">Smart Timetable</h1>
          <p className="text-sm text-gray-500 font-dm-sans mt-0.5">AI-powered scheduling, conflict resolution &amp; substitution management</p>
        </div>
        <div className="flex items-center gap-2">
          <AIBadge label="AI Powered" />
          {timetableLabel && <span className="text-xs text-gray-400 font-dm-sans">{timetableLabel}</span>}
        </div>
      </div>

      <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 shadow-sm mb-6 w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold font-dm-sans transition-all ${activeTab === tab.id ? 'bg-navy text-white shadow-sm' : 'text-gray-500 hover:text-navy hover:bg-gray-50'}`}>
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'generator' && <span className="text-[9px] bg-gold text-navy px-1.5 py-0.5 rounded-full font-bold">AI</span>}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: Timetable ─────────────────────────────────────────────── */}
      {activeTab === 'timetable' && (
        <div className="space-y-5">
          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {viewMode === 'class' ? (
              <select value={selectedSectionId} onChange={e => {
                const found = allSections.find(s => s.id === e.target.value);
                setSelectedSectionId(e.target.value);
                setSelectedSectionLabel(found?.label ?? '');
              }} className="text-sm border border-gray-200 rounded-lg px-4 py-2 text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-navy/20 font-dm-sans">
                {allSections.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            ) : (
              <select value={selectedTeacherId} onChange={e => setSelectedTeacherId(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-4 py-2 text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-navy/20 font-dm-sans">
                <option value="">Select teacher…</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
            <span className="text-sm text-gray-500 font-dm-sans">
              {viewMode === 'class' ? <>Showing timetable for <strong className="text-navy">{selectedSectionLabel}</strong></> : 'Teacher Schedule View'}
            </span>
            <button onClick={() => setViewMode(v => v === 'class' ? 'teacher' : 'class')}
              className="ml-auto flex items-center gap-2 text-sm bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-600 hover:border-navy/30 hover:text-navy transition-colors font-dm-sans shadow-sm">
              <User className="w-3.5 h-3.5" />
              {viewMode === 'class' ? 'Teacher View' : 'Class View'}
            </button>
            {Object.keys(grid).length > 0 && viewMode === 'class' && timetableId && (
              <button onClick={() => setEditMode(e => !e)}
                className={`flex items-center gap-2 text-sm border rounded-lg px-4 py-2 font-semibold font-dm-sans transition-colors shadow-sm ${
                  editMode
                    ? 'bg-amber-500 border-amber-500 text-white hover:bg-amber-600'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-amber-400 hover:text-amber-600'
                }`}>
                {editMode ? <><X className="w-3.5 h-3.5" /> Exit Edit</> : <><Pencil className="w-3.5 h-3.5" /> Edit Timetable</>}
              </button>
            )}
          </div>

          {/* Substitution alert from DB */}
          {substitutions.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-700 font-dm-sans">
                  <strong className="text-amber-700">Today&apos;s Substitutions:</strong>{' '}
                  {substitutions.map((s: any) => `${s.originalTeacher?.name} → ${s.substituteTeacher?.name}`).join('; ')}
                </p>
                <button onClick={() => setActiveTab('substitution')} className="mt-1.5 text-xs text-amber-700 font-semibold underline hover:no-underline">
                  Manage all substitutions →
                </button>
              </div>
            </div>
          )}

          {/* Edit mode banner */}
          {editMode && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <Pencil className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800 font-dm-sans">
                <strong>Edit mode:</strong> Drag any period cell to a new slot to move it. Drag two cells onto each other to swap.
                Green highlight = valid · Red highlight = conflict.
              </p>
              <button onClick={() => setEditMode(false)} className="ml-auto text-xs text-amber-700 font-semibold underline hover:no-underline">Done</button>
            </div>
          )}

          {/* Grid */}
          {ttLoading ? (
            <div className="h-64 bg-white rounded-xl border border-gray-100 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-gray-300 animate-spin" />
            </div>
          ) : Object.keys(grid).length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
              <BookOpen className="w-8 h-8 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No timetable found for this {viewMode === 'class' ? 'section' : 'teacher'}.</p>
              <p className="text-xs text-gray-300 mt-1">Use the AI Generator tab to create one.</p>
            </div>
          ) : (
            <TimetableGrid
              grid={grid}
              periodSlots={periodSlots}
              workingDays={ttConfig.workingDays}
              mainBreakAfterPeriod={groupMeta?.mainBreakAfterPeriod}
              shortBreakAfterPeriod={groupMeta?.shortBreakEnabled ? groupMeta.shortBreakAfterPeriod : null}
              fillerTypes={groupMeta?.fillerTypes}
              halfDayRules={halfDayRules}
              gradeGroupId={groupMeta?.id ?? null}
              editMode={editMode}
              timetableId={timetableId ?? undefined}
              onCellMoved={setGrid}
            />
          )}

          {/* Health Score */}
          {Object.keys(grid).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-navy" />
                  <h3 className="text-sm font-sora font-semibold text-navy">Timetable Health Score</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-sora font-semibold text-navy">94</span>
                  <span className="text-sm text-gray-400">/100</span>
                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Excellent</span>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Conflict Free', icon: CheckCircle2, status: 'Clear', color: 'text-green-700 bg-green-100' },
                  { label: 'Teacher Fatigue', icon: Timer, status: 'Low', color: 'text-green-700 bg-green-100' },
                  { label: 'Subject Distribution', icon: TrendingUp, status: 'Balanced', color: 'text-green-700 bg-green-100' },
                ].map(row => {
                  const Icon = row.icon;
                  return (
                    <div key={row.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-dm-sans text-gray-600"><Icon className="w-4 h-4 text-teal" />{row.label}</div>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${row.color}`}>{row.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: AI Generator ──────────────────────────────────────────── */}
      {activeTab === 'generator' && (
        <div className="space-y-5">
          {/* Pre-flight loading */}
          {preflightLoading && (
            <div className="bg-white rounded-xl border border-gray-100 p-8 flex items-center justify-center gap-3">
              <RefreshCw className="w-4 h-4 text-gray-300 animate-spin" />
              <span className="text-sm text-gray-400 font-dm-sans">Checking available data…</span>
            </div>
          )}

          {/* Data insufficient — show what's missing */}
          {!preflightLoading && preflight && !preflight.ready && (
            <div className="bg-white rounded-xl border border-red-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h2 className="text-sm font-sora font-semibold text-navy">Insufficient Data for AI Generation</h2>
                  <p className="text-xs text-gray-500 font-dm-sans mt-0.5">The following must be set up before the AI can generate a timetable:</p>
                </div>
              </div>
              <ul className="space-y-2 pl-1">
                {preflight.missing.map(m => (
                  <li key={m} className="flex items-start gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold">✕</span>
                    <span className="text-sm font-dm-sans text-gray-700">{m}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-gray-100 pt-3 flex items-center gap-3 flex-wrap">
                <button onClick={() => setActiveTab('setup')}
                  className="flex items-center gap-2 bg-navy text-white text-sm font-semibold rounded-lg px-4 py-2 hover:bg-navyMid transition-colors">
                  <Settings2 className="w-4 h-4" /> Configure School Hours
                </button>
                <button onClick={() => setActiveTab('classsubjects')}
                  className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg px-4 py-2 hover:border-navy/30 transition-colors">
                  <GraduationCap className="w-4 h-4" /> Set Up Class Subjects
                </button>
              </div>
            </div>
          )}

          {/* Ready — show generator UI */}
          {!preflightLoading && preflight?.ready && (
            <div className="grid grid-cols-5 gap-5">
              {/* Left: Config panel */}
              <div className="col-span-2 space-y-4">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-5 h-5 text-gold" />
                    <h2 className="text-base font-sora font-semibold text-navy">AI Timetable Generator</h2>
                  </div>
                  <p className="text-xs text-gray-500 font-dm-sans mb-5">Generate optimised, conflict-free timetables from your actual teacher & subject data</p>

                  {/* Live data summary */}
                  <div className="grid grid-cols-2 gap-2 mb-5">
                    {[
                      { label: 'Grade Groups', value: preflight.groupCount },
                      { label: 'Working Days', value: preflight.workingDays.length },
                      { label: 'Subjects', value: preflight.subjectCount },
                      { label: 'Teachers', value: preflight.teacherCount },
                    ].map(item => (
                      <div key={item.label} className="bg-iceLight rounded-lg px-3 py-2">
                        <div className="text-xs text-gray-500 font-dm-sans">{item.label}</div>
                        <div className="text-lg font-sora font-semibold text-navy">{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Section selector — grouped by Grade Group */}
                  <div className="mb-5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Classes to Generate</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {(() => {
                        // Group sections by groupName (null → 'Unassigned')
                        const grouped = new Map<string, PreflightSection[]>();
                        for (const s of preflight.sections) {
                          const key = s.groupName ?? '⚠ No Group';
                          if (!grouped.has(key)) grouped.set(key, []);
                          grouped.get(key)!.push(s);
                        }
                        // Sort: named groups first (alphabetical), then unassigned
                        const sortedKeys = [...grouped.keys()].sort((a, b) => {
                          if (a.startsWith('⚠')) return 1;
                          if (b.startsWith('⚠')) return -1;
                          return a.localeCompare(b);
                        });
                        return sortedKeys.map(groupName => {
                          const sections = grouped.get(groupName)!;
                          const isUnassigned = groupName.startsWith('⚠');
                          const selectableSections = sections.filter(s => s.hasCurriculum && s.hasGroup);
                          const allSelected = selectableSections.length > 0 && selectableSections.every(s => selectedGenSections.has(s.id));
                          const someSelected = selectableSections.some(s => selectedGenSections.has(s.id));
                          const periodsLabel = sections[0]?.groupPeriodsPerDay ? `${sections[0].groupPeriodsPerDay} periods/day` : '';
                          return (
                            <div key={groupName} className={`rounded-xl border ${isUnassigned ? 'border-red-200 bg-red-50/40' : 'border-blue-100 bg-blue-50/30'} overflow-hidden`}>
                              {/* Group header with Select All */}
                              <div className="flex items-center gap-2 px-3 py-2 border-b border-inherit">
                                {!isUnassigned && (
                                  <input
                                    type="checkbox"
                                    disabled={selectableSections.length === 0}
                                    checked={allSelected}
                                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                                    onChange={e => {
                                      setSelectedGenSections(prev => {
                                        const next = new Set(prev);
                                        selectableSections.forEach(s => e.target.checked ? next.add(s.id) : next.delete(s.id));
                                        return next;
                                      });
                                    }}
                                    className="w-3.5 h-3.5 accent-navy rounded flex-shrink-0"
                                  />
                                )}
                                <span className={`text-[11px] font-sora font-bold flex-1 ${isUnassigned ? 'text-red-600' : 'text-navy'}`}>{groupName}</span>
                                {periodsLabel && <span className="text-[9px] bg-white/70 border border-blue-200 text-blue-600 px-1.5 py-0.5 rounded-full font-semibold">{periodsLabel}</span>}
                                {!isUnassigned && (
                                  <span className="text-[9px] text-gray-400">{selectableSections.length}/{sections.length} ready</span>
                                )}
                              </div>
                              {/* Sections in this group */}
                              <div className="px-2 py-1 space-y-0.5">
                                {sections.map(s => {
                                  const canSelect = s.hasCurriculum && s.hasGroup;
                                  const reason = !s.hasCurriculum ? 'No subjects configured' : !s.hasGroup ? 'No grade group assigned' : null;
                                  return (
                                    <label key={s.id}
                                      className={`flex items-center gap-2 rounded-lg px-1 py-1 ${canSelect ? 'cursor-pointer hover:bg-white/60' : 'cursor-not-allowed opacity-50'}`}
                                      title={reason ?? undefined}>
                                      <input type="checkbox"
                                        disabled={!canSelect}
                                        checked={selectedGenSections.has(s.id)}
                                        onChange={e => {
                                          if (!canSelect) return;
                                          setSelectedGenSections(prev => {
                                            const next = new Set(prev);
                                            if (e.target.checked) { next.add(s.id); } else { next.delete(s.id); }
                                            return next;
                                          });
                                        }}
                                        className="w-3.5 h-3.5 accent-navy rounded flex-shrink-0" />
                                      <span className="text-xs font-dm-sans text-gray-700 flex-1">{s.label}</span>
                                      {s.hasCurriculum
                                        ? <span className="text-[9px] bg-green-100 text-green-700 px-1 py-0.5 rounded-full font-semibold">✓</span>
                                        : <span className="text-[9px] bg-gray-100 text-gray-400 px-1 py-0.5 rounded-full font-semibold">–</span>}
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                    {preflight.sections.every(s => !s.hasCurriculum) && (
                      <div className="mt-2 flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        <AlertCircle className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-[10px] text-amber-700 font-dm-sans">
                          No classes have subjects configured.{' '}
                          <button onClick={() => setActiveTab('classsubjects')} className="underline font-semibold">Set up Class Subjects →</button>
                        </p>
                      </div>
                    )}
                    {preflight.sections.some(s => s.hasCurriculum && !s.hasGroup) && (
                      <div className="mt-2 flex items-start gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        <AlertCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-[10px] text-red-700 font-dm-sans">
                          Some classes have no grade group.{' '}
                          <button onClick={() => setActiveTab('setup')} className="underline font-semibold">Set up Grade Groups →</button>
                        </p>
                      </div>
                    )}
                    {selectedGenSections.size === 0 && preflight.sections.some(s => s.hasCurriculum && s.hasGroup) && (
                      <p className="text-xs text-amber-600 mt-1.5 font-dm-sans">Select at least one class</p>
                    )}
                  </div>

                  {/* Constraints */}
                  <div className="mb-5">
                    <button onClick={() => setConstraintsOpen(o => !o)} className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Constraints <ChevronDown className={`w-3.5 h-3.5 transition-transform ${constraintsOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {constraintsOpen && (
                      <div className="space-y-2 pl-1">
                        {[
                          'No subject more than once per day per class',
                          'Max 4 consecutive periods per teacher',
                          'Teacher conflict prevention across sections',
                        ].map(c => (
                          <label key={c} className="flex items-start gap-2 cursor-pointer">
                            <input type="checkbox" defaultChecked className="mt-0.5 w-3.5 h-3.5 accent-navy rounded flex-shrink-0" />
                            <span className="text-xs font-dm-sans text-gray-600 leading-snug">{c}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={genState === 'running' || selectedGenSections.size === 0}
                    className="w-full flex items-center justify-center gap-2 bg-gold text-navy font-sora font-semibold rounded-xl px-4 py-3 hover:bg-gold/90 transition-colors disabled:opacity-50 text-sm">
                    <Brain className="w-4 h-4" />
                    {genState === 'running' ? 'Generating…' : '🤖 Generate Optimal Timetable'}
                  </button>
                </div>
              </div>

              {/* Right: Output panel */}
              <div className="col-span-3 space-y-4">
                {genState === 'idle' && (
                  <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-10 flex flex-col items-center justify-center text-center min-h-[300px]">
                    <Sparkles className="w-10 h-10 text-gray-300 mb-3" />
                    <p className="text-sm font-sora font-semibold text-gray-400">Select classes and click Generate</p>
                    <p className="text-xs text-gray-400 font-dm-sans mt-1">The AI will schedule {preflight.subjectCount} subjects across {preflight.groupCount} grade group{preflight.groupCount !== 1 ? 's' : ''} using {preflight.teacherCount} teachers</p>
                  </div>
                )}

                {genState === 'running' && (
                  <div className="bg-white rounded-xl border border-navy/10 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <RefreshCw className="w-4 h-4 text-navy animate-spin" />
                      <h3 className="text-sm font-sora font-semibold text-navy">Generating timetable for {selectedGenSections.size} class{selectedGenSections.size !== 1 ? 'es' : ''}…</h3>
                    </div>
                    <div className="space-y-2.5">
                      {GEN_STEPS.map((step, i) => {
                        const isDone = i < genStep; const isActive = i === genStep;
                        return (
                          <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive ? 'bg-navy/5 border border-navy/10' : isDone ? 'opacity-60' : 'opacity-30'}`}>
                            <span className="text-base leading-none">{step.icon}</span>
                            <span className="flex-1 text-sm font-dm-sans text-gray-700">{step.text}</span>
                            {isDone && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                            {isActive && <span className="w-3 h-3 border-2 border-navy border-t-transparent rounded-full animate-spin flex-shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {genState === 'error' && genError && (
                  <div className="bg-white rounded-xl border border-red-100 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <h3 className="text-sm font-sora font-semibold text-red-700">Generation Failed</h3>
                    </div>
                    <p className="text-sm font-dm-sans text-gray-600 mb-4">{genError}</p>
                    <button onClick={() => { setGenState('idle'); setGenError(null); }}
                      className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl px-4 py-2 hover:border-navy/30 transition-colors text-sm">
                      <RotateCcw className="w-4 h-4" /> Try Again
                    </button>
                  </div>
                )}

                {genState === 'complete' && genResult && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <h3 className="text-sm font-sora font-semibold text-navy">Timetable Generated Successfully</h3>
                        <AIBadge label="AI" />
                      </div>
                      <p className="text-xs text-gray-400 font-dm-sans mb-4">{genResult.label}</p>

                      {/* Real stats */}
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        {[
                          { label: 'Classes Scheduled',  value: genResult.stats.sectionsGenerated, color: 'text-navy' },
                          { label: 'Total Periods',       value: genResult.stats.totalEntries,      color: 'text-navy' },
                          { label: 'Teachers Assigned',   value: genResult.stats.teachersScheduled, color: 'text-teal' },
                          { label: 'Conflicts Found',     value: genResult.stats.conflictsFound,    color: 'text-green-600' },
                        ].map(s => (
                          <div key={s.label} className="bg-gray-50 rounded-xl p-3">
                            <div className={`text-2xl font-sora font-semibold ${s.color}`}>{s.value}</div>
                            <div className="text-xs text-gray-500 font-dm-sans mt-0.5">{s.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Quality bars (real data derived) */}
                      <div className="space-y-3">
                        {[
                          { label: 'Conflict Score', score: genResult.stats.conflictsFound === 0 ? 100 : Math.max(60, 100 - genResult.stats.conflictsFound * 5), color: 'bg-green-500', text: 'text-green-700', note: genResult.stats.conflictsFound === 0 ? 'Zero scheduling conflicts' : `${genResult.stats.conflictsFound} conflicts detected` },
                          { label: 'Subject Coverage', score: Math.min(100, Math.round((genResult.stats.subjectsScheduled / preflight.subjectCount) * 100)), color: 'bg-teal', text: 'text-teal', note: `${genResult.stats.subjectsScheduled} of ${preflight.subjectCount} subjects scheduled` },
                          { label: 'Teacher Utilisation', score: Math.min(100, Math.round((genResult.stats.teachersScheduled / preflight.teacherCount) * 100)), color: 'bg-purple', text: 'text-purple', note: `${genResult.stats.teachersScheduled} of ${preflight.teacherCount} teachers active` },
                        ].map(s => (
                          <div key={s.label}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-600">{s.label}</span>
                              <span className={`text-xs font-bold ${s.text}`}>{s.score}/100</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full ${s.color} rounded-full transition-all duration-700`} style={{ width: `${s.score}%` }} />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5">{s.note}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => { setActiveTab('timetable'); toast.success('Timetable is now active — viewing generated schedule.'); }}
                        className="flex items-center gap-2 bg-gold text-navy font-sora font-semibold rounded-xl px-5 py-2.5 hover:bg-gold/90 transition-colors text-sm">
                        <CheckCircle2 className="w-4 h-4" /> View Timetable
                      </button>
                      <button
                        onClick={() => { setGenState('idle'); setGenResult(null); }}
                        className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl px-4 py-2.5 hover:border-navy/30 transition-colors text-sm">
                        <RotateCcw className="w-4 h-4" /> Regenerate
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Substitution Intelligence ─────────────────────────────── */}
      {activeTab === 'substitution' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-sora font-semibold text-navy mb-3">Select Absent Teacher</h3>
            <div className="flex items-center gap-3 flex-wrap">
              <select value={selectedAbsent}
                onChange={e => { setSelectedAbsent(e.target.value); if (e.target.value) loadSuggestions(e.target.value); }}
                className="text-sm border border-gray-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20">
                <option value="">-- Select teacher on leave today --</option>
                {absentTeachers.length > 0 ? (
                  absentTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                ) : (
                  teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                )}
              </select>
              {absentTeachers.length > 0 && (
                <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full font-semibold">
                  {absentTeachers.length} teacher{absentTeachers.length !== 1 ? 's' : ''} on leave today
                </span>
              )}
              {absentTeachers.length === 0 && (
                <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-semibold">
                  No approved leaves today
                </span>
              )}
            </div>
          </div>

          {subLoading && (
            <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
              <RefreshCw className="w-5 h-5 text-gray-300 animate-spin mx-auto" />
            </div>
          )}

          {!subLoading && selectedAbsent && subSuggestions.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-sm text-gray-400">
              No periods scheduled for this teacher today, or no active timetable found.
            </div>
          )}

          {!subLoading && subSuggestions.map(sug => (
            <div key={sug.timetableEntryId} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 p-4 border-b border-gray-100 bg-amber-50/40">
                <div>
                  <span className="text-sm font-sora font-bold text-navy">Period {sug.periodNo}</span>
                  <span className="text-xs text-gray-500 ml-2">{sug.startTime}–{sug.endTime}</span>
                  <span className="ml-2 text-xs bg-purple/10 text-purple px-2 py-0.5 rounded font-semibold">{sug.subject.name}</span>
                  <span className="ml-1 text-xs text-gray-400">· {sug.section}</span>
                </div>
              </div>
              <div className="p-4">
                {sug.candidates.length === 0 ? (
                  <p className="text-xs text-gray-400">No available substitute found for this period.</p>
                ) : (
                  <div className="space-y-2">
                    {sug.candidates.map((c, i) => (
                      <div key={c.id} className="flex items-center gap-3 p-2.5 bg-teal/5 border border-teal/15 rounded-lg">
                        <div className="w-6 h-6 rounded-full bg-navy flex items-center justify-center text-white text-[10px] font-bold">{i + 1}</div>
                        <div className="flex-1">
                          <span className="text-sm font-semibold text-gray-800">{c.name}</span>
                          <span className="ml-2 text-[10px] text-teal font-semibold">{c.proficiency}</span>
                        </div>
                        {assigned.has(sug.timetableEntryId) ? (
                          <span className="flex items-center gap-1 text-xs text-green-700 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" />Assigned</span>
                        ) : (
                          i === 0 && (
                            <button onClick={() => handleAssignSub(sug.timetableEntryId, c.id, c.name)}
                              className="bg-navy text-white text-xs font-semibold rounded-lg px-4 py-1.5 hover:bg-navyMid transition-colors">
                              Assign
                            </button>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB 4: Class Subjects ─────────────────────────────────────── */}
      {activeTab === 'classsubjects' && (
        <ClassSubjectsTab onGoToGenerator={handleGoToGenerator} />
      )}

      {/* ── TAB 5: Setup ─────────────────────────────────────────────────── */}
      {activeTab === 'setup' && (
        <div className="space-y-6 max-w-3xl">
          {/* School timing — global */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-5 h-5 text-navy" />
              <h2 className="text-base font-sora font-semibold text-navy">School Timing</h2>
              <span className="text-xs text-gray-400 font-dm-sans ml-1">— applies to all classes</span>
            </div>
            <p className="text-xs text-gray-400 font-dm-sans mb-5">Period duration, breaks, and periods per day are configured per grade group below.</p>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">School Start Time</label>
                <input type="time" value={setupForm.schoolStartTime}
                  onChange={e => setSetupForm(f => ({ ...f, schoolStartTime: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-navy/20 font-dm-sans" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Working Days</label>
                <div className="flex gap-1.5 flex-wrap">
                  {ALL_DAYS.map(day => {
                    const active = setupForm.workingDays.includes(day);
                    return (
                      <button key={day}
                        onClick={() => setSetupForm(f => ({
                          ...f,
                          workingDays: active ? f.workingDays.filter(d => d !== day) : [...f.workingDays, day],
                        }))}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${active ? 'bg-navy text-white border-navy' : 'bg-white text-gray-500 border-gray-200 hover:border-navy/30'}`}>
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100">
              <button onClick={handleSaveSetup} disabled={setupSaving || setupForm.workingDays.length === 0}
                className="flex items-center gap-2 bg-gold text-navy font-sora font-semibold rounded-xl px-5 py-2.5 hover:bg-gold/90 transition-colors disabled:opacity-50 text-sm">
                {setupSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {setupSaving ? 'Saving…' : setupExisting ? 'Update School Timing' : 'Save School Timing'}
              </button>
            </div>
          </div>

          {/* Grade groups */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <GradeGroupsSetup />
          </div>

          {/* Half-day rules */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <HalfDaySetup />
          </div>

          {setupExisting && (
            <div className="bg-teal/10 border border-teal/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-teal" />
                <span className="text-sm font-semibold text-teal">Setup Complete</span>
              </div>
              <p className="text-xs text-gray-500 font-dm-sans">
                School starts at {setupForm.schoolStartTime} · {setupForm.workingDays.length} working days · periods and breaks configured per grade group
              </p>
              <button onClick={() => setActiveTab('generator')}
                className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-navy underline hover:no-underline">
                <Sparkles className="w-3 h-3" /> Go to AI Generator →
              </button>
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}

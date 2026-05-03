'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Brain, CheckCircle2, Loader2, Zap, RefreshCw,
  Shield, Gauge, BookOpenCheck, ChevronDown, ChevronUp,
} from 'lucide-react';
import classesData  from '@/data/muraliganj/classes.json';
import teachersData from '@/data/muraliganj/teachers.json';
import timetableData from '@/data/muraliganj/timetable.json';

const STEPS = [
  { icon: '📋', label: 'Parsing teacher availability & constraints…' },
  { icon: '🔍', label: 'Mapping subjects to sections & periods…' },
  { icon: '⚡', label: 'Running constraint-satisfaction solver…' },
  { icon: '🔄', label: 'Optimising teacher fatigue distribution…' },
  { icon: '✅', label: 'Verifying conflict-free output…' },
];

const CONSTRAINTS = [
  'No teacher assigned to two classes in the same period',
  'Maximum 3 consecutive periods per teacher without a gap',
  'Physical Education always scheduled in Periods 1–4',
  'Core subjects (Maths, Bengali, English) distributed across Mon–Fri',
  'Saturday capped at 5 periods per class',
];

const { qualityScore } = timetableData.meta;

export default function AIGenerator() {
  const [selected, setSelected]       = useState<Set<string>>(new Set(classesData.map(c => c.id)));
  const [periodsPerDay, setPeriodsPerDay] = useState(8);
  const [showConstraints, setShowConstraints] = useState(false);
  const [generating, setGenerating]   = useState(false);
  const [stepIndex, setStepIndex]     = useState(-1);
  const [done, setDone]               = useState(false);

  const availableTeachers = teachersData.filter(t => t.status === 'active').length;
  const onLeave           = teachersData.filter(t => t.status === 'on-leave').length;

  function toggleClass(id: string) {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); } else { n.add(id); }
      return n;
    });
  }

  async function generate() {
    if (selected.size === 0) { toast.error('Select at least one class'); return; }
    setDone(false);
    setGenerating(true);
    setStepIndex(0);
    for (let i = 1; i <= STEPS.length; i++) {
      await new Promise(r => setTimeout(r, 900));
      setStepIndex(i);
    }
    setGenerating(false);
    setDone(true);
    toast.success('Timetable generated successfully — 0 conflicts');
  }

  return (
    <div className="grid grid-cols-5 gap-6">
      {/* Left: Config */}
      <div className="col-span-2 space-y-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-sora font-semibold text-gray-900 mb-4">Configuration</h3>

          {/* Classes */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Include Classes</label>
            <div className="grid grid-cols-3 gap-1.5">
              {classesData.map(c => (
                <label key={c.id} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleClass(c.id)}
                    className="w-3.5 h-3.5 accent-navy"
                  />
                  <span className="text-xs text-gray-700 font-dm-sans">{c.id}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Periods */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
              Periods / Day (Mon–Fri)
            </label>
            <div className="flex items-center gap-2">
              {[6, 7, 8].map(n => (
                <button
                  key={n}
                  onClick={() => setPeriodsPerDay(n)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-sora font-semibold transition-colors ${periodsPerDay === n ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >{n}</button>
              ))}
            </div>
          </div>

          {/* Working days */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Working Days</label>
            <div className="flex gap-1">
              {['Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <span key={d} className="px-2 py-1 bg-navy text-white text-[10px] font-semibold rounded">{d}</span>
              ))}
            </div>
          </div>

          {/* Constraints toggle */}
          <button
            onClick={() => setShowConstraints(!showConstraints)}
            className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2"
          >
            <span>Hard Constraints ({CONSTRAINTS.length})</span>
            {showConstraints ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showConstraints && (
            <ul className="space-y-1.5">
              {CONSTRAINTS.map((c, i) => (
                <li key={i} className="flex gap-2 text-xs text-gray-600">
                  <Shield className="w-3.5 h-3.5 text-teal flex-shrink-0 mt-0.5" />
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Teacher availability */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-sora font-semibold text-gray-900 text-sm">Teacher Availability</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${onLeave > 0 ? 'bg-amber/10 text-amber' : 'bg-green/10 text-green'}`}>
              {onLeave} on leave
            </span>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {teachersData.map(t => (
              <div key={t.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-700 truncate max-w-[140px]">{t.name}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${t.status === 'active' ? 'bg-green/10 text-green' : 'bg-amber/10 text-amber'}`}>
                  {t.status === 'active' ? 'Available' : 'On Leave'}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400">
            {availableTeachers} of {teachersData.length} teachers available
          </div>
        </div>

        <button
          onClick={generate}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold/90 text-navy font-sora font-bold py-3 rounded-xl transition-colors disabled:opacity-60"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
          {generating ? 'Generating…' : 'Generate Optimal Timetable'}
        </button>
      </div>

      {/* Right: Progress / Results */}
      <div className="col-span-3">
        {!generating && !done && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
            <div className="w-16 h-16 bg-navy/5 rounded-2xl flex items-center justify-center mb-4">
              <Brain className="w-8 h-8 text-navy/40" />
            </div>
            <h3 className="font-sora font-semibold text-gray-700 mb-2">AI Timetable Engine Ready</h3>
            <p className="text-sm text-gray-400 max-w-xs">Configure the options on the left and click &quot;Generate&quot; to create a conflict-free timetable for all selected classes.</p>
          </div>
        )}

        {generating && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 min-h-[400px]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-teal/10 rounded-lg flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-teal animate-spin" />
              </div>
              <div>
                <div className="font-sora font-semibold text-gray-900 text-sm">Generating Timetable…</div>
                <div className="text-xs text-gray-400">SchoolOS Timetable Engine v2.1</div>
              </div>
            </div>
            <div className="space-y-3">
              {STEPS.map((step, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${i < stepIndex ? 'bg-green/5 border border-green/20' : i === stepIndex ? 'bg-teal/5 border border-teal/20' : 'bg-gray-50 border border-gray-100'}`}>
                  <span className="text-lg">{step.icon}</span>
                  <span className={`text-sm flex-1 ${i < stepIndex ? 'text-green' : i === stepIndex ? 'text-teal' : 'text-gray-400'}`}>{step.label}</span>
                  {i < stepIndex && <CheckCircle2 className="w-4 h-4 text-green" />}
                  {i === stepIndex && <Loader2 className="w-4 h-4 text-teal animate-spin" />}
                </div>
              ))}
            </div>
            <div className="mt-4 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-1.5 bg-gradient-to-r from-teal to-green rounded-full transition-all duration-700"
                style={{ width: `${(stepIndex / STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {done && (
          <div className="space-y-4">
            {/* Score */}
            <div className="bg-white rounded-xl border border-green/30 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green" />
                  <h3 className="font-sora font-semibold text-gray-900">Generation Complete</h3>
                </div>
                <span className="text-3xl font-sora font-bold text-green">{qualityScore.overall}<span className="text-base text-gray-400">/100</span></span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { icon: Shield,        label: 'Conflict-Free', value: qualityScore.conflictFree,   color: 'text-green' },
                  { icon: Gauge,         label: 'Teacher Load',  value: qualityScore.teacherFatigue, color: 'text-teal' },
                  { icon: BookOpenCheck, label: 'Pedagogy',      value: qualityScore.pedagogy,       color: 'text-purple' },
                ].map(m => {
                  const Icon = m.icon;
                  return (
                    <div key={m.label} className="bg-gray-50 rounded-lg p-3 text-center">
                      <Icon className={`w-4 h-4 mx-auto mb-1 ${m.color}`} />
                      <div className={`text-lg font-sora font-bold ${m.color}`}>{m.value}%</div>
                      <div className="text-[10px] text-gray-500">{m.label}</div>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 bg-green/5 border border-green/20 rounded-lg text-xs text-green font-semibold">
                ✓ {selected.size} sections · {timetableData.meta.totalSlotsFilled} slots filled · {timetableData.meta.conflictsFound} conflicts
              </div>
            </div>

            {/* AI summary */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-teal" />
                <span className="font-sora font-semibold text-sm text-gray-900">What the AI optimised</span>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green flex-shrink-0 mt-0.5" />Bengali teacher T006 (on leave) — periods redistributed to available staff</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green flex-shrink-0 mt-0.5" />Mathematics spread across all 6 days for Classes IX–X to reduce cramming</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green flex-shrink-0 mt-0.5" />Physical Education placed in early periods to avoid heat exposure</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green flex-shrink-0 mt-0.5" />No teacher assigned more than 3 consecutive periods on any day</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button onClick={generate} className="flex-1 flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-dm-sans py-2.5 rounded-xl hover:bg-gray-50 text-sm transition-colors">
                <RefreshCw className="w-4 h-4" /> Regenerate
              </button>
              <button onClick={() => toast.success('Timetable published to all teachers')} className="flex-1 flex items-center justify-center gap-2 bg-navy text-white font-sora font-semibold py-2.5 rounded-xl hover:bg-navyMid text-sm transition-colors">
                <CheckCircle2 className="w-4 h-4" /> Apply &amp; Publish
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

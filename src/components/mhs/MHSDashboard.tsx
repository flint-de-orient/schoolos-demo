'use client';

import { useState, useEffect } from 'react';
import { Brain, Clock, Users, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import timetableData from '@/data/muraliganj/timetable.json';
import teachersData from '@/data/muraliganj/teachers.json';
import classesData from '@/data/muraliganj/classes.json';

const { meta } = timetableData;

const todayMon = (timetableData.schedule as Record<string, Record<string, { subject: string; teacher: string | null }[]>>)['X-A']['Mon'];
const teacherMap = Object.fromEntries(teachersData.map(t => [t.id, t.name]));

export default function MHSDashboard() {
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 500); return () => clearTimeout(t); }, []);

  const activeTeachers = teachersData.filter(t => t.status === 'active').length;
  const onLeave = teachersData.filter(t => t.status === 'on-leave').length;

  if (loading) {
    return (
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-5 gap-5">
          <Skeleton className="col-span-3 h-64 rounded-xl" />
          <Skeleton className="col-span-2 h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 animate-fadeIn">
      <div>
        <h2 className="font-sora font-bold text-2xl text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Muraliganj High School (H.S) · Academic Year 2026-27</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Active Teachers',    value: activeTeachers, sub: `${onLeave} on leave`,     icon: Users,       bg: 'bg-navy',   text: 'text-navy' },
          { label: 'Classes',            value: classesData.length, sub: 'Class V–X',           icon: Clock,       bg: 'bg-teal',   text: 'text-teal' },
          { label: 'Timetable Quality',  value: `${meta.qualityScore.overall}/100`, sub: '0 conflicts', icon: Brain, bg: 'bg-purple', text: 'text-purple' },
          { label: 'Slots Filled',       value: meta.totalSlotsFilled, sub: 'This week',        icon: CheckCircle2,bg: 'bg-green',  text: 'text-green' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className={`text-3xl font-sora font-bold ${s.text}`}>{s.value}</div>
              <div className="text-sm text-gray-500 mt-0.5">{s.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-5 gap-5">
        <div className="col-span-3 space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-navy" />
                <h3 className="font-sora font-semibold text-navy">Today — Class X-A (Monday)</h3>
              </div>
              <Link href="/timetable" className="text-xs text-navyMid hover:text-navy font-semibold flex items-center gap-1">
                Full Timetable <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {todayMon.map((slot, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm">
                  <span className="w-6 text-xs text-gray-400 font-semibold">P{idx + 1}</span>
                  <div className="flex-1 flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="font-semibold text-gray-800">{slot.subject}</span>
                    {slot.teacher && <span className="text-xs text-gray-500">{teacherMap[slot.teacher] ?? slot.teacher}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-sora font-semibold text-navy mb-4">Teacher Status</h3>
            <div className="grid grid-cols-2 gap-2">
              {teachersData.map(t => (
                <div key={t.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-gray-700 truncate">{t.name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.status === 'active' ? 'bg-green/10 text-green' : 'bg-amber/10 text-amber'}`}>
                    {t.status === 'active' ? 'Active' : 'Leave'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-teal" />
              <h3 className="font-sora font-semibold text-navy">AI Timetable Score</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Conflict-Free', value: meta.qualityScore.conflictFree, color: 'bg-green' },
                { label: 'Teacher Fatigue', value: meta.qualityScore.teacherFatigue, color: 'bg-teal' },
                { label: 'Pedagogy', value: meta.qualityScore.pedagogy, color: 'bg-purple' },
              ].map(m => (
                <div key={m.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">{m.label}</span>
                    <span className="text-xs font-bold text-gray-800">{m.value}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${m.color} rounded-full`} style={{ width: `${m.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <Link href="/timetable" className="mt-4 flex items-center justify-center gap-1.5 w-full bg-navy text-white text-xs font-sora font-semibold py-2.5 rounded-lg hover:bg-navyMid transition-colors">
              <Brain className="w-3.5 h-3.5" /> Open AI Timetable Engine
            </Link>
          </div>

          <div className="bg-amber/5 border border-amber/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-sora font-semibold text-sm text-gray-900 mb-1">Substitution Required</div>
                <p className="text-xs text-gray-600">Taslima Begum (T006) is on leave today. {onLeave > 0 ? 'English periods need cover.' : ''}</p>
                <Link href="/timetable" className="mt-2 text-xs font-semibold text-amber underline hover:no-underline block">
                  Manage Substitutions →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

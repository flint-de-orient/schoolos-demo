'use client';

import { useState } from 'react';
import { BookOpen, ChevronDown, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import syllabusData from '@/data/muraliganj/syllabus.json';

type ClassKey = keyof typeof syllabusData.classes;

const STATUS_CONFIG = {
  completed: { label: 'Completed', bg: 'bg-green/10', text: 'text-green', dot: 'bg-green' },
  ongoing:   { label: 'Ongoing',   bg: 'bg-teal/10',  text: 'text-teal',  dot: 'bg-teal' },
  pending:   { label: 'Pending',   bg: 'bg-gray-100',  text: 'text-gray-500', dot: 'bg-gray-300' },
};

function SubjectCard({ subject, data }: { subject: string; data: { totalChapters: number; completed: number; chapters: { name: string; topics: number; done: number; status: string }[] } }) {
  const [open, setOpen] = useState(false);
  const pct = Math.round((data.completed / data.totalChapters) * 100);
  const color = pct >= 75 ? 'bg-green' : pct >= 50 ? 'bg-teal' : 'bg-amber';

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left">
        <BookOpen className="w-4 h-4 text-navy flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-sora font-semibold text-sm text-gray-900">{subject}</span>
            <span className="text-xs font-bold text-gray-600">{data.completed}/{data.totalChapters} chapters</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <span className={`text-xs font-bold w-10 text-right ${pct >= 75 ? 'text-green' : pct >= 50 ? 'text-teal' : 'text-amber'}`}>{pct}%</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {data.chapters.map((ch, i) => {
            const cfg = STATUS_CONFIG[ch.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-800 truncate">{ch.name}</div>
                  <div className="text-[10px] text-gray-400">{ch.done}/{ch.topics} topics done</div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                {ch.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-green flex-shrink-0" />}
                {ch.status === 'ongoing'   && <Clock        className="w-3.5 h-3.5 text-teal  flex-shrink-0" />}
                {ch.status === 'pending'   && <AlertCircle  className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MHSAcademicsPage() {
  const [selectedClass, setSelectedClass] = useState<ClassKey>('X');
  const classData = syllabusData.classes[selectedClass];
  const subjects = Object.entries(classData.subjects);

  const totalChapters = subjects.reduce((sum, [, d]) => sum + d.totalChapters, 0);
  const completedChapters = subjects.reduce((sum, [, d]) => sum + d.completed, 0);
  const overallPct = Math.round((completedChapters / totalChapters) * 100);

  const onTrack = subjects.filter(([, d]) => (d.completed / d.totalChapters) >= 0.6).length;

  return (
    <div className="p-6 space-y-5 animate-fadeIn">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-sora font-bold text-2xl text-gray-900">Academics — WBBSE Syllabus</h2>
          <p className="text-sm text-gray-500 mt-1">Academic Year {syllabusData.academicYear} · {syllabusData.board}</p>
        </div>
        <div className="flex rounded-lg overflow-hidden border border-gray-200">
          {(Object.keys(syllabusData.classes) as ClassKey[]).map(cls => (
            <button key={cls} onClick={() => setSelectedClass(cls)}
              className={`px-4 py-2 text-sm font-sora font-semibold transition-colors ${selectedClass === cls ? 'bg-navy text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              Class {cls}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Overall Coverage',  value: `${overallPct}%`, color: 'text-navy' },
          { label: 'Total Chapters',    value: totalChapters,    color: 'text-gray-700' },
          { label: 'Completed',         value: completedChapters, color: 'text-green' },
          { label: 'Subjects On Track', value: `${onTrack}/${subjects.length}`, color: 'text-teal' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className={`text-2xl font-sora font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {subjects.map(([subject, data]) => (
          <SubjectCard key={subject} subject={subject} data={data} />
        ))}
      </div>
    </div>
  );
}

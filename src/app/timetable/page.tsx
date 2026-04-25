'use client';

import { useState } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { AlertCircle } from 'lucide-react';
import timetableData from '@/data/timetable.json';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TimetablePage() {
  const [selectedClass, setSelectedClass] = useState('Class X-A');

  const schedule = timetableData.schedule['Class X-A'];
  const allPeriods = schedule?.Monday ?? [];

  return (
    <PageWrapper>
      {/* Controls */}
      <div className="flex items-center gap-4 mb-5">
        <select
          value={selectedClass}
          onChange={e => setSelectedClass(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-4 py-2 text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-navy/20 font-dm-sans"
        >
          {timetableData.classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-sm text-gray-500">Showing timetable for <strong className="text-navy">{selectedClass}</strong></span>
      </div>

      {/* Substitution Alert */}
      <div className="bg-amber/8 border border-amber/20 rounded-xl p-4 mb-5 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-amber mt-0.5 flex-shrink-0" />
        <p className="text-sm text-gray-700">
          <strong>Substitution Notice:</strong> Mr. Arijit Das (Physics) is on leave today — Period 3 Physics auto-assigned to <strong>Mrs. Suchitra Ghosh</strong>. Room 201.
        </p>
      </div>

      {/* Timetable Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="gradient-navy text-white">
                <th className="text-left px-5 py-3 text-xs font-sora font-semibold w-28">Period</th>
                {days.map(d => (
                  <th key={d} className="text-center px-3 py-3 text-xs font-sora font-semibold">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allPeriods.map((period, pIdx) => (
                <tr key={period.periodNo} className={`border-b border-gray-100 ${pIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                  <td className="px-5 py-2 border-r border-gray-100">
                    <div className="text-xs font-sora font-bold text-navy">P{period.periodNo}</div>
                    <div className="text-[10px] text-gray-400">{period.startTime}–{period.endTime}</div>
                  </td>
                  {days.map(day => {
                    const p = schedule?.[day as keyof typeof schedule]?.[pIdx];
                    if (!p) return <td key={day} className="px-3 py-2 text-center text-xs text-gray-300">—</td>;
                    if (p.subject === 'Break') {
                      return (
                        <td key={day} className="px-3 py-2" colSpan={1}>
                          <div className="bg-gray-100 text-gray-400 text-[10px] font-semibold rounded-lg px-2 py-1.5 text-center">BREAK</div>
                        </td>
                      );
                    }
                    const colorClass = timetableData.subjectColors[p.subject as keyof typeof timetableData.subjectColors] ?? 'bg-gray-100 text-gray-700 border-gray-200';
                    return (
                      <td key={day} className="px-2 py-2">
                        <div className={`rounded-lg border px-2 py-1.5 ${colorClass} hover:shadow-sm transition-shadow`}>
                          <div className="text-[11px] font-semibold leading-tight truncate">{p.subject}</div>
                          <div className="text-[9px] opacity-70 truncate mt-0.5">{p.teacher.split(' ').slice(-1)[0]}</div>
                          <div className="text-[9px] opacity-60">{p.room}</div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-2">
        {Object.entries(timetableData.subjectColors).filter(([k]) => k !== 'Break').slice(0, 8).map(([subject, cls]) => (
          <span key={subject} className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${cls}`}>{subject}</span>
        ))}
      </div>
    </PageWrapper>
  );
}

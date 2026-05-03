'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import schoolData   from '@/data/muraliganj/school.json';
import teachersData from '@/data/muraliganj/teachers.json';
import classesData  from '@/data/muraliganj/classes.json';
import timetableData from '@/data/muraliganj/timetable.json';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
type Day = typeof DAYS[number];

const teacherMap = Object.fromEntries(teachersData.map(t => [t.id, t.name]));

type Props = { defaultClass?: string };

export default function TimetableGrid({ defaultClass = 'X-A' }: Props) {
  const [selectedClass, setSelectedClass] = useState(defaultClass);
  const [view, setView] = useState<'class' | 'teacher'>('class');
  const [selectedTeacher, setSelectedTeacher] = useState('T001');

  const schedule = (timetableData.schedule as Record<string, Record<string, { subject: string; teacher: string | null }[]>>)[selectedClass];
  const colors = schoolData.subjectColors as Record<string, string>;

  // Teacher view — build teacher's personal schedule
  const teacherSchedule: Record<Day, ({ subject: string; classId: string } | null)[]> = {} as never;
  if (view === 'teacher') {
    for (const day of DAYS) {
      teacherSchedule[day] = Array(day === 'Sat' ? 5 : 8).fill(null);
      for (const [classId, daySchedules] of Object.entries(timetableData.schedule as Record<string, Record<string, { subject: string; teacher: string | null }[]>>)) {
        const daySlots = daySchedules[day] ?? [];
        daySlots.forEach((slot, idx) => {
          if (slot.teacher === selectedTeacher) {
            teacherSchedule[day][idx] = { subject: slot.subject, classId };
          }
        });
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg overflow-hidden border border-gray-200">
          <button onClick={() => setView('class')}   className={`px-4 py-2 text-sm font-dm-sans transition-colors ${view === 'class'   ? 'bg-navy text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Class View</button>
          <button onClick={() => setView('teacher')} className={`px-4 py-2 text-sm font-dm-sans transition-colors ${view === 'teacher' ? 'bg-navy text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Teacher View</button>
        </div>

        {view === 'class' ? (
          <div className="relative">
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm font-dm-sans text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-navy/20"
            >
              {classesData.map(c => (
                <option key={c.id} value={c.id}>Class {c.id} — {c.room}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        ) : (
          <div className="relative">
            <select
              value={selectedTeacher}
              onChange={e => setSelectedTeacher(e.target.value)}
              className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm font-dm-sans text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-navy/20"
            >
              {teachersData.map(t => (
                <option key={t.id} value={t.id}>{t.name} — {t.subjects.join(', ')}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        )}

        <div className="ml-auto flex flex-wrap gap-2 text-[11px]">
          {Object.entries(colors).slice(0, 6).map(([subj, color]) => (
            <span key={subj} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: color }}>
              {subj}
            </span>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-navy text-white">
              <th className="w-28 px-3 py-3 text-left text-xs font-sora font-semibold text-ice/80 uppercase tracking-wide">Period</th>
              {DAYS.map(d => (
                <th key={d} className="px-2 py-3 text-center text-xs font-sora font-semibold text-ice/80 uppercase tracking-wide">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Tiffin break row after period 4 */}
            {schoolData.slots.map((slot, idx) => {
              return (
                <>
                  {idx === 4 && (
                    <tr key="break" className="bg-amber/5">
                      <td className="px-3 py-1.5 text-xs font-semibold text-amber border-t border-amber/20">
                        {schoolData.timing.breakLabel}
                        <span className="text-[10px] font-normal text-gray-400 ml-1">13:10–13:40</span>
                      </td>
                      {DAYS.map(d => (
                        <td key={d} className="px-2 py-1.5 border-t border-amber/20 text-center text-[10px] text-amber/70">—</td>
                      ))}
                    </tr>
                  )}
                  <tr key={slot.no} className={idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-50'}>
                    <td className="px-3 py-2.5 border-t border-gray-100">
                      <div className="font-sora font-semibold text-xs text-gray-700">P{slot.no}</div>
                      <div className="text-[10px] text-gray-400">{slot.start}–{slot.end}</div>
                    </td>
                    {DAYS.map(d => {
                      const maxP = d === 'Sat' ? 5 : 8;
                      if (slot.no > maxP) {
                        return <td key={d} className="px-2 py-2 border-t border-gray-100 text-center"><span className="text-[10px] text-gray-300">—</span></td>;
                      }

                      if (view === 'class') {
                        const cell = schedule?.[d]?.[idx];
                        if (!cell) return <td key={d} className="px-2 py-2 border-t border-gray-100" />;
                        const isFreePeriod = cell.subject === 'Free Period' || !cell.teacher;
                        return (
                          <td key={d} className="px-1.5 py-1.5 border-t border-gray-100">
                            {isFreePeriod ? (
                              <div className="rounded-md px-2 py-1.5 bg-gray-100 text-center">
                                <div className="text-[10px] text-gray-400 font-medium">Free</div>
                              </div>
                            ) : (
                              <div
                                className="rounded-md px-2 py-1.5 text-white text-center"
                                style={{ backgroundColor: colors[cell.subject] ?? '#6B7280' }}
                              >
                                <div className="text-[11px] font-semibold leading-tight">{cell.subject}</div>
                                <div className="text-[9px] opacity-80 mt-0.5 truncate">{teacherMap[cell.teacher ?? ''] ?? ''}</div>
                              </div>
                            )}
                          </td>
                        );
                      } else {
                        const cell = teacherSchedule[d]?.[idx];
                        return (
                          <td key={d} className="px-1.5 py-1.5 border-t border-gray-100">
                            {cell ? (
                              <div
                                className="rounded-md px-2 py-1.5 text-white text-center"
                                style={{ backgroundColor: colors[cell.subject] ?? '#6B7280' }}
                              >
                                <div className="text-[11px] font-semibold leading-tight">{cell.subject}</div>
                                <div className="text-[9px] opacity-80 mt-0.5">Class {cell.classId}</div>
                              </div>
                            ) : (
                              <div className="rounded-md px-2 py-1.5 bg-gray-100 text-center">
                                <div className="text-[10px] text-gray-400">—</div>
                              </div>
                            )}
                          </td>
                        );
                      }
                    })}
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {view === 'class' && (
        <p className="text-xs text-gray-400 text-right">
          Class Teacher: <span className="font-semibold text-gray-600">{teacherMap[classesData.find(c => c.id === selectedClass)?.classTeacher ?? ''] ?? '—'}</span>
          &nbsp;·&nbsp;
          Room: <span className="font-semibold text-gray-600">{classesData.find(c => c.id === selectedClass)?.room}</span>
        </p>
      )}
    </div>
  );
}

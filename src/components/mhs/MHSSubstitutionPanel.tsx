'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, UserCheck, Clock, ChevronDown } from 'lucide-react';
import teachersData from '@/data/muraliganj/teachers.json';
import timetableData from '@/data/muraliganj/timetable.json';

const ABSENT_TEACHER_ID = 'T006';
const absentTeacher = teachersData.find(t => t.id === ABSENT_TEACHER_ID)!;

type Substitute = { teacherId: string; name: string; reason: string };

function findSubstitutes(subject: string, period: number, day: string): Substitute[] {
  return teachersData
    .filter(t => {
      if (t.id === ABSENT_TEACHER_ID || t.status !== 'active') return false;
      if (!t.subjects.includes(subject)) return false;
      const schedule = (timetableData.schedule as Record<string, Record<string, { subject: string; teacher: string | null }[]>>);
      const busy = Object.values(schedule).some(cls => (cls[day]?.[period - 1]?.teacher === t.id));
      return !busy;
    })
    .slice(0, 2)
    .map(t => ({ teacherId: t.id, name: t.name, reason: `Teaches ${subject} · Free P${period}` }));
}

interface AffectedPeriod {
  day: string;
  period: number;
  classId: string;
  subject: string;
  substitutes: Substitute[];
}

function buildAffectedPeriods(): AffectedPeriod[] {
  const result: AffectedPeriod[] = [];
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const schedule = timetableData.schedule as Record<string, Record<string, { subject: string; teacher: string | null }[]>>;

  for (const [classId, dayMap] of Object.entries(schedule)) {
    for (const day of DAYS) {
      const slots = dayMap[day] ?? [];
      slots.forEach((slot, idx) => {
        if (slot.teacher === ABSENT_TEACHER_ID) {
          result.push({
            day,
            period: idx + 1,
            classId,
            subject: slot.subject,
            substitutes: findSubstitutes(slot.subject, idx + 1, day),
          });
        }
      });
    }
  }
  return result.slice(0, 6);
}

const AFFECTED = buildAffectedPeriods();

const HISTORY = [
  { date: '24 Apr 2026', absent: 'T003 — Md. Rafiqul Islam', periods: 3, assigned: 'T009, T011, T014', status: 'Resolved' },
  { date: '18 Apr 2026', absent: 'T010 — Smt. Rina Mondal',  periods: 2, assigned: 'T007, T012',      status: 'Resolved' },
];

export default function MHSSubstitutionPanel() {
  const [assigned, setAssigned] = useState<Record<string, string>>({});
  const [selectedSub, setSelectedSub] = useState<Record<string, string>>({});

  function key(ap: AffectedPeriod) { return `${ap.day}-${ap.period}-${ap.classId}`; }

  function assign(ap: AffectedPeriod) {
    const subId = selectedSub[key(ap)] ?? ap.substitutes[0]?.teacherId;
    if (!subId) return;
    const sub = teachersData.find(t => t.id === subId);
    setAssigned(prev => ({ ...prev, [key(ap)]: subId }));
    toast.success(`${sub?.name} assigned for P${ap.period} — Class ${ap.classId}`);
  }

  function assignAll() {
    const updates: Record<string, string> = {};
    AFFECTED.forEach(ap => {
      if (!assigned[key(ap)] && ap.substitutes[0]) updates[key(ap)] = ap.substitutes[0].teacherId;
    });
    setAssigned(prev => ({ ...prev, ...updates }));
    toast.success(`All ${Object.keys(updates).length} periods assigned automatically`);
  }

  const pending = AFFECTED.filter(ap => !assigned[key(ap)]).length;

  return (
    <div className="space-y-5">
      <div className="bg-amber/5 border border-amber/30 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="font-sora font-semibold text-gray-900 text-sm">{absentTeacher.name} is on leave today</div>
          <div className="text-xs text-gray-500 mt-0.5">{absentTeacher.subjects.join(', ')} · {AFFECTED.length} periods need cover</div>
        </div>
        {pending > 0 && (
          <button onClick={assignAll} className="flex items-center gap-1.5 bg-navy text-white text-xs font-sora font-semibold px-3 py-1.5 rounded-lg hover:bg-navyMid transition-colors">
            <UserCheck className="w-3.5 h-3.5" /> Auto-Assign All
          </button>
        )}
        {pending === 0 && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-green bg-green/10 px-3 py-1.5 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" /> All covered
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {AFFECTED.map(ap => {
          const k = key(ap);
          const isAssigned = !!assigned[k];
          const assignedTeacher = teachersData.find(t => t.id === assigned[k]);
          const selSub = selectedSub[k] ?? ap.substitutes[0]?.teacherId ?? '';

          return (
            <div key={k} className={`bg-white rounded-xl border p-4 shadow-sm transition-all ${isAssigned ? 'border-green/30' : 'border-gray-100'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-700">P{ap.period} · {ap.day}</span>
                  <span className="text-[10px] bg-navy/10 text-navy px-1.5 py-0.5 rounded-full font-semibold">Class {ap.classId}</span>
                </div>
                {isAssigned && <CheckCircle2 className="w-4 h-4 text-green" />}
              </div>
              <div className="text-sm font-sora font-semibold text-gray-900 mb-3">{ap.subject}</div>

              {isAssigned ? (
                <div className="flex items-center gap-2 text-xs text-green bg-green/5 border border-green/20 rounded-lg px-3 py-2">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span className="font-semibold">{assignedTeacher?.name}</span>
                  <span className="text-gray-400">assigned</span>
                </div>
              ) : ap.substitutes.length === 0 ? (
                <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">No available substitute</div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select
                      value={selSub}
                      onChange={e => setSelectedSub(prev => ({ ...prev, [k]: e.target.value }))}
                      className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg pl-2.5 pr-7 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-navy/20"
                    >
                      {ap.substitutes.map(s => (
                        <option key={s.teacherId} value={s.teacherId}>{s.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-2 w-3 h-3 text-gray-400 pointer-events-none" />
                  </div>
                  <button onClick={() => assign(ap)} className="px-3 py-1.5 bg-teal text-white text-xs font-sora font-semibold rounded-lg hover:bg-teal/90 transition-colors">
                    Assign
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h3 className="font-sora font-semibold text-sm text-gray-900 mb-3">Substitution History</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="text-left pb-2 font-semibold">Date</th>
              <th className="text-left pb-2 font-semibold">Absent Teacher</th>
              <th className="text-center pb-2 font-semibold">Periods</th>
              <th className="text-left pb-2 font-semibold">Substitutes</th>
              <th className="text-left pb-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {HISTORY.map((h, i) => (
              <tr key={i} className="border-t border-gray-50">
                <td className="py-2 text-gray-600">{h.date}</td>
                <td className="py-2 text-gray-700 font-medium">{h.absent}</td>
                <td className="py-2 text-center text-gray-600">{h.periods}</td>
                <td className="py-2 text-gray-500">{h.assigned}</td>
                <td className="py-2"><span className="bg-green/10 text-green px-2 py-0.5 rounded-full font-semibold">{h.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

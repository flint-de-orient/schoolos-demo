'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Brain, CheckCircle2, User, Clock } from 'lucide-react';
import teachersData from '@/data/muraliganj/teachers.json';

const absentToday = teachersData.filter(t => t.status === 'on-leave');

const suggestedSubs: Record<string, { period: number; classId: string; subject: string; suggestedTeacher: string; reason: string }[]> = {
  T006: [
    { period: 2, classId: 'VII-A', subject: 'English', suggestedTeacher: 'T007', reason: 'Same subject, no conflict in this period' },
    { period: 3, classId: 'VIII-B', subject: 'English', suggestedTeacher: 'T005', reason: 'Available & teaches English V-VI' },
    { period: 5, classId: 'VII-B', subject: 'English', suggestedTeacher: 'T007', reason: 'Free in this slot' },
    { period: 7, classId: 'VIII-A', subject: 'English', suggestedTeacher: 'T005', reason: 'No conflict detected' },
  ],
};

const teacherMap = Object.fromEntries(teachersData.map(t => [t.id, t.name]));

export default function SubstitutionPanel() {
  const [assigned, setAssigned] = useState<Set<string>>(new Set());

  function assign(key: string, teacherName: string, classId: string) {
    setAssigned(prev => new Set([...prev, key]));
    toast.success(`${teacherName} assigned to ${classId} — substitution confirmed`);
  }

  function assignAll() {
    const keys: string[] = [];
    Object.entries(suggestedSubs).forEach(([tid, subs]) => {
      subs.forEach((s, i) => keys.push(`${tid}-${i}`));
    });
    setAssigned(new Set(keys));
    toast.success('All substitutions assigned automatically');
  }

  const totalSubs = Object.values(suggestedSubs).flat().length;
  const assignedCount = assigned.size;

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="flex items-center gap-4 bg-amber/5 border border-amber/20 rounded-xl p-4">
        <AlertTriangle className="w-5 h-5 text-amber flex-shrink-0" />
        <div className="flex-1">
          <div className="font-sora font-semibold text-sm text-gray-800">
            {absentToday.length} teacher{absentToday.length !== 1 ? 's' : ''} absent today — {totalSubs} periods need substitution
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {assignedCount} of {totalSubs} substitutions assigned
          </div>
          <div className="mt-2 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-1.5 bg-green rounded-full transition-all" style={{ width: `${(assignedCount / totalSubs) * 100}%` }} />
          </div>
        </div>
        <button onClick={assignAll} className="flex items-center gap-1.5 bg-navy text-white font-sora font-semibold text-sm px-4 py-2 rounded-lg hover:bg-navyMid transition-colors">
          <Brain className="w-3.5 h-3.5" /> Assign All (AI)
        </button>
      </div>

      {/* Absent teacher cards */}
      {absentToday.map(teacher => (
        <div key={teacher.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-amber/10 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-amber" />
            </div>
            <div>
              <div className="font-sora font-semibold text-gray-900">{teacher.name}</div>
              <div className="text-xs text-gray-500">{teacher.subjects.join(', ')} · Classes {teacher.assignedClasses.join(', ')}</div>
            </div>
            <span className="ml-auto text-xs bg-amber/10 text-amber px-2 py-0.5 rounded-full font-semibold">On Leave</span>
          </div>

          <div className="space-y-2">
            {(suggestedSubs[teacher.id] ?? []).map((s, i) => {
              const key = `${teacher.id}-${i}`;
              const isAssigned = assigned.has(key);
              return (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${isAssigned ? 'bg-green/5 border-green/20' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 w-16">
                    <Clock className="w-3.5 h-3.5" /> P{s.period}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-800">{s.subject} — Class {s.classId}</div>
                    <div className="text-xs text-teal flex items-center gap-1 mt-0.5">
                      <Brain className="w-3 h-3" />
                      AI suggests: <span className="font-semibold">{teacherMap[s.suggestedTeacher]}</span> — {s.reason}
                    </div>
                  </div>
                  {isAssigned ? (
                    <CheckCircle2 className="w-5 h-5 text-green flex-shrink-0" />
                  ) : (
                    <button
                      onClick={() => assign(key, teacherMap[s.suggestedTeacher], s.classId)}
                      className="text-xs bg-navy text-white font-sora font-semibold px-3 py-1.5 rounded-lg hover:bg-navyMid transition-colors"
                    >
                      Assign
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {absentToday.length === 0 && (
        <div className="bg-green/5 border border-green/20 rounded-xl p-6 text-center">
          <CheckCircle2 className="w-8 h-8 text-green mx-auto mb-2" />
          <div className="font-sora font-semibold text-green">All teachers present today</div>
          <div className="text-xs text-gray-500 mt-1">No substitutions required</div>
        </div>
      )}

      {/* History */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-sora font-semibold text-sm text-gray-900 mb-3">Substitution History (This Week)</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="text-left pb-2">Date</th>
              <th className="text-left pb-2">Absent Teacher</th>
              <th className="text-left pb-2">Class</th>
              <th className="text-left pb-2">Substitute</th>
              <th className="text-left pb-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {[
              { date: 'Mon 28 Apr', absent: 'Taslima Begum', cls: 'VII-A P2', sub: 'Anisur Rahman', status: 'Completed' },
              { date: 'Tue 29 Apr', absent: 'Taslima Begum', cls: 'VIII-B P5', sub: 'Abul Hossain',  status: 'Completed' },
              { date: 'Wed 30 Apr', absent: 'Taslima Begum', cls: 'VII-B P3', sub: 'Anisur Rahman', status: 'Completed' },
            ].map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="py-2 text-gray-500">{r.date}</td>
                <td className="py-2 text-gray-700 font-medium">{r.absent}</td>
                <td className="py-2 text-gray-600">{r.cls}</td>
                <td className="py-2 text-gray-700">{r.sub}</td>
                <td className="py-2"><span className="bg-green/10 text-green px-1.5 py-0.5 rounded-full font-semibold">{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

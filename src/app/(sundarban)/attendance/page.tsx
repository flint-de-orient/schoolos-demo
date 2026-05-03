'use client';

import { useState } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import AIBadge from '@/components/shared/AIBadge';
import { Users, CheckCircle, XCircle, Percent, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import attendanceData from '@/data/attendance.json';

export default function AttendancePage() {
  const [notified, setNotified] = useState<Record<string, boolean>>(
    Object.fromEntries(attendanceData.absentees.map(a => [a.studentId, a.parentNotified]))
  );
  const [markModal, setMarkModal] = useState<null | { classId: string; className: string }>(null);
  const [markReason, setMarkReason] = useState('');
  const [markedAbsent, setMarkedAbsent] = useState<Record<string, number>>({});

  const handleNotifyToggle = (id: string, name: string) => {
    setNotified(prev => {
      const next = { ...prev, [id]: !prev[id] };
      if (next[id]) {
        toast.success(`Parent of ${name} notified via WhatsApp`);
      }
      return next;
    });
  };

  const getAttendanceColor = (percent: number) => {
    if (percent >= 90) return 'text-green';
    if (percent >= 75) return 'text-amber';
    return 'text-coral';
  };

  const getAttendanceBg = (percent: number) => {
    if (percent >= 90) return 'bg-green/10';
    if (percent >= 75) return 'bg-amber/10';
    return 'bg-coral/10';
  };

  const overall = attendanceData.schoolOverall;

  return (
    <PageWrapper>
      {/* Top Stats Bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-navy rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-3xl font-sora font-semibold text-navy">{overall.total}</div>
            <div className="text-sm text-gray-500">Total Students</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-green rounded-xl flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-3xl font-sora font-semibold text-green">{overall.present}</div>
            <div className="text-sm text-gray-500">Present Today</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-coral rounded-xl flex items-center justify-center">
            <XCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-3xl font-sora font-semibold text-coral">{overall.absent}</div>
            <div className="text-sm text-gray-500">Absent Today</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-teal rounded-xl flex items-center justify-center">
            <Percent className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-3xl font-sora font-semibold text-teal">{overall.percent}%</div>
            <div className="text-sm text-gray-500">Overall Today</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Class-wise Table */}
        <div className="col-span-2 space-y-5">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-sora font-semibold text-navy">Class-wise Breakdown</h3>
              <p className="text-xs text-gray-400 mt-0.5">April 10, 2025 · Click &quot;Mark Absent&quot; to record absences</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Class', 'Teacher', 'Total', 'Present', 'Absent', '%', 'Action'].map(h => (
                      <th key={h} className="text-left text-xs uppercase tracking-wide text-gray-400 px-5 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.classWise.map((c, i) => {
                    const extra = markedAbsent[c.class] ?? 0;
                    const absent = c.absent + extra;
                    const present = c.total - absent;
                    const pct = Math.round((present / c.total) * 100);
                    return (
                      <tr key={c.class} className={`border-b border-gray-50 hover:bg-gray-50/80 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                        <td className="px-5 py-3 font-semibold text-sm text-gray-800">{c.class}</td>
                        <td className="px-5 py-3 text-sm text-gray-500">{c.teacher}</td>
                        <td className="px-5 py-3 text-sm text-gray-700 font-medium">{c.total}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-green">{present}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-coral">{absent}</td>
                        <td className="px-5 py-3">
                          <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${getAttendanceBg(pct)} ${getAttendanceColor(pct)}`}>
                            {pct}%
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => setMarkModal({ classId: c.class, className: c.class })}
                            className="text-xs text-navyMid hover:text-navy font-semibold transition-colors"
                          >
                            Mark Absent
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly Trend */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-sora font-semibold text-navy mb-4">Monthly Attendance Trend</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={attendanceData.monthlyTrend} margin={{ top: 4, right: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'DM Sans' }} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 11, fontFamily: 'DM Sans' }} />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Attendance']}
                  contentStyle={{ fontFamily: 'DM Sans', fontSize: 12, borderRadius: 8 }}
                />
                <Line type="monotone" dataKey="percent" stroke="#1E2761" strokeWidth={2.5} dot={{ fill: '#F5C542', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Absentees + AI Alert */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl shadow-sm border border-amber/20 p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber" />
              <h3 className="font-sora font-semibold text-navy text-base">AI Alert</h3>
              <AIBadge />
            </div>
            <div className="bg-amber/8 border border-amber/20 rounded-lg p-3">
              <p className="text-xs text-gray-700 font-dm-sans leading-relaxed">
                <strong>Priya Sen</strong> has been absent 8 days this month — attendance at 62%. High at-risk profile detected. Recommend immediate counsellor follow-up and parent meeting.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-sora font-semibold text-navy mb-4">Today&apos;s Absentees ({attendanceData.absentees.length})</h3>
            <div className="space-y-3">
              {attendanceData.absentees.map(a => (
                <div key={a.studentId} className="border border-gray-100 rounded-xl p-3 hover:border-gray-200 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{a.name}</p>
                      <p className="text-xs text-gray-400">{a.class}</p>
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full mt-1 inline-block">{a.reason}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] text-gray-400">Parent notified</span>
                      <button
                        onClick={() => handleNotifyToggle(a.studentId, a.name)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${notified[a.studentId] ? 'bg-teal' : 'bg-gray-300'}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${notified[a.studentId] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mark Absent Modal */}
      <Dialog open={!!markModal} onOpenChange={() => { setMarkModal(null); setMarkReason(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-sora text-navy">Mark Absent — {markModal?.className}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Reason</label>
              <select
                value={markReason}
                onChange={e => setMarkReason(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 h-9 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-navy/20"
              >
                <option value="">Select reason...</option>
                <option value="Sick">Sick</option>
                <option value="Family Emergency">Family Emergency</option>
                <option value="Not Known">Not Known</option>
                <option value="On Leave">On Leave</option>
              </select>
            </div>
            <button
              onClick={() => {
                if (!markReason) { toast.error('Please select a reason'); return; }
                setMarkedAbsent(prev => ({ ...prev, [markModal!.classId]: (prev[markModal!.classId] ?? 0) + 1 }));
                toast.success(`Student marked absent — ${markReason}`, { description: `${markModal?.className} attendance updated` });
                setMarkModal(null);
                setMarkReason('');
              }}
              className="w-full bg-navy text-white rounded-lg py-2 font-semibold text-sm hover:bg-navyMid transition-colors"
            >
              Confirm Mark Absent
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}

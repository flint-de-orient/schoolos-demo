'use client';

import { useState, useEffect } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import StatCard from '@/components/shared/StatCard';
import AIBadge from '@/components/shared/AIBadge';
import {
  Users, CalendarCheck, CreditCard, UserCheck, Brain,
  AlertTriangle, TrendingDown, Trophy, ChevronRight, Clock, Info,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

const stageBadgeColor: Record<string, string> = {
  INQUIRY:               'bg-gray-100 text-gray-600',
  APPLICATION_RECEIVED:  'bg-blue-100 text-blue-700',
  DOCUMENTS_VERIFIED:    'bg-purple-100 text-purple-700',
  INTERVIEW_SCHEDULED:   'bg-amber-100 text-amber-700',
  OFFER_MADE:            'bg-teal/10 text-teal',
  ENROLLED:              'bg-green/10 text-green',
  REJECTED:              'bg-coral/10 text-coral',
};

const stageLabel: Record<string, string> = {
  INQUIRY: 'Inquiry', APPLICATION_RECEIVED: 'Application',
  DOCUMENTS_VERIFIED: 'Docs Verified', INTERVIEW_SCHEDULED: 'Interview',
  OFFER_MADE: 'Offer Made', ENROLLED: 'Enrolled', REJECTED: 'Rejected',
};

const subjectColors: Record<string, string> = {
  English:     'bg-blue-50 text-blue-700 border-blue-100',
  Mathematics: 'bg-purple-50 text-purple-700 border-purple-100',
  Science:     'bg-green/10 text-green border-green/20',
  History:     'bg-amber/10 text-amber border-amber/20',
  Geography:   'bg-teal/10 text-teal border-teal/20',
  Bengali:     'bg-pink-50 text-pink-700 border-pink-100',
  'Phys. Ed.': 'bg-coral/10 text-coral border-coral/20',
};

const upcomingEvents = [
  { date: 'May 10', title: 'Pre-Board Examination Begins', type: 'exam' },
  { date: 'May 15', title: 'PTA Meeting — All Classes', type: 'meeting' },
  { date: 'May 22', title: 'Annual Science Fair', type: 'event' },
];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics]   = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [timetable, setTimetable]   = useState<any>(null);
  const [alerts, setAlerts]         = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics').then(r => r.json()),
      fetch('/api/attendance').then(r => r.json()),
      fetch('/api/admissions?limit=5').then(r => r.json()),
      fetch('/api/timetable').then(r => r.json()),
      fetch('/api/dashboard/alerts').then(r => r.json()),
    ]).then(([ana, att, adm, tt, al]) => {
      setAnalytics(ana);
      setAttendance(att);
      setAdmissions(adm.data?.slice(0, 5) ?? []);
      setTimetable(tt);
      setAlerts(al);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <PageWrapper>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-5 gap-5">
          <div className="col-span-3 space-y-5">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
          <div className="col-span-2 space-y-5">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  const overview       = analytics?.overview ?? {};
  const totalStudents  = overview.totalStudents ?? '—';
  const attendancePct  = attendance?.summary?.percent ?? overview.attendanceToday ?? 0;
  const presentToday   = attendance?.summary?.present ?? overview.presentToday ?? 0;
  const totalExpected  = attendance?.summary?.total ?? overview.totalExpectedToday ?? 0;
  const feeCollected   = overview.feeCollected
    ? `₹${(overview.feeCollected / 100000).toFixed(1)}L`
    : '₹8.4L';
  const totalStaff     = overview.totalStaff ?? 20;

  // Build chart from DB sessions — deduplicate sections (one bar per section)
  const seenSections = new Set<string>();
  const chartData = (attendance?.sessions ?? [])
    .filter((s: any) => {
      const key = s.section?.id ?? s.sectionId;
      if (seenSections.has(key)) return false;
      seenSections.add(key);
      return true;
    })
    .map((s: any) => {
      const total   = s.records.length;
      const present = s.records.filter((r: any) => r.status === 'PRESENT').length;
      return {
        class:   `${s.section?.grade?.name?.replace('Class ', 'Cl.') ?? '?'}-${s.section?.name ?? ''}`,
        percent: total > 0 ? Math.round((present / total) * 100) : 0,
        present,
        total,
      };
    });

  const attendanceDate = attendance?.date
    ? new Date(attendance.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const isLive = attendance?.isLive ?? false;

  // Today's timetable
  const todayEntries = timetable?.entries
    ?.filter((e: any) => {
      const today = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'][new Date().getDay()];
      return e.day === today;
    })
    ?.sort((a: any, b: any) => (a.periodSlot?.startTime ?? '').localeCompare(b.periodSlot?.startTime ?? ''))
    ?.slice(0, 6) ?? [];

  // AI alerts from real DB data
  const atRiskStudents: any[]     = alerts?.atRiskStudents ?? [];
  const overdueCount: number      = alerts?.overdueAccounts?.count ?? 0;
  const overdueAmount: number     = alerts?.overdueAccounts?.totalBalance ?? 0;
  const boardAlerts: any[]        = alerts?.boardAlerts ?? [];
  const lowSections: any[]        = alerts?.lowAttendanceSections ?? [];

  const overdueAmountFmt = overdueAmount > 0
    ? `₹${(overdueAmount / 100000).toFixed(1)}L`
    : overdueCount > 0 ? '—' : null;

  return (
    <PageWrapper>
      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Students"      value={String(totalStudents)}   icon={Users}        iconBg="bg-navy"     trend="up"      trendLabel="↑ 12 from last month" />
        <StatCard title="Today's Attendance"  value={`${attendancePct}%`}     icon={CalendarCheck} iconBg="bg-teal"   subtitle={`${presentToday} / ${totalExpected} present`} trend={attendancePct >= 85 ? 'up' : 'down'} trendLabel={`${presentToday} present`} />
        <StatCard title="Fee Collected (Apr)" value={feeCollected}            icon={CreditCard}   iconBg="bg-green"    trend="up"      trendLabel={overdueCount > 0 ? `${overdueCount} accounts overdue` : 'On track'} />
        <StatCard title="Active Staff"        value={`${totalStaff}/${totalStaff}`} icon={UserCheck} iconBg="bg-navyMid" trend="neutral" trendLabel="All staff present" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-5 gap-5">
        {/* Left Column — 60% */}
        <div className="col-span-3 space-y-5">

          {/* Attendance Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-sora font-semibold text-navy text-base">Class-wise Attendance</h3>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                  {attendanceDate}
                  {!isLive && (
                    <span className="flex items-center gap-1 text-amber text-[10px] font-semibold bg-amber/10 px-1.5 py-0.5 rounded-full">
                      <Info className="w-2.5 h-2.5" /> Most recent
                    </span>
                  )}
                </p>
              </div>
              <Link href="/attendance" className="text-xs text-navyMid hover:text-navy font-semibold flex items-center gap-1 transition-colors">
                View All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {chartData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
                No attendance data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="class" tick={{ fontSize: 10, fontFamily: 'DM Sans' }} />
                  <YAxis domain={[60, 100]} tick={{ fontSize: 10, fontFamily: 'DM Sans' }} />
                  <Tooltip
                    formatter={(v: any, _: any, props: any) => [
                      `${v}% (${props.payload.present}/${props.payload.total})`,
                      'Attendance',
                    ]}
                    contentStyle={{ fontFamily: 'DM Sans', fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                  <Bar
                    dataKey="percent"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                    fill="#F5C542"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Recent Admissions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-sora font-semibold text-navy text-base">Recent Admissions Pipeline</h3>
              <Link href="/admissions" className="text-xs text-navyMid hover:text-navy font-semibold flex items-center gap-1 transition-colors">
                View All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {admissions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No recent admissions</p>
              ) : admissions.map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-iceLight flex items-center justify-center text-navy font-bold text-xs font-sora">
                    {a.studentName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{a.studentName}</p>
                    <p className="text-xs text-gray-400">{a.applyingForClass} · {a.source?.replace('_', ' ')}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stageBadgeColor[a.stage] ?? 'bg-gray-100 text-gray-600'}`}>
                    {stageLabel[a.stage] ?? a.stage}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column — 40% */}
        <div className="col-span-2 space-y-5">

          {/* AI Alerts — fully from DB */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-sora font-semibold text-navy text-base">AI Alerts</h3>
              <AIBadge />
            </div>
            <div className="space-y-3">

              {/* Attendance at-risk */}
              {atRiskStudents.length > 0 ? (
                <div className="flex gap-3 p-3 bg-amber/8 border border-amber/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-800">
                      {atRiskStudents.length} Student{atRiskStudents.length > 1 ? 's' : ''} Below 75% Attendance
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {atRiskStudents.slice(0, 2).map((s: any) =>
                        `${s.name} (${s.grade?.name} ${s.section?.name} — ${s.attendancePercent}%)`
                      ).join('; ')}
                      {atRiskStudents.length > 2 && ` and ${atRiskStudents.length - 2} more`}.
                      Counsellor follow-up recommended.
                    </p>
                  </div>
                </div>
              ) : lowSections.length > 0 ? (
                <div className="flex gap-3 p-3 bg-amber/8 border border-amber/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Low Attendance Sections</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {lowSections.map((s: any) => `${s.label}: ${s.percent}%`).join(', ')}. Below 80% threshold.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 p-3 bg-green/8 border border-green/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-green flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Attendance Healthy</p>
                    <p className="text-xs text-gray-600 mt-0.5">All students are above the 75% threshold.</p>
                  </div>
                </div>
              )}

              {/* Fee risk */}
              <div className={`flex gap-3 p-3 rounded-lg border ${overdueCount > 0 ? 'bg-coral/8 border-coral/20' : 'bg-green/8 border-green/20'}`}>
                <TrendingDown className={`w-4 h-4 flex-shrink-0 mt-0.5 ${overdueCount > 0 ? 'text-coral' : 'text-green'}`} />
                <div>
                  <p className="text-xs font-semibold text-gray-800">Fee Risk</p>
                  {overdueCount > 0 ? (
                    <p className="text-xs text-gray-600 mt-0.5">
                      {overdueCount} fee account{overdueCount > 1 ? 's' : ''} overdue
                      {overdueAmountFmt ? ` — ${overdueAmountFmt} at risk` : ''}.
                      {' '}Proactive outreach recommended.
                    </p>
                  ) : (
                    <p className="text-xs text-gray-600 mt-0.5">No overdue fee accounts. Collections on track.</p>
                  )}
                </div>
              </div>

              {/* Board predictions */}
              {boardAlerts.length > 0 ? (
                <div className="flex gap-3 p-3 bg-purple/8 border border-purple/20 rounded-lg">
                  <Brain className="w-4 h-4 text-purple flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Board Prediction Alert</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {boardAlerts.map((b: any) => `${b.grade}: ${b.avgScore}%`).join(', ')} — below target. Review curriculum coverage.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 p-3 bg-purple/8 border border-purple/20 rounded-lg">
                  <Brain className="w-4 h-4 text-purple flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Board Predictions</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      No AI predictions generated yet. Run the prediction engine from AI Advisor.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Today's Timetable */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-navy" />
                <h3 className="font-sora font-semibold text-navy text-base">Today — Class X-A</h3>
              </div>
              <Link href="/timetable" className="text-xs text-navyMid hover:text-navy font-semibold flex items-center gap-1">
                Full <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-1.5">
              {todayEntries.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">No classes scheduled today</p>
              ) : todayEntries.map((e: any) => (
                <div key={e.id} className="flex items-center gap-2 text-xs">
                  <span className="w-10 text-gray-400 font-dm-sans flex-shrink-0">{e.periodSlot?.startTime?.slice(0, 5) ?? ''}</span>
                  <div className={`flex-1 px-2 py-1 rounded border ${subjectColors[e.subject?.name] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                    <span className="font-semibold">{e.subject?.name}</span>
                    {e.room && <span className="text-[10px] ml-1.5 opacity-70">{e.room}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-gold" />
              <h3 className="font-sora font-semibold text-navy text-base">Upcoming Events</h3>
            </div>
            <div className="space-y-2">
              {upcomingEvents.map((e, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="w-12 h-12 rounded-xl bg-iceLight flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-navy font-sora font-bold text-sm leading-none">{e.date.split(' ')[1]}</span>
                    <span className="text-navy/60 text-[9px] font-dm-sans">{e.date.split(' ')[0]}</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-700">{e.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

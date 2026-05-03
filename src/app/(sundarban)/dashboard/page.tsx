'use client';

import { useState, useEffect } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import StatCard from '@/components/shared/StatCard';
import AIBadge from '@/components/shared/AIBadge';
import { Users, CalendarCheck, CreditCard, UserCheck, Brain, AlertTriangle, TrendingDown, Trophy, ChevronRight, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import attendanceData from '@/data/attendance.json';
import admissionsData from '@/data/admissions.json';
import timetableData from '@/data/timetable.json';
import Link from 'next/link';

const stageBadgeColor: Record<string, string> = {
  'Inquiry': 'bg-gray-100 text-gray-600',
  'Application Received': 'bg-blue-100 text-blue-700',
  'Documents Verified': 'bg-purple-100 text-purple-700',
  'Interview Scheduled': 'bg-amber-100 text-amber-700',
  'Offer Made': 'bg-teal/10 text-teal',
  'Enrolled': 'bg-green/10 text-green',
  'Rejected': 'bg-coral/10 text-coral',
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const chartData = attendanceData.classWise.map(c => ({
    class: c.class.replace('Class ', 'Cl.'),
    percent: c.percent,
  }));

  const recentApplicants = admissionsData.applicants.slice(0, 5);
  const todayTimetable = timetableData.schedule['Class X-A'];
  const mondayPeriods = todayTimetable?.Monday?.slice(0, 8) ?? [];

  const upcomingEvents = [
    { date: 'Apr 14', title: 'Pre-Board Examination Begins', type: 'exam' },
    { date: 'Apr 18', title: 'PTA Meeting — All Classes', type: 'meeting' },
    { date: 'Apr 22', title: 'Annual Science Fair', type: 'event' },
  ];

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

  return (
    <PageWrapper>
      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Students" value="520" icon={Users} iconBg="bg-navy" trend="up" trendLabel="↑ 12 from last month" />
        <StatCard title="Today's Attendance" value="90%" icon={CalendarCheck} iconBg="bg-teal" subtitle="468 / 520 present" trendLabel="468 present today" trend="up" />
        <StatCard title="Fee Collected (Apr)" value="₹8.4L" icon={CreditCard} iconBg="bg-green" trend="up" trendLabel="₹2.7L pending" />
        <StatCard title="Active Staff" value="20/20" icon={UserCheck} iconBg="bg-navyMid" trend="neutral" trendLabel="All staff present" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-5 gap-5">
        {/* Left Column — 60% */}
        <div className="col-span-3 space-y-5">
          {/* Attendance Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-sora font-semibold text-navy text-base">Class-wise Attendance Today</h3>
                <p className="text-xs text-gray-400 mt-0.5">April 10, 2025</p>
              </div>
              <Link href="/attendance" className="text-xs text-navyMid hover:text-navy font-semibold flex items-center gap-1 transition-colors">
                View All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="class" tick={{ fontSize: 10, fontFamily: 'DM Sans' }} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 10, fontFamily: 'DM Sans' }} />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Attendance']}
                  contentStyle={{ fontFamily: 'DM Sans', fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="percent" fill="#F5C542" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
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
              {recentApplicants.map((a) => (
                <div key={a.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-iceLight flex items-center justify-center text-navy font-bold text-xs font-sora">
                    {a.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.applyingForClass} · {a.source}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stageBadgeColor[a.stage] ?? 'bg-gray-100 text-gray-600'}`}>
                    {a.stage}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column — 40% */}
        <div className="col-span-2 space-y-5">
          {/* AI Alerts */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-sora font-semibold text-navy text-base">AI Alerts</h3>
              <AIBadge />
            </div>
            <div className="space-y-3">
              <div className="flex gap-3 p-3 bg-amber/8 border border-amber/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-800">Attendance Alert</p>
                  <p className="text-xs text-gray-600 mt-0.5">Riya Bose (Class XI-A) has dropped below 75% attendance — counsellor follow-up recommended.</p>
                </div>
              </div>
              <div className="flex gap-3 p-3 bg-coral/8 border border-coral/20 rounded-lg">
                <TrendingDown className="w-4 h-4 text-coral flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-800">Fee Risk</p>
                  <p className="text-xs text-gray-600 mt-0.5">8 fee accounts overdue — ₹2.7L at risk. 5 likely to default next term.</p>
                </div>
              </div>
              <div className="flex gap-3 p-3 bg-purple/8 border border-purple/20 rounded-lg">
                <Brain className="w-4 h-4 text-purple flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-800">Board Prediction</p>
                  <p className="text-xs text-gray-600 mt-0.5">Class XII predicted board score: 79% — below school target of 84%. Review curriculum coverage.</p>
                </div>
              </div>
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
              {mondayPeriods.filter(p => p.subject !== 'Break').slice(0, 6).map((p) => (
                <div key={p.periodNo} className="flex items-center gap-2 text-xs">
                  <span className="w-8 text-gray-400 font-dm-sans flex-shrink-0">{p.startTime}</span>
                  <div className={`flex-1 px-2 py-1 rounded ${timetableData.subjectColors[p.subject as keyof typeof timetableData.subjectColors] ?? 'bg-gray-100 text-gray-700'} border`}>
                    <span className="font-semibold">{p.subject}</span>
                    <span className="text-[10px] ml-1.5 opacity-70">{p.room}</span>
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

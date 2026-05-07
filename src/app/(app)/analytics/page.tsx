'use client';

import { useState, useEffect } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import AIBadge from '@/components/shared/AIBadge';
import { TrendingUp, DollarSign, Users, Smartphone } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

const SUBJECT_COLORS = ['#1E2761', '#F5C542', '#028090', '#534AB7', '#D85A30', '#3B6D11'];

const STATIC_SUBJECT_PERF = [
  { class: 'Cl. VIII', english: 78, mathematics: 82, science: 80, history: 72, geography: 74, bengali: 81 },
  { class: 'Cl. IX', english: 76, mathematics: 84, science: 79, history: 70, geography: 73, bengali: 79 },
  { class: 'Cl. X', english: 80, mathematics: 88, science: 85, history: 74, geography: 77, bengali: 83 },
  { class: 'Cl. XI', english: 74, mathematics: 81, science: 83, history: 69, geography: 71, bengali: 77 },
  { class: 'Cl. XII', english: 77, mathematics: 83, science: 82, history: 71, geography: 72, bengali: 78 },
];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(res => { setData(res); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <PageWrapper>
        <div className="grid grid-cols-2 gap-5 mb-5">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
        <Skeleton className="h-28 rounded-xl" />
      </PageWrapper>
    );
  }

  const enrollmentTrend = data?.enrollmentTrend ?? [];
  const feeByMonth = (data?.feeByMonth ?? []).map((m: any) => ({
    month: m.month,
    amount: m.collected,
  }));
  const parentPct = data?.parentAppAdoption ?? 73;
  const totalStudents = data?.overview?.totalStudents ?? 520;
  const activatedCount = Math.round(totalStudents * (parentPct / 100));
  const donutData = [
    { name: 'Activated', value: activatedCount },
    { name: 'Not Activated', value: totalStudents - activatedCount },
  ];

  return (
    <PageWrapper>
      {/* Charts Grid 2×2 */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Enrollment Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-sora font-semibold text-navy">Enrollment Trend (2021–2026)</h3>
            <TrendingUp className="w-4 h-4 text-gold" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={enrollmentTrend} margin={{ top: 4, right: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fontFamily: 'DM Sans' }} />
              <YAxis domain={[400, 560]} tick={{ fontSize: 11, fontFamily: 'DM Sans' }} />
              <Tooltip contentStyle={{ fontFamily: 'DM Sans', fontSize: 12, borderRadius: 8 }} />
              <Line type="monotone" dataKey="students" stroke="#F5C542" strokeWidth={3} dot={{ fill: '#1E2761', r: 5 }} name="Students" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Fee Collection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-sora font-semibold text-navy">Monthly Fee Collection</h3>
            <DollarSign className="w-4 h-4 text-green" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={feeByMonth} margin={{ top: 4, right: 4, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fontFamily: 'DM Sans' }} />
              <YAxis tick={{ fontSize: 10, fontFamily: 'DM Sans' }} tickFormatter={v => `₹${(v / 100000).toFixed(1)}L`} />
              <Tooltip
                formatter={(v) => [`₹${(Number(v) / 100000).toFixed(2)}L`, 'Collection']}
                contentStyle={{ fontFamily: 'DM Sans', fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="amount" fill="#3B6D11" radius={[4, 4, 0, 0]} name="Fee Collected" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Subject Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-sora font-semibold text-navy">Subject Performance by Class</h3>
            <Users className="w-4 h-4 text-purple" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={STATIC_SUBJECT_PERF} margin={{ top: 4, right: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="class" tick={{ fontSize: 10, fontFamily: 'DM Sans' }} />
              <YAxis domain={[65, 95]} tick={{ fontSize: 10, fontFamily: 'DM Sans' }} />
              <Tooltip contentStyle={{ fontFamily: 'DM Sans', fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontFamily: 'DM Sans', fontSize: 11 }} />
              {['english', 'mathematics', 'science', 'history', 'geography', 'bengali'].map((sub, i) => (
                <Bar key={sub} dataKey={sub} fill={SUBJECT_COLORS[i]} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Parent App Adoption */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-sora font-semibold text-navy">Parent App Adoption</h3>
            <Smartphone className="w-4 h-4 text-teal" />
          </div>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" startAngle={90} endAngle={-270}>
                  <Cell fill="#028090" />
                  <Cell fill="#E8EFFE" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div>
              <div className="text-5xl font-sora font-bold text-navy mb-1">{parentPct}%</div>
              <p className="text-sm text-gray-500">{activatedCount} of {totalStudents} families</p>
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 rounded-full bg-teal" /><span>Activated: {activatedCount}</span></div>
                <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 rounded-full bg-iceLight border border-ice" /><span>Pending: {totalStudents - activatedCount}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forecast Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { title: 'Enrollment Forecast FY 2025-26', value: `${Math.round((data?.overview?.totalStudents ?? 520) * 1.048)} students`, sub: '↑ 4.8% growth projected', icon: TrendingUp },
          { title: 'Projected Fee Revenue', value: '₹1.24 Cr', sub: 'Based on current collection rate', icon: DollarSign },
          { title: 'Teacher Attendance Rate', value: `${data?.teacherAttendance ?? 96}%`, sub: 'Staff present today', icon: Users },
          { title: 'Teacher Attrition Risk', value: '2 staff', sub: 'AI flagged for retention review', icon: TrendingUp },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-gradient-to-br from-teal/10 to-iceLight border border-teal/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4 text-teal" />
                <AIBadge />
              </div>
              <p className="text-2xl font-sora font-bold text-navy mb-1">{card.value}</p>
              <p className="text-xs text-gray-500">{card.title}</p>
              <p className="text-[10px] text-teal font-semibold mt-1">{card.sub}</p>
            </div>
          );
        })}
      </div>
    </PageWrapper>
  );
}

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

// Used when DB has no mark entries yet
const FALLBACK_SUBJECT_PERF = [
  { class: 'Cl. VIII', english: 78, mathematics: 82, science: 80, history: 72, geography: 74, bengali: 81 },
  { class: 'Cl. IX',  english: 76, mathematics: 84, science: 79, history: 70, geography: 73, bengali: 79 },
  { class: 'Cl. X',  english: 80, mathematics: 88, science: 85, history: 74, geography: 77, bengali: 83 },
  { class: 'Cl. XI', english: 74, mathematics: 81, science: 83, history: 69, geography: 71, bengali: 77 },
  { class: 'Cl. XII',english: 77, mathematics: 83, science: 82, history: 71, geography: 72, bengali: 78 },
];
const FALLBACK_SUBJECT_KEYS = ['english', 'mathematics', 'science', 'history', 'geography', 'bengali'];

function subjectLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

type AnalyticsData = {
  overview: { totalStudents: number };
  enrollmentTrend: { year: number; students: number }[];
  feeByMonth: { month: string; collected: number }[];
  subjectPerformance: Record<string, number | string>[];
  parentAppAdoption: number;
  totalParents: number;
  activatedParents: number;
  teacherAttendance: number;
  forecast: {
    enrollmentNextYear: number;
    projectedFeeRevenue: string;
    growthPct: string;
    nextAcYearLabel: string;
    attritionRisk: number;
    teacherAttendance: number;
  };
};

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(res => { setData(res.data ?? res); setLoading(false); })
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
  const feeByMonth = (data?.feeByMonth ?? []).map((m) => ({
    month: m.month,
    amount: m.collected,
  }));

  // Subject performance: use real DB data if available, else fallback
  const rawSubjectPerf = data?.subjectPerformance ?? [];
  const subjectPerf = rawSubjectPerf.length > 0 ? rawSubjectPerf : FALLBACK_SUBJECT_PERF;
  const subjectKeys =
    rawSubjectPerf.length > 0
      ? Object.keys(rawSubjectPerf[0]).filter(k => k !== 'class')
      : FALLBACK_SUBJECT_KEYS;

  // Parent app donut
  const parentPct = data?.parentAppAdoption ?? 0;
  const totalParents = data?.totalParents ?? data?.overview?.totalStudents ?? 0;
  const activatedParents = data?.activatedParents ?? Math.round(totalParents * (parentPct / 100));
  const donutData = [
    { name: 'Activated', value: activatedParents },
    { name: 'Not Activated', value: Math.max(0, totalParents - activatedParents) },
  ];

  const forecast = data?.forecast;
  const totalStudents = data?.overview?.totalStudents ?? 0;

  return (
    <PageWrapper>
      {/* Charts Grid 2×2 */}
      <div className="grid grid-cols-2 gap-5 mb-5">

        {/* Enrollment Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-sora font-semibold text-navy">Enrollment Trend (last 6 years)</h3>
            <TrendingUp className="w-4 h-4 text-gold" />
          </div>
          {enrollmentTrend.some(d => d.students > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={enrollmentTrend} margin={{ top: 4, right: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fontFamily: 'DM Sans' }} />
                <YAxis tick={{ fontSize: 11, fontFamily: 'DM Sans' }} />
                <Tooltip contentStyle={{ fontFamily: 'DM Sans', fontSize: 12, borderRadius: 8 }} />
                <Line type="monotone" dataKey="students" stroke="#F5C542" strokeWidth={3}
                  dot={{ fill: '#1E2761', r: 5 }} name="Students" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">
              No enrollment data yet — add students to see the trend.
            </div>
          )}
        </div>

        {/* Monthly Fee Collection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-sora font-semibold text-navy">Monthly Fee Collection</h3>
            <DollarSign className="w-4 h-4 text-green" />
          </div>
          {feeByMonth.some(m => m.amount > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={feeByMonth} margin={{ top: 4, right: 4, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fontFamily: 'DM Sans' }} />
                <YAxis tick={{ fontSize: 10, fontFamily: 'DM Sans' }}
                  tickFormatter={v => `₹${(v / 100000).toFixed(1)}L`} />
                <Tooltip
                  formatter={(v) => [`₹${(Number(v) / 100000).toFixed(2)}L`, 'Collection']}
                  contentStyle={{ fontFamily: 'DM Sans', fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="amount" fill="#3B6D11" radius={[4, 4, 0, 0]} name="Fee Collected" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">
              No fee transactions recorded yet.
            </div>
          )}
        </div>

        {/* Subject Performance by Class */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-sora font-semibold text-navy">Subject Performance by Class</h3>
              {rawSubjectPerf.length === 0 && (
                <span className="text-[10px] bg-amber/10 text-amber font-semibold px-2 py-0.5 rounded-full">
                  Sample data
                </span>
              )}
            </div>
            <Users className="w-4 h-4 text-purple" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={subjectPerf} margin={{ top: 4, right: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="class" tick={{ fontSize: 10, fontFamily: 'DM Sans' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fontFamily: 'DM Sans' }} />
              <Tooltip contentStyle={{ fontFamily: 'DM Sans', fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontFamily: 'DM Sans', fontSize: 11 }} />
              {subjectKeys.map((sub, i) => (
                <Bar key={sub} dataKey={sub} name={subjectLabel(sub)}
                  fill={SUBJECT_COLORS[i % SUBJECT_COLORS.length]} radius={[2, 2, 0, 0]} />
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
          {totalParents > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                    dataKey="value" startAngle={90} endAngle={-270}>
                    <Cell fill="#028090" />
                    <Cell fill="#E8EFFE" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div>
                <div className="text-5xl font-sora font-bold text-navy mb-1">{parentPct}%</div>
                <p className="text-sm text-gray-500">{activatedParents} of {totalParents} families</p>
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-teal" />
                    <span>Activated: {activatedParents}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-iceLight border border-ice" />
                    <span>Pending: {totalParents - activatedParents}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-sm text-gray-400">
              No parent accounts registered yet.
            </div>
          )}
        </div>
      </div>

      {/* Forecast Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            title: `Enrollment Forecast FY ${forecast?.nextAcYearLabel ?? `${new Date().getFullYear() + 1}-${String(new Date().getFullYear() + 2).slice(2)}`}`,
            value: `${forecast?.enrollmentNextYear ?? Math.round(totalStudents * 1.048)} students`,
            sub: forecast?.growthPct ?? '↑ 4.8% growth projected',
            icon: TrendingUp,
          },
          {
            title: 'Projected Fee Revenue',
            value: forecast?.projectedFeeRevenue ?? '—',
            sub: 'Based on current monthly collection rate',
            icon: DollarSign,
          },
          {
            title: 'Teacher Attendance Rate',
            value: `${forecast?.teacherAttendance ?? data?.teacherAttendance ?? 0}%`,
            sub: 'Staff present today (excl. approved leave)',
            icon: Users,
          },
          {
            title: 'Teacher Attrition Risk',
            value: `${forecast?.attritionRisk ?? 0} staff`,
            sub: 'Flagged — >15 days leave this session',
            icon: TrendingUp,
          },
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

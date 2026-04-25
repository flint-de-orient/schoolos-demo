'use client';

import PageWrapper from '@/components/layout/PageWrapper';
import AIBadge from '@/components/shared/AIBadge';
import { TrendingUp, DollarSign, Users, Smartphone } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import analyticsData from '@/data/analytics.json';

const SUBJECT_COLORS = ['#1E2761', '#F5C542', '#028090', '#534AB7', '#D85A30', '#3B6D11'];

export default function AnalyticsPage() {
  const subjectChartData = Object.entries(analyticsData.subjectPerformance).map(([cls, scores]) => ({
    class: cls.replace('Class ', 'Cl.'),
    ...scores,
  }));

  const donutData = [
    { name: 'Activated', value: analyticsData.parentAppAdoption.activated },
    { name: 'Not Activated', value: analyticsData.parentAppAdoption.total - analyticsData.parentAppAdoption.activated },
  ];

  return (
    <PageWrapper>
      {/* Charts Grid 2×2 */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Enrollment Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-sora font-semibold text-navy">Enrollment Trend (2019–2025)</h3>
            <TrendingUp className="w-4 h-4 text-gold" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={analyticsData.enrollmentTrend} margin={{ top: 4, right: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fontFamily: 'DM Sans' }} />
              <YAxis domain={[400, 540]} tick={{ fontSize: 11, fontFamily: 'DM Sans' }} />
              <Tooltip contentStyle={{ fontFamily: 'DM Sans', fontSize: 12, borderRadius: 8 }} />
              <Line type="monotone" dataKey="students" stroke="#F5C542" strokeWidth={3} dot={{ fill: '#1E2761', r: 5 }} name="Students" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Fee Collection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-sora font-semibold text-navy">Monthly Fee Collection (2024-25)</h3>
            <DollarSign className="w-4 h-4 text-green" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analyticsData.feeCollectionByMonth} margin={{ top: 4, right: 4, left: -10 }}>
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
            <BarChart data={subjectChartData} margin={{ top: 4, right: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="class" tick={{ fontSize: 10, fontFamily: 'DM Sans' }} />
              <YAxis domain={[65, 90]} tick={{ fontSize: 10, fontFamily: 'DM Sans' }} />
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
              <div className="text-5xl font-sora font-bold text-navy mb-1">{analyticsData.parentAppAdoption.percent}%</div>
              <p className="text-sm text-gray-500">{analyticsData.parentAppAdoption.activated} of {analyticsData.parentAppAdoption.total} families</p>
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 rounded-full bg-teal" /><span>Activated: {analyticsData.parentAppAdoption.activated}</span></div>
                <div className="flex items-center gap-2 text-xs"><div className="w-3 h-3 rounded-full bg-iceLight border border-ice" /><span>Pending: {analyticsData.parentAppAdoption.total - analyticsData.parentAppAdoption.activated}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forecast Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { title: 'Enrollment Forecast FY 2025-26', value: `${analyticsData.forecasts.enrollment2026} students`, sub: `↑ ${analyticsData.forecasts.enrollmentGrowth}% growth projected`, icon: TrendingUp },
          { title: 'Projected Fee Revenue', value: '₹1.24 Cr', sub: 'Based on current collection rate', icon: DollarSign },
          { title: 'Teacher Attendance Rate', value: `${analyticsData.teacherAttendance.percent}%`, sub: `${analyticsData.teacherAttendance.present}/${analyticsData.teacherAttendance.total} staff today`, icon: Users },
          { title: 'Teacher Attrition Risk', value: `${analyticsData.forecasts.attritionRisk} staff`, sub: 'AI flagged for retention review', icon: TrendingUp },
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

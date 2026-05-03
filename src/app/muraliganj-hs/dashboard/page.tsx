'use client';

import Link from 'next/link';
import { Clock, Users, BookOpen, CheckCircle2, AlertCircle, Brain, ArrowRight, Calendar, Zap, TrendingUp } from 'lucide-react';
import schoolData   from '@/data/muraliganj/school.json';
import teachersData from '@/data/muraliganj/teachers.json';
import classesData  from '@/data/muraliganj/classes.json';
import timetableData from '@/data/muraliganj/timetable.json';

const activeTeachers   = teachersData.filter(t => t.status === 'active').length;
const onLeaveTeachers  = teachersData.filter(t => t.status === 'on-leave').length;
const totalSections    = classesData.length;
const totalStudents    = classesData.reduce((s, c) => s + c.students, 0);
const { qualityScore } = timetableData.meta;

const stats = [
  { label: 'Teachers',       value: activeTeachers,  sub: `${onLeaveTeachers} on leave`, icon: Users,       color: 'text-purple bg-purple/10' },
  { label: 'Classes',        value: totalSections,   sub: '6 standards · 2 sections',    icon: BookOpen,    color: 'text-teal bg-teal/10' },
  { label: 'Total Students', value: totalStudents,   sub: 'Enrolled 2026-27',             icon: TrendingUp,  color: 'text-green bg-green/10' },
  { label: 'Timetable Score',value: `${qualityScore.overall}/100`, sub: 'AI Generated · No conflicts', icon: Brain, color: 'text-gold bg-gold/10' },
];

const recentActivity = [
  { icon: CheckCircle2, color: 'text-green', text: 'Timetable generated successfully for all 12 sections', time: 'Today, 08:15 AM' },
  { icon: Brain,        color: 'text-teal',  text: 'AI resolved 3 teacher-period conflicts automatically', time: 'Today, 08:14 AM' },
  { icon: AlertCircle,  color: 'text-amber', text: 'Taslima Begum (English VII-VIII) marked on leave — substitution suggested', time: 'Today, 07:50 AM' },
  { icon: CheckCircle2, color: 'text-green', text: 'Academic Year 2026-27 configuration saved', time: 'Yesterday' },
];

const quickLinks = [
  { href: '/muraliganj-hs/timetable', label: 'View Full Timetable', icon: Clock,     desc: 'Class & teacher-wise grid', color: 'border-purple/30 bg-purple/5 hover:bg-purple/10' },
  { href: '/muraliganj-hs/timetable', label: 'Regenerate with AI',  icon: Brain,     desc: 'Update constraints & re-run', color: 'border-teal/30 bg-teal/5 hover:bg-teal/10' },
  { href: '/muraliganj-hs/teachers',  label: 'Manage Teachers',     icon: Users,     desc: '18 teachers · 1 on leave', color: 'border-gold/30 bg-gold/5 hover:bg-gold/10' },
  { href: '/muraliganj-hs/classes',   label: 'Classes & Subjects',  icon: BookOpen,  desc: '12 sections configured', color: 'border-green/30 bg-green/5 hover:bg-green/10' },
];

export default function MHSDashboard() {
  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-navy to-navyMid rounded-xl p-5 text-white flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-gold" />
            <span className="text-gold text-xs font-sora font-semibold uppercase tracking-wide">SchoolOS · Timetable Engine</span>
          </div>
          <h2 className="font-sora font-bold text-xl">Welcome, Mr. Samsul Alam</h2>
          <p className="text-ice/70 text-sm mt-1">Your timetable for Academic Year 2026-27 is live and conflict-free.</p>
        </div>
        <Link
          href="/muraliganj-hs/timetable"
          className="flex items-center gap-2 bg-gold text-navy font-sora font-semibold text-sm px-4 py-2 rounded-lg hover:bg-gold/90 transition-colors"
        >
          Open Timetable <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500 font-dm-sans">{s.label}</span>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="font-sora font-bold text-3xl text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Timetable quality */}
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-sora font-semibold text-gray-900">Timetable Quality Report</h3>
            <span className="flex items-center gap-1 text-[10px] bg-teal/10 text-teal px-2 py-0.5 rounded-full font-semibold">
              <Brain className="w-3 h-3" /> AI Generated
            </span>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Conflict-Free Score',       value: qualityScore.conflictFree, color: 'bg-green',  desc: 'No teacher double-bookings' },
              { label: 'Teacher Fatigue Index',     value: qualityScore.teacherFatigue, color: 'bg-teal', desc: 'Balanced load distribution' },
              { label: 'Pedagogical Distribution',  value: qualityScore.pedagogy,     color: 'bg-purple', desc: 'Subjects spread optimally across the week' },
            ].map((m) => (
              <div key={m.label}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-700 font-dm-sans">{m.label}</span>
                  <span className="text-sm font-sora font-bold text-gray-900">{m.value}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-2 ${m.color} rounded-full transition-all`} style={{ width: `${m.value}%` }} />
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">{m.desc}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-green/5 border border-green/20 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green flex-shrink-0" />
            <span className="text-sm text-green font-semibold">All 12 sections · 534 slots filled · 0 conflicts detected</span>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-gray-400" />
            <h3 className="font-sora font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="space-y-3">
            {recentActivity.map((a, i) => {
              const Icon = a.icon;
              return (
                <div key={i} className="flex gap-2.5">
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${a.color}`} />
                  <div>
                    <p className="text-xs text-gray-700 leading-snug">{a.text}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{a.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h3 className="font-sora font-semibold text-gray-700 text-sm mb-3">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-4">
          {quickLinks.map((l) => {
            const Icon = l.icon;
            return (
              <Link key={l.label} href={l.href} className={`border rounded-xl p-4 transition-colors ${l.color}`}>
                <Icon className="w-5 h-5 text-navy mb-2" />
                <div className="font-sora font-semibold text-sm text-gray-800">{l.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{l.desc}</div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* School info footer */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between text-xs text-gray-400">
        <span className="font-sora font-semibold text-gray-600">{schoolData.name}</span>
        <span>Board: {schoolData.board} · Est. {schoolData.estYear} · UDISE: {schoolData.udiseCode}</span>
        <span className="bg-teal/10 text-teal px-2 py-0.5 rounded-full font-semibold">
          {schoolData.plan}
        </span>
      </div>
    </div>
  );
}

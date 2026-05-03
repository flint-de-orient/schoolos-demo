'use client';

import { useState } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { Building, Calendar, ToggleLeft, Users, Bell, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const moduleGroups = [
  {
    pillar: 'School Operations',
    modules: [
      { id: 'admissions', name: 'Admissions Pipeline', desc: 'Kanban-style lead management', on: true },
      { id: 'attendance', name: 'Attendance Intelligence', desc: 'AI-powered attendance tracking', on: true },
      { id: 'timetable', name: 'Smart Timetable', desc: 'Auto-scheduling with substitution', on: true },
      { id: 'examinations', name: 'Examination Control', desc: 'Hall tickets, seating, results', on: true },
      { id: 'transport', name: 'Transport & GPS', desc: 'Live bus tracking + SOS alerts', on: true },
      { id: 'health', name: 'Health & Medical', desc: 'Nurse log, vaccination tracker', on: false },
    ],
  },
  {
    pillar: 'Learning',
    modules: [
      { id: 'academics', name: 'Academics & Assessment', desc: 'Syllabus tracker, report cards', on: true },
      { id: 'library', name: 'Library Management', desc: 'Book catalog, issue tracking', on: true },
      { id: 'homework', name: 'Homework Tracker', desc: 'Assignment management', on: false },
    ],
  },
  {
    pillar: 'Finance',
    modules: [
      { id: 'fee', name: 'Fee Management', desc: 'Billing, reminders, collections', on: true },
      { id: 'payroll', name: 'Payroll & Salary', desc: 'Staff payslip generation', on: true },
    ],
  },
  {
    pillar: 'AI & Analytics',
    modules: [
      { id: 'ai-advisor', name: 'AI Academic Advisor', desc: 'Predictive scoring, at-risk alerts', on: true },
      { id: 'analytics', name: 'Predictive Analytics', desc: 'Enrollment, revenue forecasts', on: true },
    ],
  },
  {
    pillar: 'Parent Connect',
    modules: [
      { id: 'parent-app', name: 'Parent App', desc: 'Mobile app for parents', on: true },
      { id: 'school-shop', name: 'School Shop', desc: 'Online store + wallet payments', on: false },
      { id: 'communication', name: 'Communication Hub', desc: 'Announcements and circulars', on: true },
    ],
  },
];

export default function SettingsPage() {
  const [modules, setModules] = useState<Record<string, boolean>>(
    Object.fromEntries(moduleGroups.flatMap(g => g.modules.map(m => [m.id, m.on])))
  );

  const toggleModule = (id: string) => {
    setModules(prev => {
      const next = { ...prev, [id]: !prev[id] };
      toast.success(next[id] ? `Module activated` : `Module deactivated`, {
        description: moduleGroups.flatMap(g => g.modules).find(m => m.id === id)?.name,
      });
      return next;
    });
  };

  const activeCount = Object.values(modules).filter(Boolean).length;

  return (
    <PageWrapper>
      <div className="grid grid-cols-3 gap-5">
        {/* Main Settings */}
        <div className="col-span-2 space-y-5">
          {/* School Profile */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-4">
              <Building className="w-5 h-5 text-navy" />
              <h3 className="font-sora font-semibold text-navy">School Profile</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'School Name', val: 'Sundarban Academy' },
                { label: 'Location', val: 'Kolkata, West Bengal' },
                { label: 'Affiliation', val: 'CISCE Board' },
                { label: 'UDISE Code', val: '19010101001' },
                { label: 'Principal', val: 'Dr. Rajesh Sharma' },
                { label: 'Email', val: 'principal@sundarbanacademy.edu.in' },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-xs text-gray-400 uppercase tracking-wide">{f.label}</label>
                  <input
                    defaultValue={f.val}
                    className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Academic Year */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-navy" />
              <h3 className="font-sora font-semibold text-navy">Academic Year</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Current Year', val: '2024-25' },
                { label: 'Year Start', val: '2024-04-01' },
                { label: 'Year End', val: '2025-03-31' },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-xs text-gray-400 uppercase tracking-wide">{f.label}</label>
                  <input
                    defaultValue={f.val}
                    className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Module Activation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <ToggleLeft className="w-5 h-5 text-navy" />
                <h3 className="font-sora font-semibold text-navy">Module Activation</h3>
              </div>
              <span className="text-sm text-gray-500 font-dm-sans">{activeCount} / {Object.keys(modules).length} active</span>
            </div>
            <div className="space-y-6">
              {moduleGroups.map(group => (
                <div key={group.pillar}>
                  <p className="text-xs font-sora font-bold text-gray-400 uppercase tracking-wide mb-2">{group.pillar}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {group.modules.map(m => (
                      <div key={m.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${modules[m.id] ? 'border-navy/20 bg-iceLight' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{m.name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{m.desc}</p>
                        </div>
                        <button
                          onClick={() => toggleModule(m.id)}
                          className={`w-10 h-5 rounded-full transition-all flex-shrink-0 ml-2 relative ${modules[m.id] ? 'bg-teal' : 'bg-gray-300'}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${modules[m.id] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-5">
          {/* Billing */}
          <div className="bg-gradient-to-br from-navy to-navyMid rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-gold" />
              <h3 className="font-sora font-semibold text-base">Current Plan</h3>
            </div>
            <div className="bg-white/10 rounded-xl p-4 mb-4">
              <p className="text-gold font-sora font-bold text-xl mb-1">Growth Plan</p>
              <p className="text-white/80 text-2xl font-sora font-bold">₹3.2L<span className="text-sm font-normal text-white/60">/year</span></p>
              <p className="text-white/60 text-xs mt-1">Renews April 2026</p>
            </div>
            <div className="space-y-2 text-sm text-white/80">
              <div className="flex justify-between">
                <span>Active Modules</span>
                <span className="font-bold text-gold">{activeCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Student Seats</span>
                <span className="font-bold">600</span>
              </div>
              <div className="flex justify-between">
                <span>Staff Seats</span>
                <span className="font-bold">50</span>
              </div>
              <div className="flex justify-between">
                <span>Support</span>
                <span className="font-bold">Priority 24/7</span>
              </div>
            </div>
            <button className="w-full mt-4 py-2.5 bg-gold text-navy font-semibold text-sm rounded-xl hover:bg-gold/90 transition-colors">
              Manage Subscription
            </button>
          </div>

          {/* User Roles */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-navy" />
              <h3 className="font-sora font-semibold text-navy text-sm">User Roles</h3>
            </div>
            {[
              { role: 'Super Admin', users: 1, color: 'bg-navy/10 text-navy' },
              { role: 'Principal', users: 1, color: 'bg-purple/10 text-purple' },
              { role: 'Teacher', users: 14, color: 'bg-teal/10 text-teal' },
              { role: 'Admin Staff', users: 2, color: 'bg-amber/10 text-amber' },
              { role: 'Parent (App)', users: 380, color: 'bg-green/10 text-green' },
            ].map(r => (
              <div key={r.role} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.color}`}>{r.role}</span>
                <span className="text-sm font-bold text-gray-700">{r.users}</span>
              </div>
            ))}
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-4 h-4 text-navy" />
              <h3 className="font-sora font-semibold text-navy text-sm">Notification Channels</h3>
            </div>
            {['WhatsApp Alerts', 'Email Reports', 'SMS (Bulk)', 'In-App Push', 'Daily Summary Email'].map((n, i) => (
              <div key={n} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-700">{n}</span>
                <button className={`w-8 h-4 rounded-full relative transition-colors ${i < 3 ? 'bg-teal' : 'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${i < 3 ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

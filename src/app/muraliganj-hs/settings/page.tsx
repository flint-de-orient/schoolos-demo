'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { School, Clock, Brain, Save } from 'lucide-react';
import schoolData from '@/data/muraliganj/school.json';

export default function MHSSettingsPage() {
  const [schoolName, setSchoolName] = useState(schoolData.name);
  const [hmName,     setHmName]     = useState(schoolData.headMaster);
  const [startTime,  setStartTime]  = useState(schoolData.timing.start);
  const [periods,    setPeriods]    = useState(schoolData.timing.periodsPerDay);

  return (
    <div className="p-6 space-y-6 animate-fadeIn max-w-3xl">
      <div>
        <h2 className="font-sora font-bold text-2xl text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-1">School profile and timetable engine configuration</p>
      </div>

      {/* School Profile */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <School className="w-4 h-4 text-navy" />
          <h3 className="font-sora font-semibold text-gray-900">School Profile</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">School Name</label>
            <input value={schoolName} onChange={e => setSchoolName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-dm-sans focus:outline-none focus:ring-2 focus:ring-navy/20" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Head Master</label>
            <input value={hmName} onChange={e => setHmName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-dm-sans focus:outline-none focus:ring-2 focus:ring-navy/20" />
          </div>
          {[
            { label: 'District',  value: schoolData.location.district },
            { label: 'Board',     value: schoolData.board },
            { label: 'Est. Year', value: String(schoolData.estYear) },
            { label: 'UDISE Code',value: schoolData.udiseCode },
          ].map(f => (
            <div key={f.label}>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">{f.label}</label>
              <input defaultValue={f.value} readOnly
                className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-sm font-dm-sans text-gray-500 cursor-not-allowed" />
            </div>
          ))}
        </div>
      </div>

      {/* Timing */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-navy" />
          <h3 className="font-sora font-semibold text-gray-900">School Timing</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">School Start Time</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-dm-sans focus:outline-none focus:ring-2 focus:ring-navy/20" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Periods / Day (Mon–Fri)</label>
            <select value={periods} onChange={e => setPeriods(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-dm-sans focus:outline-none focus:ring-2 focus:ring-navy/20">
              {[6,7,8,9].map(n => <option key={n} value={n}>{n} periods</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Saturday Periods</label>
            <input readOnly defaultValue={schoolData.timing.saturdayPeriods}
              className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-sm font-dm-sans text-gray-500 cursor-not-allowed" />
          </div>
        </div>
        {/* Period slots preview */}
        <div className="mt-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Period Slots</div>
          <div className="flex flex-wrap gap-2">
            {schoolData.slots.map(s => (
              <span key={s.no} className="text-xs bg-iceLight text-navy px-2 py-1 rounded-lg font-dm-sans">
                P{s.no}: {s.start}–{s.end}
              </span>
            ))}
            <span className="text-xs bg-amber/10 text-amber px-2 py-1 rounded-lg font-dm-sans">
              {schoolData.timing.breakLabel}: 13:10–13:40
            </span>
          </div>
        </div>
      </div>

      {/* Module */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-4 h-4 text-teal" />
          <h3 className="font-sora font-semibold text-gray-900">Active Modules</h3>
        </div>
        <div className="space-y-2">
          {[
            { label: 'AI Timetable Engine', active: true,  desc: 'Auto-generates conflict-free timetables using constraint solving' },
            { label: 'Substitution Manager',active: true,  desc: 'AI-suggests substitutes when teachers are absent' },
            { label: 'Fee Management',      active: false, desc: 'Student fee tracking and payment recording' },
            { label: 'Admissions Pipeline', active: false, desc: 'Manage student applications and enrolment' },
            { label: 'Attendance',          active: false, desc: 'Daily attendance marking and reports' },
          ].map(m => (
            <div key={m.label} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
              <div>
                <div className="text-sm font-semibold text-gray-800">{m.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{m.desc}</div>
              </div>
              <div className={`relative w-9 h-5 rounded-full transition-colors ${m.active ? 'bg-teal' : 'bg-gray-200'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${m.active ? 'left-4' : 'left-0.5'}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Plan */}
      <div className="bg-navy/3 border border-navy/10 rounded-xl p-4 flex items-center justify-between">
        <div>
          <div className="font-sora font-semibold text-navy text-sm">{schoolData.plan}</div>
          <div className="text-xs text-gray-400 mt-0.5">Tenant since {new Date(schoolData.tenantSince).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · Powered by SchoolOS</div>
        </div>
        <span className="bg-teal/10 text-teal text-xs font-semibold px-3 py-1.5 rounded-full">Active</span>
      </div>

      <button
        onClick={() => toast.success('Settings saved successfully')}
        className="flex items-center gap-2 bg-navy text-white font-sora font-semibold px-5 py-2.5 rounded-xl hover:bg-navyMid transition-colors"
      >
        <Save className="w-4 h-4" /> Save Changes
      </button>
    </div>
  );
}

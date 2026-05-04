'use client';

import PageWrapper from '@/components/layout/PageWrapper';
import { CheckCircle, ShoppingBag, MessageSquare, Activity, Calendar, Map, CreditCard, BookOpen, Heart, ClipboardList } from 'lucide-react';

const zones = [
  { no: '01', name: 'My Child Dashboard', icon: Activity, desc: 'Attendance, assignments, fee status, and daily summary at a glance.', color: 'bg-navy', textColor: 'text-navy' },
  { no: '02', name: 'Homework & Assignments', icon: BookOpen, desc: 'View, track, and submit assignments. Get reminders for due dates.', color: 'bg-purple', textColor: 'text-purple' },
  { no: '03', name: 'Live Safety Tracker', icon: Map, desc: 'Real-time bus GPS, ETA, SOS alerts, and route progress.', color: 'bg-teal', textColor: 'text-teal' },
  { no: '04', name: 'Fee & Smart Payments', icon: CreditCard, desc: 'View fee dues, pay via UPI, get receipts instantly on your phone.', color: 'bg-green', textColor: 'text-green' },
  { no: '05', name: 'School Shop', icon: ShoppingBag, desc: 'Buy uniforms, books, stationery. Charges directly to parent wallet.', color: 'bg-amber', textColor: 'text-amber' },
  { no: '06', name: 'Communication Hub', icon: MessageSquare, desc: 'Chat with teachers, receive circulars, and school announcements.', color: 'bg-coral', textColor: 'text-coral' },
  { no: '07', name: 'Academic Progress', icon: ClipboardList, desc: 'View marks, report cards, AI-predicted board scores with trends.', color: 'bg-navyMid', textColor: 'text-navyMid' },
  { no: '08', name: 'Health & Wellness', icon: Heart, desc: 'Nurse visit logs, vaccination records, medical alerts.', color: 'bg-pink', textColor: 'text-pink' },
  { no: '09', name: 'Calendar & Events', icon: Calendar, desc: 'School events, exam schedules, holidays, and PTM dates.', color: 'bg-orange-500', textColor: 'text-orange-600' },
];

export default function ParentAppPage() {
  return (
    <PageWrapper>
      <div className="flex flex-col items-center mb-8">
        <div className="relative">
          {/* Phone frame */}
          <div className="w-64 h-[520px] bg-gray-900 rounded-[2.5rem] shadow-2xl border-4 border-gray-800 overflow-hidden relative">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-gray-900 rounded-b-2xl z-10" />
            {/* Screen */}
            <div className="w-full h-full bg-white overflow-hidden">
              {/* Status bar */}
              <div className="gradient-navy h-8 flex items-center justify-between px-6 pt-1">
                <span className="text-white text-[10px] font-bold">9:41</span>
                <span className="text-white text-[10px]">●●●</span>
              </div>
              {/* App content */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl gradient-navy flex items-center justify-center">
                    <span className="text-gold font-bold text-xs">S</span>
                  </div>
                  <div>
                    <p className="text-xs font-sora font-bold text-navy">SchoolOS Parent</p>
                    <p className="text-[9px] text-gray-400">Arjun Chatterjee · Class X-A</p>
                  </div>
                </div>

                {/* Today card */}
                <div className="bg-gradient-to-r from-navy to-navyMid rounded-2xl p-3 mb-3 text-white">
                  <p className="text-[9px] opacity-70 mb-1">TODAY — APR 10</p>
                  <div className="flex items-center gap-1.5 mb-2">
                    <CheckCircle className="w-3 h-3 text-gold" />
                    <span className="text-[10px] font-semibold">Present · 1st period attended</span>
                  </div>
                  <div className="bg-teal/30 rounded-xl p-2 text-[9px]">
                    🚌 Bus arriving in 12 mins — Gariahat stop
                  </div>
                </div>

                {/* Mini stats */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { label: 'Attendance', val: '87%', color: 'text-green' },
                    { label: 'Fee Status', val: 'Paid ✓', color: 'text-green' },
                    { label: 'HW Due', val: '2 tasks', color: 'text-amber' },
                    { label: 'Board Pred.', val: '84%', color: 'text-navy' },
                  ].map(item => (
                    <div key={item.label} className="bg-gray-50 rounded-xl p-2">
                      <p className="text-[8px] text-gray-400">{item.label}</p>
                      <p className={`text-[11px] font-bold ${item.color}`}>{item.val}</p>
                    </div>
                  ))}
                </div>

                {/* Homework items */}
                <div className="text-[9px] space-y-1">
                  <p className="font-bold text-gray-500 uppercase tracking-wide">Due Soon</p>
                  <div className="flex items-center gap-1.5 p-1.5 bg-amber/8 rounded-lg">
                    <BookOpen className="w-3 h-3 text-amber" />
                    <span className="text-gray-700">Maths — Chapter 5 · Due Apr 12</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1.5 bg-blue-50 rounded-lg">
                    <BookOpen className="w-3 h-3 text-blue-500" />
                    <span className="text-gray-700">English Essay · Due Apr 14</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Home indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-20 h-1 bg-gray-800 rounded-full" />
          </div>
        </div>

        <p className="text-sm text-gray-500 font-dm-sans mt-4 text-center max-w-xs">
          73% of parents have activated the SchoolOS Parent App · 380 of 520 families
        </p>
      </div>

      {/* Zone Cards */}
      <div className="grid grid-cols-3 gap-4">
        {zones.map(z => {
          const Icon = z.icon;
          return (
            <div key={z.no} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all group">
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 ${z.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className={`text-[10px] font-bold ${z.textColor} bg-current/10 px-1.5 py-0.5 rounded-full`} style={{ background: 'transparent' }}>
                    Zone {z.no}
                  </span>
                  <h4 className="font-sora font-semibold text-navy text-sm mt-0.5">{z.name}</h4>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">{z.desc}</p>
              <button className="w-full py-2 text-xs font-semibold text-navy border border-navy/20 rounded-lg hover:bg-navy hover:text-white transition-colors">
                Activate
              </button>
            </div>
          );
        })}
      </div>
    </PageWrapper>
  );
}

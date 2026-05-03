'use client';

import { usePathname } from 'next/navigation';
import { Bell, CalendarDays } from 'lucide-react';

const pageTitles: Record<string, string> = {
  '/muraliganj-hs/dashboard': 'Dashboard',
  '/muraliganj-hs/timetable': 'AI Timetable Engine',
  '/muraliganj-hs/teachers':  'Teachers',
  '/muraliganj-hs/classes':   'Classes & Subjects',
  '/muraliganj-hs/settings':  'Settings',
};

export default function MHSTopbar() {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? 'SchoolOS';
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-gray-100 flex items-center px-6 z-30 shadow-sm">
      <div className="flex-1">
        <h1 className="font-sora font-semibold text-navy text-lg leading-tight">{title}</h1>
        <p className="text-[11px] text-gray-400 font-dm-sans italic">Muraliganj High School (H.S) · Murshidabad</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <CalendarDays className="w-3.5 h-3.5" />
          {today}
        </div>
        <button className="relative p-2 rounded-lg hover:bg-gray-50 transition-colors">
          <Bell className="w-4 h-4 text-gray-400" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-coral rounded-full" />
        </button>
        <div className="flex items-center gap-2 pl-4 border-l border-gray-100">
          <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center text-gold font-bold text-xs font-sora">
            SA
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-semibold text-gray-700 leading-tight">Mr. Samsul Alam</div>
            <div className="text-[10px] text-gray-400">Head Master</div>
          </div>
        </div>
      </div>
    </header>
  );
}

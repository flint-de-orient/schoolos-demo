'use client';

import { Bell, Search, ChevronDown } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTenantSafe } from '@/context/TenantContext';

const pageTitles: Record<string, string> = {
  '/dashboard':    'Dashboard',
  '/students':     'Student Management',
  '/admissions':   'Admissions Pipeline',
  '/attendance':   'Attendance Intelligence',
  '/timetable':    'AI Timetable Engine',
  '/academics':    'Academics & Assessment',
  '/examinations': 'Examination Control',
  '/fee':          'Fee Management',
  '/library':      'Library Management',
  '/transport':    'Transport & GPS',
  '/health':       'Health & Medical',
  '/hr':           'HR & Staff',
  '/id-cards':     'ID Cards & Certificates',
  '/parent-portal':'Parent Portal',
  '/parent-app':   'Parent App Preview',
  '/school-shop':  'School Shop',
  '/ai-advisor':   'AI Academic Advisor',
  '/analytics':    'Predictive Analytics',
  '/settings':     'Settings',
  '/exam-engine':  'Exam Engine',
};

export default function Topbar() {
  const pathname = usePathname();
  const tenant   = useTenantSafe();

  const baseRoute = '/' + pathname.split('/')[1];
  const title = pageTitles[baseRoute] ?? 'SchoolOS';

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const schoolLine = tenant ? `${tenant.name} · ${tenant.city}` : 'SchoolOS';

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-gray-200/80 flex items-center px-6 z-30 shadow-sm">
      <div className="flex-1">
        <h1 className="font-sora font-semibold text-navy text-lg leading-tight">{title}</h1>
        <p className="text-[11px] text-gray-400 font-dm-sans italic">{schoolLine}</p>
      </div>

      <div className="hidden md:flex items-center text-sm text-gray-500 font-dm-sans">
        {today}
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-navy hover:bg-gray-100 rounded-lg transition-colors">
          <Search className="w-4 h-4" />
        </button>

        <button className="relative w-8 h-8 flex items-center justify-center text-gray-400 hover:text-navy hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-coral rounded-full text-white text-[9px] font-bold flex items-center justify-center">5</span>
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-gray-200 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-full gradient-navy flex items-center justify-center text-white font-bold text-xs font-sora shadow-sm">
            {tenant?.headInitials ?? '?'}
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-semibold text-navy font-dm-sans leading-tight">{tenant?.headName ?? 'Admin'}</div>
            <div className="text-[10px] text-gray-400">{tenant?.headTitle ?? 'Administrator'}</div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </div>
      </div>
    </header>
  );
}

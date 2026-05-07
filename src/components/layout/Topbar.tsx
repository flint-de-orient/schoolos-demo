'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Search, ChevronDown, CalendarDays, Check } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTenantSafe } from '@/context/TenantContext';
import { useAcademicYearSafe } from '@/context/AcademicYearContext';

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
  const tenant = useTenantSafe();
  const ayCtx = useAcademicYearSafe();
  const [yearOpen, setYearOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const baseRoute = '/' + pathname.split('/')[1];
  const title = pageTitles[baseRoute] ?? 'SchoolOS';

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const schoolLine = tenant ? `${tenant.name} · ${tenant.city}` : 'SchoolOS';

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setYearOpen(false);
      }
    }
    if (yearOpen) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [yearOpen]);

  const viewingYear = ayCtx?.viewingYear;
  const dbCurrentYear = ayCtx?.dbCurrentYear;
  const isViewingCurrent = viewingYear?.id === dbCurrentYear?.id;

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-gray-200/80 flex items-center px-6 z-30 shadow-sm">
      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="font-sora font-semibold text-navy text-lg leading-tight">{title}</h1>
        <p className="text-[11px] text-gray-400 font-dm-sans italic truncate">{schoolLine}</p>
      </div>

      {/* Date */}
      <div className="hidden lg:flex items-center text-sm text-gray-500 font-dm-sans mr-4">
        {today}
      </div>

      {/* ── Academic Year Selector ── */}
      {ayCtx && (
        <div className="relative mr-3" ref={dropRef}>
          <button
            onClick={() => setYearOpen((o) => !o)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
              isViewingCurrent
                ? 'bg-navy/8 border-navy/20 text-navy hover:bg-navy/12'
                : 'bg-amber/10 border-amber/30 text-amber hover:bg-amber/15'
            }`}
            title={isViewingCurrent ? 'Current session' : 'Viewing historical session'}
          >
            <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{viewingYear?.label ?? '—'}</span>
            {!isViewingCurrent && (
              <span className="text-[9px] font-bold bg-amber/20 text-amber px-1 py-0.5 rounded uppercase tracking-wide">
                Past
              </span>
            )}
            <ChevronDown className={`w-3 h-3 transition-transform ${yearOpen ? 'rotate-180' : ''}`} />
          </button>

          {yearOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
              <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Academic Sessions</p>
              </div>
              <div className="max-h-56 overflow-y-auto">
                {(ayCtx.years ?? []).map((y) => {
                  const isViewing = y.id === viewingYear?.id;
                  const isCurrent = y.isCurrent;
                  return (
                    <button
                      key={y.id}
                      onClick={() => { ayCtx.setViewingYear(y); setYearOpen(false); }}
                      className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left ${isViewing ? 'bg-navy/5' : ''}`}
                    >
                      <div>
                        <span className={`text-sm font-semibold ${isViewing ? 'text-navy' : 'text-gray-700'}`}>
                          {y.label}
                        </span>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {new Date(y.startDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                          {' — '}
                          {new Date(y.endDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        {isCurrent && (
                          <span className="text-[9px] font-bold bg-green/10 text-green px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                            Active
                          </span>
                        )}
                        {isViewing && <Check className="w-3.5 h-3.5 text-navy" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
                <p className="text-[9px] text-gray-400">
                  Switch to view data for any session. &quot;Active&quot; = official current year.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Icons */}
      <div className="flex items-center gap-2">
        <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-navy hover:bg-gray-100 rounded-lg transition-colors">
          <Search className="w-4 h-4" />
        </button>

        <button className="relative w-8 h-8 flex items-center justify-center text-gray-400 hover:text-navy hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-coral rounded-full text-white text-[9px] font-bold flex items-center justify-center">5</span>
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-gray-200 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-full gradient-navy flex items-center justify-center text-white font-bold text-xs font-sora shadow-sm">
            {tenant?.headName?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'}
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

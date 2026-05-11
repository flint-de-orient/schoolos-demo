'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, UserPlus, CalendarCheck, Clock,
  FileText, CreditCard, Library, Bus, Heart, Users,
  Smartphone, ShoppingBag, Brain, BarChart3, Settings,
  Sparkles, GraduationCap, ChevronRight, BookUser, IdCard, Globe,
  LogOut, Bell, Layers,
} from 'lucide-react';
import { useTenantSafe } from '@/context/TenantContext';
import { signOut } from 'next-auth/react';

const allNavGroups = [
  {
    label: 'Overview',
    items: [
      { moduleId: 'dashboard',    href: '/dashboard',    label: 'Dashboard',           icon: LayoutDashboard },
    ],
  },
  {
    label: 'School Operations',
    items: [
      { moduleId: 'students',     href: '/students',     label: 'Students',            icon: BookUser },
      { moduleId: 'id_cards',     href: '/id-cards',     label: 'ID Cards & Certs',    icon: IdCard },
      { moduleId: 'admissions',   href: '/admissions',   label: 'Admissions',          icon: UserPlus },
      { moduleId: 'attendance',   href: '/attendance',   label: 'Attendance',          icon: CalendarCheck },
      { moduleId: 'timetable',    href: '/timetable',    label: 'AI Timetable',        icon: Clock, ai: true as const },
      { moduleId: 'examinations', href: '/examinations', label: 'Examinations',        icon: FileText },
      { moduleId: 'transport',    href: '/transport',    label: 'Transport',           icon: Bus },
      { moduleId: 'health',       href: '/health',       label: 'Health',              icon: Heart },
    ],
  },
  {
    label: 'Learning',
    items: [
      { moduleId: 'academics',    href: '/academics',         label: 'Academics',           icon: GraduationCap },
      { moduleId: 'academics',    href: '/academics/classes', label: 'Classes & Sections',  icon: Layers },
      { moduleId: 'exam_engine',  href: '/exam-engine',       label: 'Exam Engine',         icon: FileText, ai: true as const },
      { moduleId: 'library',      href: '/library',           label: 'Library',             icon: Library },
    ],
  },
  {
    label: 'People',
    items: [
      { moduleId: 'hr',           href: '/hr',           label: 'HR & Staff',          icon: Users },
    ],
  },
  {
    label: 'Finance',
    items: [
      { moduleId: 'fee',          href: '/fee',          label: 'Fee Management',      icon: CreditCard },
    ],
  },
  {
    label: 'AI & Insights',
    items: [
      { moduleId: 'ai_advisor',   href: '/ai-advisor',   label: 'AI Advisor',          icon: Brain,    ai: true as const },
      { moduleId: 'analytics',    href: '/analytics',    label: 'Analytics',           icon: BarChart3, ai: true as const },
    ],
  },
  {
    label: 'Parent Connect',
    items: [
      { moduleId: 'parent_portal',href: '/parent-portal',label: 'Parent Portal',       icon: Globe },
      { moduleId: 'parent_app',   href: '/parent-app',   label: 'Parent App',          icon: Smartphone },
      { moduleId: 'school_shop',  href: '/school-shop',  label: 'School Shop',         icon: ShoppingBag },
    ],
  },
  {
    label: 'System',
    items: [
      { moduleId: 'notifications', href: '/notifications', label: 'Notification Log',   icon: Bell },
      { moduleId: 'settings',      href: '/settings',      label: 'Settings',           icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const tenant   = useTenantSafe();

  const allowedModules = new Set(tenant?.modules ?? []);

  const visibleGroups = allNavGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => allowedModules.has(item.moduleId)),
    }))
    .filter(group => group.items.length > 0);

  function handleLogout() {
    signOut({ callbackUrl: '/login' });
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 gradient-navy flex flex-col z-40 shadow-2xl">
      {/* Logo + School */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gold rounded-xl flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-navy" />
          </div>
          <div>
            <div className="font-sora font-bold text-white text-[15px] leading-tight">SchoolOS</div>
            <div className="text-ice/60 text-[10px] font-dm-sans tracking-wide">AI-Powered ERP</div>
          </div>
        </div>
        {tenant && (
          <div className="mt-3 px-3 py-2 bg-white/8 rounded-lg border border-white/10">
            <div className="text-gold text-[11px] font-sora font-semibold leading-tight truncate">{tenant.name}</div>
            <div className="text-ice/50 text-[10px] mt-0.5">{tenant.city} · {tenant.board}</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        {visibleGroups.map((group) => (
          <div key={group.label} className="mb-1">
            <div className="px-5 py-2 text-[10px] font-sora font-semibold tracking-widest text-ice/40 uppercase">
              {group.label}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-dm-sans transition-all duration-150 group relative ${
                    isActive
                      ? 'bg-gold/15 text-gold border-l-[3px] border-gold rounded-l-none ml-0 pl-5'
                      : 'text-ice/75 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-gold' : 'text-ice/60 group-hover:text-white'}`} />
                  <span className={`flex-1 ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
                  {'ai' in item && item.ai && (
                    <span className="text-[9px] font-bold bg-teal text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <Brain className="w-2.5 h-2.5" />AI
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3 h-3 text-gold/60" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer — user + logout */}
      <div className="p-4 border-t border-white/10 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
          <div className="w-7 h-7 rounded-full bg-gold flex items-center justify-center text-navy font-bold text-xs font-sora flex-shrink-0">
            {tenant?.headName?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white text-xs font-semibold truncate">{tenant?.headName ?? 'Admin'}</div>
            <div className="text-ice/50 text-[10px]">{tenant?.headTitle ?? 'Administrator'}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-ice/60 hover:bg-white/8 hover:text-white text-xs font-dm-sans transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>
    </aside>
  );
}

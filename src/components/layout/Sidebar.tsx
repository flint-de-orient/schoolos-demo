'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, UserPlus, CalendarCheck, Clock,
  FileText, CreditCard, Library, Bus, Heart, Users,
  Smartphone, ShoppingBag, Brain, BarChart3, Settings,
  Sparkles, GraduationCap, ChevronRight, BookUser, IdCard, Globe
} from 'lucide-react';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'School Operations',
    items: [
      { href: '/students', label: 'Students', icon: BookUser },
      { href: '/id-cards', label: 'ID Cards & Certs', icon: IdCard },
      { href: '/admissions', label: 'Admissions', icon: UserPlus },
      { href: '/attendance', label: 'Attendance', icon: CalendarCheck },
      { href: '/timetable', label: 'Timetable', icon: Clock },
      { href: '/examinations', label: 'Examinations', icon: FileText },
      { href: '/transport', label: 'Transport', icon: Bus },
      { href: '/health', label: 'Health', icon: Heart },
    ],
  },
  {
    label: 'Learning',
    items: [
      { href: '/academics', label: 'Academics', icon: GraduationCap },
      { href: '/exam-engine', label: 'Exam Engine', icon: FileText, ai: true as const },
      { href: '/library', label: 'Library', icon: Library },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/hr', label: 'HR & Staff', icon: Users },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/fee', label: 'Fee Management', icon: CreditCard },
    ],
  },
  {
    label: 'AI & Insights',
    items: [
      { href: '/ai-advisor', label: 'AI Advisor', icon: Brain, ai: true as const },
      { href: '/analytics', label: 'Analytics', icon: BarChart3, ai: true as const },
    ],
  },
  {
    label: 'Parent Connect',
    items: [
      { href: '/parent-portal', label: 'Parent Portal', icon: Globe },
      { href: '/parent-app', label: 'Parent App', icon: Smartphone },
      { href: '/school-shop', label: 'School Shop', icon: ShoppingBag },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 gradient-navy flex flex-col z-40 shadow-2xl">
      {/* Logo */}
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
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        {navGroups.map((group) => (
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

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
          <div className="w-7 h-7 rounded-full bg-gold flex items-center justify-center text-navy font-bold text-xs font-sora">
            PS
          </div>
          <div className="min-w-0">
            <div className="text-white text-xs font-semibold truncate">Principal Sharma</div>
            <div className="text-ice/50 text-[10px]">Administrator</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

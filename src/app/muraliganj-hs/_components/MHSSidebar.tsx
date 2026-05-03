'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Clock, Users, BookOpen, Settings, Sparkles, Brain, ChevronRight,
} from 'lucide-react';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { href: '/muraliganj-hs/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'AI Engine',
    items: [
      { href: '/muraliganj-hs/timetable', label: 'AI Timetable Engine', icon: Clock, ai: true as const },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/muraliganj-hs/teachers', label: 'Teachers', icon: Users },
      { href: '/muraliganj-hs/classes',  label: 'Classes & Subjects', icon: BookOpen },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/muraliganj-hs/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export default function MHSSidebar() {
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
            <div className="font-sora font-bold text-white text-[14px] leading-tight">SchoolOS</div>
            <div className="text-ice/60 text-[9px] font-dm-sans tracking-wide uppercase">Timetable Engine</div>
          </div>
        </div>
        {/* School name badge */}
        <div className="mt-3 px-3 py-2 bg-white/8 rounded-lg border border-white/10">
          <div className="text-gold text-[11px] font-sora font-semibold leading-tight">Muraliganj High School (H.S)</div>
          <div className="text-ice/50 text-[10px] mt-0.5">Murshidabad, West Bengal</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
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
            SA
          </div>
          <div className="min-w-0">
            <div className="text-white text-xs font-semibold truncate">Mr. Samsul Alam</div>
            <div className="text-ice/50 text-[10px]">Head Master</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

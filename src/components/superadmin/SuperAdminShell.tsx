'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Building2, LayoutDashboard, Settings, LogOut, Sparkles, Users, Shield } from 'lucide-react';

const navItems = [
  { href: '/superadmin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/superadmin/tenants', label: 'Tenants', icon: Building2, exact: false },
  { href: '/superadmin/users', label: 'Platform Users', icon: Users, exact: false },
  { href: '/superadmin/settings', label: 'Platform Settings', icon: Settings, exact: false },
];

interface Props {
  user: { name?: string | null; email?: string | null };
  children: React.ReactNode;
}

export default function SuperAdminShell({ user, children }: Props) {
  const pathname = usePathname();

  function isActive(item: typeof navItems[0]) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col fixed inset-y-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-navy" />
            </div>
            <div>
              <p className="font-sora font-bold text-white text-sm leading-none">SchoolOS</p>
              <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" /> Super Admin
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-dm-sans transition-colors ${
                  active
                    ? 'bg-gold/10 text-gold border border-gold/20'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-gray-800">
          <div className="flex items-center gap-2.5 px-2 py-1.5 mb-1">
            <div className="w-7 h-7 rounded-full bg-navy flex items-center justify-center text-xs font-bold text-white">
              {user.name?.[0] ?? 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.name ?? 'Super Admin'}</p>
              <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-60 flex-1 p-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}

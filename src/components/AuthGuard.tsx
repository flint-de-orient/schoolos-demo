'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { getCurrentTenant, type Tenant } from '@/lib/tenant';
import { TenantProvider } from '@/context/TenantContext';
import Sidebar from '@/components/layout/Sidebar';
import Topbar  from '@/components/layout/Topbar';
import ChatBot from '@/components/shared/ChatBot';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router  = useRouter();
  const [tenant,  setTenant]  = useState<Tenant | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const t = getCurrentTenant();
    if (!t) {
      router.replace('/login');
    } else {
      setTenant(t);
      setChecked(true);
    }
  }, [router]);

  if (!checked) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-navy rounded-xl mb-4">
            <Sparkles className="w-6 h-6 text-gold" />
          </div>
          <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <TenantProvider tenant={tenant!}>
      <Sidebar />
      <Topbar />
      <main className="ml-64 pt-16 min-h-screen bg-gray-50">
        {children}
      </main>
      <ChatBot mode="school" />
    </TenantProvider>
  );
}

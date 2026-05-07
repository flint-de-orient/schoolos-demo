'use client';

import { TenantProvider } from '@/context/TenantContext';
import { AcademicYearProvider } from '@/context/AcademicYearContext';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import ChatBot from '@/components/shared/ChatBot';
import type { SessionTenant } from '@/types/next-auth';

interface TenantShellProps {
  tenant: SessionTenant;
  children: React.ReactNode;
}

export default function TenantShell({ tenant, children }: TenantShellProps) {
  return (
    <TenantProvider tenant={{ ...tenant, id: tenant.id }}>
      <AcademicYearProvider>
        <Sidebar />
        <Topbar />
        <main className="ml-64 pt-16 min-h-screen bg-gray-50">{children}</main>
        <ChatBot mode="school" />
      </AcademicYearProvider>
    </TenantProvider>
  );
}

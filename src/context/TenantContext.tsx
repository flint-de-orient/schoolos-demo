'use client';

import { createContext, useContext } from 'react';

export interface AppTenant {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  board: string;
  city: string;
  state: string;
  headTitle: string;
  headName: string;
  modules: string[];
}

const TenantContext = createContext<AppTenant | null>(null);

export function TenantProvider({
  tenant,
  children,
}: {
  tenant: AppTenant;
  children: React.ReactNode;
}) {
  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>;
}

export function useTenant(): AppTenant {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used inside TenantProvider');
  return ctx;
}

export function useTenantSafe(): AppTenant | null {
  return useContext(TenantContext);
}

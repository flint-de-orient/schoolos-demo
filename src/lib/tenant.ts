import tenantsData from '@/data/tenants.json';

export type TenantId = 'sundarban' | 'muraliganj';

export interface Tenant {
  id: TenantId;
  name: string;
  shortName: string;
  city: string;
  state: string;
  board: string;
  headTitle: string;
  headName: string;
  headInitials: string;
  email: string;
  modules: string[];
}

const STORAGE_KEY = 'schoolos_session';

export function loginTenant(email: string, password: string): Tenant | null {
  const match = tenantsData.find(
    (t) => t.email === email.trim().toLowerCase() && t.password === password
  );
  if (!match) return null;
  const tenant = Object.fromEntries(Object.entries(match).filter(([k]) => k !== 'password')) as unknown as Tenant;
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tenant));
  }
  return tenant;
}

export function logoutTenant(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

export function getCurrentTenant(): Tenant | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Tenant) : null;
  } catch {
    return null;
  }
}

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import TenantShell from '@/components/layout/TenantShell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role === 'SUPER_ADMIN') redirect('/superadmin/tenants');
  return <TenantShell tenant={session.user.tenant}>{children}</TenantShell>;
}

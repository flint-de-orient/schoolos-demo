import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import TenantShell from '@/components/layout/TenantShell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role === 'SUPER_ADMIN') redirect('/superadmin/tenants');

  // JWT may be stale after onboarding — always verify against DB when token says false
  if (!session.user.tenant.isOnboarded) {
    const tenant = await db.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { isOnboarded: true },
    });
    if (!tenant?.isOnboarded) redirect('/onboarding');
  }

  return <TenantShell tenant={session.user.tenant}>{children}</TenantShell>;
}

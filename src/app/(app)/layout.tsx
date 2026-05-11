import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import TenantShell from '@/components/layout/TenantShell';
import { db } from '@/lib/db';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role === 'SUPER_ADMIN') redirect('/superadmin/tenants');

  if (!session.user.tenant.isOnboarded) {
    // Tenant has existing data (seeded or migrated) — backfill the flag and continue
    const hasAcademicYear = await db.academicYear.count({
      where: { tenantId: session.user.tenantId },
    });

    if (hasAcademicYear > 0) {
      await db.tenant.update({
        where: { id: session.user.tenantId },
        data: { isOnboarded: true },
      });
    } else {
      redirect('/onboarding');
    }
  }

  return <TenantShell tenant={session.user.tenant}>{children}</TenantShell>;
}

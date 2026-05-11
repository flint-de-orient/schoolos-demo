import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role === 'SUPER_ADMIN') redirect('/superadmin/tenants');
  if (session.user.tenant.isOnboarded) redirect('/dashboard');

  const tenant = await db.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: {
      name: true, shortName: true, board: true,
      phone: true, address: true, city: true, state: true,
      website: true, headTitle: true, headName: true,
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navyMid to-navy flex items-center justify-center p-4">
      <OnboardingWizard tenant={tenant!} />
    </div>
  );
}

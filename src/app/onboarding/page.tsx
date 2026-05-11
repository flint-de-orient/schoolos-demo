import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role === 'SUPER_ADMIN') redirect('/superadmin/tenants');
  if (session.user.tenant.isOnboarded) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navyMid to-navy flex items-center justify-center p-4">
      <OnboardingWizard
        tenantName={session.user.tenant.name}
        tenantBoard={session.user.tenant.board}
      />
    </div>
  );
}

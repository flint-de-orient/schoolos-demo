import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { phoneNumberId, wabaId } = await req.json() as {
    phoneNumberId: string;
    wabaId: string;
  };

  if (!phoneNumberId || !wabaId) {
    return err('Missing phoneNumberId or wabaId');
  }

  // Verify WABA exists using platform system user token
  const sysToken = process.env.META_SYSTEM_USER_TOKEN;
  let businessName = '';
  if (sysToken) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${wabaId}?fields=name,currency,timezone_id&access_token=${sysToken}`
      );
      if (res.ok) {
        const data = await res.json() as { name?: string };
        businessName = data.name ?? '';
      }
    } catch {
      // Non-fatal — save anyway
    }
  }

  await db.tenantIntegrationConfig.upsert({
    where: {
      tenantId_provider: {
        tenantId: session.user.tenantId,
        provider: 'whatsapp',
      },
    },
    create: {
      tenantId: session.user.tenantId,
      provider:  'whatsapp',
      enabled:   true,
      config:    { phoneNumberId, wabaId, businessName },
      secrets:   {},
    },
    update: {
      enabled: true,
      config:  { phoneNumberId, wabaId, businessName },
    },
  });

  return ok({ phoneNumberId, wabaId, businessName, connected: true });
}

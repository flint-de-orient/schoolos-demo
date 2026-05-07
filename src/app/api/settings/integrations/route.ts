import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireSession, ok, err } from '@/lib/api-auth';

type Provider = 'zoom' | 'gmeet' | 'smsgatehub' | 'whatsapp';

function maskSecrets(secrets: Record<string, string>) {
  const masked: Record<string, string> = {};
  for (const key of Object.keys(secrets)) {
    const val = secrets[key];
    masked[key] = val ? `${'●'.repeat(8)} (${val.slice(0, 4)}…)` : '';
  }
  return masked;
}

// GET — list all integration configs (secrets masked)
export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const rows = await db.tenantIntegrationConfig.findMany({
    where: { tenantId: session.user.tenantId },
  });

  const result = rows.map(r => ({
    provider:        r.provider as Provider,
    enabled:         r.enabled,
    config:          r.config as Record<string, string>,
    secretsConfigured: maskSecrets(r.secrets as Record<string, string>),
    hasSecrets:      Object.keys(r.secrets as object).some(k => !!(r.secrets as Record<string, string>)[k]),
    updatedAt:       r.updatedAt,
  }));

  return ok(result);
}

// PUT — upsert one provider's credentials
// Body: { provider, enabled, config: { non-sensitive }, secrets: { sensitive } }
// Secret fields with empty string values are left unchanged (allows partial updates)
export async function PUT(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json();
  const { provider, enabled = true, config = {}, secrets = {} } = body as {
    provider: Provider;
    enabled: boolean;
    config: Record<string, string>;
    secrets: Record<string, string>;
  };

  if (!['zoom', 'gmeet', 'smsgatehub', 'whatsapp'].includes(provider)) {
    return err('Invalid provider');
  }

  // Fetch existing to preserve secrets not being updated
  const existing = await db.tenantIntegrationConfig.findUnique({
    where: { tenantId_provider: { tenantId: session.user.tenantId, provider } },
  });

  const existingSecrets = (existing?.secrets ?? {}) as Record<string, string>;

  // Merge: only overwrite secrets that are non-empty in the request
  const mergedSecrets: Record<string, string> = { ...existingSecrets };
  for (const [key, val] of Object.entries(secrets)) {
    if (val && val.trim()) {
      mergedSecrets[key] = val.trim();
    }
  }

  const row = await db.tenantIntegrationConfig.upsert({
    where:  { tenantId_provider: { tenantId: session.user.tenantId, provider } },
    create: { tenantId: session.user.tenantId, provider, enabled, config, secrets: mergedSecrets },
    update: { enabled, config, secrets: mergedSecrets },
  });

  return ok({
    provider: row.provider,
    enabled:  row.enabled,
    config:   row.config,
    secretsConfigured: maskSecrets(mergedSecrets),
    hasSecrets: Object.values(mergedSecrets).some(Boolean),
    updatedAt: row.updatedAt,
  });
}

/**
 * Fetches decrypted integration credentials for a tenant.
 * Returns DB credentials if configured, falls back to env vars.
 * Used server-side only.
 */

import { db } from '@/lib/db';

export interface ZoomCredentials {
  accountId: string;
  clientId: string;
  clientSecret: string;
}

export interface GmeetCredentials {
  serviceAccountEmail: string;
  privateKey: string;
  calendarId: string;
}

export interface SmsCredentials {
  apiKey: string;
  senderId: string;
}

export async function getZoomCredentials(tenantId: string): Promise<ZoomCredentials | null> {
  const row = await db.tenantIntegrationConfig.findUnique({
    where: { tenantId_provider: { tenantId, provider: 'zoom' } },
  }).catch(() => null);

  if (row?.enabled) {
    const cfg     = row.config as Record<string, string>;
    const secrets = row.secrets as Record<string, string>;
    const accountId    = cfg.accountId    || process.env.ZOOM_ACCOUNT_ID    || '';
    const clientId     = cfg.clientId     || process.env.ZOOM_CLIENT_ID     || '';
    const clientSecret = secrets.clientSecret || process.env.ZOOM_CLIENT_SECRET || '';
    if (accountId && clientId && clientSecret) return { accountId, clientId, clientSecret };
  }

  // Env var fallback
  const accountId    = process.env.ZOOM_ACCOUNT_ID    || '';
  const clientId     = process.env.ZOOM_CLIENT_ID     || '';
  const clientSecret = process.env.ZOOM_CLIENT_SECRET || '';
  if (accountId && clientId && clientSecret) return { accountId, clientId, clientSecret };
  return null;
}

export async function getGmeetCredentials(tenantId: string): Promise<GmeetCredentials | null> {
  const row = await db.tenantIntegrationConfig.findUnique({
    where: { tenantId_provider: { tenantId, provider: 'gmeet' } },
  }).catch(() => null);

  if (row?.enabled) {
    const cfg     = row.config as Record<string, string>;
    const secrets = row.secrets as Record<string, string>;
    const serviceAccountEmail = cfg.serviceAccountEmail    || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
    const privateKey          = secrets.privateKey?.replace(/\\n/g, '\n') || process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';
    const calendarId          = cfg.calendarId             || process.env.GOOGLE_CALENDAR_ID || 'primary';
    if (serviceAccountEmail && privateKey) return { serviceAccountEmail, privateKey, calendarId };
  }

  // Env var fallback
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
  const privateKey          = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';
  const calendarId          = process.env.GOOGLE_CALENDAR_ID || 'primary';
  if (serviceAccountEmail && privateKey) return { serviceAccountEmail, privateKey, calendarId };
  return null;
}

export async function getSmsCredentials(tenantId: string): Promise<SmsCredentials | null> {
  const row = await db.tenantIntegrationConfig.findUnique({
    where: { tenantId_provider: { tenantId, provider: 'smsgatehub' } },
  }).catch(() => null);

  if (row?.enabled) {
    const cfg     = row.config as Record<string, string>;
    const secrets = row.secrets as Record<string, string>;
    const apiKey   = secrets.apiKey  || process.env.SMSGATEHUB_API_KEY    || '';
    const senderId = cfg.senderId    || process.env.SMSGATEHUB_SENDER_ID  || 'SCHOOL';
    if (apiKey) return { apiKey, senderId };
  }

  // Env var fallback
  const apiKey   = process.env.SMSGATEHUB_API_KEY   || '';
  const senderId = process.env.SMSGATEHUB_SENDER_ID || 'SCHOOL';
  if (apiKey) return { apiKey, senderId };
  return null;
}

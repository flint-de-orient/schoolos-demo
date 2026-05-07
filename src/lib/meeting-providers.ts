/**
 * Meeting provider integrations: Zoom (Server-to-Server OAuth) + Google Meet (Calendar REST API).
 * Accepts credentials directly — caller should fetch from DB via integration-credentials.ts.
 * Falls back to realistic demo links when no credentials are provided.
 *
 * No external packages — uses Node.js built-in `crypto` for JWT signing.
 */

import { createSign } from 'crypto';
import type { ZoomCredentials, GmeetCredentials } from './integration-credentials';

export interface MeetingResult {
  link: string;
  meetingId?: string;
  passcode?: string;
  isDemo?: boolean;
}

export async function createMeeting(params: {
  mode: 'ZOOM' | 'GMEET';
  topic: string;
  startTime: Date;
  durationMins: number;
  zoomCreds?: ZoomCredentials | null;
  gmeetCreds?: GmeetCredentials | null;
}): Promise<MeetingResult> {
  return params.mode === 'ZOOM'
    ? createZoomMeeting(params)
    : createGoogleMeet(params);
}

// ─── Zoom ─────────────────────────────────────────────────────────────────────

async function createZoomMeeting(params: {
  topic: string; startTime: Date; durationMins: number;
  zoomCreds?: ZoomCredentials | null;
}): Promise<MeetingResult> {
  const creds = params.zoomCreds;
  if (!creds) return demoZoomLink();

  try {
    const tokenRes = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${creds.accountId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    if (!tokenRes.ok) return demoZoomLink();
    const { access_token } = await tokenRes.json() as { access_token: string };

    const meetRes = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: params.topic, type: 2,
        start_time: params.startTime.toISOString(),
        duration: params.durationMins,
        timezone: 'Asia/Kolkata',
        settings: { join_before_host: true, waiting_room: false, auto_recording: 'none' },
      }),
    });
    if (!meetRes.ok) return demoZoomLink();
    const meeting = await meetRes.json() as { join_url: string; id: number; password?: string };
    return { link: meeting.join_url, meetingId: String(meeting.id), passcode: meeting.password };
  } catch {
    return demoZoomLink();
  }
}

function demoZoomLink(): MeetingResult {
  const id = Math.floor(Math.random() * 9_000_000_000) + 1_000_000_000;
  return {
    link: `https://zoom.us/j/${id}`,
    meetingId: String(id),
    passcode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    isDemo: true,
  };
}

// ─── Google Meet (pure REST — no googleapis package) ─────────────────────────

async function createGoogleMeet(params: {
  topic: string; startTime: Date; durationMins: number;
  gmeetCreds?: GmeetCredentials | null;
}): Promise<MeetingResult> {
  const creds = params.gmeetCreds;
  if (!creds) return demoGoogleMeetLink();

  try {
    const accessToken = await getGoogleAccessToken(creds.serviceAccountEmail, creds.privateKey);
    const calendarId  = creds.calendarId ?? 'primary';
    const endTime     = new Date(params.startTime.getTime() + params.durationMins * 60_000);

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: params.topic,
          start: { dateTime: params.startTime.toISOString(), timeZone: 'Asia/Kolkata' },
          end:   { dateTime: endTime.toISOString(),          timeZone: 'Asia/Kolkata' },
          conferenceData: {
            createRequest: {
              requestId: crypto.randomUUID(),
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
        }),
      }
    );

    if (!res.ok) return demoGoogleMeetLink();
    const event = await res.json() as {
      id?: string;
      conferenceData?: { entryPoints?: { entryPointType: string; uri: string }[] };
    };
    const meetLink = event.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri;
    return { link: meetLink ?? 'https://meet.google.com/new', meetingId: event.id };
  } catch {
    return demoGoogleMeetLink();
  }
}

async function getGoogleAccessToken(email: string, privateKey: string): Promise<string> {
  const now     = Math.floor(Date.now() / 1000);
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: email, scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  })).toString('base64url');

  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(privateKey, 'base64url');
  const jwt = `${header}.${payload}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  if (!tokenRes.ok) throw new Error('Failed to get Google access token');
  const data = await tokenRes.json() as { access_token: string };
  return data.access_token;
}

function demoGoogleMeetLink(): MeetingResult {
  const seg = () => Math.random().toString(36).substring(2, 5);
  return { link: `https://meet.google.com/${seg()}-${seg()}-${seg()}`, isDemo: true };
}

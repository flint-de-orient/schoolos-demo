/**
 * Parent notification via SMS (SMSGateHub) with WhatsApp placeholder.
 * Credentials are passed in by the caller (fetched from DB via integration-credentials.ts).
 * Falls back to console.log demo mode when no credentials provided.
 */

import type { SmsCredentials } from './integration-credentials';

export async function notifyParentInterview(params: {
  phone: string;
  studentName: string;
  date: string;
  startTime: string;
  mode: string;
  meetingLink?: string;
  passcode?: string;
  interviewerName?: string;
  schoolName?: string;
  queueNo?: number;
  smsCreds?: SmsCredentials | null;
}): Promise<{ sent: boolean; channel: 'sms' | 'demo' }> {
  const message = buildSmsMessage(params);
  const phone   = params.phone.replace(/\D/g, '');

  if (params.smsCreds) {
    try {
      const res = await fetch('https://smsgatehub.com/api/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${params.smsCreds.apiKey}`,
        },
        body: JSON.stringify({
          mobile:  phone,
          message,
          sender:  params.smsCreds.senderId,
          route:   'transactional',
        }),
      });
      if (res.ok) return { sent: true, channel: 'sms' };
      const body = await res.text().catch(() => '');
      console.error(`[SMSGateHub] Failed ${res.status}: ${body}`);
    } catch (e) {
      console.error('[SMSGateHub] Network error:', e);
    }
  }

  // WhatsApp placeholder — wire when WHATSAPP_API_KEY is set in integrations
  // POST https://graph.facebook.com/v18.0/{phoneNumberId}/messages

  // Demo fallback
  console.log(`\n[SMS Demo] → +91${phone}\n${'─'.repeat(50)}\n${message}\n${'─'.repeat(50)}\n`);
  return { sent: true, channel: 'demo' };
}

export async function notifyParentQueueAdvance(params: {
  phone: string;
  studentName: string;
  newTime: string;
  originalTime: string;
  date: string;
  schoolName?: string;
  smsCreds?: SmsCredentials | null;
}): Promise<{ sent: boolean }> {
  const school  = params.schoolName ?? 'Sundarban Academy';
  const message = [
    `Dear Parent of ${params.studentName},`,
    ``,
    `Good news! A slot opened up at ${school}.`,
    `Your interview on ${params.date} can now start at ${params.newTime} (earlier than your original ${params.originalTime}).`,
    `Please come early if possible. Your original slot is still reserved.`,
    ``,
    `- Admissions Team`,
  ].join('\n');

  const phone = params.phone.replace(/\D/g, '');

  if (params.smsCreds) {
    try {
      const res = await fetch('https://smsgatehub.com/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${params.smsCreds.apiKey}` },
        body: JSON.stringify({ mobile: phone, message, sender: params.smsCreds.senderId, route: 'transactional' }),
      });
      if (res.ok) return { sent: true };
    } catch { /* non-fatal */ }
  }

  console.log(`\n[SMS Demo — Queue Advance] → +91${phone}\n${message}\n`);
  return { sent: true };
}

function buildSmsMessage(p: Parameters<typeof notifyParentInterview>[0]): string {
  const school = p.schoolName ?? 'Sundarban Academy';
  const lines  = [
    `Dear Parent of ${p.studentName},`,
    ``,
    `Admission interview at ${school}.`,
    `Date: ${p.date}`,
    `Time: ${p.startTime}${p.queueNo ? ` (Queue No. ${p.queueNo})` : ''}`,
    `Mode: ${p.mode}`,
  ];
  if (p.meetingLink) lines.push(`Join: ${p.meetingLink}`);
  if (p.passcode)    lines.push(`Passcode: ${p.passcode}`);
  if (p.interviewerName) lines.push(`Interviewer: ${p.interviewerName}`);
  lines.push(``, `Please be on time. - Admissions Team`);
  return lines.join('\n');
}

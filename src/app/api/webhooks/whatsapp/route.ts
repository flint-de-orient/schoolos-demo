import { NextRequest, NextResponse } from 'next/server';

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN ?? 'schoolos-whatsapp-webhook-2026';

// GET — Meta webhook verification challenge
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get('hub.mode');
  const token     = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

// POST — receive incoming messages and delivery status updates
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry ?? []) {
        for (const change of entry.changes ?? []) {
          if (change.field === 'messages') {
            const value = change.value;

            // Delivery / read status updates
            for (const status of value.statuses ?? []) {
              console.log(`[WhatsApp] msg=${status.id} status=${status.status} to=${status.recipient_id}`);
            }

            // Incoming messages (parents replying)
            for (const msg of value.messages ?? []) {
              console.log(`[WhatsApp] incoming from=${msg.from} type=${msg.type}`);
            }
          }
        }
      }
    }

    return new NextResponse('OK', { status: 200 });
  } catch {
    return new NextResponse('Error', { status: 500 });
  }
}

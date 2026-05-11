import { db } from '@/lib/db';

const GRAPH_URL = 'https://graph.facebook.com/v21.0';

interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters: Array<{ type: 'text'; text: string } | { type: 'payload'; payload: string }>;
  sub_type?: string;
  index?: number;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Format Indian phone number to E.164 (+91XXXXXXXXXX)
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

export async function sendWhatsAppTemplate(
  tenantId: string,
  toPhone: string,
  templateName: string,
  bodyVars: string[],
  buttonUrlVar?: string,
  recipientName?: string
): Promise<SendResult> {
  try {
    const config = await db.tenantIntegrationConfig.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'whatsapp' } },
    });

    if (!config?.enabled) return { success: false, error: 'WhatsApp not connected for this school' };

    const { phoneNumberId } = config.config as { phoneNumberId: string; wabaId: string };
    const sysToken = process.env.META_SYSTEM_USER_TOKEN;

    if (!phoneNumberId || !sysToken) return { success: false, error: 'Missing WhatsApp credentials' };

    const components: TemplateComponent[] = [];

    if (bodyVars.length > 0) {
      components.push({
        type: 'body',
        parameters: bodyVars.map((v) => ({ type: 'text', text: v })),
      });
    }

    if (buttonUrlVar) {
      components.push({
        type: 'button',
        sub_type: 'url',
        index: 0,
        parameters: [{ type: 'text', text: buttonUrlVar }],
      });
    }

    const res = await fetch(`${GRAPH_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sysToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formatPhone(toPhone),
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components: components.length > 0 ? components : undefined,
        },
      }),
    });

    const data = await res.json() as { messages?: Array<{ id: string }>; error?: { message: string } };

    if (!res.ok || data.error) {
      return { success: false, error: data.error?.message ?? 'WhatsApp API error' };
    }

    const messageId = data.messages?.[0]?.id;
    await db.outboundLog.create({
      data: {
        tenantId,
        channel: 'WHATSAPP',
        templateName,
        recipientPhone: formatPhone(toPhone),
        recipientName,
        status: 'SENT',
        messageId,
        metadata: { bodyVars, buttonUrlVar },
      },
    }).catch(() => {});

    return { success: true, messageId };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    await db.outboundLog.create({
      data: {
        tenantId,
        channel: 'WHATSAPP',
        templateName,
        recipientPhone: formatPhone(toPhone),
        recipientName,
        status: 'FAILED',
        errorMessage,
        metadata: { bodyVars, buttonUrlVar },
      },
    }).catch(() => {});
    return { success: false, error: errorMessage };
  }
}

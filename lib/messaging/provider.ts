// Messaging abstraction — swap providers without changing business logic.
// Add a real provider by implementing the MessageProvider interface below.

export type WhatsAppTemplateParam = { type: "text"; text: string };

export type MessagePayload = {
  to: string;      // phone number  e.g. "+919876543210"
  message: string;
  channel: "WHATSAPP" | "SMS";
  // If templateName is provided, WhatsApp sends a pre-approved template message
  // instead of free-form text (required for business-initiated outbound messages)
  templateName?: string;
  templateParams?: WhatsAppTemplateParam[];
  templateLanguage?: string; // default "en"
};

export type SendResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

export interface MessageProvider {
  name: string;
  send(payload: MessagePayload): Promise<SendResult>;
}

// ── Manual / copy-paste provider (always available in MVP) ───────────────────
class ManualProvider implements MessageProvider {
  name = "MANUAL";
  async send(payload: MessagePayload): Promise<SendResult> {
    // In manual mode we just log — the UI shows the message for staff to copy-send
    console.log(`[MANUAL] To: ${payload.to}\n${payload.message}`);
    return { success: true, messageId: `manual-${Date.now()}` };
  }
}

// ── WhatsApp Business API provider ──────────────────────────────────────────
class WhatsAppProvider implements MessageProvider {
  name = "WHATSAPP";
  async send(payload: MessagePayload): Promise<SendResult> {
    const token   = process.env.WHATSAPP_API_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiUrl  = process.env.WHATSAPP_API_URL;

    if (!token || !phoneId || !apiUrl) {
      return { success: false, error: "WhatsApp API not configured" };
    }

    try {
      // Use template if provided (required for business-initiated messages)
      const body = payload.templateName
        ? {
            messaging_product: "whatsapp",
            to: payload.to.replace("+", ""),
            type: "template",
            template: {
              name: payload.templateName,
              language: { code: payload.templateLanguage ?? "en" },
              components: payload.templateParams?.length
                ? [{ type: "body", parameters: payload.templateParams }]
                : [],
            },
          }
        : {
            messaging_product: "whatsapp",
            to: payload.to.replace("+", ""),
            type: "text",
            text: { body: payload.message },
          };

      const res = await fetch(`${apiUrl}/${phoneId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        return { success: false, error: err };
      }

      const data = await res.json();
      return { success: true, messageId: data.messages?.[0]?.id };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}

// ── Twilio SMS provider ──────────────────────────────────────────────────────
class TwilioProvider implements MessageProvider {
  name = "TWILIO";
  async send(payload: MessagePayload): Promise<SendResult> {
    const sid   = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from  = process.env.TWILIO_FROM_NUMBER;

    if (!sid || !token || !from) {
      return { success: false, error: "Twilio not configured" };
    }

    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          },
          body: new URLSearchParams({ From: from, To: payload.to, Body: payload.message }).toString(),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        return { success: false, error: err };
      }

      const data = await res.json();
      return { success: true, messageId: data.sid };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}

// ── MSG91 (popular in India) ─────────────────────────────────────────────────
class MSG91Provider implements MessageProvider {
  name = "MSG91";
  async send(payload: MessagePayload): Promise<SendResult> {
    const authKey   = process.env.MSG91_AUTH_KEY;
    const senderId  = process.env.MSG91_SENDER_ID ?? "YOSGYM";
    const templateId = process.env.MSG91_TEMPLATE_ID;

    if (!authKey) {
      return { success: false, error: "MSG91 not configured" };
    }

    try {
      const res = await fetch("https://api.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: { "Content-Type": "application/json", authkey: authKey },
        body: JSON.stringify({
          template_id: templateId,
          short_url: "0",
          recipients: [{ mobiles: payload.to.replace("+", ""), message: payload.message }],
        }),
      });

      const data = await res.json();
      if (data.type === "success") return { success: true, messageId: data.request_id };
      return { success: false, error: JSON.stringify(data) };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}

// ── Provider registry ────────────────────────────────────────────────────────
const providers: Record<string, MessageProvider> = {
  MANUAL:    new ManualProvider(),
  WHATSAPP:  new WhatsAppProvider(),
  TWILIO:    new TwilioProvider(),
  MSG91:     new MSG91Provider(),
};

export function getProvider(name?: string): MessageProvider {
  const key = (name ?? "MANUAL").toUpperCase();
  return providers[key] ?? providers["MANUAL"];
}

// Determine active provider based on env config
export function getActiveProvider(): MessageProvider {
  if (process.env.WHATSAPP_API_TOKEN)  return providers["WHATSAPP"];
  if (process.env.TWILIO_ACCOUNT_SID)  return providers["TWILIO"];
  if (process.env.MSG91_AUTH_KEY)       return providers["MSG91"];
  return providers["MANUAL"];
}

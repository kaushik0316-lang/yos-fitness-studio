import crypto from "crypto";

export function razorpayConfigured() {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.yosfitnessstudio.in";

type CreateLinkArgs = {
  amountPaise: number;
  description: string;
  referenceId: string;
  customerName: string;
  customerContact?: string; // 10-digit Indian mobile, optional
  expireBy: number;         // unix seconds
  callbackPath?: string;    // where the customer lands after paying (default: thank-you page)
};

export async function createRazorpayPaymentLink(a: CreateLinkArgs): Promise<{ id: string; shortUrl: string }> {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: a.amountPaise,
      currency: "INR",
      accept_partial: false,
      reference_id: a.referenceId,
      description: a.description,
      customer: { name: a.customerName, ...(a.customerContact ? { contact: `+91${a.customerContact}` } : {}) },
      notify: { sms: false, email: false },
      reminder_enable: false,
      expire_by: a.expireBy,
      callback_url: `${SITE_URL}${a.callbackPath ?? "/payment-received"}`,
      callback_method: "get",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.description ?? "Razorpay could not create the link.");
  return { id: data.id, shortUrl: data.short_url };
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Best effort: stop a link from being paid after the slot it was for has been released.
export async function cancelRazorpayLink(linkId: string): Promise<void> {
  try {
    const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
    await fetch(`https://api.razorpay.com/v1/payment_links/${linkId}/cancel`, {
      method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[razorpay] could not cancel link", linkId, e);
  }
}

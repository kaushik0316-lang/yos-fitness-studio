import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { finalizePaidLink } from "@/lib/razorpayFinalize";

export const dynamic = "force-dynamic";

// Razorpay -> CRM. Configure in Razorpay Dashboard > Webhooks with events:
// payment_link.paid, payment_link.expired, payment_link.cancelled
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: "Bad payload" }, { status: 400 }); }

  const link = event?.payload?.payment_link?.entity;
  try {
    if (event.event === "payment_link.paid" && link?.id) {
      const pay = event.payload?.payment?.entity;
      const result = await finalizePaidLink(link.id, {
        id: pay?.id ?? `link_${link.id}`,
        method: pay?.method ?? "",
        amountPaise: Number(pay?.amount ?? link.amount_paid ?? 0),
      });
      if (!result.ok) console.error("[razorpay-webhook] not applied:", link.id, result.reason);
    } else if ((event.event === "payment_link.expired" || event.event === "payment_link.cancelled") && link?.id) {
      await prisma.paymentLink.updateMany({
        where: { razorpayLinkId: link.id, status: "CREATED" },
        data: { status: event.event === "payment_link.expired" ? "EXPIRED" : "CANCELLED" },
      });
    }
  } catch (err) {
    console.error("[razorpay-webhook]", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 }); // Razorpay retries
  }
  return NextResponse.json({ ok: true });
}

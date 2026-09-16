import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { toTitleCase } from "@/lib/utils/titleCase";

function fmt(mode: string) {
  return (
    { CASH: "Cash", UPI: "UPI", CARD: "Card", BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque", FREE: "Free" }[mode] ?? mode
  );
}
function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}
function fmtPeriod(s: Date | string, e: Date | string) {
  return `${fmtDate(s)} – ${fmtDate(e)}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pin = searchParams.get("pin");
  const paymentId = searchParams.get("paymentId");

  if (!pin || !paymentId) {
    return new NextResponse("Missing parameters.", { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const rl = checkRateLimit(`${ip}:member-receipt`, {
    maxAttempts: 20, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000,
  });
  if (!rl.allowed) {
    return new NextResponse("Too many requests.", { status: 429 });
  }

  const member = await prisma.member.findUnique({
    where: { pin: String(pin) },
    select: { id: true, memberId: true, fullName: true, phone: true },
  });
  if (!member) return new NextResponse("Unauthorized.", { status: 401 });

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, memberId: member.id, isVoided: false },
    select: {
      id: true,
      date: true,
      amount: true,
      discount: true,
      pendingAmount: true,
      paymentMode: true,
      splitPaymentMode: true,
      splitAmount: true,
      receiptNumber: true,
      notes: true,
      package: { select: { name: true } },
      membership: { select: { startDate: true, expiryDate: true } },
    },
  });
  if (!payment) return new NextResponse("Receipt not found.", { status: 404 });

  const name = toTitleCase(member.fullName);
  const paid = Number(payment.amount) - Number(payment.discount);
  const hasSplit = payment.splitPaymentMode && payment.splitAmount;
  const hasPending = Number(payment.pendingAmount) > 0;
  const receiptLabel = payment.receiptNumber ? `#${payment.receiptNumber}` : payment.id.slice(-8).toUpperCase();
  const packageName = payment.package?.name ?? payment.notes ?? "Membership";

  const modeStr = hasSplit
    ? `${fmt(payment.paymentMode)} + ${fmt(payment.splitPaymentMode!)} (₹${Number(payment.splitAmount).toLocaleString("en-IN")})`
    : fmt(payment.paymentMode);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Receipt ${receiptLabel} – Yos Fitness Studio</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background: #f5f5f5;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      min-height: 100vh;
      padding: 32px 16px;
    }
    .receipt {
      background: #fff;
      border-radius: 16px;
      width: 100%;
      max-width: 440px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.10);
    }
    .header {
      background: #111;
      padding: 28px 28px 24px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .logo-circle {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: #ff6b00;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 900;
      color: #fff;
      flex-shrink: 0;
      letter-spacing: -1px;
    }
    .gym-name {
      color: #fff;
      font-size: 17px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .gym-sub {
      color: #666;
      font-size: 11px;
      margin-top: 2px;
      letter-spacing: 0.3px;
    }
    .hero {
      background: #111;
      padding: 0 28px 28px;
      text-align: center;
    }
    .receipt-label {
      display: inline-block;
      color: #ff6b00;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      border: 1px solid rgba(255,107,0,0.3);
      border-radius: 20px;
      padding: 3px 10px;
      margin-bottom: 12px;
    }
    .amount-big {
      color: #fff;
      font-size: 40px;
      font-weight: 800;
      letter-spacing: -1px;
    }
    .amount-big span { font-size: 22px; font-weight: 600; opacity: 0.7; margin-right: 2px; }
    .paid-on {
      color: #666;
      font-size: 12px;
      margin-top: 4px;
    }
    .divider-dashed {
      border: none;
      border-top: 1.5px dashed #e5e5e5;
      margin: 0;
    }
    .body { padding: 22px 28px; }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 9px 0;
      border-bottom: 1px solid #f3f3f3;
      gap: 12px;
    }
    .row:last-child { border-bottom: none; }
    .row-label {
      color: #999;
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      flex-shrink: 0;
    }
    .row-value {
      color: #111;
      font-size: 13px;
      font-weight: 600;
      text-align: right;
    }
    .discount-row .row-value { color: #16a34a; }
    .pending-row .row-value { color: #ea580c; }
    .member-section {
      background: #f9f9f9;
      border-radius: 12px;
      padding: 14px 16px;
      margin-bottom: 16px;
    }
    .member-section .label {
      color: #aaa;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    .member-section .member-name {
      color: #111;
      font-size: 15px;
      font-weight: 700;
    }
    .member-section .member-id {
      color: #999;
      font-size: 11px;
      margin-top: 1px;
    }
    .footer {
      background: #f9f9f9;
      border-top: 1px solid #efefef;
      padding: 16px 28px;
      text-align: center;
    }
    .footer p {
      color: #bbb;
      font-size: 10px;
      letter-spacing: 0.3px;
    }
    .footer p strong { color: #999; }
    @media print {
      body { background: #fff; padding: 0; }
      .receipt { box-shadow: none; border-radius: 0; max-width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="logo-circle">YF</div>
      <div>
        <div class="gym-name">Yos Fitness Studio</div>
        <div class="gym-sub">Official Payment Receipt</div>
      </div>
    </div>

    <div class="hero">
      <div class="receipt-label">Receipt ${receiptLabel}</div>
      <div class="amount-big"><span>₹</span>${paid.toLocaleString("en-IN")}</div>
      <div class="paid-on">Paid on ${fmtDate(payment.date)}</div>
    </div>

    <hr class="divider-dashed" />

    <div class="body">
      <div class="member-section">
        <div class="label">Member</div>
        <div class="member-name">${name}</div>
        <div class="member-id">ID: ${member.memberId}</div>
      </div>

      <div class="row">
        <span class="row-label">Package</span>
        <span class="row-value">${packageName}</span>
      </div>
      ${payment.membership ? `
      <div class="row">
        <span class="row-label">Valid Period</span>
        <span class="row-value">${fmtPeriod(payment.membership.startDate, payment.membership.expiryDate)}</span>
      </div>` : ""}
      <div class="row">
        <span class="row-label">Payment Mode</span>
        <span class="row-value">${modeStr}</span>
      </div>
      ${Number(payment.discount) > 0 ? `
      <div class="row discount-row">
        <span class="row-label">Discount</span>
        <span class="row-value">– ₹${Number(payment.discount).toLocaleString("en-IN")}</span>
      </div>` : ""}
      ${hasPending ? `
      <div class="row pending-row">
        <span class="row-label">Pending</span>
        <span class="row-value">₹${Number(payment.pendingAmount).toLocaleString("en-IN")}</span>
      </div>` : ""}
      <div class="row" style="margin-top: 4px;">
        <span class="row-label" style="font-size:12px; color:#111; font-weight:700;">Total Paid</span>
        <span class="row-value" style="font-size:16px; color:#16a34a;">₹${paid.toLocaleString("en-IN")}</span>
      </div>
    </div>

    <div class="footer">
      <p>Thank you for being a valued member of <strong>Yos Fitness Studio</strong></p>
      <p style="margin-top:4px;">Keep crushing your goals! 💪</p>
    </div>
  </div>

  <script>
    // Auto-trigger print on load for desktop; mobile users can use share sheet
    if (!/Mobi|Android/i.test(navigator.userAgent)) {
      window.addEventListener('load', () => window.print());
    }
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

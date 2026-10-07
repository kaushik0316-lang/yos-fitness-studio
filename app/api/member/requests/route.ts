import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { getActiveProvider } from "@/lib/messaging/provider";

// Member portal: request a membership pause and see its status (PIN-authenticated).
// Staff review requests on the Requests page; nothing changes on the membership automatically.

const MAX_PAUSE_DAYS = 90;
const MAX_START_AHEAD_DAYS = 60;
const DAY = 86_400_000;

function istToday(): Date {
  const d = new Date(Date.now() + 5.5 * 3600_000);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function parseDay(v: unknown): Date | null {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}

const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const rl = checkRateLimit(`${ip}:member-requests`, { maxAttempts: 15, windowMs: 15 * 60 * 1000, blockMs: 15 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: `Too many attempts. Try again in ${rl.retryAfterSeconds} seconds.` }, { status: 429 });
    }

    const body = await req.json();
    const { pin, action } = body as { pin?: string; action?: "status" | "freeze" };
    if (!pin || String(pin).length !== 4) return NextResponse.json({ error: "Invalid PIN." }, { status: 400 });

    const member = await prisma.member.findUnique({
      where: { pin: String(pin) },
      select: { id: true, memberId: true, fullName: true, status: true, phone: true },
    });
    if (!member) return NextResponse.json({ error: "Invalid PIN." }, { status: 401 });

    const latest = () => prisma.memberRequest.findFirst({
      where: { memberId: member.id, kind: "FREEZE" },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, fromDate: true, toDate: true, reason: true, staffNote: true, createdAt: true },
    });

    if (action !== "freeze") return NextResponse.json({ request: await latest() });

    if (member.status !== "ACTIVE") {
      return NextResponse.json({ error: "Only an active membership can be paused. Please contact the front desk." }, { status: 400 });
    }
    const pending = await prisma.memberRequest.findFirst({ where: { memberId: member.id, kind: "FREEZE", status: "PENDING" } });
    if (pending) return NextResponse.json({ error: "You already have a pause request waiting for the studio." }, { status: 409 });

    const from = parseDay(body.fromDate);
    const to = parseDay(body.toDate);
    const today = istToday();
    if (!from || !to) return NextResponse.json({ error: "Choose the first and last day of your pause." }, { status: 400 });
    if (from < today) return NextResponse.json({ error: "The pause can't start in the past." }, { status: 400 });
    if (from.getTime() - today.getTime() > MAX_START_AHEAD_DAYS * DAY) {
      return NextResponse.json({ error: `Choose a start date within the next ${MAX_START_AHEAD_DAYS} days.` }, { status: 400 });
    }
    if (to < from) return NextResponse.json({ error: "The last day must be on or after the first day." }, { status: 400 });
    if ((to.getTime() - from.getTime()) / DAY + 1 > MAX_PAUSE_DAYS) {
      return NextResponse.json({ error: `A pause can be at most ${MAX_PAUSE_DAYS} days.` }, { status: 400 });
    }
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : "";

    await prisma.memberRequest.create({
      data: { memberId: member.id, kind: "FREEZE", fromDate: from, toDate: to, reason: reason || null },
    });

    // Best-effort heads-up to the studio, same as new-registration alerts
    const adminPhone = process.env.ADMIN_NOTIFY_PHONE ?? "919840690418";
    getActiveProvider().send({
      to: adminPhone.startsWith("+") ? adminPhone : `+${adminPhone}`,
      channel: "WHATSAPP",
      message:
        `⏸️ *Membership pause request*\n*Member:* ${member.fullName} (${member.memberId})\n` +
        `*From:* ${fmt(from)}  *To:* ${fmt(to)}\n${reason ? `*Reason:* ${reason}\n` : ""}\nReview it under Requests in Yos Desk.`,
    }).catch((e) => console.error("[member/requests] admin notify failed:", e));

    return NextResponse.json({ ok: true, request: await latest() });
  } catch (err) {
    console.error("[member/requests]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { istToday, releaseExpiredHolds, ymd } from "@/lib/pt";
import { confirmPtRequest, declinePtRequest } from "@/lib/ptRespond";

// Trainers answer PT session requests with their own staff PIN: no CRM login needed.

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const rl = checkRateLimit(`${ip}:trainer-pt`, { maxAttempts: 30, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: `Too many attempts. Try again in ${rl.retryAfterSeconds} seconds.` }, { status: 429 });
    }

    const body = await req.json();
    const { pin, action } = body as { pin?: string; action?: "list" | "respond" };
    if (!pin || !/^\d{4}$/.test(String(pin))) return NextResponse.json({ error: "Enter your 4-digit PIN." }, { status: 400 });

    const trainer = await prisma.employee.findUnique({ where: { pin: String(pin) }, select: { id: true, fullName: true, role: true, isActive: true } });
    if (!trainer || !trainer.isActive) return NextResponse.json({ error: "Invalid PIN." }, { status: 401 });
    if (trainer.role !== "TRAINER") return NextResponse.json({ error: "This page is for trainers." }, { status: 403 });

    if (action === "respond") {
      const { bookingId, decision, note } = body as { bookingId?: string; decision?: "confirm" | "decline"; note?: string };
      if (!bookingId || (decision !== "confirm" && decision !== "decline")) {
        return NextResponse.json({ error: "Missing details." }, { status: 400 });
      }
      const by = { name: trainer.fullName, trainerId: trainer.id };
      const r = decision === "confirm" ? await confirmPtRequest(bookingId, by) : await declinePtRequest(bookingId, by, note);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 409 });
    }

    await releaseExpiredHolds();
    const rows = await prisma.ptBooking.findMany({
      where: {
        trainerId: trainer.id,
        OR: [
          { status: { in: ["REQUESTED", "PENDING_PAYMENT"] }, expiresAt: { gt: new Date() } },
          { status: "CONFIRMED", date: { gte: istToday() } },
        ],
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      select: { id: true, status: true, date: true, startTime: true, durationMins: true, expiresAt: true, member: { select: { fullName: true } } },
    });

    return NextResponse.json({
      trainer: trainer.fullName,
      bookings: rows.map((b) => ({
        id: b.id, status: b.status, date: ymd(b.date), time: b.startTime, durationMins: b.durationMins,
        expiresAt: b.expiresAt?.toISOString() ?? null, member: b.member.fullName,
      })),
    });
  } catch (err) {
    console.error("[trainer/pt]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

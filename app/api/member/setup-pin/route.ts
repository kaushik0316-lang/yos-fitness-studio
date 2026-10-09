import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const rl = checkRateLimit(`${ip}:member-setup-pin`, {
      maxAttempts: 10, windowMs: 15 * 60 * 1000, blockMs: 30 * 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rl.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const { memberId, phone4, pin } = await req.json();

    if (!memberId || typeof memberId !== "string") {
      return NextResponse.json({ error: "Member ID is required." }, { status: 400 });
    }
    if (!phone4 || !/^\d{4}$/.test(String(phone4))) {
      return NextResponse.json({ error: "Last 4 digits of phone number are required." }, { status: 400 });
    }
    if (!pin || !/^\d{4}$/.test(String(pin))) {
      return NextResponse.json({ error: "PIN must be exactly 4 digits." }, { status: 400 });
    }

    // Look up member by memberId
    const member = await prisma.member.findUnique({
      where: { memberId: memberId.toUpperCase().trim() },
      select: { id: true, fullName: true, memberId: true, phone: true },
    });

    // Return same 404 whether ID not found or phone mismatch — don't leak which one failed
    if (!member) {
      return NextResponse.json(
        { error: "Member ID or phone number does not match. Please check and try again." },
        { status: 404 }
      );
    }

    // Verify last 4 digits of phone
    const storedLast4 = member.phone.replace(/\D/g, "").slice(-4);
    if (storedLast4 !== String(phone4)) {
      return NextResponse.json(
        { error: "Member ID or phone number does not match. Please check and try again." },
        { status: 404 }
      );
    }

    // Check PIN not already taken by a different member
    const existing = await prisma.member.findUnique({
      where: { pin: String(pin) },
      select: { id: true },
    });
    if (existing && existing.id !== member.id) {
      return NextResponse.json(
        { error: "This PIN is already in use. Please choose a different PIN." },
        { status: 409 }
      );
    }

    // Set the PIN
    await prisma.member.update({
      where: { id: member.id },
      data: { pin: String(pin) },
    });

    return NextResponse.json({ ok: true, fullName: member.fullName, memberId: member.memberId });
  } catch (err) {
    console.error("[member/setup-pin]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

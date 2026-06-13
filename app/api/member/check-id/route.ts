import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const rl = checkRateLimit(`${ip}:member-check-id`, {
      maxAttempts: 20, windowMs: 15 * 60 * 1000, blockMs: 15 * 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rl.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const { memberId } = await req.json();
    if (!memberId || typeof memberId !== "string") {
      return NextResponse.json({ error: "Member ID is required." }, { status: 400 });
    }

    const member = await prisma.member.findUnique({
      where: { memberId: memberId.toUpperCase().trim() },
      select: { id: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Member ID not found. Check your membership card." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[member/check-id]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

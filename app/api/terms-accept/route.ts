import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const rl = checkRateLimit(`${ip}:terms-accept`, {
      maxAttempts: 10, windowMs: 15 * 60 * 1000, blockMs: 30 * 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rl.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const { memberId } = await req.json();
    if (!memberId || typeof memberId !== "string") {
      return NextResponse.json({ error: "Member ID required." }, { status: 400 });
    }

    const member = await prisma.member.findUnique({
      where: { memberId },
      select: { id: true, termsAcceptedAt: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    if (member.termsAcceptedAt) {
      return NextResponse.json({ alreadyAccepted: true });
    }

    await prisma.member.update({
      where: { id: member.id },
      data: { termsAcceptedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[terms-accept]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const memberId = req.nextUrl.searchParams.get("id");
  if (!memberId) return NextResponse.json({ error: "Member ID required." }, { status: 400 });

  const member = await prisma.member.findUnique({
    where: { memberId },
    select: { fullName: true, termsAcceptedAt: true },
  });

  if (!member) return NextResponse.json({ error: "Member not found." }, { status: 404 });

  return NextResponse.json({
    fullName: member.fullName,
    termsAcceptedAt: member.termsAcceptedAt?.toISOString() ?? null,
  });
}

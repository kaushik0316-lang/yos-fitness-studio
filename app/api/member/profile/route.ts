import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

// Member portal: read and update the member's own contact details (PIN-authenticated).

// Accepts "98409 58866", "+91 98409 58866", "098409..." etc. Returns 10 digits or null.
function cleanMobile(raw: unknown): string | null {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length !== 10 || /^(\d)\1+$/.test(d) || !/^[6-9]/.test(d)) return null;
  return d;
}

const isBlank = (v: unknown) => v === undefined || v === null || String(v).trim() === "";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const rl = checkRateLimit(`${ip}:member-profile`, { maxAttempts: 15, windowMs: 15 * 60 * 1000, blockMs: 15 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: `Too many attempts. Try again in ${rl.retryAfterSeconds} seconds.` }, { status: 429 });
    }

    const body = await req.json();
    const { pin, action } = body as { pin?: string; action?: "get" | "update" };
    if (!pin || String(pin).length !== 4) return NextResponse.json({ error: "Invalid PIN." }, { status: 400 });

    const member = await prisma.member.findUnique({
      where: { pin: String(pin) },
      select: { id: true, phone: true, whatsapp: true, emergencyContact: true, emergencyPhone: true },
    });
    if (!member) return NextResponse.json({ error: "Invalid PIN." }, { status: 401 });

    if (action !== "update") {
      return NextResponse.json({
        phone: member.phone, whatsapp: member.whatsapp ?? "",
        emergencyContact: member.emergencyContact ?? "", emergencyPhone: member.emergencyPhone ?? "",
      });
    }

    const phone = cleanMobile(body.phone);
    if (!phone) return NextResponse.json({ error: "Enter a valid 10-digit mobile number." }, { status: 400 });

    let whatsapp = phone;
    if (!isBlank(body.whatsapp)) {
      const w = cleanMobile(body.whatsapp);
      if (!w) return NextResponse.json({ error: "Enter a valid 10-digit WhatsApp number, or leave it blank to use your mobile number." }, { status: 400 });
      whatsapp = w;
    }

    let emergencyPhone: string | null = null;
    if (!isBlank(body.emergencyPhone)) {
      emergencyPhone = cleanMobile(body.emergencyPhone);
      if (!emergencyPhone) return NextResponse.json({ error: "Enter a valid 10-digit emergency contact number." }, { status: 400 });
    }
    const emergencyContact = isBlank(body.emergencyContact) ? null : String(body.emergencyContact).trim().slice(0, 80);

    await prisma.member.update({
      where: { id: member.id },
      data: { phone, whatsapp, emergencyContact, emergencyPhone },
    });

    return NextResponse.json({ ok: true, phone, whatsapp, emergencyContact: emergencyContact ?? "", emergencyPhone: emergencyPhone ?? "" });
  } catch (err) {
    console.error("[member/profile]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

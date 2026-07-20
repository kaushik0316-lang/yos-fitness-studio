import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { normalizeName } from "@/lib/utils/titleCase";
import { getActiveProvider } from "@/lib/messaging/provider";

export async function POST(req: NextRequest) {
  // Rate limit: 5 registrations per hour per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const rl = checkRateLimit(`${ip}:register-member`, { maxAttempts: 5, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many registrations. Please try again later." }, { status: 429 });
  }

  const body = await req.json();

  const { fullName, phone, whatsapp, gender, dateOfBirth, email,
    bloodGroup, weight, height, healthConditions, intentionOfJoining,
    emergencyContact, emergencyPhone, address, primaryCompany } = body;

  if (!fullName?.trim() || !phone?.trim() || !primaryCompany) {
    return NextResponse.json({ error: "Name, phone and gym selection are required." }, { status: 400 });
  }

  const digitsOnly = phone.trim().replace(/\D/g, "");
  if (digitsOnly.length !== 10) {
    return NextResponse.json({ error: "Phone number must be exactly 10 digits." }, { status: 400 });
  }

  // Generate next member ID inside a transaction (primaryCompany used for ID prefix only, not stored)
  const member = await prisma.$transaction(async (tx) => {
    const prefix = primaryCompany === "YOS_FITNESS" ? "YF" : "YFS";

    const existing = await tx.member.findMany({
      where: { memberId: { startsWith: `${prefix}-` } },
      select: { memberId: true },
    });

    const maxNum = existing.reduce((max, m) => {
      const n = parseInt(m.memberId.split("-")[1] ?? "0", 10);
      return n > max ? n : max;
    }, 0);

    const nextId = `${prefix}-${String(maxNum + 1).padStart(3, "0")}`;

    const u = (s: string | undefined | null) => s?.trim().toUpperCase() || null;
    return tx.member.create({
      data: {
        memberId: nextId,
        fullName: normalizeName(fullName).trim().toUpperCase(),
        phone: phone.trim(),
        whatsapp: whatsapp?.trim() || phone.trim(),
        gender: gender || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        email: email?.trim().toLowerCase() || null,
        bloodGroup: bloodGroup?.trim() || null,
        weight: weight ? parseFloat(weight) : null,
        height: height ? parseFloat(height) : null,
        healthConditions: u(healthConditions),
        intentionOfJoining: u(intentionOfJoining),
        emergencyContact: u(emergencyContact),
        emergencyPhone: emergencyPhone?.trim() || null,
        address: u(address),
        status: "PROSPECT",
      },
      select: { memberId: true, fullName: true },
    });
  });

  // Notify admin on WhatsApp so they can add the new member to the group
  const adminPhone = process.env.ADMIN_NOTIFY_PHONE ?? "919840690418";
  const notifyTo   = adminPhone.startsWith("+") ? adminPhone : `+${adminPhone}`;
  const msg =
    `🆕 *New Member Registration*\n` +
    `*Name:* ${member.fullName}\n` +
    `*Phone:* ${phone.trim()}\n` +
    `*Member ID:* ${member.memberId}\n\n` +
    `Add to WhatsApp group 📱`;

  getActiveProvider().send({ to: notifyTo, message: msg, channel: "WHATSAPP" })
    .catch((e) => console.error("[register-member] admin notify failed:", e));

  return NextResponse.json({ ok: true, memberId: member.memberId, fullName: member.fullName });
}

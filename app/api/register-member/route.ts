import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { fullName, phone, whatsapp, gender, dateOfBirth, email,
    bloodGroup, weight, height, healthConditions, intentionOfJoining,
    emergencyContact, emergencyPhone, address, primaryCompany } = body;

  if (!fullName?.trim() || !phone?.trim() || !primaryCompany) {
    return NextResponse.json({ error: "Name, phone and gym selection are required." }, { status: 400 });
  }

  // Generate next member ID inside a transaction
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

    return tx.member.create({
      data: {
        memberId: nextId,
        fullName: fullName.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp?.trim() || phone.trim(),
        gender: gender || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        email: email?.trim() || null,
        bloodGroup: bloodGroup?.trim() || null,
        weight: weight ? parseFloat(weight) : null,
        height: height ? parseFloat(height) : null,
        healthConditions: healthConditions?.trim() || null,
        intentionOfJoining: intentionOfJoining?.trim() || null,
        emergencyContact: emergencyContact?.trim() || null,
        emergencyPhone: emergencyPhone?.trim() || null,
        address: address?.trim() || null,
        primaryCompany,
        status: "PROSPECT",
      },
      select: { memberId: true, fullName: true },
    });
  });

  return NextResponse.json({ ok: true, memberId: member.memberId, fullName: member.fullName });
}

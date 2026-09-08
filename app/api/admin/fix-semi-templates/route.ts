import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.$transaction([
    prisma.waTemplate.update({
      where: { key: "renewal_semi_expired" },
      data: { body: "Hi {{name}}!\n\nYour Semi-Private Coaching membership expired on *{{date}}*. We'd love to have you back — do renew at the earliest!\n\n– Team Yos" },
    }),
    prisma.waTemplate.update({
      where: { key: "renewal_semi_today" },
      data: { body: "Hi {{name}}!\n\nYour Semi-Private Coaching membership expires *today*. Do renew at the earliest — we enjoy having you here!\n\n– Team Yos" },
    }),
    prisma.waTemplate.update({
      where: { key: "renewal_semi_upcoming" },
      data: { body: "Hi {{name}}!\n\nJust a heads-up that your Semi-Private Coaching membership is expiring on *{{date}}*. Do renew at the earliest — we enjoy having you here!\n\n– Team Yos" },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.waTemplate.update({
    where: { key: "onboarding_general" },
    data: { body: "Hi {{name}}! Welcome to Yos Fitness Studio! 🎉\n\nWe're so happy to have you with us — this is the start of something great!\n\nYour Member ID is *{{memberId}}*. Keep it handy for check-ins and anything membership related.\n\n📱 Set up your member portal to track attendance and view your membership details:\nhttps://yosfitnessstudio.in/member-portal?setup=1\n\nIf you ever need anything, we're right here for you. See you at the studio! 💪\n\n– Team Yos" },
  });

  return NextResponse.json({ ok: true });
}

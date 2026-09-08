import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await Promise.all([
    prisma.waTemplate.upsert({
      where: { key: "wa_group_male" },
      update: { body: "https://chat.whatsapp.com/FVztewE7CVCF8d0LlRCU3v?s=cl&p=i&mlu=4&ilr=4" },
      create: { key: "wa_group_male", label: "WhatsApp Group Link — Male", category: "onboarding", body: "https://chat.whatsapp.com/FVztewE7CVCF8d0LlRCU3v?s=cl&p=i&mlu=4&ilr=4" },
    }),
    prisma.waTemplate.upsert({
      where: { key: "wa_group_female" },
      update: { body: "https://chat.whatsapp.com/DGyicuz4jkfALdoXYnW44X?s=cl&p=i&mlu=4&ilr=4" },
      create: { key: "wa_group_female", label: "WhatsApp Group Link — Female", category: "onboarding", body: "https://chat.whatsapp.com/DGyicuz4jkfALdoXYnW44X?s=cl&p=i&mlu=4&ilr=4" },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

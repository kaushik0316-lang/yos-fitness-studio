import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.waTemplate.findUnique({
    where: { key: "onboarding_general" },
    select: { body: true, updatedAt: true },
  });

  return NextResponse.json({ body: row?.body, updatedAt: row?.updatedAt });
}

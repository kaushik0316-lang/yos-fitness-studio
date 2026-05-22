import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Add shifts column if it doesn't exist
  await prisma.$executeRaw`
    ALTER TABLE "Employee"
    ADD COLUMN IF NOT EXISTS "shifts" JSONB;
  `;

  return NextResponse.json({ success: true, message: "shifts column added" });
}

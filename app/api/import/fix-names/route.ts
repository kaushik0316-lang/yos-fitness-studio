import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function cleanName(raw: string): string {
  return raw
    .replace(/[./\\,;:|_+*&%$#@!^~`'"]/g, " ") // special chars → space
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const members = await prisma.member.findMany({ select: { id: true, fullName: true } });

  let fixed = 0;
  const sample: { from: string; to: string }[] = [];

  for (const m of members) {
    const cleaned = cleanName(m.fullName);
    if (cleaned !== m.fullName) {
      await prisma.member.update({ where: { id: m.id }, data: { fullName: cleaned } });
      if (sample.length < 20) sample.push({ from: m.fullName, to: cleaned });
      fixed++;
    }
  }

  return NextResponse.json({ fixed, sample });
}

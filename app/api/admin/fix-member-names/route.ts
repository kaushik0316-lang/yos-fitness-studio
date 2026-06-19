import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeName } from "@/lib/utils/titleCase";

function cleanName(name: string): string {
  return normalizeName(name).toUpperCase();
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch all members (only id + fullName needed)
    const members = await prisma.member.findMany({
      select: { id: true, fullName: true },
    });

    let fixed = 0;
    let skipped = 0;
    const changes: { id: string; before: string; after: string }[] = [];

    for (const m of members) {
      const cleaned = cleanName(m.fullName);
      if (cleaned === m.fullName) {
        skipped++;
        continue;
      }
      await prisma.member.update({
        where: { id: m.id },
        data: { fullName: cleaned },
      });
      changes.push({ id: m.id, before: m.fullName, after: cleaned });
      fixed++;
    }

    return NextResponse.json({
      total: members.length,
      fixed,
      skipped,
      message: `Fixed ${fixed} names, ${skipped} already clean.`,
      // Show first 20 changes as sample
      sample: changes.slice(0, 20),
    });
  } catch (e: any) {
    console.error("[fix-member-names]", e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

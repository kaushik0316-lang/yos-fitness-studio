import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Replace dots, slashes, dashes, commas etc. with a space, collapse whitespace */
function cleanName(raw: string): string {
  return raw
    .replace(/[.\-\/,;()_\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find ALL members whose name contains a special char
  const members = await prisma.member.findMany({
    where: {
      OR: [
        { fullName: { contains: "." } },
        { fullName: { contains: "/" } },
        { fullName: { contains: "," } },
        { fullName: { contains: ";" } },
        { fullName: { contains: "(" } },
        { fullName: { contains: ")" } },
        { fullName: { contains: "\\" } },
      ],
    },
    select: { id: true, fullName: true },
  });

  let fixed = 0;
  const updates = members
    .map((m) => ({ id: m.id, cleaned: cleanName(m.fullName) }))
    .filter((u) => u.cleaned !== u.id); // only if actually changed

  // Run in parallel batches of 50
  const ops = updates.map((u) =>
    prisma.member.update({ where: { id: u.id }, data: { fullName: updates.find(x => x.id === u.id)!.cleaned } })
  );

  // Rewrite properly
  const fixList = members
    .map((m) => ({ id: m.id, original: m.fullName, cleaned: cleanName(m.fullName) }))
    .filter((u) => u.cleaned !== u.original);

  for (let i = 0; i < fixList.length; i += 50) {
    await Promise.all(
      fixList.slice(i, i + 50).map((u) =>
        prisma.member.update({ where: { id: u.id }, data: { fullName: u.cleaned } })
      )
    );
    fixed += Math.min(50, fixList.length - i);
  }

  return NextResponse.json({ fixed, sample: fixList.slice(0, 20).map(u => ({ from: u.original, to: u.cleaned })) });
}

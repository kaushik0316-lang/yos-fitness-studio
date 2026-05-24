import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();

    if (q.length < 1) return NextResponse.json([]);

    const members = await prisma.member.findMany({
      where: {
        fullName: { contains: q, mode: "insensitive" },
        NOT: { memberId: { startsWith: "IMP-" } },
      },
      select: { id: true, fullName: true, memberId: true, phone: true },
      orderBy: { fullName: "asc" },
      take: 8,
    });

    return NextResponse.json(members);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

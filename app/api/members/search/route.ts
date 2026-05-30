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

    const limit = Math.min(Number(new URL(req.url).searchParams.get("limit") ?? 8), 20);

    // Token search: each word must match at least one field (any word order)
    const tokens = q.split(/\s+/).filter(Boolean);
    const members = await prisma.member.findMany({
      where: {
        AND: tokens.map((t) => ({
          OR: [
            { fullName: { contains: t, mode: "insensitive" } },
            { memberId: { contains: t, mode: "insensitive" } },
            { phone: { contains: t } },
          ],
        })),
      },
      select: { id: true, fullName: true, memberId: true, phone: true },
      orderBy: { fullName: "asc" },
      take: limit,
    });

    return NextResponse.json(members);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

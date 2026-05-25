import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const memberId = formData.get("memberId") as string | null;

    if (!file || !memberId) return NextResponse.json({ error: "Missing file or memberId" }, { status: 400 });
    if (!file.type.startsWith("image/")) return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });

    // Delete old photo if exists
    const member = await prisma.member.findUnique({ where: { id: memberId }, select: { photoUrl: true } });
    if (member?.photoUrl) {
      try { await del(member.photoUrl); } catch {}
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const blob = await put(`members/${memberId}.${ext}`, file, {
      access: "public",
      addRandomSuffix: false,
    });

    await prisma.member.update({
      where: { id: memberId },
      data: { photoUrl: blob.url },
    });

    return NextResponse.json({ url: blob.url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

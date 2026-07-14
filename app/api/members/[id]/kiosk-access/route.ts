import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowKioskCheckin } = await req.json();

  await prisma.member.update({
    where: { id: params.id },
    data: { allowKioskCheckin: Boolean(allowKioskCheckin) },
  });

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST — log a WhatsApp message as sent (admin only)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { message } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const log = await prisma.enquiryMessage.create({
    data: {
      enquiryId: params.id,
      message: message.trim(),
      sentById: session.user.id,
    },
    include: { sentBy: { select: { name: true } } },
  });

  return NextResponse.json({ log });
}

// GET — fetch message history for an enquiry (admin only)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const messages = await prisma.enquiryMessage.findMany({
    where: { enquiryId: params.id },
    orderBy: { sentAt: "desc" },
    include: { sentBy: { select: { name: true } } },
  });

  return NextResponse.json({ messages });
}

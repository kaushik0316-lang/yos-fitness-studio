import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }

  // Fetch user with current password hash
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, password: true },
  });

  if (!user?.password) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Verify current password
  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  // Hash and save new password
  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  return NextResponse.json({ success: true });
}

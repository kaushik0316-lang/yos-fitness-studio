"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Staff decision on a member's request. This only records the decision; changing the
// membership itself (status, expiry) is still done on the member's profile.
export async function resolveMemberRequest(
  id: string,
  decision: "DONE" | "DECLINED",
  note?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Your session has expired. Please sign in again." };
  if (session.user.role !== "ADMIN" && session.user.role !== "FRONT_DESK") {
    return { ok: false, error: "You don't have permission to do this." };
  }

  const updated = await prisma.memberRequest.updateMany({
    where: { id, status: "PENDING" },
    data: {
      status: decision,
      handledById: session.user.id,
      handledByName: session.user.name ?? session.user.email ?? "Staff",
      handledAt: new Date(),
      staffNote: note?.trim().slice(0, 200) || null,
    },
  });
  if (updated.count === 0) return { ok: false, error: "This request was already handled." };

  revalidatePath("/requests");
  return { ok: true };
}

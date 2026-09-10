"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  ctaLabel: string;
  audience: string;
  active: boolean;
  expiresAt: Date | null;
  sortOrder: number;
  createdAt: Date;
};

export async function getAnnouncements(): Promise<AnnouncementRow[]> {
  return prisma.announcement.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
}

export async function getActiveAnnouncements(packageName: string | null, status: string): Promise<AnnouncementRow[]> {
  const now = new Date();
  const rows = await prisma.announcement.findMany({
    where: { active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: 2,
  });

  const pkg = (packageName ?? "").toLowerCase();
  const pkgType = pkg.includes("personal training") || pkg.includes(" pt ") || pkg.startsWith("pt ")
    ? "PT"
    : pkg.includes("semi private") || pkg.includes("semi-private") || pkg.includes("semiprivate")
    ? "SEMI"
    : pkg.includes("hiit")
    ? "HIIT"
    : "GENERAL";

  return rows.filter((r) => {
    if (r.audience === "ALL") return true;
    if (r.audience === "ACTIVE") return status === "ACTIVE";
    if (r.audience === "EXPIRED") return status === "EXPIRED";
    if (r.audience === pkgType) return true;
    return false;
  }).slice(0, 2);
}

export async function createAnnouncement(data: {
  title: string; body: string; ctaLabel: string; audience: string; expiresAt: string | null;
}): Promise<void> {
  const max = await prisma.announcement.aggregate({ _max: { sortOrder: true } });
  await prisma.announcement.create({
    data: {
      title: data.title, body: data.body, ctaLabel: data.ctaLabel,
      audience: data.audience,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      sortOrder: (max._max.sortOrder ?? 0) + 1,
    },
  });
  revalidatePath("/announcements");
}

export async function updateAnnouncement(id: string, data: {
  title: string; body: string; ctaLabel: string; audience: string; expiresAt: string | null; active: boolean;
}): Promise<void> {
  await prisma.announcement.update({
    where: { id },
    data: {
      title: data.title, body: data.body, ctaLabel: data.ctaLabel,
      audience: data.audience, active: data.active,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    },
  });
  revalidatePath("/announcements");
}

export async function toggleAnnouncement(id: string, active: boolean): Promise<void> {
  await prisma.announcement.update({ where: { id }, data: { active } });
  revalidatePath("/announcements");
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await prisma.announcement.delete({ where: { id } });
  revalidatePath("/announcements");
}

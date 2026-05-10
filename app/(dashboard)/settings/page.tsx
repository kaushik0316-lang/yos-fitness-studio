import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { SettingsClient } from "@/components/settings/SettingsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/");

  const [packages, users] = await Promise.all([
    prisma.package.findMany({ orderBy: [{ company: "asc" }, { durationDays: "asc" }] }),
    prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <Header title="Settings" subtitle="Packages, users, and system configuration" />
      <div className="flex-1 p-6">
        <SettingsClient packages={packages} users={users as any} />
      </div>
    </>
  );
}

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { AutomationClient } from "@/components/automation/AutomationClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Automation" };

export default async function AutomationPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/");

  const [logs, inactiveCount, expiringCount, messageStats] = await Promise.all([
    prisma.automationLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.member.count({
      where: { status: "ACTIVE", lastAttendanceDate: { lt: new Date(Date.now() - 4 * 86400000) } },
    }),
    prisma.member.count({
      where: { status: "ACTIVE", expiryDate: { gte: new Date(), lte: new Date(Date.now() + 7 * 86400000) } },
    }),
    prisma.messageLog.groupBy({
      by: ["status"],
      _count: true,
      where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
    }),
  ]);

  return (
    <>
      <Header title="Automation" subtitle="Scheduled tasks & logs" />
      <div className="flex-1 overflow-y-auto p-6">
        <AutomationClient
          logs={logs as any}
          inactiveCount={inactiveCount}
          expiringCount={expiringCount}
          messageStats={messageStats}
        />
      </div>
    </>
  );
}

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { MessagesClient } from "@/components/messages/MessagesClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const session = await auth();

  const [templates, recentLogs] = await Promise.all([
    prisma.messageTemplate.findMany({ orderBy: { trigger: "asc" } }),
    prisma.messageLog.findMany({
      include: { member: { select: { memberId: true, fullName: true } }, template: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <>
      <Header title="Messages" subtitle="Templates and message history" />
      <div className="flex-1 overflow-y-auto p-6">
        <MessagesClient
          templates={templates as any}
          recentLogs={recentLogs as any}
          userRole={session!.user.role}
        />
      </div>
    </>
  );
}

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CrmShell } from "@/components/layout/CrmShell";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <CrmShell
      userRole={session.user.role}
      userName={session.user.name ?? "User"}
      userEmail={session.user.email ?? ""}
    >
      {children}
    </CrmShell>
  );
}

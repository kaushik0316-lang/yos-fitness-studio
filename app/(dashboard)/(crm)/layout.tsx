import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0e0e0e" }}>
      <Sidebar
        userRole={session.user.role}
        userName={session.user.name ?? "User"}
        userEmail={session.user.email ?? ""}
      />
      {/* Main content — offset by sidebar width */}
      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        {children}
      </div>
    </div>
  );
}

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { StaffToolsClient } from "@/components/staff/StaffToolsClient";
import { REGISTRATION_FORM_URL } from "@/lib/site-config";

export const metadata = { title: "Staff Tools" };

export default async function StaffToolsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <>
      <Header
        title="Staff Tools"
        subtitle="Quick actions and member registration"
      />
      <div className="flex-1 p-6">
        <StaffToolsClient
          formUrl={REGISTRATION_FORM_URL}
          userName={session.user.name ?? "Staff"}
          userRole={session.user.role ?? "FRONT_DESK"}
        />
      </div>
    </>
  );
}

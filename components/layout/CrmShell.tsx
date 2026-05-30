"use client";

import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { TitleCaseInput } from "./TitleCaseInput";
import type { UserRole } from "@prisma/client";

type Props = {
  userRole: UserRole;
  userName: string;
  userEmail: string;
  children: React.ReactNode;
};

export function CrmShell({ userRole, userName, userEmail, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Apply dark class to <html> so Radix portals (dialogs, popovers) also use dark CSS variables
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  return (
    <div className="dark flex h-screen overflow-hidden" style={{ background: "#0e0e0e" }}>
      <TitleCaseInput />
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        userRole={userRole}
        userName={userName}
        userEmail={userEmail}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden md:ml-60">
        {/* Mobile top bar with hamburger */}
        <div
          className="flex items-center gap-3 px-4 h-14 flex-shrink-0 md:hidden"
          style={{ background: "rgba(13,13,13,0.95)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/8 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-orange-500 rounded-lg p-1.5">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
              </svg>
            </div>
            <span className="font-bold text-white text-sm">Yos CRM</span>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}

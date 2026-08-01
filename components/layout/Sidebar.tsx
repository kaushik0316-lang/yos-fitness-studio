"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Users, CalendarCheck, RotateCcw, CreditCard,
  ClipboardList, DollarSign, BarChart3, MessageSquare,
  Zap, Settings, LogOut, Dumbbell, Wrench, FileUp, UserSearch, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

const navGroups = [
  {
    label: "",
    items: [
      { label: "Members",          href: "/members",            icon: Users,         roles: ["ADMIN", "FRONT_DESK", "TRAINER", "ACCOUNTANT"] },
      { label: "Enquiries",        href: "/enquiries",          icon: UserSearch,    roles: ["ADMIN", "FRONT_DESK", "TRAINER"] },
      { label: "Attendance",       href: "/attendance",         icon: CalendarCheck, roles: ["ADMIN", "FRONT_DESK", "TRAINER"] },
      { label: "Renewals",         href: "/renewals",           icon: RotateCcw,     roles: ["ADMIN", "FRONT_DESK", "ACCOUNTANT"] },
      { label: "Payments",         href: "/payments",           icon: CreditCard,    roles: ["ADMIN", "FRONT_DESK", "ACCOUNTANT"] },
      { label: "Overview",         href: "/staff-tools",        icon: Wrench,        roles: ["ADMIN", "FRONT_DESK"] },
    ],
  },
  {
    label: "Staff",
    items: [
      { label: "Staff Attendance", href: "/employee-attendance", icon: ClipboardList, roles: ["ADMIN", "ACCOUNTANT"] },
      { label: "Payroll",          href: "/payroll",            icon: DollarSign,    roles: ["ADMIN", "ACCOUNTANT"] },
      { label: "Sales",            href: "/sales",              icon: TrendingUp,    roles: ["ADMIN", "ACCOUNTANT"] },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Reports",          href: "/reports",            icon: BarChart3,     roles: ["ADMIN", "ACCOUNTANT"] },
      { label: "Messages",         href: "/messages",           icon: MessageSquare, roles: ["ADMIN", "FRONT_DESK"] },
      { label: "Automation",       href: "/automation",         icon: Zap,           roles: ["ADMIN"] },
      { label: "Settings",         href: "/settings",           icon: Settings,      roles: ["ADMIN"] },
      { label: "Import",           href: "/admin/import",       icon: FileUp,        roles: ["ADMIN"] },
    ],
  },
];

type Props = {
  userRole: UserRole;
  userName: string;
  userEmail: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

export function Sidebar({ userRole, userName, userEmail, mobileOpen = false, onMobileClose }: Props) {
  const pathname = usePathname();
  const initials = userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-40 w-60 flex flex-col transition-transform duration-300",
      "md:translate-x-0",
      mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
    )} style={{ background: "#0d0d0d", borderRight: "1px solid rgba(255,255,255,0.05)" }}>

      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="rounded-xl p-2 flex-shrink-0 shadow-lg" style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", boxShadow: "0 4px 12px rgba(249,115,22,0.3)" }}>
          <Dumbbell className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-white text-sm leading-tight">Yos CRM</p>
          <p className="text-[10px] leading-tight" style={{ color: "#4b5563" }}>Gym Management</p>
        </div>
        {onMobileClose && (
          <button onClick={onMobileClose} className="md:hidden p-1.5 transition-colors" style={{ color: "#4b5563" }}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-4">
        {navGroups.map((group) => {
          const visible = group.items.filter((item) => item.roles.includes(userRole));
          if (visible.length === 0) return null;
          return (
            <div key={group.label}>
              {group.label && (
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] px-2.5 mb-1" style={{ color: "#374151" }}>
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {visible.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onMobileClose}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium transition-all duration-150",
                        isActive
                          ? "text-white"
                          : "hover:text-white"
                      )}
                      style={isActive ? {
                        background: "linear-gradient(135deg, rgba(249,115,22,0.2), rgba(234,88,12,0.12))",
                        color: "#fb923c",
                        border: "1px solid rgba(249,115,22,0.2)",
                      } : {
                        color: "#6b7280",
                        border: "1px solid transparent",
                      }}
                      onMouseEnter={e => {
                        if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      }}
                      onMouseLeave={e => {
                        if (!isActive) e.currentTarget.style.background = "";
                      }}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" style={isActive ? { color: "#f97316" } : undefined} />
                      <span className="flex-1 truncate text-[13px]">{item.label}</span>
                      {isActive && <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: "#f97316" }} />}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="rounded-full w-8 h-8 flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate leading-tight">{userName}</p>
            <p className="text-[10px] leading-tight truncate" style={{ color: "#4b5563" }}>
              {userRole === "ADMIN" ? "Administrator" : userRole === "FRONT_DESK" ? "Front Desk" : userRole === "ACCOUNTANT" ? "Accountant" : "Trainer"}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-1.5 rounded-lg transition-colors flex-shrink-0"
            style={{ color: "#4b5563" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#4b5563"; e.currentTarget.style.background = ""; }}
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

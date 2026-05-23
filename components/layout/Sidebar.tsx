"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Users, CalendarCheck, RotateCcw, CreditCard,
  UserCog, ClipboardList, DollarSign, BarChart3, MessageSquare,
  Zap, Settings, LogOut, Dumbbell, Wrench, FileUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

const navGroups = [
  {
    label: "Main",
    items: [
      { label: "Members", href: "/members", icon: Users, roles: ["ADMIN", "FRONT_DESK", "TRAINER", "ACCOUNTANT"] },
      { label: "Attendance", href: "/attendance", icon: CalendarCheck, roles: ["ADMIN", "FRONT_DESK", "TRAINER"] },
      { label: "Renewals", href: "/renewals", icon: RotateCcw, roles: ["ADMIN", "FRONT_DESK", "ACCOUNTANT"] },
      { label: "Payments", href: "/payments", icon: CreditCard, roles: ["ADMIN", "FRONT_DESK", "ACCOUNTANT"] },
      { label: "Operations", href: "/staff-tools", icon: Wrench, roles: ["ADMIN", "FRONT_DESK"] },
    ],
  },
  {
    label: "Staff",
    items: [
      { label: "Employees", href: "/employees", icon: UserCog, roles: ["ADMIN", "ACCOUNTANT"] },
      { label: "Emp. Attendance", href: "/employee-attendance", icon: ClipboardList, roles: ["ADMIN", "ACCOUNTANT"] },
      { label: "Payroll", href: "/payroll", icon: DollarSign, roles: ["ADMIN", "ACCOUNTANT"] },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Reports", href: "/reports", icon: BarChart3, roles: ["ADMIN", "ACCOUNTANT"] },
      { label: "Messages", href: "/messages", icon: MessageSquare, roles: ["ADMIN", "FRONT_DESK"] },
      { label: "Automation", href: "/automation", icon: Zap, roles: ["ADMIN"] },
      { label: "Settings", href: "/settings", icon: Settings, roles: ["ADMIN"] },
      { label: "Import Data", href: "/admin/import", icon: FileUp, roles: ["ADMIN"] },
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
      "fixed inset-y-0 left-0 z-40 w-64 bg-gray-950 flex flex-col transition-transform duration-300",
      // Mobile: slide in/out. Desktop: always visible.
      "md:translate-x-0",
      mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10 flex-shrink-0">
        <div className="bg-orange-500 rounded-xl p-2 flex-shrink-0 shadow-lg shadow-orange-900/50">
          <Dumbbell className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-white text-sm leading-tight">Yos CRM</p>
          <p className="text-xs text-gray-500 leading-tight">Gym Management</p>
        </div>
        {/* Close button — mobile only */}
        {onMobileClose && (
          <button onClick={onMobileClose} className="md:hidden p-1.5 text-gray-500 hover:text-white transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {navGroups.map((group) => {
          const visible = group.items.filter((item) => item.roles.includes(userRole));
          if (visible.length === 0) return null;
          return (
            <div key={group.label}>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 mb-1.5">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {visible.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onMobileClose}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                        isActive
                          ? "bg-orange-500 text-white shadow-lg shadow-orange-900/30"
                          : "text-gray-400 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <item.icon className={cn("h-4 w-4 flex-shrink-0 transition-transform", isActive ? "" : "group-hover:scale-110")} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {isActive && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-white/10 p-4 flex-shrink-0">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group cursor-default">
          <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-full w-9 h-9 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate leading-tight">{userName}</p>
            <p className="text-xs text-gray-500 truncate leading-tight">{userRole.replace("_", " ")}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

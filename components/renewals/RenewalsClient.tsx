"use client";

import { useState } from "react";
import Link from "next/link";
import { RotateCcw, Phone, AlertTriangle, CheckCircle2 } from "lucide-react";
import { RenewMembershipDialog } from "@/components/members/RenewMembershipDialog";
import { formatDate, daysAgo, daysUntil } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

type RenewalMember = {
  id: string; memberId: string; fullName: string; phone: string; whatsapp: string | null;
  expiryDate: Date | null; lastAttendanceDate?: Date | null;
  currentPackage: { name: string } | null; trainer?: { fullName: string } | null;
  renewalFollowUps?: any[];
};

type Props = {
  expiredMembers: RenewalMember[]; expiring1: RenewalMember[]; expiring3: RenewalMember[];
  expiring7: RenewalMember[]; renewedToday: any[]; packages: any[];
  userRole: UserRole; userId: string;
};

const TABS = [
  { key: "expired", label: "Expired",       shortLabel: "Expired",    color: "text-red-600",    badge: "bg-red-100 text-red-700",    strip: "bg-red-500" },
  { key: "1day",    label: "Due Tomorrow",  shortLabel: "Tomorrow",   color: "text-red-500",    badge: "bg-red-50 text-red-600",     strip: "bg-red-400" },
  { key: "3days",   label: "In 3 Days",     shortLabel: "3 Days",     color: "text-orange-600", badge: "bg-orange-100 text-orange-700", strip: "bg-orange-500" },
  { key: "7days",   label: "In 7 Days",     shortLabel: "7 Days",     color: "text-amber-600",  badge: "bg-amber-100 text-amber-700",  strip: "bg-amber-500" },
  { key: "renewed", label: "Renewed Today", shortLabel: "Renewed",    color: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700", strip: "bg-emerald-500" },
];

export function RenewalsClient({ expiredMembers, expiring1, expiring3, expiring7, renewedToday, packages, userRole, userId }: Props) {
  const [activeTab, setActiveTab] = useState("expired");
  const [renewFor, setRenewFor] = useState<RenewalMember | null>(null);

  const counts: Record<string, number> = {
    expired: expiredMembers.length, "1day": expiring1.length,
    "3days": expiring3.length, "7days": expiring7.length, renewed: renewedToday.length,
  };

  const currentList: RenewalMember[] =
    activeTab === "expired" ? expiredMembers :
    activeTab === "1day" ? expiring1 :
    activeTab === "3days" ? expiring3 :
    activeTab === "7days" ? expiring7 : [];

  const activeTabConfig = TABS.find((t) => t.key === activeTab)!;

  return (
    <div className="space-y-5">
      {/* ── Summary cards ── */}
      <div className="grid grid-cols-5 gap-3">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "bg-white rounded-2xl border border-gray-100 p-4 text-left transition-all hover:shadow-md relative overflow-hidden",
              activeTab === tab.key && "ring-2 ring-orange-400 shadow-md shadow-orange-100"
            )}
          >
            <div className={cn("absolute inset-x-0 top-0 h-[3px]", tab.strip)} />
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1 truncate">{tab.shortLabel}</p>
            <p className={cn("text-3xl font-extrabold mt-1.5", tab.color)}>{counts[tab.key]}</p>
          </button>
        ))}
      </div>

      {/* ── List ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-gray-900">{activeTabConfig.label}</h3>
            <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", activeTabConfig.badge)}>
              {counts[activeTab]}
            </span>
          </div>
        </div>

        {activeTab === "renewed" ? (
          <div className="divide-y divide-gray-50">
            {renewedToday.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-300">
                <RotateCcw className="h-10 w-10" />
                <p className="text-sm text-gray-400 font-medium">No renewals recorded today yet</p>
              </div>
            ) : (
              renewedToday.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{r.member.fullName}</p>
                      <p className="text-xs text-gray-400">{r.member.memberId} · {r.package.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">Renewed</p>
                    <p className="text-xs text-gray-400">valid till {formatDate(r.expiryDate)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-[62vh] overflow-y-auto">
            {currentList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-300">
                <RotateCcw className="h-10 w-10" />
                <p className="text-sm text-gray-400 font-medium">No members in this category</p>
              </div>
            ) : (
              currentList.map((m) => {
                const daysExpired = m.expiryDate ? Math.abs(daysUntil(m.expiryDate)) : null;
                const lastVisit = m.lastAttendanceDate ? daysAgo(m.lastAttendanceDate) : null;

                return (
                  <div key={m.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/70 transition-colors group">
                    {/* Left */}
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xs font-extrabold text-gray-500 flex-shrink-0">
                        {m.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/members/${m.id}`} className="font-semibold text-gray-900 hover:text-orange-600 transition-colors">
                            {m.fullName}
                          </Link>
                          {lastVisit !== null && lastVisit >= 4 && (
                            <span className="text-[11px] text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              {lastVisit}d absent
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {m.memberId}{m.currentPackage ? ` · ${m.currentPackage.name}` : ""}
                        </p>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-400">Expiry</p>
                        <p className={cn("text-sm font-bold", activeTab === "expired" ? "text-red-600" : "text-orange-600")}>
                          {formatDate(m.expiryDate)}
                        </p>
                        {activeTab === "expired" && daysExpired !== null && (
                          <p className="text-xs text-red-400">{daysExpired}d ago</p>
                        )}
                      </div>
                      <a
                        href={`tel:${m.phone}`}
                        className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                        title="Call"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                      {(userRole === "ADMIN" || userRole === "FRONT_DESK") && (
                        <button
                          onClick={() => setRenewFor(m)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-orange-200"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Renew
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {renewFor && (
        <RenewMembershipDialog
          open={!!renewFor}
          onClose={() => setRenewFor(null)}
          member={{ id: renewFor.id, memberId: renewFor.memberId, fullName: renewFor.fullName }}
          packages={packages}
          userId={userId}
        />
      )}
    </div>
  );
}

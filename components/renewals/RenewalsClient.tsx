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
  { key: "expired", label: "Expired",       shortLabel: "Expired",   accent: "#ef4444", badgeBg: "rgba(239,68,68,0.12)",   badgeColor: "#f87171" },
  { key: "1day",    label: "Due Tomorrow",  shortLabel: "Tomorrow",  accent: "#f97316", badgeBg: "rgba(249,115,22,0.12)",  badgeColor: "#fb923c" },
  { key: "3days",   label: "In 3 Days",     shortLabel: "3 Days",    accent: "#f59e0b", badgeBg: "rgba(245,158,11,0.12)",  badgeColor: "#fbbf24" },
  { key: "7days",   label: "In 7 Days",     shortLabel: "7 Days",    accent: "#eab308", badgeBg: "rgba(234,179,8,0.12)",   badgeColor: "#facc15" },
  { key: "renewed", label: "Renewed Today", shortLabel: "Renewed",   accent: "#10b981", badgeBg: "rgba(16,185,129,0.12)",  badgeColor: "#34d399" },
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
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="relative overflow-hidden rounded-2xl p-4 text-left transition-all"
              style={{
                background: isActive ? "rgba(255,255,255,0.06)" : "#161616",
                border: `1px solid ${isActive ? tab.accent + "50" : "rgba(255,255,255,0.06)"}`,
                boxShadow: isActive ? `0 0 0 1px ${tab.accent}40` : "none",
              }}>
              <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl" style={{ background: tab.accent }} />
              <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest mt-1 truncate">{tab.shortLabel}</p>
              <p className="text-3xl font-extrabold mt-1.5" style={{ color: tab.badgeColor }}>{counts[tab.key]}</p>
            </button>
          );
        })}
      </div>

      {/* ── List ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-white">{activeTabConfig.label}</h3>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: activeTabConfig.badgeBg, color: activeTabConfig.badgeColor }}>
              {counts[activeTab]}
            </span>
          </div>
        </div>

        {activeTab === "renewed" ? (
          <div>
            {renewedToday.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <RotateCcw className="h-10 w-10 text-gray-700" />
                <p className="text-sm text-gray-500 font-medium">No renewals recorded today yet</p>
              </div>
            ) : (
              renewedToday.map((r: any, idx: number) => (
                <div key={r.id} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-white/[0.02]"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: idx % 2 === 0 ? "#161616" : "#181818" }}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.12)" }}>
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{r.member.fullName}</p>
                      <p className="text-xs text-gray-600">{r.member.memberId} · {r.package.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-400">Renewed</p>
                    <p className="text-xs text-gray-600">valid till {formatDate(r.expiryDate)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="max-h-[62vh] overflow-y-auto">
            {currentList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <RotateCcw className="h-10 w-10 text-gray-700" />
                <p className="text-sm text-gray-500 font-medium">No members in this category</p>
              </div>
            ) : (
              currentList.map((m, idx) => {
                const daysExpired = m.expiryDate ? Math.abs(daysUntil(m.expiryDate)) : null;
                const lastVisit = m.lastAttendanceDate ? daysAgo(m.lastAttendanceDate) : null;
                return (
                  <div key={m.id} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-white/[0.02] group"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: idx % 2 === 0 ? "#161616" : "#181818" }}>
                    {/* Left */}
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0"
                        style={{ background: "rgba(255,255,255,0.06)", color: "#9ca3af" }}>
                        {m.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/members/${m.id}`} className="font-semibold text-white hover:text-orange-400 transition-colors">
                            {m.fullName}
                          </Link>
                          {lastVisit !== null && lastVisit >= 4 && (
                            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5"
                              style={{ background: "rgba(249,115,22,0.12)", color: "#fb923c" }}>
                              <AlertTriangle className="h-2.5 w-2.5" />{lastVisit}d absent
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {m.memberId}{m.currentPackage ? ` · ${m.currentPackage.name}` : ""}
                        </p>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-600">Expiry</p>
                        <p className="text-sm font-bold" style={{ color: activeTab === "expired" ? "#f87171" : "#fb923c" }}>
                          {formatDate(m.expiryDate)}
                        </p>
                        {activeTab === "expired" && daysExpired !== null && (
                          <p className="text-xs text-red-500/70">{daysExpired}d ago</p>
                        )}
                      </div>
                      <a href={`tel:${m.phone}`}
                        className="p-2.5 rounded-xl text-gray-600 hover:text-white transition-colors"
                        style={{ background: "rgba(255,255,255,0.06)" }} title="Call">
                        <Phone className="h-4 w-4" />
                      </a>
                      {(userRole === "ADMIN" || userRole === "FRONT_DESK") && (
                        <button onClick={() => setRenewFor(m)}
                          className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-bold transition-all"
                          style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
                          <RotateCcw className="h-3.5 w-3.5" /> Renew
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
          open={!!renewFor} onClose={() => setRenewFor(null)}
          member={{ id: renewFor.id, memberId: renewFor.memberId, fullName: renewFor.fullName }}
          packages={packages} userId={userId}
        />
      )}
    </div>
  );
}

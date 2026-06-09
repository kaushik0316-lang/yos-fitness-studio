"use client";

import { useState } from "react";
import Link from "next/link";
import { RotateCcw, Phone, AlertTriangle, CheckCircle2, MessageCircle, Clock } from "lucide-react";
import { RenewMembershipDialog } from "@/components/members/RenewMembershipDialog";
import { formatDate, daysAgo, daysUntil } from "@/lib/utils";
import { toTitleCase } from "@/lib/utils/titleCase";
import type { UserRole } from "@prisma/client";

type RenewalMember = {
  id: string; memberId: string; fullName: string; phone: string; whatsapp: string | null;
  expiryDate: Date | null; lastAttendanceDate?: Date | null;
  currentPackage: { name: string } | null; trainer?: { fullName: string } | null;
  renewalFollowUps?: any[];
};

type Props = {
  expiredMembers: RenewalMember[]; expiring1: RenewalMember[]; expiring3: RenewalMember[];
  expiring7: RenewalMember[]; expiring30: RenewalMember[]; renewedToday: any[]; packages: any[];
  userRole: UserRole; userId: string;
};

const TABS = [
  { key: "expired", label: "Expired",       shortLabel: "Expired",   accent: "#ef4444", badgeBg: "rgba(239,68,68,0.12)",   badgeColor: "#f87171" },
  { key: "1day",    label: "Due Tomorrow",  shortLabel: "Tomorrow",  accent: "#f97316", badgeBg: "rgba(249,115,22,0.12)",  badgeColor: "#fb923c" },
  { key: "3days",   label: "In 3 Days",     shortLabel: "3 Days",    accent: "#f59e0b", badgeBg: "rgba(245,158,11,0.12)",  badgeColor: "#fbbf24" },
  { key: "7days",   label: "In 7 Days",     shortLabel: "7 Days",    accent: "#eab308", badgeBg: "rgba(234,179,8,0.12)",   badgeColor: "#facc15" },
  { key: "30days",  label: "This Month",    shortLabel: "Month",     accent: "#3b82f6", badgeBg: "rgba(59,130,246,0.12)",  badgeColor: "#60a5fa" },
  { key: "renewed", label: "Renewed Today", shortLabel: "Renewed",   accent: "#10b981", badgeBg: "rgba(16,185,129,0.12)",  badgeColor: "#34d399" },
];

function waLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const num = digits.startsWith("91") && digits.length === 12 ? digits : `91${digits.slice(-10)}`;
  return `https://wa.me/${num}`;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export function RenewalsClient({ expiredMembers, expiring1, expiring3, expiring7, expiring30, renewedToday, packages, userRole, userId }: Props) {
  const [activeTab, setActiveTab] = useState("expired");
  const [renewFor, setRenewFor] = useState<RenewalMember | null>(null);

  const counts: Record<string, number> = {
    expired: expiredMembers.length, "1day": expiring1.length,
    "3days": expiring3.length, "7days": expiring7.length,
    "30days": expiring30.length, renewed: renewedToday.length,
  };

  const currentList: RenewalMember[] =
    activeTab === "expired" ? expiredMembers :
    activeTab === "1day" ? expiring1 :
    activeTab === "3days" ? expiring3 :
    activeTab === "7days" ? expiring7 :
    activeTab === "30days" ? expiring30 : [];

  const activeTabConfig = TABS.find((t) => t.key === activeTab)!;

  return (
    <div className="space-y-5">
      {/* ── Summary cards ── */}
      <div className="grid grid-cols-6 gap-3">
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
                      <p className="font-semibold text-white">{toTitleCase(r.member.fullName)}</p>
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
          <div className="max-h-[62vh] overflow-y-auto divide-y divide-white/[0.04]">
            {currentList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <RotateCcw className="h-10 w-10 text-gray-700" />
                <p className="text-sm text-gray-500 font-medium">No members in this category</p>
              </div>
            ) : (
              currentList.map((m, idx) => {
                const daysLeft    = m.expiryDate ? daysUntil(m.expiryDate) : null;
                const daysExpired = daysLeft !== null && daysLeft < 0 ? Math.abs(daysLeft) : null;
                const lastVisit   = m.lastAttendanceDate ? daysAgo(m.lastAttendanceDate) : null;
                const waNumber    = m.whatsapp || m.phone;
                const isExpired   = activeTab === "expired" || (activeTab === "30days" && daysLeft !== null && daysLeft < 0);

                return (
                  <div key={m.id}
                    className="px-5 py-4 hover:bg-white/[0.02] transition-colors"
                    style={{ background: idx % 2 === 0 ? "#161616" : "#181818" }}>

                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 mt-0.5"
                        style={{ background: "rgba(255,255,255,0.06)", color: "#9ca3af" }}>
                        {getInitials(m.fullName)}
                      </div>

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        {/* Row 1: name + badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/members/${m.id}`}
                            className="font-bold text-white hover:text-orange-400 transition-colors text-sm">
                            {toTitleCase(m.fullName)}
                          </Link>
                          <span className="text-[10px] font-bold text-gray-600 font-mono">{m.memberId}</span>
                          {activeTab === "30days" && isExpired && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                              style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
                              Expired
                            </span>
                          )}
                          {lastVisit !== null && lastVisit >= 4 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5"
                              style={{ background: "rgba(249,115,22,0.12)", color: "#fb923c" }}>
                              <AlertTriangle className="h-2.5 w-2.5" />{lastVisit}d absent
                            </span>
                          )}
                        </div>

                        {/* Row 2: package + expiry */}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {m.currentPackage && (
                            <span className="text-xs text-gray-500">{m.currentPackage.name}</span>
                          )}
                          <span className="text-gray-700 text-xs">·</span>
                          <span className="flex items-center gap-1 text-xs font-semibold"
                            style={{ color: isExpired ? "#f87171" : "#fb923c" }}>
                            <Clock className="h-3 w-3" />
                            {m.expiryDate ? formatDate(m.expiryDate) : "—"}
                            {isExpired && daysExpired !== null && (
                              <span className="text-red-500/60 font-normal ml-0.5">({daysExpired}d ago)</span>
                            )}
                          </span>
                        </div>

                        {/* Row 3: phone + action buttons */}
                        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                          {/* Phone number text */}
                          <a href={`tel:${m.phone}`}
                            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg"
                            style={{ background: "rgba(255,255,255,0.06)" }}>
                            <Phone className="h-3 w-3" />
                            {m.phone}
                          </a>

                          {/* WhatsApp button */}
                          <a href={waLink(waNumber)} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors"
                            style={{ background: "rgba(37,211,102,0.12)", color: "#25d366" }}
                            title="WhatsApp">
                            <MessageCircle className="h-3 w-3" />
                            WhatsApp
                          </a>

                          {/* Renew button */}
                          {(userRole === "ADMIN" || userRole === "FRONT_DESK") && (
                            <button onClick={() => setRenewFor(m)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-bold transition-all ml-auto"
                              style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
                              <RotateCcw className="h-3 w-3" /> Renew
                            </button>
                          )}
                        </div>
                      </div>
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

"use client";

import { useState } from "react";
import Link from "next/link";
import { RotateCcw, Phone, AlertTriangle, CheckCircle2, MessageCircle, Clock, Search, X, Share2, CheckSquare, Square } from "lucide-react";
import { RenewMembershipDialog } from "@/components/members/RenewMembershipDialog";
import { formatDate, daysAgo, daysUntil } from "@/lib/utils";
import { toTitleCase } from "@/lib/utils/titleCase";
import type { UserRole } from "@prisma/client";

type MemberInfo = {
  id: string; memberId: string; fullName: string; phone: string; whatsapp: string | null;
  lastAttendanceDate?: Date | null; status: string;
  renewalFollowUps?: any[];
  lastPayment?: { amount: number | string; discount: number | string; categoryLabel?: string | null } | null;
};

type RenewalMembership = {
  id: string;
  expiryDate: Date | null;
  package: { name: string } | null;
  member: MemberInfo;
};

type Trainer = { id: string; fullName: string };

type Props = {
  expiredMemberships: RenewalMembership[]; expiring1: RenewalMembership[]; expiring3: RenewalMembership[];
  expiring7: RenewalMembership[]; expiring30: RenewalMembership[]; renewedToday: any[];
  winBack: RenewalMembership[];
  packages: any[];
  trainers?: Trainer[];
  userRole: UserRole; userId: string;
};

const TABS = [
  { key: "expired",  label: "Expired",             shortLabel: "Expired",   accent: "#ef4444", badgeBg: "rgba(239,68,68,0.12)",   badgeColor: "#f87171", urgent: false },
  { key: "1day",     label: "Due Today / Tomorrow", shortLabel: "Tomorrow",  accent: "#f97316", badgeBg: "rgba(249,115,22,0.12)",  badgeColor: "#fb923c", urgent: true  },
  { key: "3days",    label: "In 3 Days",            shortLabel: "3 Days",    accent: "#f59e0b", badgeBg: "rgba(245,158,11,0.12)",  badgeColor: "#fbbf24", urgent: false },
  { key: "7days",    label: "In 7 Days",            shortLabel: "7 Days",    accent: "#eab308", badgeBg: "rgba(234,179,8,0.12)",   badgeColor: "#facc15", urgent: false },
  { key: "30days",   label: "This Month",           shortLabel: "Month",     accent: "#3b82f6", badgeBg: "rgba(59,130,246,0.12)",  badgeColor: "#60a5fa", urgent: false },
  { key: "renewed",  label: "Renewed Today",        shortLabel: "Renewed",   accent: "#10b981", badgeBg: "rgba(16,185,129,0.12)",  badgeColor: "#34d399", urgent: false },
  { key: "winback",  label: "Win Back (31–90 days)", shortLabel: "Win Back", accent: "#a855f7", badgeBg: "rgba(168,85,247,0.12)",  badgeColor: "#c084fc", urgent: false },
];

const PAGE_SIZE = 50;

function waLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const num = digits.startsWith("91") && digits.length === 12 ? digits : `91${digits.slice(-10)}`;
  return `https://wa.me/${num}`;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function getNetAmount(ms: RenewalMembership) {
  const p = ms.member.lastPayment;
  if (!p) return null;
  return Number(p.amount) - Number(p.discount);
}

function packageName(ms: RenewalMembership): string | null {
  return ms.package?.name ?? ms.member.lastPayment?.categoryLabel ?? null;
}

function buildWhatsAppMessage(memberships: RenewalMembership[], tabLabel: string): string {
  const date = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  let msg = `*Follow-up List — ${tabLabel}*\n${date}\n\n`;
  memberships.forEach((ms, i) => {
    const net = getNetAmount(ms);
    msg += `*${i + 1}. ${toTitleCase(ms.member.fullName)}*\n`;
    msg += `Ph: ${ms.member.phone}\n`;
    msg += `Pkg: ${packageName(ms) ?? "—"}\n`;
    msg += `Renewal: ${ms.expiryDate ? formatDate(ms.expiryDate) : "—"}\n`;
    msg += `Amount: ${net != null ? `Rs.${net.toLocaleString("en-IN")}` : "—"}\n\n`;
  });
  return msg.trim();
}

export function RenewalsClient({ expiredMemberships, expiring1, expiring3, expiring7, expiring30, renewedToday, winBack, packages, trainers = [], userRole, userId }: Props) {
  const [activeTab, setActiveTab] = useState("expired");
  const [renewFor, setRenewFor] = useState<{ id: string; memberId: string; fullName: string } | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const counts: Record<string, number> = {
    expired: expiredMemberships.length, "1day": expiring1.length,
    "3days": expiring3.length, "7days": expiring7.length,
    "30days": expiring30.length, renewed: renewedToday.length,
    winback: winBack.length,
  };

  const rawList: RenewalMembership[] =
    activeTab === "expired"  ? expiredMemberships :
    activeTab === "1day"     ? expiring1 :
    activeTab === "3days"    ? expiring3 :
    activeTab === "7days"    ? expiring7 :
    activeTab === "30days"   ? expiring30 :
    activeTab === "winback"  ? winBack : [];

  const q = search.trim().toLowerCase();
  const filteredList = q
    ? rawList.filter((ms) =>
        ms.member.fullName.toLowerCase().includes(q) ||
        ms.member.memberId.toLowerCase().includes(q) ||
        ms.member.phone.includes(q)
      )
    : rawList;

  const currentList = filteredList.slice(0, page * PAGE_SIZE);
  const hasMore = filteredList.length > currentList.length;

  const activeTabConfig = TABS.find((t) => t.key === activeTab)!;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(filteredList.map((ms) => ms.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function shareOnWhatsApp() {
    const selectedMemberships = filteredList.filter((ms) => selected.has(ms.id));
    const msg = buildWhatsAppMessage(selectedMemberships, activeTabConfig.label);
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  return (
    <div className="space-y-5 pb-28">
      {/* ── Summary cards ── */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const hasUrgent = tab.urgent && counts[tab.key] > 0;
          return (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSearch(""); setPage(1); setSelected(new Set()); }}
              className="relative overflow-hidden rounded-2xl p-4 text-left transition-all"
              style={{
                background: isActive ? "rgba(255,255,255,0.06)" : "#161616",
                border: `1px solid ${isActive ? tab.accent + "50" : hasUrgent ? tab.accent + "40" : "rgba(255,255,255,0.06)"}`,
                boxShadow: isActive ? `0 0 0 1px ${tab.accent}40` : hasUrgent ? `0 0 12px ${tab.accent}20` : "none",
              }}>
              <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl" style={{ background: tab.accent }} />
              <div className="flex items-center gap-1.5 mt-1">
                <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest truncate">{tab.shortLabel}</p>
                {hasUrgent && (
                  <span className="relative flex h-2 w-2 flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: tab.accent }} />
                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: tab.accent }} />
                  </span>
                )}
              </div>
              <p className="text-3xl font-extrabold mt-1.5" style={{ color: tab.badgeColor }}>{counts[tab.key]}</p>
            </button>
          );
        })}
      </div>

      {/* ── List ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between gap-4 px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center gap-3 flex-shrink-0">
            <h3 className="font-bold text-white">{activeTabConfig.label}</h3>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: activeTabConfig.badgeBg, color: activeTabConfig.badgeColor }}>
              {q ? `${filteredList.length} / ${counts[activeTab]}` : counts[activeTab]}
            </span>
          </div>
          {activeTab !== "renewed" && (
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-600 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); setSelected(new Set()); }}
                placeholder="Search name, ID, phone…"
                className="w-full pl-8 pr-8 py-2 rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:ring-1 focus:ring-white/20"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
              />
              {search && (
                <button onClick={() => { setSearch(""); setPage(1); setSelected(new Set()); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
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
          <div className="divide-y divide-white/[0.04]">
            {currentList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <RotateCcw className="h-10 w-10 text-gray-700" />
                <p className="text-sm text-gray-500 font-medium">No memberships in this category</p>
              </div>
            ) : (
              currentList.map((ms, idx) => {
                const daysLeft    = ms.expiryDate ? daysUntil(ms.expiryDate) : null;
                const daysExpired = daysLeft !== null && daysLeft < 0 ? Math.abs(daysLeft) : null;
                const lastVisit   = ms.member.lastAttendanceDate ? daysAgo(ms.member.lastAttendanceDate) : null;
                const waNumber    = ms.member.whatsapp || ms.member.phone;
                const isExpired   = activeTab === "expired";
                const isSelected  = selected.has(ms.id);
                const net         = getNetAmount(ms);
                const pkgName     = packageName(ms);

                return (
                  <div key={ms.id}
                    className="px-5 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
                    style={{ background: isSelected ? "rgba(59,130,246,0.06)" : idx % 2 === 0 ? "#161616" : "#181818" }}
                    onClick={() => toggleSelect(ms.id)}>

                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div className="flex-shrink-0 mt-0.5 pt-1">
                        {isSelected
                          ? <CheckSquare className="h-4 w-4 text-blue-400" />
                          : <Square className="h-4 w-4 text-gray-600" />}
                      </div>

                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 mt-0.5"
                        style={{ background: "rgba(255,255,255,0.06)", color: "#9ca3af" }}>
                        {getInitials(ms.member.fullName)}
                      </div>

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        {/* Row 1: name + badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/members/${ms.member.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-bold text-white hover:text-orange-400 transition-colors text-sm">
                            {toTitleCase(ms.member.fullName)}
                          </Link>
                          <span className="text-[10px] font-bold text-gray-600 font-mono">{ms.member.memberId}</span>
                          {lastVisit !== null && lastVisit >= 4 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5"
                              style={{ background: "rgba(249,115,22,0.12)", color: "#fb923c" }}>
                              <AlertTriangle className="h-2.5 w-2.5" />{lastVisit}d absent
                            </span>
                          )}
                        </div>

                        {/* Row 2: package + expiry + amount */}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {pkgName && (
                            <span className="text-xs text-gray-500">{pkgName}</span>
                          )}
                          {net != null && (
                            <span className="text-xs font-semibold text-gray-500">₹{net.toLocaleString("en-IN")}</span>
                          )}
                          <span className="text-gray-700 text-xs">·</span>
                          <span className="flex items-center gap-1 text-xs font-semibold"
                            style={{ color: isExpired ? "#f87171" : "#fb923c" }}>
                            <Clock className="h-3 w-3" />
                            {ms.expiryDate ? formatDate(ms.expiryDate) : "—"}
                            {isExpired && daysExpired !== null && (
                              <span className="text-red-500/60 font-normal ml-0.5">({daysExpired}d ago)</span>
                            )}
                          </span>
                        </div>

                        {/* Row 3: phone + action buttons */}
                        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                          <a href={`tel:${ms.member.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg"
                            style={{ background: "rgba(255,255,255,0.06)" }}>
                            <Phone className="h-3 w-3" />
                            {ms.member.phone}
                          </a>
                          <a href={waLink(waNumber)} target="_blank" rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors"
                            style={{ background: "rgba(37,211,102,0.12)", color: "#25d366" }}>
                            <MessageCircle className="h-3 w-3" />
                            WhatsApp
                          </a>
                          {(userRole === "ADMIN" || userRole === "FRONT_DESK") && (
                            <button onClick={(e) => { e.stopPropagation(); setRenewFor({ id: ms.member.id, memberId: ms.member.memberId, fullName: ms.member.fullName }); }}
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
            {hasMore && (
              <div className="flex justify-center py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-gray-400 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.06)" }}>
                  Load more ({filteredList.length - currentList.length} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Floating action bar ── */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl"
          style={{ background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
          <span className="text-sm font-bold text-white">{selected.size} selected</span>
          <div className="w-px h-5 bg-white/10" />
          <button onClick={selectAll}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors">
            <CheckSquare className="h-3.5 w-3.5" />
            Select all ({filteredList.length})
          </button>
          <button onClick={clearSelection}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors">
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
          <div className="w-px h-5 bg-white/10" />
          <button onClick={shareOnWhatsApp}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all"
            style={{ background: "linear-gradient(135deg, #25d366, #128c7e)" }}>
            <Share2 className="h-4 w-4" />
            Share on WhatsApp
          </button>
        </div>
      )}

      {renewFor && (
        <RenewMembershipDialog
          open={!!renewFor} onClose={() => setRenewFor(null)}
          member={renewFor}
          packages={packages} trainers={trainers} userId={userId} userRole={userRole}
        />
      )}
    </div>
  );
}

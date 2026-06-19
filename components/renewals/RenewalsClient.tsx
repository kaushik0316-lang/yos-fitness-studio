"use client";

import { useState } from "react";
import Link from "next/link";
import { RotateCcw, Phone, AlertTriangle, CheckCircle2, MessageCircle, Clock, Search, X, Share2, CheckSquare, Square } from "lucide-react";
import { RenewMembershipDialog } from "@/components/members/RenewMembershipDialog";
import { formatDate, daysAgo, daysUntil } from "@/lib/utils";
import { toTitleCase } from "@/lib/utils/titleCase";
import type { UserRole } from "@prisma/client";

type RenewalMember = {
  id: string; memberId: string; fullName: string; phone: string; whatsapp: string | null;
  expiryDate: Date | null; lastAttendanceDate?: Date | null;
  currentPackage: { name: string } | null; trainer?: { fullName: string } | null;
  memberships?: { package: { name: string } | null; expiryDate: Date | string | null }[];
  renewalFollowUps?: any[];
  payments?: { amount: number | string; discount: number | string }[];
};

function expiringPackageName(m: RenewalMember): string | null {
  // Match the membership whose expiryDate equals the member's expiryDate (the one actually expiring)
  if (m.expiryDate && m.memberships?.length) {
    const memberExpiry = new Date(m.expiryDate).toDateString();
    const match = m.memberships.find(
      (ms) => ms.expiryDate && new Date(ms.expiryDate).toDateString() === memberExpiry
    );
    if (match?.package?.name) return match.package.name;
  }
  return m.memberships?.[0]?.package?.name ?? m.currentPackage?.name ?? null;
}

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

const PAGE_SIZE = 50;

function waLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const num = digits.startsWith("91") && digits.length === 12 ? digits : `91${digits.slice(-10)}`;
  return `https://wa.me/${num}`;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function getNetAmount(m: RenewalMember) {
  if (!m.payments?.length) return null;
  const p = m.payments[0];
  const amt = Number(p.amount);
  const disc = Number(p.discount);
  return amt - disc;
}

function buildWhatsAppMessage(members: RenewalMember[], tabLabel: string): string {
  const date = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  let msg = `📋 *Follow-up List — ${tabLabel}*\n🗓️ ${date}\n\n`;
  members.forEach((m, i) => {
    const net = getNetAmount(m);
    msg += `*${i + 1}. ${toTitleCase(m.fullName)}*\n`;
    msg += `📞 ${m.phone}\n`;
    msg += `📦 ${expiringPackageName(m) ?? "—"}\n`;
    msg += `🗓️ Renewal: ${m.expiryDate ? formatDate(m.expiryDate) : "—"}\n`;
    msg += `💰 Amount: ${net != null ? `₹${net.toLocaleString("en-IN")}` : "—"}\n\n`;
  });
  return msg.trim();
}

export function RenewalsClient({ expiredMembers, expiring1, expiring3, expiring7, expiring30, renewedToday, packages, userRole, userId }: Props) {
  const [activeTab, setActiveTab] = useState("expired");
  const [renewFor, setRenewFor] = useState<RenewalMember | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const counts: Record<string, number> = {
    expired: expiredMembers.length, "1day": expiring1.length,
    "3days": expiring3.length, "7days": expiring7.length,
    "30days": expiring30.length, renewed: renewedToday.length,
  };

  const rawList: RenewalMember[] =
    activeTab === "expired" ? expiredMembers :
    activeTab === "1day" ? expiring1 :
    activeTab === "3days" ? expiring3 :
    activeTab === "7days" ? expiring7 :
    activeTab === "30days" ? expiring30 : [];

  const q = search.trim().toLowerCase();
  const filteredList = q
    ? rawList.filter((m) =>
        m.fullName.toLowerCase().includes(q) ||
        m.memberId.toLowerCase().includes(q) ||
        m.phone.includes(q)
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
    setSelected(new Set(filteredList.map((m) => m.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function shareOnWhatsApp() {
    const selectedMembers = filteredList.filter((m) => selected.has(m.id));
    const msg = buildWhatsAppMessage(selectedMembers, activeTabConfig.label);
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  return (
    <div className="space-y-5 pb-28">
      {/* ── Summary cards ── */}
      <div className="grid grid-cols-6 gap-3">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSearch(""); setPage(1); setSelected(new Set()); }}
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
                <p className="text-sm text-gray-500 font-medium">No members in this category</p>
              </div>
            ) : (
              currentList.map((m, idx) => {
                const daysLeft    = m.expiryDate ? daysUntil(m.expiryDate) : null;
                const daysExpired = daysLeft !== null && daysLeft < 0 ? Math.abs(daysLeft) : null;
                const lastVisit   = m.lastAttendanceDate ? daysAgo(m.lastAttendanceDate) : null;
                const waNumber    = m.whatsapp || m.phone;
                const isExpired   = activeTab === "expired";
                const isSelected  = selected.has(m.id);
                const net         = getNetAmount(m);

                return (
                  <div key={m.id}
                    className="px-5 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
                    style={{ background: isSelected ? "rgba(59,130,246,0.06)" : idx % 2 === 0 ? "#161616" : "#181818" }}
                    onClick={() => toggleSelect(m.id)}>

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
                        {getInitials(m.fullName)}
                      </div>

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        {/* Row 1: name + badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/members/${m.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-bold text-white hover:text-orange-400 transition-colors text-sm">
                            {toTitleCase(m.fullName)}
                          </Link>
                          <span className="text-[10px] font-bold text-gray-600 font-mono">{m.memberId}</span>
                          {lastVisit !== null && lastVisit >= 4 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5"
                              style={{ background: "rgba(249,115,22,0.12)", color: "#fb923c" }}>
                              <AlertTriangle className="h-2.5 w-2.5" />{lastVisit}d absent
                            </span>
                          )}
                        </div>

                        {/* Row 2: package + expiry + amount */}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {expiringPackageName(m) && (
                            <span className="text-xs text-gray-500">{expiringPackageName(m)}</span>
                          )}
                          {net != null && (
                            <span className="text-xs font-semibold text-gray-500">₹{net.toLocaleString("en-IN")}</span>
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
                          <a href={`tel:${m.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg"
                            style={{ background: "rgba(255,255,255,0.06)" }}>
                            <Phone className="h-3 w-3" />
                            {m.phone}
                          </a>
                          <a href={waLink(waNumber)} target="_blank" rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors"
                            style={{ background: "rgba(37,211,102,0.12)", color: "#25d366" }}>
                            <MessageCircle className="h-3 w-3" />
                            WhatsApp
                          </a>
                          {(userRole === "ADMIN" || userRole === "FRONT_DESK") && (
                            <button onClick={(e) => { e.stopPropagation(); setRenewFor(m); }}
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
          member={{ id: renewFor.id, memberId: renewFor.memberId, fullName: renewFor.fullName }}
          packages={packages} userId={userId}
        />
      )}
    </div>
  );
}

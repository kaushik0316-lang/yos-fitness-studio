"use client";

import { useState } from "react";
import Link from "next/link";
import { RotateCcw, Phone, AlertTriangle, CheckCircle2, MessageCircle, Clock, Search, X, Share2, CheckSquare, Square, ExternalLink } from "lucide-react";
import { RenewMembershipDialog } from "@/components/members/RenewMembershipDialog";
import { formatDate, daysAgo, daysUntil } from "@/lib/utils";
import { toTitleCase, getFirstName } from "@/lib/utils/titleCase";
import { buildRenewalMessage } from "@/lib/utils/renewalTemplate";
import { WaConfirmButton } from "@/components/whatsapp/WaConfirmButton";
import { WaSentSummary } from "@/components/whatsapp/WaSentSummary";
import type { UserRole } from "@prisma/client";

type MemberInfo = {
  id: string; memberId: string; fullName: string; phone: string; whatsapp: string | null;
  lastAttendanceDate?: Date | null; status: string;
  renewalFollowUps?: any[];
  lastPayment?: { amount: number | string; discount: number | string; categoryLabel?: string | null; soldBy?: { fullName: string; employeeId: string } | null; soldBy2?: { fullName: string; employeeId: string } | null } | null;
};

type RenewalMembership = {
  id: string;
  expiryDate: Date | null;
  package: { name: string } | null;
  member: MemberInfo;
};

type Trainer = { id: string; fullName: string };

type WaLog = { id: string; memberId: string; memberName: string; sentByName: string | null; sentAt: Date | null; createdAt: Date };

type Props = {
  expiredMemberships: RenewalMembership[]; expiring1: RenewalMembership[]; expiring3: RenewalMembership[];
  expiring7: RenewalMembership[]; expiring30: RenewalMembership[]; renewedToday: any[];
  winBack: RenewalMembership[];
  packages: any[];
  trainers?: Trainer[];
  userRole: UserRole; userId: string;
  renewalWaLogs?: WaLog[];
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

// ── Bulk WA Panel ─────────────────────────────────────────────────────────────
function BulkWaPanel({
  filteredList, selected, activeTab, packageName, buildRenewalTemplate, onClose,
}: {
  filteredList: any[]; selected: Set<string>; activeTab: string;
  packageName: (ms: any) => string | null;
  buildRenewalTemplate: (member: any, expiryDate: Date | null, pkgName: string | null, isExpired: boolean) => string;
  onClose: () => void;
}) {
  const [rowState, setRowState] = useState<Record<string, "idle" | "opened" | "sent">>({});
  const isExp = activeTab === "expired";
  const selectedList = filteredList.filter((ms) => selected.has(ms.id));
  const sentCount = Object.values(rowState).filter((s) => s === "sent").length;

  async function markSent(ms: any, msg: string) {
    setRowState((r) => ({ ...r, [ms.id]: "sent" }));
    try {
      const { logManualWA } = await import("@/lib/actions/whatsapp");
      await logManualWA(ms.member.id, "RENEWAL", msg);
    } catch { /* silent */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <p className="font-bold text-white">Bulk WhatsApp</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {selectedList.length} members · {sentCount} logged as sent
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
        {/* Member rows */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(80vh - 80px)" }}>
          {selectedList.map((ms) => {
            const phone = (ms.member.whatsapp || ms.member.phone || "").replace(/\D/g, "").slice(-10);
            const pkgName = packageName(ms);
            const msg = buildRenewalTemplate(ms.member, ms.expiryDate, pkgName, isExp);
            const expStr = ms.expiryDate ? new Date(ms.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
            const state = rowState[ms.id] ?? "idle";

            return (
              <div key={ms.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{toTitleCase(ms.member.fullName)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{ms.member.phone} · {isExp ? "expired" : "expires"} {expStr}</p>
                </div>
                {!phone ? (
                  <span className="text-xs text-gray-600 px-3">No phone</span>
                ) : state === "sent" ? (
                  <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold"
                    style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80" }}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Sent
                  </span>
                ) : (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a href={`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={() => setRowState((r) => ({ ...r, [ms.id]: "opened" }))}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                      style={{ background: "rgba(37,211,102,0.12)", color: "#25d366", border: "1px solid rgba(37,211,102,0.2)" }}>
                      <MessageCircle className="h-3.5 w-3.5" />
                      {state === "opened" ? "Re-open" : "Open Chat"}
                    </a>
                    {state === "opened" && (
                      <button
                        onClick={() => markSent(ms, msg)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
                        style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Sent?
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function waLink(phone: string, message?: string) {
  const digits = phone.replace(/\D/g, "");
  const num = digits.startsWith("91") && digits.length === 12 ? digits : `91${digits.slice(-10)}`;
  return message ? `https://wa.me/${num}?text=${encodeURIComponent(message)}` : `https://wa.me/${num}`;
}

function buildRenewalTemplate(member: { fullName: string }, expiryDate: Date | null, pkgName: string | null, isExpired: boolean): string {
  return buildRenewalMessage(member.fullName, expiryDate, pkgName, isExpired);
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

export function RenewalsClient({ expiredMemberships, expiring1, expiring3, expiring7, expiring30, renewedToday, winBack, packages, trainers = [], userRole, userId, renewalWaLogs = [] }: Props) {
  // Build per-member sent count from page-level logs
  const waSentByMember = renewalWaLogs.reduce<Record<string, { count: number; lastAt: Date | null }>>((acc, log) => {
    if (!log.memberId) return acc;
    const prev = acc[log.memberId];
    const logDate = log.sentAt ?? log.createdAt;
    if (!prev) { acc[log.memberId] = { count: 1, lastAt: logDate }; }
    else { prev.count++; if (logDate && (!prev.lastAt || logDate > prev.lastAt)) prev.lastAt = logDate; }
    return acc;
  }, {});

  const [activeTab, setActiveTab] = useState("expired");
  const [renewFor, setRenewFor] = useState<{ id: string; memberId: string; fullName: string } | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkPanel, setShowBulkPanel] = useState(false);

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
      {/* ── WA Sent Summary ── */}
      <WaSentSummary logs={renewalWaLogs} waType="RENEWAL" />

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
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest leading-tight">{tab.shortLabel}</p>
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
                const isExpired   = daysLeft !== null && daysLeft < 0;
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

                        {/* Row 2b: sold by */}
                        {ms.member.lastPayment?.soldBy && (
                          <div className="mt-1">
                            <span className="text-xs font-semibold" style={{ color: "#f97316" }}>
                              Sold by {toTitleCase(ms.member.lastPayment.soldBy.fullName)}
                            </span>
                            {ms.member.lastPayment.soldBy2 && (
                              <span className="text-xs text-gray-600"> & {toTitleCase(ms.member.lastPayment.soldBy2.fullName)}</span>
                            )}
                          </div>
                        )}

                        {/* Row 3: phone + action buttons */}
                        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                          <a href={`tel:${ms.member.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg"
                            style={{ background: "rgba(255,255,255,0.06)" }}>
                            <Phone className="h-3 w-3" />
                            {ms.member.phone}
                          </a>
                          <WaConfirmButton
                            memberId={ms.member.id}
                            phone={waNumber}
                            message={buildRenewalTemplate(ms.member, ms.expiryDate, pkgName, isExpired)}
                            waType="RENEWAL"
                            label="WhatsApp"
                            className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors"
                            style={{ background: "rgba(37,211,102,0.12)", color: "#25d366" }}
                          />
                          {waSentByMember[ms.member.id] && (() => {
                            const { count, lastAt } = waSentByMember[ms.member.id];
                            const dateStr = lastAt ? new Date(lastAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";
                            return (
                              <span title={`Last sent: ${dateStr}`} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium"
                                style={{ background: "rgba(37,211,102,0.08)", color: "#25d366", border: "1px solid rgba(37,211,102,0.2)" }}>
                                ✓ {count}× {dateStr && <span className="text-gray-500">{dateStr}</span>}
                              </span>
                            );
                          })()}
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
          <button onClick={() => setShowBulkPanel(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all"
            style={{ background: "linear-gradient(135deg, #25d366, #128c7e)" }}>
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Bulk WhatsApp ({selected.size})
          </button>
        </div>
      )}

      {/* ── Bulk WhatsApp panel ── */}
      {showBulkPanel && (
        <BulkWaPanel
          filteredList={filteredList}
          selected={selected}
          activeTab={activeTab}
          packageName={packageName}
          buildRenewalTemplate={buildRenewalTemplate}
          onClose={() => setShowBulkPanel(false)}
        />
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

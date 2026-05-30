"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Plus, Search, Eye, CheckCircle, Clock, Snowflake,
  UserMinus, UserPlus, Users, ArrowUpDown, RefreshCw, MessageCircle,
} from "lucide-react";
import { AddMemberDialog } from "@/components/members/AddMemberDialog";
import { MarkAttendanceDialog } from "@/components/members/MarkAttendanceDialog";
import { MoveMembershipButton } from "@/components/members/MoveMembershipButton";
import { formatDate, daysAgo, daysUntil } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toTitleCase } from "@/lib/utils/titleCase";
import type { Company, MemberStatus, UserRole } from "@prisma/client";

type Member = {
  id: string; memberId: string; fullName: string; phone: string;
  whatsapp: string | null; gender: string | null; status: MemberStatus;
  currentPackage: { name: string } | null;
  expiryDate: Date | null; lastAttendanceDate: Date | null;
  joinDate: Date; trainer: { id: string; fullName: string } | null;
  _count: { attendances: number };
  payments?: { categoryLabel: string | null }[];
};

type Props = {
  members: Member[]; total: number; page: number; pageSize: number;
  packages: { id: string; name: string; price: any; durationDays: number; company: Company | null }[];
  trainers: { id: string; fullName: string; role: string }[];
  userRole: UserRole; userId: string;
  statusCounts: Record<string, number>;
  activeStatusFilter: string;
};

const STATUS_CONFIG: Record<string, { icon: React.FC<{ className?: string }>; label: string; bg: string; color: string }> = {
  ACTIVE:   { icon: CheckCircle, label: "Active",   bg: "rgba(16,185,129,0.12)",  color: "#34d399" },
  EXPIRED:  { icon: Clock,       label: "Expired",  bg: "rgba(239,68,68,0.12)",   color: "#f87171" },
  FROZEN:   { icon: Snowflake,   label: "Frozen",   bg: "rgba(14,165,233,0.12)",  color: "#38bdf8" },
  INACTIVE: { icon: UserMinus,   label: "Inactive", bg: "rgba(107,114,128,0.12)", color: "#9ca3af" },
  PROSPECT: { icon: UserPlus,    label: "Prospect", bg: "rgba(139,92,246,0.12)",  color: "#a78bfa" },
};

const STATUS_OPTS = [
  { value: "ALL",      label: "All Status" },
  { value: "ACTIVE",   label: "Active"    },
  { value: "EXPIRED",  label: "Expired"   },
  { value: "FROZEN",   label: "Frozen"    },
  { value: "INACTIVE", label: "Inactive"  },
  { value: "PROSPECT", label: "Prospect"  },
];

const SORT_OPTS = [
  { value: "",           label: "Newest Registered"  },
  { value: "name_asc",   label: "Name A → Z"         },
  { value: "expiry_asc", label: "Expiry (soonest)"   },
  { value: "visit_desc", label: "Last Visit"         },
];

function waLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const num = digits.startsWith("91") && digits.length === 12 ? digits : `91${digits}`;
  return `https://wa.me/${num}`;
}

export function MembersClient({
  members, total, page, pageSize, packages, trainers,
  userRole, userId, statusCounts, activeStatusFilter,
}: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [showAdd, setShowAdd]   = useState(false);
  const [markFor, setMarkFor]   = useState<Member | null>(null);
  const [search, setSearch]     = useState(searchParams.get("search") ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Instant search — debounced 400 ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search.trim()) params.set("search", search.trim());
      else params.delete("search");
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function updateQuery(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "" || value === "ALL") params.delete(key);
    else params.set(key, value);
    if (key !== "page") params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  // Bulk select helpers
  const allIds = members.map((m) => m.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allIds));
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function exportSelected() {
    const sel = members.filter((m) => selected.has(m.id));
    const rows = [
      ["Member ID","Name","Phone","Status","Package","Expiry","Join Date","Last Visit"],
      ...sel.map((m) => [
        m.memberId, m.fullName, m.phone, m.status,
        m.currentPackage?.name ?? "—",
        m.expiryDate ? formatDate(m.expiryDate) : "—",
        formatDate(m.joinDate),
        m.lastAttendanceDate ? formatDate(m.lastAttendanceDate) : "—",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    Object.assign(document.createElement("a"), {
      href: url,
      download: `members-selected-${new Date().toISOString().split("T")[0]}.csv`,
    }).click();
  }

  const totalPages = Math.ceil(total / pageSize);

  const inputStyle = {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "#f9fafb",
    borderRadius: "0.75rem",
    padding: "0.625rem 0.875rem",
    fontSize: "0.875rem",
    outline: "none",
    WebkitTextFillColor: "#f9fafb",
  };

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="rounded-2xl px-5 py-4" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex flex-wrap items-center gap-3">

          {/* Instant search */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, ID, phone…"
              className="w-full pl-9 pr-4"
              style={{ ...inputStyle, paddingLeft: "2.25rem" }}
            />
          </div>

          {/* Status filter with counts */}
          <select
            value={activeStatusFilter}
            onChange={(e) => updateQuery("status", e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            {STATUS_OPTS.map((o) => {
              const count = o.value === "ALL"
                ? Object.values(statusCounts).reduce((a, b) => a + b, 0)
                : (statusCounts[o.value] ?? 0);
              return (
                <option key={o.value} value={o.value}>
                  {o.label} ({count})
                </option>
              );
            })}
          </select>

          {/* Sort */}
          <select
            value={searchParams.get("sort") ?? ""}
            onChange={(e) => updateQuery("sort", e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            {SORT_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Hide Imports toggle */}
          <button
            onClick={() => updateQuery("showGhosts", searchParams.get("showGhosts") === "false" ? "" : "false")}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={searchParams.get("showGhosts") === "false"
              ? { background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.3)" }
              : { background: "rgba(255,255,255,0.06)", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Users className="h-3.5 w-3.5" />
            {searchParams.get("showGhosts") === "false" ? "Show Imports" : "Hide Imports"}
          </button>

          <div className="flex items-center gap-2 ml-auto">
            {/* Full export */}
            <button
              onClick={() => { window.location.href = "/api/export/members"; }}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 transition-colors hover:text-white"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              Export All
            </button>

            {(userRole === "ADMIN" || userRole === "FRONT_DESK") && (
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
              >
                <Plus className="h-4 w-4" /> Add Member
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-700 mt-3">{total} member{total !== 1 ? "s" : ""} found</p>
      </div>

      {/* ── Bulk action bar ── */}
      {selected.size > 0 && (
        <div className="rounded-2xl px-5 py-3 flex items-center gap-4"
          style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)" }}>
          <span className="text-sm font-bold text-orange-400">{selected.size} selected</span>
          <button
            onClick={exportSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
            style={{ background: "rgba(249,115,22,0.7)" }}
          >
            Export Selected
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-gray-300 ml-auto">
            Clear selection
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                {/* Select-all checkbox */}
                <th className="pl-4 pr-2 py-3.5 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="accent-orange-500 cursor-pointer"
                  />
                </th>
                {["Member", "Status", "Package & Expiry", "Joined · Last Visit", "Trainer", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-600 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <Users className="h-12 w-12 text-gray-700" />
                      <p className="text-sm text-gray-500 font-medium">No members found</p>
                      <p className="text-xs text-gray-700">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                members.map((m, idx) => {
                  const daysLeft  = m.expiryDate ? daysUntil(m.expiryDate) : null;
                  const lastVisit = m.lastAttendanceDate ? daysAgo(m.lastAttendanceDate) : null;
                  const isInactive = lastVisit !== null && lastVisit >= 4;
                  const sc = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.INACTIVE;
                  const isExpired = m.status === "EXPIRED";
                  const isSelected = selected.has(m.id);

                  return (
                    <tr key={m.id}
                      className="transition-colors hover:bg-white/[0.015]"
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background: isSelected
                          ? "rgba(249,115,22,0.06)"
                          : idx % 2 === 0 ? "#161616" : "#181818",
                      }}>

                      {/* Checkbox */}
                      <td className="pl-4 pr-2 py-4 w-8">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(m.id)}
                          className="accent-orange-500 cursor-pointer"
                        />
                      </td>

                      {/* Member */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0"
                            style={{ background: "rgba(249,115,22,0.15)", color: "#fb923c" }}>
                            {m.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{toTitleCase(m.fullName)}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{m.memberId}</p>
                            <a
                              href={waLink(m.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-green-400 transition-colors mt-0.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MessageCircle className="h-3 w-3" />
                              {m.phone}
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                          style={{ background: sc.bg, color: sc.color }}>
                          <sc.icon className="h-3 w-3" />
                          {sc.label}
                        </span>
                      </td>

                      {/* Package + Expiry */}
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-400">
                          {m.currentPackage?.name ?? m.payments?.[0]?.categoryLabel ?? <span className="text-gray-700">—</span>}
                        </p>
                        {m.expiryDate && (
                          <p className={cn("text-xs mt-0.5 font-medium",
                            daysLeft !== null && daysLeft < 0 ? "text-red-400"
                            : daysLeft !== null && daysLeft <= 7 ? "text-amber-400"
                            : "text-gray-600"
                          )}>
                            {daysLeft !== null && daysLeft < 0
                              ? `Expired ${Math.abs(daysLeft)}d ago`
                              : daysLeft === 0 ? "Expires today"
                              : daysLeft !== null && daysLeft <= 7 ? `${daysLeft}d left`
                              : `Exp ${formatDate(m.expiryDate)}`
                            }
                          </p>
                        )}
                      </td>

                      {/* Joined + Last Visit */}
                      <td className="px-4 py-4">
                        <p className="text-xs text-gray-600">
                          Joined {formatDate(m.joinDate)}
                        </p>
                        <p className={cn("text-xs mt-0.5 font-medium",
                          isInactive ? "text-orange-400" : "text-gray-500"
                        )}>
                          {m.lastAttendanceDate
                            ? lastVisit === 0 ? "Visited today"
                              : lastVisit === 1 ? "Visited yesterday"
                              : `${lastVisit}d since visit`
                            : <span className="text-gray-700">Never visited</span>
                          }
                        </p>
                      </td>

                      {/* Trainer */}
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {m.trainer ? toTitleCase(m.trainer.fullName) : <span className="text-gray-700">—</span>}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <Link href={`/members/${m.id}`}
                            className="p-2 rounded-xl text-gray-600 hover:text-white transition-colors"
                            style={{ background: "rgba(255,255,255,0.04)" }} title="View profile">
                            <Eye className="h-4 w-4" />
                          </Link>
                          {(userRole === "ADMIN" || userRole === "FRONT_DESK" || userRole === "TRAINER") && (
                            <button onClick={() => setMarkFor(m)}
                              className="p-2 rounded-xl text-gray-600 hover:text-emerald-400 transition-colors"
                              style={{ background: "rgba(255,255,255,0.04)" }} title="Check in">
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          {/* Quick Renew for expired members */}
                          {isExpired && (userRole === "ADMIN" || userRole === "FRONT_DESK") && (
                            <Link
                              href={`/payments/new?memberId=${m.id}`}
                              className="p-2 rounded-xl text-gray-600 hover:text-orange-400 transition-colors"
                              style={{ background: "rgba(255,255,255,0.04)" }}
                              title="Quick renew"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Link>
                          )}
                          {/* Move Membership — admin only */}
                          {userRole === "ADMIN" && (
                            <MoveMembershipButton
                              member={{
                                id:       m.id,
                                name:     toTitleCase(m.fullName),
                                memberId: m.memberId,
                                phone:    m.phone ?? "",
                              }}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}>
            <p className="text-xs text-gray-600">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => updateQuery("page", String(page - 1))} disabled={page <= 1}
                className="w-8 h-8 rounded-xl text-xs font-bold text-gray-500 hover:text-white disabled:opacity-30 transition-colors"
                style={{ background: "rgba(255,255,255,0.06)" }}>‹</button>
              {(() => {
                const win = 2, start = Math.max(1, page - win), end = Math.min(totalPages, page + win);
                const pages: (number | "…")[] = [];
                if (start > 1) { pages.push(1); if (start > 2) pages.push("…"); }
                for (let i = start; i <= end; i++) pages.push(i);
                if (end < totalPages) { if (end < totalPages - 1) pages.push("…"); pages.push(totalPages); }
                return pages.map((p, i) => p === "…"
                  ? <span key={`e${i}`} className="w-8 text-center text-xs text-gray-600">…</span>
                  : <button key={p} onClick={() => updateQuery("page", String(p))}
                      className="w-8 h-8 rounded-xl text-xs font-semibold transition-colors"
                      style={p === page
                        ? { background: "#f97316", color: "#fff" }
                        : { background: "rgba(255,255,255,0.06)", color: "#6b7280" }}>{p}</button>
                );
              })()}
              <button onClick={() => updateQuery("page", String(page + 1))} disabled={page >= totalPages}
                className="w-8 h-8 rounded-xl text-xs font-bold text-gray-500 hover:text-white disabled:opacity-30 transition-colors"
                style={{ background: "rgba(255,255,255,0.06)" }}>›</button>
            </div>
          </div>
        )}
      </div>

      <AddMemberDialog open={showAdd} onClose={() => setShowAdd(false)} packages={packages} trainers={trainers} userId={userId} />
      {markFor && <MarkAttendanceDialog open={!!markFor} onClose={() => setMarkFor(null)} member={markFor} userId={userId} />}
    </div>
  );
}

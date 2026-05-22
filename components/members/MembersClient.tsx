"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Plus, Search, Download, Eye, CheckCircle, Clock, Snowflake, UserMinus, UserPlus, Users } from "lucide-react";
import { AddMemberDialog } from "@/components/members/AddMemberDialog";
import { MarkAttendanceDialog } from "@/components/members/MarkAttendanceDialog";
import { formatDate, daysAgo, daysUntil } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Company, MemberStatus, UserRole } from "@prisma/client";

type Member = {
  id: string; memberId: string; fullName: string; phone: string;
  whatsapp: string | null; gender: string | null; status: MemberStatus;
  currentPackage: { name: string } | null;
  expiryDate: Date | null; lastAttendanceDate: Date | null;
  joinDate: Date; trainer: { id: string; fullName: string } | null;
  _count: { attendances: number };
};

type Props = {
  members: Member[]; total: number; page: number; pageSize: number;
  packages: { id: string; name: string; price: any; durationDays: number; company: Company | null }[];
  trainers: { id: string; fullName: string; role: string }[];
  userRole: UserRole; userId: string;
};

const STATUS_CONFIG: Record<string, { icon: React.FC<{ className?: string }>; label: string; bg: string; color: string }> = {
  ACTIVE:   { icon: CheckCircle, label: "Active",   bg: "rgba(16,185,129,0.12)",  color: "#34d399" },
  EXPIRED:  { icon: Clock,       label: "Expired",  bg: "rgba(239,68,68,0.12)",   color: "#f87171" },
  FROZEN:   { icon: Snowflake,   label: "Frozen",   bg: "rgba(14,165,233,0.12)",  color: "#38bdf8" },
  INACTIVE: { icon: UserMinus,   label: "Inactive", bg: "rgba(107,114,128,0.12)", color: "#9ca3af" },
  PROSPECT: { icon: UserPlus,    label: "Prospect", bg: "rgba(139,92,246,0.12)",  color: "#a78bfa" },
};

export function MembersClient({ members, total, page, pageSize, packages, trainers, userRole, userId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showAdd, setShowAdd] = useState(false);
  const [markFor, setMarkFor] = useState<Member | null>(null);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  function updateQuery(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "" || value === "ALL") params.delete(key);
    else params.set(key, value);
    if (key !== "page") params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function exportCSV() {
    const rows = [
      ["Member ID", "Name", "Phone", "Status", "Package", "Expiry", "Last Visit", "Join Date"],
      ...members.map((m) => [
        m.memberId, m.fullName, m.phone, m.status,
        m.currentPackage?.name ?? "—",
        m.expiryDate ? formatDate(m.expiryDate) : "—",
        m.lastAttendanceDate ? formatDate(m.lastAttendanceDate) : "—",
        formatDate(m.joinDate),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: `members-${new Date().toISOString().split("T")[0]}.csv` }).click();
  }

  const totalPages = Math.ceil(total / pageSize);
  const inputStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#e5e7eb",
    borderRadius: "0.75rem",
    padding: "0.625rem 0.875rem",
    fontSize: "0.875rem",
    outline: "none",
  };

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="rounded-2xl px-5 py-4" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <form onSubmit={(e) => { e.preventDefault(); updateQuery("search", search); }}
            className="flex items-center gap-2 flex-1 min-w-[220px]">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-600 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, ID, phone…"
                className="w-full pl-9 pr-4"
                style={{ ...inputStyle, paddingLeft: "2.25rem" }}
              />
            </div>
            <button type="submit" className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 transition-colors hover:text-white"
              style={{ background: "rgba(255,255,255,0.08)" }}>
              Search
            </button>
          </form>

          {/* Status filter */}
          <select
            defaultValue={searchParams.get("status") ?? "ALL"}
            onChange={(e) => updateQuery("status", e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="FROZEN">Frozen</option>
            <option value="INACTIVE">Inactive</option>
            <option value="PROSPECT">Prospect</option>
          </select>

          {/* Ghost toggle */}
          <button
            onClick={() => updateQuery("showGhosts", searchParams.get("showGhosts") === "false" ? "" : "false")}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={searchParams.get("showGhosts") === "false"
              ? { background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.3)" }
              : { background: "rgba(255,255,255,0.06)", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Users className="h-3.5 w-3.5" />
            {searchParams.get("showGhosts") === "false" ? "Show Ghosts" : "Hide Ghosts"}
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 transition-colors hover:text-white"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            {(userRole === "ADMIN" || userRole === "FRONT_DESK") && (
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
                <Plus className="h-4 w-4" /> Add Member
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-700 mt-3">{total} member{total !== 1 ? "s" : ""} found</p>
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                {["Member", "Status", "Package", "Last Visit", "Trainer", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-600 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={6}>
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

                  return (
                    <tr key={m.id}
                      className="transition-colors hover:bg-white/[0.015]"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: idx % 2 === 0 ? "#161616" : "#181818" }}>
                      {/* Member */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0"
                            style={{ background: "rgba(249,115,22,0.15)", color: "#fb923c" }}>
                            {m.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{m.fullName}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{m.memberId} · {m.phone}</p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                          style={{ background: sc.bg, color: sc.color }}>
                          <sc.icon className="h-3 w-3" />
                          {sc.label}
                        </span>
                      </td>

                      {/* Package */}
                      <td className="px-5 py-4 text-sm text-gray-400">
                        {m.currentPackage?.name ?? <span className="text-gray-700">—</span>}
                      </td>

                      {/* Last Visit */}
                      <td className="px-5 py-4">
                        {m.lastAttendanceDate ? (
                          <span className={cn("text-sm font-medium", isInactive ? "text-orange-400" : "text-gray-400")}>
                            {lastVisit === 0 ? "Today" : lastVisit === 1 ? "Yesterday" : `${lastVisit}d ago`}
                          </span>
                        ) : <span className="text-xs text-gray-700">Never</span>}
                      </td>

                      {/* Trainer */}
                      <td className="px-5 py-4 text-sm text-gray-500">
                        {m.trainer?.fullName ?? <span className="text-gray-700">—</span>}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
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
          <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}>
            <p className="text-xs text-gray-600">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</p>
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
                      style={p === page ? { background: "#f97316", color: "#fff" } : { background: "rgba(255,255,255,0.06)", color: "#6b7280" }}>{p}</button>
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

"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Plus, Search, Download, Eye,
  CheckCircle, Clock, Snowflake, UserMinus, UserPlus, Users,
} from "lucide-react";
import { AddMemberDialog } from "@/components/members/AddMemberDialog";
import { MarkAttendanceDialog } from "@/components/members/MarkAttendanceDialog";
import { formatDate, daysAgo, daysUntil, COMPANY_LABELS, COMPANY_COLORS, MEMBER_STATUS_COLORS } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Company, MemberStatus, UserRole } from "@prisma/client";

type Member = {
  id: string; memberId: string; fullName: string; phone: string;
  whatsapp: string | null; gender: string | null; status: MemberStatus;
  primaryCompany: Company; currentPackage: { name: string } | null;
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

const STATUS_CONFIG: Record<string, { icon: React.FC<{ className?: string }>; label: string; class: string }> = {
  ACTIVE:   { icon: CheckCircle, label: "Active",   class: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  EXPIRED:  { icon: Clock,       label: "Expired",  class: "bg-red-50 text-red-700 ring-1 ring-red-200" },
  FROZEN:   { icon: Snowflake,   label: "Frozen",   class: "bg-sky-50 text-sky-700 ring-1 ring-sky-200" },
  INACTIVE: { icon: UserMinus,   label: "Inactive", class: "bg-gray-100 text-gray-600 ring-1 ring-gray-200" },
  PROSPECT: { icon: UserPlus,    label: "Prospect", class: "bg-violet-50 text-violet-700 ring-1 ring-violet-200" },
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
    if (key !== "page") params.delete("page"); // reset to p1 on filter change, not on page click
    router.push(`${pathname}?${params.toString()}`);
  }

  function exportCSV() {
    const rows = [
      ["Member ID", "Name", "Phone", "Status", "Company", "Package", "Expiry", "Last Visit", "Join Date"],
      ...members.map((m) => [
        m.memberId, m.fullName, m.phone, m.status, COMPANY_LABELS[m.primaryCompany],
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

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <form
            onSubmit={(e) => { e.preventDefault(); updateQuery("search", search); }}
            className="flex items-center gap-2 flex-1 min-w-[220px]"
          >
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, ID, phone…"
                className="w-full pl-9 pr-4 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition-colors"
              />
            </div>
            <button type="submit" className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors">
              Search
            </button>
          </form>

          {/* Filters */}
          <select
            defaultValue={searchParams.get("status") ?? "ALL"}
            onChange={(e) => updateQuery("status", e.target.value)}
            className="text-sm border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-400 transition-colors bg-white text-gray-700 font-medium"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="FROZEN">Frozen</option>
            <option value="INACTIVE">Inactive</option>
            <option value="PROSPECT">Prospect</option>
          </select>

          <select
            defaultValue={searchParams.get("company") ?? "ALL"}
            onChange={(e) => updateQuery("company", e.target.value)}
            className="text-sm border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-400 transition-colors bg-white text-gray-700 font-medium"
          >
            <option value="ALL">Both Companies</option>
            <option value="YOS_FITNESS">Yos Fitness</option>
            <option value="YOS_FITNESS_STUDIO">Yos Studio</option>
          </select>

          {/* Ghost member toggle — ghosts shown by default, hidden when showGhosts=false */}
          <button
            onClick={() => updateQuery("showGhosts", searchParams.get("showGhosts") === "false" ? "" : "false")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2.5 border-2 rounded-xl text-sm font-medium transition-colors",
              searchParams.get("showGhosts") === "false"
                ? "border-amber-400 bg-amber-50 text-amber-700"
                : "border-gray-200 text-gray-500 hover:bg-gray-50"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            {searchParams.get("showGhosts") === "false" ? "Show Ghosts" : "Hide Ghosts"}
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            {(userRole === "ADMIN" || userRole === "FRONT_DESK") && (
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl text-sm font-bold text-white transition-colors shadow-md shadow-orange-200"
              >
                <Plus className="h-4 w-4" />
                Add Member
              </button>
            )}
          </div>
        </div>

        {/* Result count */}
        <p className="text-xs text-gray-400 mt-3">
          {total} member{total !== 1 ? "s" : ""} found
        </p>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                {["Member", "Status", "Company", "Package", "Last Visit", "Trainer", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-300">
                      <Users className="h-12 w-12" />
                      <p className="text-sm text-gray-400 font-medium">No members found</p>
                      <p className="text-xs text-gray-400">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                members.map((m, idx) => {
                  const daysLeft = m.expiryDate ? daysUntil(m.expiryDate) : null;
                  const lastVisit = m.lastAttendanceDate ? daysAgo(m.lastAttendanceDate) : null;
                  const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
                  const isInactive = lastVisit !== null && lastVisit >= 4;
                  const sc = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.INACTIVE;

                  return (
                    <tr
                      key={m.id}
                      className={cn("border-b border-gray-50 hover:bg-orange-50/30 transition-colors last:border-0")}
                    >
                      {/* Member */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-xs font-extrabold text-orange-700 flex-shrink-0">
                            {m.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{m.fullName}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{m.memberId} · {m.phone}</p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold", sc.class)}>
                          <sc.icon className="h-3 w-3" />
                          {sc.label}
                        </span>
                      </td>

                      {/* Company */}
                      <td className="px-5 py-4">
                        <span className={cn("px-2.5 py-1 rounded-lg text-xs font-semibold", COMPANY_COLORS[m.primaryCompany])}>
                          {m.primaryCompany === "YOS_FITNESS" ? "Yos Fitness" : "Yos Studio"}
                        </span>
                      </td>

                      {/* Package */}
                      <td className="px-5 py-4 text-sm text-gray-700">
                        {m.currentPackage?.name ?? <span className="text-gray-300">—</span>}
                      </td>

                      {/* Last Visit */}
                      <td className="px-5 py-4">
                        {m.lastAttendanceDate ? (
                          <span className={cn("text-sm font-medium", isInactive ? "text-orange-600" : "text-gray-600")}>
                            {lastVisit === 0 ? "Today" : lastVisit === 1 ? "Yesterday" : `${lastVisit}d ago`}
                          </span>
                        ) : <span className="text-xs text-gray-300">Never</span>}
                      </td>

                      {/* Trainer */}
                      <td className="px-5 py-4 text-sm text-gray-600">
                        {m.trainer?.fullName ?? <span className="text-gray-300">—</span>}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/members/${m.id}`}
                            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                            title="View profile"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {(userRole === "ADMIN" || userRole === "FRONT_DESK" || userRole === "TRAINER") && (
                            <button
                              onClick={() => setMarkFor(m)}
                              className="p-2 rounded-xl hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                              title="Check in"
                            >
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
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-400">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              {/* Prev */}
              <button
                onClick={() => updateQuery("page", String(page - 1))}
                disabled={page <= 1}
                className="w-8 h-8 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >‹</button>

              {/* Page numbers: show window around current page */}
              {(() => {
                const window = 2;
                const start = Math.max(1, page - window);
                const end   = Math.min(totalPages, page + window);
                const pages: (number | "…")[] = [];
                if (start > 1) { pages.push(1); if (start > 2) pages.push("…"); }
                for (let i = start; i <= end; i++) pages.push(i);
                if (end < totalPages) { if (end < totalPages - 1) pages.push("…"); pages.push(totalPages); }
                return pages.map((p, i) =>
                  p === "…" ? (
                    <span key={`ellipsis-${i}`} className="w-8 text-center text-xs text-gray-400">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => updateQuery("page", String(p))}
                      className={cn(
                        "w-8 h-8 rounded-xl text-xs font-semibold transition-colors",
                        p === page ? "bg-orange-500 text-white shadow-md shadow-orange-200" : "hover:bg-gray-200 text-gray-500"
                      )}
                    >{p}</button>
                  )
                );
              })()}

              {/* Next */}
              <button
                onClick={() => updateQuery("page", String(page + 1))}
                disabled={page >= totalPages}
                className="w-8 h-8 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >›</button>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AddMemberDialog open={showAdd} onClose={() => setShowAdd(false)} packages={packages} trainers={trainers} userId={userId} />
      {markFor && (
        <MarkAttendanceDialog open={!!markFor} onClose={() => setMarkFor(null)} member={markFor} userId={userId} />
      )}
    </div>
  );
}

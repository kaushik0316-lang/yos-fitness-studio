"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Plus, Search, Eye, CheckCircle, Clock, Snowflake,
  UserMinus, UserPlus, Users, ArrowUpDown, RefreshCw, MessageCircle, MessageSquare, X, Trash2, Loader2,
} from "lucide-react";
import { AddMemberDialog } from "@/components/members/AddMemberDialog";
import { MarkAttendanceDialog } from "@/components/members/MarkAttendanceDialog";
import { MoveMembershipButton } from "@/components/members/MoveMembershipButton";
import { formatDate, daysAgo, daysUntil } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toTitleCase, getFirstName } from "@/lib/utils/titleCase";
import { buildOnboardingMessage } from "@/lib/utils/renewalTemplate";
import { WaConfirmButton } from "@/components/whatsapp/WaConfirmButton";
import { WaSentSummary } from "@/components/whatsapp/WaSentSummary";
import { logManualWA } from "@/lib/actions/whatsapp";
import type { Company, MemberStatus, UserRole } from "@prisma/client";

type Member = {
  id: string; memberId: string; fullName: string; phone: string;
  whatsapp: string | null; gender: string | null; status: MemberStatus;
  currentPackage: { name: string } | null;
  memberships?: { package: { name: string } | null; expiryDate?: Date | string | null }[];
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
  waTemplates?: Record<string, string>;
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
  const num = digits.startsWith("91") && digits.length === 12 ? digits : `91${digits.slice(-10)}`;
  return `https://wa.me/${num}`;
}

// Normalize package/category label — strip duration prefixes, expand abbreviations
const ABBR: Record<string, string> = {
  "g/f":          "General Fitness",
  "gf":           "General Fitness",
  "fit":          "General Fitness",
  "summer slot":  "General Fitness",
  "yos studio":   "General Fitness",
  "yos fitness":  "General Fitness",
  "st/p":         "Student Package",
  "stp":          "Student Package",
  "s/p":          "Student Package",
  "sp":           "Student Package",
  "t/p":          "Transformation Package",
  "tp":           "Transformation Package",
  "p/t":          "Personal Training",
  "pt":           "Personal Training",
  "p/t+hiit":     "Personal Training + HIIT",
  "pt+hiit":      "Personal Training + HIIT",
};
function cleanPackageLabel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  if (ABBR[lower]) return ABBR[lower];
  // Strip duration prefix like "12 Months - " or "3 Months - "
  const stripped = raw.replace(/^\d+\s+months?\s*[-–]\s*/i, "").trim();
  return stripped || null;
}

type BirthdayMember = {
  id: string; memberId: string; fullName: string; phone: string; whatsapp: string | null; dateOfBirth: Date | string;
};

type WaLog = { id: string; memberName: string; sentByName: string | null; sentAt: Date | null; createdAt: Date };

function BulkWelcomeList({ members, waTemplates }: { members: Member[]; waTemplates?: Record<string, string> }) {
  const [sent, setSent] = useState<Set<string>>(new Set());

  async function handleSend(m: Member) {
    const msg = buildOnboardingMessage(m.fullName, m.memberId, null, waTemplates);
    const digits = (m.whatsapp ?? m.phone).replace(/\D/g, "").slice(-10);
    window.open(`https://wa.me/91${digits}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
    try {
      await logManualWA(m.id, "WELCOME", msg);
      setSent((s) => new Set(s).add(m.id));
    } catch {}
  }

  return (
    <>
      <div className="max-h-[60vh] overflow-y-auto">
        {members.map((m) => (
          <div key={m.id}
            className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/[0.02]"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-white font-semibold text-sm">{toTitleCase(m.fullName)}</p>
                {sent.has(m.id) && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}>Sent</span>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-0.5">{m.memberId} · {m.phone}</p>
            </div>
            <button
              onClick={() => handleSend(m)}
              disabled={sent.has(m.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0 transition-all disabled:opacity-50"
              style={{ background: sent.has(m.id) ? "rgba(16,185,129,0.15)" : "rgba(37,211,102,0.15)", color: sent.has(m.id) ? "#34d399" : "#25d366" }}>
              <MessageSquare className="h-3.5 w-3.5" />
              {sent.has(m.id) ? "Sent" : "Send"}
            </button>
          </div>
        ))}
      </div>
      <div className="px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-xs text-gray-600">Opens WhatsApp for each member · sends are logged to their WA history</p>
      </div>
    </>
  );
}

export function MembersClient({
  members, total, page, pageSize, packages, trainers,
  userRole, userId, statusCounts, activeStatusFilter, birthdayMembers = [], birthdayWaLogs = [], waTemplates,
}: Props & { birthdayMembers?: BirthdayMember[]; birthdayWaLogs?: WaLog[] }) {
  const router   = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeMainTab, setActiveMainTab] = useState<"members" | "birthdays">("members");
  const [showAdd, setShowAdd]         = useState(false);
  const [markFor, setMarkFor]         = useState<Member | null>(null);
  const [search, setSearch]           = useState(searchParams.get("search") ?? "");
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [showWelcome, setShowWelcome]       = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting]             = useState(false);
  const [deleteResults, setDeleteResults]   = useState<{ ok: string[]; failed: string[] } | null>(null);
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
    // For status, keep "ALL" in URL so server doesn't default back to ACTIVE
    if (value === "") params.delete(key);
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

  async function bulkDelete() {
    setDeleting(true);
    const ids = Array.from(selected);
    const ok: string[] = [];
    const failed: string[] = [];
    for (const id of ids) {
      const res = await fetch(`/api/members/${id}/delete`, { method: "DELETE" });
      if (res.ok) ok.push(id);
      else failed.push(id);
    }
    setDeleting(false);
    setDeleteResults({ ok, failed });
    setSelected(new Set(failed)); // keep only failed ones selected
    if (ok.length > 0) router.refresh();
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
      {/* ── Main tabs ── */}
      <div className="flex items-center gap-1 p-1 rounded-xl w-fit" style={{ background: "rgba(255,255,255,0.06)" }}>
        <button
          onClick={() => setActiveMainTab("members")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all"
          style={activeMainTab === "members"
            ? { background: "#f97316", color: "#fff" }
            : { color: "#6b7280" }}>
          <Users className="h-3.5 w-3.5" />
          Members
        </button>
        <button
          onClick={() => setActiveMainTab("birthdays")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all"
          style={activeMainTab === "birthdays"
            ? { background: "#d97706", color: "#fff" }
            : { color: "#6b7280" }}>
          🎂 Birthdays
          {birthdayMembers.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: activeMainTab === "birthdays" ? "rgba(255,255,255,0.25)" : "rgba(251,191,36,0.2)", color: activeMainTab === "birthdays" ? "#fff" : "#fbbf24" }}>
              {birthdayMembers.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Birthdays tab ── */}
      {activeMainTab === "birthdays" && <WaSentSummary logs={birthdayWaLogs} waType="BIRTHDAY" />}

      {activeMainTab === "birthdays" && (() => {
        const now = new Date();
        const todayM = now.getMonth(), todayD = now.getDate();
        const tomorrowM = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getMonth();
        const tomorrowD = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getDate();

        const toGroup = (m: BirthdayMember) => {
          const dob = new Date(m.dateOfBirth);
          if (dob.getMonth() === todayM && dob.getDate() === todayD) return "today";
          if (dob.getMonth() === tomorrowM && dob.getDate() === tomorrowD) return "tomorrow";
          return "week";
        };

        const groups: { key: string; label: string; emoji: string; bg: string; color: string; border: string; members: BirthdayMember[] }[] = [
          { key: "today",    label: "Today",           emoji: "🎉", bg: "rgba(251,191,36,0.08)",  color: "#fbbf24", border: "rgba(251,191,36,0.25)", members: [] },
          { key: "tomorrow", label: "Tomorrow",        emoji: "📅", bg: "rgba(249,115,22,0.07)",  color: "#fb923c", border: "rgba(249,115,22,0.2)",  members: [] },
          { key: "week",     label: "Later This Week", emoji: "📆", bg: "rgba(255,255,255,0.03)", color: "#6b7280", border: "rgba(255,255,255,0.08)", members: [] },
        ];

        birthdayMembers.forEach((m) => {
          const g = groups.find((g) => g.key === toGroup(m));
          if (g) g.members.push(m);
        });

        const WA_ICON = <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current flex-shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;

        return (
          <div className="space-y-4">
            {birthdayMembers.length === 0 ? (
              <div className="rounded-2xl flex flex-col items-center justify-center py-20 gap-3" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-5xl">🎂</span>
                <p className="text-sm text-gray-500 font-medium">No birthdays in the next 7 days</p>
              </div>
            ) : groups.filter((g) => g.members.length > 0).map((g) => (
              <div key={g.key} className="rounded-2xl overflow-hidden" style={{ background: g.bg, border: `1px solid ${g.border}` }}>
                {/* Group header */}
                <div className="flex items-center gap-2.5 px-5 py-3 border-b" style={{ borderColor: g.border }}>
                  <span className="text-base">{g.emoji}</span>
                  <p className="font-bold text-sm" style={{ color: g.color }}>{g.label}</p>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full ml-1"
                    style={{ background: "rgba(255,255,255,0.08)", color: g.color }}>{g.members.length}</span>
                </div>
                {/* Members */}
                <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  {g.members.map((m) => {
                    const dob = new Date(m.dateOfBirth);
                    const dobStr = dob.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                    const phone = (m.whatsapp ?? m.phone ?? "").replace(/\D/g, "").slice(-10);
                    const firstName = toTitleCase(m.fullName);
                    const bdayMsg = `Happy Birthday, ${firstName}!\n\nWishing you a wonderful day filled with joy! Keep crushing those fitness goals — the whole Yos team is cheering for you!\n\n– Team Yos Fitness Studio`;
                    return (
                      <div key={m.id} className="flex items-center gap-4 px-5 py-3.5">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0"
                          style={{ background: "rgba(255,255,255,0.08)", color: g.color }}>
                          {m.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link href={`/members/${m.id}`} className="font-semibold text-white hover:text-orange-400 transition-colors text-sm">
                            {toTitleCase(m.fullName)}
                          </Link>
                          <p className="text-xs text-gray-600 mt-0.5">{m.memberId} · {dobStr}</p>
                        </div>
                        {phone && (
                          <a href={`https://wa.me/91${phone}?text=${encodeURIComponent(bdayMsg)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0 transition-opacity hover:opacity-80"
                            style={{ background: "rgba(37,211,102,0.15)", color: "#25d366", border: "1px solid rgba(37,211,102,0.25)" }}>
                            {WA_ICON}
                            Wish
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {activeMainTab === "members" && <>
      {/* ── Toolbar ── */}
      <div className="rounded-2xl px-5 py-4" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex flex-wrap items-center gap-3">

          {/* Instant search */}
          <div className="relative flex-1 min-w-[160px] sm:min-w-[220px] max-w-sm">
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
              onClick={() => { window.location.href = `/api/export/members${activeStatusFilter && activeStatusFilter !== "ALL" ? `?status=${activeStatusFilter}` : ""}`; }}
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
        <div className="rounded-2xl px-5 py-3 flex items-center gap-3 flex-wrap"
          style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)" }}>
          <span className="text-sm font-bold text-orange-400">{selected.size} selected</span>
          {(userRole === "ADMIN" || userRole === "FRONT_DESK") && (
            <button
              onClick={() => setShowWelcome(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
              style={{ background: "#25d366" }}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Send Welcome ({selected.size})
            </button>
          )}
          <button
            onClick={exportSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
            style={{ background: "rgba(249,115,22,0.7)" }}
          >
            Export Selected
          </button>
          {userRole === "ADMIN" && (
            <button
              onClick={() => { setDeleteResults(null); setShowDeleteConfirm(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
              style={{ background: "rgba(220,38,38,0.8)" }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete ({selected.size})
            </button>
          )}
          <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-gray-300 ml-auto">
            Clear selection
          </button>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden bg-white text-gray-900">
            <div className="px-6 py-4 border-b flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-600" />
              <h3 className="font-bold text-red-600">Delete {deleteResults ? "— Results" : `${selected.size} Member${selected.size !== 1 ? "s" : ""}`}</h3>
            </div>
            <div className="px-6 py-5 space-y-3">
              {!deleteResults ? (
                <>
                  <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    <p className="font-bold mb-1">⚠ This cannot be undone.</p>
                    <p>Permanently deletes selected members and all their attendance, memberships, and notes.</p>
                    <p className="mt-1 font-medium">Members with payment records will be skipped.</p>
                  </div>
                  <p className="text-sm text-gray-600">{selected.size} member{selected.size !== 1 ? "s" : ""} selected for deletion.</p>
                </>
              ) : (
                <>
                  {deleteResults.ok.length > 0 && (
                    <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 font-medium">
                      ✓ {deleteResults.ok.length} member{deleteResults.ok.length !== 1 ? "s" : ""} deleted.
                    </p>
                  )}
                  {deleteResults.failed.length > 0 && (
                    <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 font-medium">
                      ✗ {deleteResults.failed.length} skipped — have payment records.
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t flex gap-3 justify-end">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200">
                {deleteResults ? "Close" : "Cancel"}
              </button>
              {!deleteResults && (
                <button
                  onClick={bulkDelete}
                  disabled={deleting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {deleting ? "Deleting…" : "Confirm Delete"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Welcome message modal ── */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setShowWelcome(false)}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: "#1c1c1c", border: "1px solid rgba(255,255,255,0.1)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div>
                <h3 className="text-white font-bold">Send Welcome Messages</h3>
                <p className="text-xs text-gray-500 mt-0.5">Click each member to open WhatsApp</p>
              </div>
              <button onClick={() => setShowWelcome(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <BulkWelcomeList
              members={members.filter((m) => selected.has(m.id))}
              waTemplates={waTemplates}
            />
          </div>
        </div>
      )}

      {/* ── Mobile card list (hidden on md+) ── */}
      <div className="md:hidden rounded-2xl overflow-hidden divide-y divide-white/[0.04]" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users className="h-10 w-10 text-gray-700" />
            <p className="text-sm text-gray-500 font-medium">No members found</p>
          </div>
        ) : members.map((m) => {
          const daysLeft  = m.expiryDate ? daysUntil(m.expiryDate) : null;
          const lastVisit = m.lastAttendanceDate ? daysAgo(m.lastAttendanceDate) : null;
          const isInactive = lastVisit !== null && lastVisit >= 4;
          const sc = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.INACTIVE;
          const isExpired = m.status === "EXPIRED";
          const label = (() => {
            const matchedMembership = m.expiryDate && m.memberships?.find(
              (ms) => ms.expiryDate && new Date(ms.expiryDate).toDateString() === new Date(m.expiryDate!).toDateString()
            );
            return cleanPackageLabel(m.payments?.[0]?.categoryLabel) ?? cleanPackageLabel(matchedMembership ? matchedMembership.package?.name : m.memberships?.[0]?.package?.name) ?? cleanPackageLabel(m.currentPackage?.name);
          })();
          return (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3.5">
              {/* Avatar */}
              <div className="relative w-10 h-10 flex-shrink-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold"
                  style={{ background: "rgba(249,115,22,0.15)", color: "#fb923c" }}>
                  {m.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                {isInactive && lastVisit !== null && lastVisit >= 7 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-[#161616]" />
                )}
                {isInactive && lastVisit !== null && lastVisit >= 4 && lastVisit < 7 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-orange-400 border-2 border-[#161616]" />
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/members/${m.id}`} className="font-semibold text-white text-sm leading-tight hover:text-orange-400 transition-colors">
                    {toTitleCase(m.fullName)}
                  </Link>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                    style={{ background: sc.bg, color: sc.color }}>
                    {sc.label}
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 mt-0.5">{m.memberId} · {m.phone}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {label && <span className="text-[11px] text-gray-500">{label}</span>}
                  {m.expiryDate && (
                    <span className={cn("text-[11px] font-medium",
                      daysLeft !== null && daysLeft < 0 ? "text-red-400"
                      : daysLeft !== null && daysLeft <= 7 ? "text-amber-400"
                      : "text-gray-600"
                    )}>
                      {daysLeft !== null && daysLeft < 0 ? `Exp ${Math.abs(daysLeft)}d ago`
                        : daysLeft === 0 ? "Exp today"
                        : daysLeft !== null && daysLeft <= 7 ? `${daysLeft}d left`
                        : `Exp ${formatDate(m.expiryDate)}`}
                    </span>
                  )}
                  {lastVisit !== null && (
                    <span className={cn("text-[11px]", isInactive ? "text-orange-400" : "text-gray-600")}>
                      {lastVisit === 0 ? "Today" : lastVisit === 1 ? "Yesterday" : `${lastVisit}d ago`}
                    </span>
                  )}
                </div>
              </div>
              {/* Actions */}
              <div className="flex flex-col gap-1 flex-shrink-0">
                <Link href={`/members/${m.id}`}
                  className="flex items-center justify-center w-8 h-8 rounded-xl text-gray-500 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.06)" }}>
                  <Eye className="h-4 w-4" />
                </Link>
                {(userRole === "ADMIN" || userRole === "FRONT_DESK") && m.phone && (() => {
                  const pkgName = label ?? m.currentPackage?.name ?? m.memberships?.[0]?.package?.name ?? null;
                  const msg = buildOnboardingMessage(m.fullName, m.memberId, pkgName, waTemplates);
                  return (
                    <WaConfirmButton
                      memberId={m.id} phone={m.whatsapp ?? m.phone} message={msg}
                      waType="WELCOME" iconOnly
                      className="flex items-center justify-center w-8 h-8 rounded-xl transition-colors"
                      style={{ background: "rgba(37,211,102,0.1)", color: "#25d366" }}
                    />
                  );
                })()}
                {(userRole === "ADMIN" || userRole === "FRONT_DESK" || userRole === "TRAINER") && (
                  <button onClick={() => setMarkFor(m)}
                    className="flex items-center justify-center w-8 h-8 rounded-xl text-gray-500 hover:text-emerald-400 transition-colors"
                    style={{ background: "rgba(255,255,255,0.06)" }}>
                    <CheckCircle className="h-4 w-4" />
                  </button>
                )}
                {isExpired && (userRole === "ADMIN" || userRole === "FRONT_DESK") && (
                  <Link href={`/payments/new?memberId=${m.id}`}
                    className="flex items-center justify-center w-8 h-8 rounded-xl text-gray-500 hover:text-orange-400 transition-colors"
                    style={{ background: "rgba(255,255,255,0.06)" }}>
                    <RefreshCw className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Table (hidden on mobile) ── */}
      <div className="hidden md:block rounded-2xl overflow-hidden" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
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
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-600 uppercase tracking-widest whitespace-nowrap">Member</th>
                <th className="hidden sm:table-cell text-left px-4 py-3.5 text-[11px] font-bold text-gray-600 uppercase tracking-widest whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-600 uppercase tracking-widest whitespace-nowrap">Package &amp; Expiry</th>
                <th className="hidden lg:table-cell text-left px-4 py-3.5 text-[11px] font-bold text-gray-600 uppercase tracking-widest whitespace-nowrap">Joined · Last Visit</th>
                <th className="hidden lg:table-cell text-left px-4 py-3.5 text-[11px] font-bold text-gray-600 uppercase tracking-widest whitespace-nowrap">Trainer</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-600 uppercase tracking-widest"></th>
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
                          <div className="relative w-9 h-9 flex-shrink-0">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold"
                              style={{ background: "rgba(249,115,22,0.15)", color: "#fb923c" }}>
                              {m.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            {isInactive && lastVisit !== null && lastVisit >= 7 && (
                              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-[#161616]" title={`${lastVisit}d since last visit`} />
                            )}
                            {isInactive && lastVisit !== null && lastVisit >= 4 && lastVisit < 7 && (
                              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-orange-400 border-2 border-[#161616]" title={`${lastVisit}d since last visit`} />
                            )}
                          </div>
                          <div>
                            <Link href={`/members/${m.id}`} className="font-semibold text-white hover:text-orange-400 transition-colors">
                              {toTitleCase(m.fullName)}
                            </Link>
                            <p className="text-xs text-gray-600 mt-0.5">{m.memberId}</p>
                            {/* Inline status badge — only shown when Status column is hidden (< sm) */}
                            <span className="sm:hidden inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md mt-0.5"
                              style={{ background: sc.bg, color: sc.color }}>
                              {sc.label}
                            </span>
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
                      <td className="hidden sm:table-cell px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                          style={{ background: sc.bg, color: sc.color }}>
                          <sc.icon className="h-3 w-3" />
                          {sc.label}
                        </span>
                      </td>

                      {/* Package + Expiry */}
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-400">
                          {(() => {
                            const matchedMembership = m.expiryDate && m.memberships?.find(
                              (ms) => ms.expiryDate && new Date(ms.expiryDate).toDateString() === new Date(m.expiryDate!).toDateString()
                            );
                            const label = cleanPackageLabel(m.payments?.[0]?.categoryLabel) ?? cleanPackageLabel(matchedMembership ? matchedMembership.package?.name : m.memberships?.[0]?.package?.name) ?? cleanPackageLabel(m.currentPackage?.name);
                            return label ?? <span className="text-gray-700">—</span>;
                          })()}
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
                      <td className="hidden lg:table-cell px-4 py-4">
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
                      <td className="hidden lg:table-cell px-4 py-4 text-sm text-gray-500">
                        {m.trainer ? toTitleCase(m.trainer.fullName) : <span className="text-gray-700">—</span>}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <Link href={`/members/${m.id}`}
                            className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-gray-500 hover:text-white transition-colors"
                            style={{ background: "rgba(255,255,255,0.04)" }}>
                            <Eye className="h-3.5 w-3.5" />
                            <span className="text-[9px] font-semibold leading-none">View</span>
                          </Link>
                          {(userRole === "ADMIN" || userRole === "FRONT_DESK") && m.phone && (() => {
                            const pkgName = cleanPackageLabel(m.payments?.[0]?.categoryLabel) ?? cleanPackageLabel(m.memberships?.[0]?.package?.name) ?? cleanPackageLabel(m.currentPackage?.name);
                            const msg = buildOnboardingMessage(m.fullName, m.memberId, pkgName, waTemplates);
                            return (
                              <WaConfirmButton
                                memberId={m.id} phone={m.whatsapp ?? m.phone} message={msg}
                                waType="WELCOME" label="Welcome"
                                className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors text-[9px] font-semibold"
                                style={{ background: "rgba(37,211,102,0.1)", color: "#25d366" }}
                              />
                            );
                          })()}
                          {(userRole === "ADMIN" || userRole === "FRONT_DESK" || userRole === "TRAINER") && (
                            <button onClick={() => setMarkFor(m)}
                              className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-gray-500 hover:text-emerald-400 transition-colors"
                              style={{ background: "rgba(255,255,255,0.04)" }}>
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span className="text-[9px] font-semibold leading-none">Check In</span>
                            </button>
                          )}
                          {/* Quick Renew for expired members */}
                          {isExpired && (userRole === "ADMIN" || userRole === "FRONT_DESK") && (
                            <Link href={`/payments/new?memberId=${m.id}`}
                              className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-gray-500 hover:text-orange-400 transition-colors"
                              style={{ background: "rgba(255,255,255,0.04)" }}>
                              <RefreshCw className="h-3.5 w-3.5" />
                              <span className="text-[9px] font-semibold leading-none">Renew</span>
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
      </>}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft, Plus, Phone, MessageCircle, ChevronDown,
  Calendar, StickyNote, X, UserCircle, Search, User, UserCheck,
  CreditCard, CheckCircle2,
} from "lucide-react";

type Employee = { id: string; fullName: string };

type LinkedMember = { id: string; memberId: string; fullName: string };

type Enquiry = {
  id: string; name: string; phone: string;
  interest: string | null; source: string; status: string;
  assignedTo: Employee | null;
  followUpDate: string | null; notes: string | null;
  createdAt: string; convertedAt: string | null;
  member: LinkedMember | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  NEW:       { label: "New",       color: "#60a5fa", bg: "rgba(59,130,246,0.15)",  dot: "#3b82f6" },
  CONTACTED: { label: "Contacted", color: "#fbbf24", bg: "rgba(245,158,11,0.15)",  dot: "#f59e0b" },
  FOLLOW_UP: { label: "Follow Up", color: "#a78bfa", bg: "rgba(139,92,246,0.15)",  dot: "#8b5cf6" },
  CONVERTED: { label: "Joined",    color: "#34d399", bg: "rgba(16,185,129,0.15)",  dot: "#10b981" },
  LOST:      { label: "Lost",      color: "#9ca3af", bg: "rgba(107,114,128,0.15)", dot: "#6b7280" },
};

const SOURCE_LABELS: Record<string, string> = {
  WALK_IN: "Walk-in", INSTAGRAM: "Instagram", REFERRAL: "Referral",
  PHONE: "Phone", WEBSITE: "Website", OTHER: "Other",
};

const STATUSES = ["NEW", "CONTACTED", "FOLLOW_UP", "CONVERTED", "LOST"];
const SOURCES  = ["WALK_IN", "INSTAGRAM", "REFERRAL", "PHONE", "WEBSITE", "OTHER"];

function waLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const num = digits.startsWith("91") && digits.length === 12 ? digits : `91${digits.slice(-10)}`;
  return `https://wa.me/${num}`;
}

function formatDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

function toTitleCase(s: string) {
  return s.toLowerCase().split(" ").map((w) => w ? w[0].toUpperCase() + w.slice(1) : w).join(" ");
}

// Returns { year: "2026", months: [{ value: "2026-08", label: "Aug" }, ...] }[]
function buildMonthTree(enquiries: Enquiry[]) {
  const seen = new Set<string>();
  for (const e of enquiries) {
    const d = new Date(e.createdAt);
    seen.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const byYear: Record<string, { value: string; label: string }[]> = {};
  for (const v of Array.from(seen).sort((a, b) => b.localeCompare(a))) {
    const [y, m] = v.split("-");
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push({
      value: v,
      label: new Date(Number(y), Number(m) - 1).toLocaleDateString("en-IN", { month: "short" }),
    });
  }
  return Object.entries(byYear)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, months]) => ({ year, months }));
}

function enquiryMonth(e: Enquiry) {
  const d = new Date(e.createdAt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function StatusPicker({ enquiry, onSelect }: {
  enquiry: Enquiry;
  onSelect: (id: string, s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = STATUS_CONFIG[enquiry.status] ?? STATUS_CONFIG.NEW;

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-xl"
        style={{ background: cfg.bg, color: cfg.color }}>
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
        {cfg.label}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 rounded-xl overflow-hidden shadow-2xl"
          style={{ background: "#2a2a2a", border: "1px solid rgba(255,255,255,0.12)", minWidth: "140px" }}>
          {STATUSES.map((s) => (
            <button key={s}
              onClick={() => { onSelect(enquiry.id, s); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-left active:opacity-70"
              style={{
                color: STATUS_CONFIG[s].color,
                background: enquiry.status === s ? "rgba(255,255,255,0.06)" : "transparent",
              }}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: STATUS_CONFIG[s].dot }} />
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ConvertModal({ enquiry, pin, onClose, onDone }: {
  enquiry: Enquiry;
  pin: string;
  onClose: () => void;
  onDone: (updated: Enquiry) => void;
}) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<{ id: string; memberId: string; fullName: string; phone: string }[]>([]);
  const [selected, setSelected] = useState<{ id: string; memberId: string; fullName: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.trim().length < 2) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/staff/enquiries/members?pin=${encodeURIComponent(pin)}&q=${encodeURIComponent(query)}`);
      if (res.ok) setResults(await res.json());
      setLoading(false);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query, pin]);

  async function submit(memberId: string | null) {
    setSaving(true);
    const res = await fetch("/api/staff/enquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, action: "convert", enquiryId: enquiry.id, memberId }),
    });
    if (res.ok) {
      const { enquiry: updated } = await res.json();
      onDone(updated);
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#1c1c1c", border: "1px solid rgba(255,255,255,0.08)" }}>

        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <p className="font-bold text-white text-sm">Mark as Joined</p>
            <p className="text-xs text-gray-500 mt-0.5">{toTitleCase(enquiry.name)}</p>
          </div>
          <button onClick={onClose} className="text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-gray-500">Link to the member record they created after joining:</p>

          {!selected ? (
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-600 pointer-events-none" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, phone, or member ID…"
                  autoFocus
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                  style={{ background: "#2a2a2a", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>
              {results.length > 0 && (
                <div className="mt-1 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "#2a2a2a" }}>
                  {results.map((m) => (
                    <button key={m.id} onClick={() => setSelected(m)}
                      className="w-full flex items-start gap-3 px-3 py-2.5 text-left active:bg-white/[0.06]">
                      <div>
                        <p className="text-sm font-semibold text-white">{toTitleCase(m.fullName)}</p>
                        <p className="text-xs text-gray-500">{m.memberId} · {m.phone}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {loading && <p className="text-xs text-gray-600 mt-2">Searching…</p>}
              {!loading && query.length >= 2 && results.length === 0 && (
                <p className="text-xs text-gray-600 mt-2">No unlinked members found</p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
              style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <div>
                <p className="text-sm font-bold text-emerald-400">{toTitleCase(selected.fullName)}</p>
                <p className="text-xs text-gray-500">{selected.memberId}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-600"><X className="h-4 w-4" /></button>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button onClick={() => submit(null)} disabled={saving}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.06)", color: "#9ca3af" }}>
            Skip link
          </button>
          <button onClick={() => submit(selected?.id ?? null)} disabled={saving || !selected}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
            {saving ? "Saving…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StaffEnquiriesPage() {
  const router = useRouter();
  const [pin, setPin]               = useState<string | null>(null);
  const [currentEmpId, setEmpId]    = useState<string | null>(null);
  const [enquiries, setEnquiries]   = useState<Enquiry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setFilter]   = useState("ALL");
  const [monthFilter, setMonthFilter] = useState("ALL");
  const [staffFilter, setStaffFilter] = useState("ALL");
  const [search, setSearch]         = useState("");
  const [showAdd, setShowAdd]       = useState(false);
  const [editing, setEditing]       = useState<Enquiry | null>(null);
  const [employees, setEmployees]   = useState<Employee[]>([]);
  const [convertTarget, setConvertTarget] = useState<Enquiry | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [paymentsTarget, setPaymentsTarget] = useState<LinkedMember | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("staff_pin");
    if (!stored) { router.replace("/staff-dashboard"); return; }
    setPin(stored);
    fetchEnquiries(stored);
  }, []);

  async function fetchEnquiries(p: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/enquiries?pin=${p}`);
      if (!res.ok) { router.replace("/staff-dashboard"); return; }
      const data = await res.json();
      setEnquiries(data.enquiries);
      setEmployees(data.employees ?? []);
      setEmpId(data.employee?.id ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    if (!pin) return;
    if (status === "CONVERTED") {
      const enq = enquiries.find((e) => e.id === id);
      if (enq && !enq.member) {
        setConvertTarget(enq);
        return;
      }
    }
    const res = await fetch("/api/staff/enquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, id, status }),
    });
    if (res.ok) {
      const { enquiry } = await res.json();
      setEnquiries((prev) => prev.map((e) => e.id === id ? enquiry : e));
    }
  }

  async function handleCreate(form: FormData): Promise<string | null> {
    if (!pin) return null;
    const res = await fetch("/api/staff/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pin,
        name:         form.get("name"),
        phone:        form.get("phone"),
        interest:     form.get("interest"),
        source:       form.get("source"),
        assignedToId: form.get("assignedToId") || undefined,
        followUpDate: form.get("followUpDate"),
        notes:        form.get("notes"),
      }),
    });
    if (res.ok) {
      const { enquiry } = await res.json();
      setEnquiries((prev) => [enquiry, ...prev]);
      setShowAdd(false);
      return null;
    }
    const err = await res.json().catch(() => ({}));
    return err.error ?? "Failed to save. Please try again.";
  }

  async function handleUpdate(form: FormData): Promise<string | null> {
    if (!pin || !editing) return null;
    const res = await fetch("/api/staff/enquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pin,
        id:           editing.id,
        status:       form.get("status"),
        notes:        form.get("notes"),
        followUpDate: form.get("followUpDate"),
        assignedToId: form.get("assignedToId"),
      }),
    });
    if (res.ok) {
      const { enquiry } = await res.json();
      setEnquiries((prev) => prev.map((e) => e.id === enquiry.id ? enquiry : e));
      setEditing(null);
      return null;
    }
    const err = await res.json().catch(() => ({}));
    return err.error ?? "Failed to save. Please try again.";
  }

  const monthTree = buildMonthTree(enquiries);
  const [openYear, setOpenYear] = useState<string | null>(null);

  const q = search.toLowerCase();
  const filtered = enquiries
    .filter((e) => statusFilter === "ALL" || e.status === statusFilter)
    .filter((e) => monthFilter === "ALL" || enquiryMonth(e) === monthFilter)
    .filter((e) => staffFilter === "ALL" || e.assignedTo?.id === staffFilter)
    .filter((e) => !q || e.name.toLowerCase().includes(q) || e.phone.includes(q) || (e.interest ?? "").toLowerCase().includes(q));

  const counts: Record<string, number> = { ALL: enquiries.length };
  for (const s of STATUSES) counts[s] = enquiries.filter((e) => e.status === s).length;

  const overdueCount = enquiries.filter((e) => {
    if (!e.followUpDate || e.status === "CONVERTED" || e.status === "LOST") return false;
    return daysUntil(e.followUpDate) <= 0;
  }).length;

  const activeFilterCount = [
    monthFilter !== "ALL",
    staffFilter !== "ALL",
    statusFilter !== "ALL",
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0a0a" }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-4 border-b sticky top-0 z-10"
        style={{ borderColor: "#1c1c1c", background: "#0a0a0a" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/staff-dashboard")}
            className="p-2 rounded-xl" style={{ background: "#1c1c1c", color: "#9ca3af" }}>
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <Image src="/Logo.png" alt="Yos Fitness" width={26} height={26} className="rounded-lg" />
            <span className="text-white font-bold text-sm">Enquiries</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(249,115,22,0.15)", color: "#f97316" }}>
              {filtered.length}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters((v) => !v)}
            className="relative p-2 rounded-xl text-sm font-semibold"
            style={{
              background: showFilters ? "rgba(249,115,22,0.15)" : "#1c1c1c",
              color: showFilters ? "#f97316" : "#9ca3af",
            }}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" d="M3 6h18M6 12h12M9 18h6" />
            </svg>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center"
                style={{ background: "#f97316", color: "#fff" }}>
                {activeFilterCount}
              </span>
            )}
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">

        {/* Overdue alert */}
        {overdueCount > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
            <Calendar className="h-4 w-4 text-purple-400 flex-shrink-0" />
            <p className="text-sm font-semibold text-purple-300">
              {overdueCount} follow-up{overdueCount > 1 ? "s" : ""} due or overdue
            </p>
            <button onClick={() => setFilter("FOLLOW_UP")}
              className="ml-auto text-xs font-bold text-purple-400 flex-shrink-0">View →</button>
          </div>
        )}

        {/* Filter panel */}
        {showFilters && (
          <div className="rounded-2xl p-4 space-y-3" style={{ background: "#1c1c1c", border: "1px solid rgba(255,255,255,0.06)" }}>

            {/* Month filter — year → months two-level */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Month</p>
              <div className="space-y-2">
                <button onClick={() => { setMonthFilter("ALL"); setOpenYear(null); }}
                  className="px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{
                    background: monthFilter === "ALL" ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.05)",
                    color: monthFilter === "ALL" ? "#f97316" : "#6b7280",
                  }}>
                  All time
                </button>
                {monthTree.map(({ year, months }) => {
                  const isOpen = openYear === year;
                  const yearActive = monthFilter !== "ALL" && monthFilter.startsWith(year);
                  return (
                    <div key={year}>
                      <button
                        onClick={() => setOpenYear(isOpen ? null : year)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold w-auto"
                        style={{
                          background: yearActive ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.05)",
                          color: yearActive ? "#f97316" : "#9ca3af",
                        }}>
                        {year}
                        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isOpen && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5 pl-2">
                          {months.map(({ value, label }) => (
                            <button key={value} onClick={() => setMonthFilter(value)}
                              className="px-3 py-1.5 rounded-full text-xs font-bold"
                              style={{
                                background: monthFilter === value ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.05)",
                                color: monthFilter === value ? "#f97316" : "#6b7280",
                              }}>
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Staff filter */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Staff</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setStaffFilter("ALL")}
                  className="px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{
                    background: staffFilter === "ALL" ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.05)",
                    color: staffFilter === "ALL" ? "#f97316" : "#6b7280",
                  }}>
                  Everyone
                </button>
                {employees.map((emp) => (
                  <button key={emp.id} onClick={() => setStaffFilter(emp.id)}
                    className="px-3 py-1.5 rounded-full text-xs font-bold"
                    style={{
                      background: staffFilter === emp.id ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.05)",
                      color: staffFilter === emp.id ? "#f97316" : "#6b7280",
                    }}>
                    {toTitleCase(emp.fullName)}
                  </button>
                ))}
              </div>
            </div>

            {/* Status filter */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Status</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setFilter("ALL")}
                  className="px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{
                    background: statusFilter === "ALL" ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.05)",
                    color: statusFilter === "ALL" ? "#f97316" : "#6b7280",
                  }}>
                  All ({counts.ALL})
                </button>
                {STATUSES.map((s) => {
                  const cfg = STATUS_CONFIG[s];
                  return (
                    <button key={s} onClick={() => setFilter(s)}
                      className="px-3 py-1.5 rounded-full text-xs font-bold"
                      style={{
                        background: statusFilter === s ? cfg.bg : "rgba(255,255,255,0.05)",
                        color: statusFilter === s ? cfg.color : "#6b7280",
                      }}>
                      {cfg.label} ({counts[s] ?? 0})
                    </button>
                  );
                })}
              </div>
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={() => { setMonthFilter("ALL"); setStaffFilter("ALL"); setFilter("ALL"); }}
                className="text-xs font-bold text-gray-500 hover:text-white transition-colors">
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, interest…"
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-sm text-white placeholder:text-gray-600 outline-none"
            style={{ background: "#1c1c1c", border: "1px solid rgba(255,255,255,0.06)" }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Quick status pills (compact, only when filter panel is hidden) */}
        {!showFilters && (
          <div className="flex flex-wrap gap-2">
            {[{ key: "ALL", label: `All (${counts.ALL})` }, ...STATUSES.map((s) => ({
              key: s, label: `${STATUS_CONFIG[s].label} (${counts[s] ?? 0})`
            }))].map(({ key, label }) => {
              const cfg = STATUS_CONFIG[key];
              const isActive = statusFilter === key;
              return (
                <button key={key} onClick={() => setFilter(key)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                  style={{
                    background: isActive ? (cfg?.bg ?? "rgba(249,115,22,0.15)") : "#1c1c1c",
                    color: isActive ? (cfg?.color ?? "#fb923c") : "#6b7280",
                    border: `1px solid ${isActive ? (cfg?.dot ?? "#f97316") + "60" : "transparent"}`,
                  }}>
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <UserCircle className="h-12 w-12 text-gray-700" />
            <p className="text-sm text-gray-500">{search ? "No results found" : "No enquiries here"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((e) => {
              const followUpDays    = e.followUpDate ? daysUntil(e.followUpDate) : null;
              const followUpOverdue = followUpDays !== null && followUpDays < 0;
              const followUpToday   = followUpDays === 0;

              return (
                <div key={e.id} className="rounded-2xl p-4 space-y-3" style={{ background: "#1c1c1c" }}>

                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-white">{toTitleCase(e.name)}</p>
                        {e.member && (
                          <button
                            onClick={(ev) => { ev.stopPropagation(); setPaymentsTarget(e.member!); }}
                            className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                            style={{ background: "rgba(16,185,129,0.12)", color: "#34d399" }}>
                            <UserCheck className="h-2.5 w-2.5" />
                            {e.member.memberId}
                            <CreditCard className="h-2.5 w-2.5 ml-0.5 opacity-70" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                          style={{ background: "rgba(255,255,255,0.06)", color: "#6b7280" }}>
                          {SOURCE_LABELS[e.source] ?? e.source}
                        </span>
                        {e.interest && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                            style={{ background: "rgba(249,115,22,0.1)", color: "#fb923c" }}>
                            {e.interest}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-700">{formatDate(e.createdAt)}</span>
                      </div>
                    </div>
                    <StatusPicker enquiry={e} onSelect={handleStatusChange} />
                  </div>

                  {/* Assigned to */}
                  {e.assignedTo && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <User className="h-3 w-3 text-gray-700 flex-shrink-0" />
                      {toTitleCase(e.assignedTo.fullName)}
                    </div>
                  )}

                  {/* Follow-up */}
                  {e.followUpDate && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold"
                      style={{ color: followUpOverdue ? "#f87171" : followUpToday ? "#fb923c" : "#a78bfa" }}>
                      <Calendar className="h-3 w-3" />
                      {followUpOverdue
                        ? `Follow-up ${Math.abs(followUpDays!)}d overdue`
                        : followUpToday ? "Follow up today"
                        : `Follow up ${formatDate(e.followUpDate)}`}
                    </div>
                  )}

                  {/* Linked member */}
                  {e.member && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <UserCheck className="h-3 w-3" />
                      Joined as {toTitleCase(e.member.fullName)}
                      {e.convertedAt && <span className="text-gray-600 font-normal">· {formatDate(e.convertedAt)}</span>}
                    </div>
                  )}

                  {/* Notes */}
                  {e.notes && (
                    <p className="text-xs text-gray-500 flex items-start gap-1.5">
                      <StickyNote className="h-3 w-3 flex-shrink-0 mt-0.5 text-gray-700" />
                      {e.notes}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <a href={`tel:${e.phone}`}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl flex-1 justify-center"
                      style={{ background: "rgba(255,255,255,0.06)", color: "#9ca3af" }}>
                      <Phone className="h-3.5 w-3.5" /> {e.phone}
                    </a>
                    <a href={waLink(e.phone)} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl"
                      style={{ background: "rgba(37,211,102,0.12)", color: "#25d366" }}>
                      <MessageCircle className="h-3.5 w-3.5" /> WA
                    </a>
                    <button onClick={() => setEditing(e)}
                      className="text-xs font-semibold px-3 py-2 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.06)", color: "#9ca3af" }}>
                      Edit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAdd && (
        <EnquiryModal
          title="New Enquiry"
          employees={employees}
          defaultAssignedToId={currentEmpId ?? ""}
          onClose={() => setShowAdd(false)}
          onSubmit={handleCreate}
        />
      )}

      {editing && (
        <EnquiryModal
          title="Edit Enquiry"
          initial={editing}
          employees={employees}
          defaultAssignedToId={editing.assignedTo?.id ?? ""}
          onClose={() => setEditing(null)}
          onSubmit={handleUpdate}
          editOnly
        />
      )}

      {convertTarget && pin && (
        <ConvertModal
          enquiry={convertTarget}
          pin={pin}
          onClose={() => setConvertTarget(null)}
          onDone={(updated) => {
            setEnquiries((prev) => prev.map((e) => e.id === updated.id ? updated : e));
            setConvertTarget(null);
          }}
        />
      )}

      {paymentsTarget && pin && (
        <MemberPaymentsSheet
          member={paymentsTarget}
          pin={pin}
          employees={employees}
          onClose={() => setPaymentsTarget(null)}
        />
      )}
    </div>
  );
}

type Payment = {
  id: string;
  date: string;
  amount: string;
  discount: string;
  paymentMode: string;
  paymentType: string;
  categoryLabel: string | null;
  periodLabel: string | null;
  receiptNumber: number | null;
  soldById: string | null;
  soldById2: string | null;
  soldByPct: number;
  soldBy: { id: string; fullName: string } | null;
  soldBy2: { id: string; fullName: string } | null;
  package: { name: string } | null;
};

const PAYMENT_MODE_LABELS: Record<string, string> = {
  CASH: "Cash", CARD: "Card", UPI: "UPI", BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque", OTHER: "Other",
};

function MemberPaymentsSheet({ member, pin, employees, onClose }: {
  member: LinkedMember;
  pin: string;
  employees: Employee[];
  onClose: () => void;
}) {
  const [payments, setPayments]   = useState<Payment[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState<string | null>(null); // paymentId being saved

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/staff/members/${member.id}/payments?pin=${encodeURIComponent(pin)}`);
      if (res.ok) setPayments(await res.json());
      setLoading(false);
    })();
  }, [member.id, pin]);

  async function assignSoldBy(paymentId: string, soldById: string) {
    setSaving(paymentId);
    const res = await fetch(`/api/staff/members/${member.id}/payments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, paymentId, soldById }),
    });
    if (res.ok) {
      const updated = await res.json();
      setPayments((prev) => prev.map((p) => p.id === paymentId ? { ...p, ...updated } : p));
    }
    setSaving(null);
  }

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={onClose}>
      <div className="rounded-t-3xl overflow-hidden max-h-[88vh] flex flex-col"
        style={{ background: "#1c1c1c", border: "1px solid rgba(255,255,255,0.08)" }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <p className="font-bold text-white">{toTitleCase(member.fullName)}</p>
            <p className="text-xs text-gray-500 mt-0.5">{member.memberId} · Payments</p>
          </div>
          <button onClick={onClose} className="text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        {/* Summary */}
        {!loading && payments.length > 0 && (
          <div className="flex items-center gap-4 px-5 py-3 flex-shrink-0"
            style={{ background: "rgba(249,115,22,0.06)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Total Paid</p>
              <p className="text-lg font-extrabold text-orange-400">₹{totalPaid.toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Payments</p>
              <p className="text-lg font-extrabold text-white">{payments.length}</p>
            </div>
          </div>
        )}

        {/* List */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <CreditCard className="h-10 w-10 text-gray-700" />
              <p className="text-sm text-gray-500">No payments found</p>
            </div>
          ) : (
            payments.map((p) => {
              const label = p.categoryLabel ?? p.package?.name ?? p.paymentType;
              const net   = Number(p.amount) - Number(p.discount);
              const isSaving = saving === p.id;

              return (
                <div key={p.id} className="rounded-2xl p-4 space-y-3"
                  style={{ background: "#242424", border: "1px solid rgba(255,255,255,0.06)" }}>

                  {/* Payment info row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-white text-sm">{label}</p>
                      {p.periodLabel && <p className="text-xs text-gray-500 mt-0.5">{p.periodLabel}</p>}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                          style={{ background: "rgba(255,255,255,0.06)", color: "#6b7280" }}>
                          {PAYMENT_MODE_LABELS[p.paymentMode] ?? p.paymentMode}
                        </span>
                        {p.receiptNumber && (
                          <span className="text-[10px] text-gray-600">#{p.receiptNumber}</span>
                        )}
                        <span className="text-[10px] text-gray-600">
                          {new Date(p.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-extrabold text-white">₹{net.toLocaleString("en-IN")}</p>
                      {Number(p.discount) > 0 && (
                        <p className="text-[10px] text-gray-600 line-through">₹{Number(p.amount).toLocaleString("en-IN")}</p>
                      )}
                    </div>
                  </div>

                  {/* Sale attribution */}
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.75rem" }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Closed by</p>
                    <div className="flex items-center gap-2">
                      <select
                        value={p.soldById ?? ""}
                        disabled={isSaving}
                        onChange={(e) => assignSoldBy(p.id, e.target.value)}
                        className="flex-1 text-sm font-semibold rounded-xl px-3 py-2 outline-none disabled:opacity-50"
                        style={{
                          background: "#2a2a2a",
                          border: `1px solid ${p.soldById ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.1)"}`,
                          color: p.soldById ? "#34d399" : "#6b7280",
                        }}>
                        <option value="">— Unassigned —</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>{toTitleCase(emp.fullName)}</option>
                        ))}
                      </select>
                      {isSaving && (
                        <div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin flex-shrink-0" />
                      )}
                      {!isSaving && p.soldBy && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function EnquiryModal({ title, initial, employees, defaultAssignedToId, onClose, onSubmit, editOnly }: {
  title: string;
  initial?: Enquiry;
  employees: Employee[];
  defaultAssignedToId?: string;
  onClose: () => void;
  onSubmit: (form: FormData) => Promise<string | null>;
  editOnly?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const err = await onSubmit(new FormData(e.currentTarget));
    if (err) setError(err);
    setLoading(false);
  }

  const inp: React.CSSProperties = {
    background: "#2a2a2a", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "0.75rem", padding: "0.625rem 0.875rem",
    color: "#f9fafb", fontSize: "0.875rem", outline: "none", width: "100%",
  };
  const lbl: React.CSSProperties = {
    color: "#9ca3af", fontSize: "0.7rem", fontWeight: 600,
    display: "block", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.05em",
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={onClose}>
      <div className="rounded-t-3xl overflow-hidden max-h-[92vh] flex flex-col"
        style={{ background: "#1c1c1c", border: "1px solid rgba(255,255,255,0.08)" }}
        onClick={(ev) => ev.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h3 className="font-bold text-white">{title}</h3>
          <button onClick={onClose} style={{ color: "#6b7280" }}><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto">
          <div className="px-5 py-4 space-y-4">

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-400"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <X className="h-3.5 w-3.5 flex-shrink-0" /> {error}
              </div>
            )}

            {!editOnly && (
              <>
                <div>
                  <label style={lbl}>Name *</label>
                  <input name="name" required placeholder="Full name" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Phone *</label>
                  <input name="phone" required placeholder="10-digit mobile" inputMode="tel" style={inp} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={lbl}>Interest</label>
                    <input name="interest" placeholder="e.g. General Fitness" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Source</label>
                    <select name="source" style={inp}>
                      {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label style={lbl}>Assign To</label>
              <select name="assignedToId" defaultValue={defaultAssignedToId ?? ""} style={inp}>
                <option value="">Unassigned</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{toTitleCase(emp.fullName)}</option>
                ))}
              </select>
            </div>

            {editOnly && (
              <div>
                <label style={lbl}>Status</label>
                <select name="status" defaultValue={initial?.status ?? "NEW"} style={inp}>
                  {STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                </select>
              </div>
            )}

            <div>
              <label style={lbl}>Follow-up Date</label>
              <input type="date" name="followUpDate"
                defaultValue={initial?.followUpDate ? new Date(initial.followUpDate).toISOString().split("T")[0] : ""}
                style={inp} />
            </div>
            <div>
              <label style={lbl}>Notes</label>
              <textarea name="notes" rows={3} defaultValue={initial?.notes ?? ""}
                placeholder="Details about the enquiry…"
                style={{ ...inp, resize: "none" }} />
            </div>
          </div>

          <div className="flex gap-3 px-5 py-4 flex-shrink-0"
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold"
              style={{ background: "rgba(255,255,255,0.06)", color: "#9ca3af" }}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 rounded-2xl text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

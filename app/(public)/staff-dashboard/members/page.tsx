"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft, Plus, Phone, MessageCircle, ChevronDown,
  Calendar, StickyNote, X, UserCircle, Search, User, UserCheck,
  CreditCard, CheckCircle2, Users, ClipboardList, RefreshCw,
} from "lucide-react";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
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

type Payment = {
  id: string; date: string; amount: string; discount: string;
  paymentMode: string; paymentType: string; categoryLabel: string | null;
  periodLabel: string | null; receiptNumber: number | null;
  soldById: string | null; soldBy: { id: string; fullName: string } | null;
  package: { name: string } | null;
};

type MemberDetail = {
  id: string; memberId: string; fullName: string; phone: string;
  status: string; expiryDate: string | null; startDate: string | null;
  lastPaymentDate: string | null; packageName: string | null;
};

type MemberSummary = {
  id: string; memberId: string; fullName: string; phone: string;
  expiryDate: string | null; packageName: string | null; soldBy: string | null;
};

// ──────────────────────────────────────────────
// Constants / helpers
// ──────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  NEW:       { label: "New",       color: "#60a5fa", bg: "rgba(59,130,246,0.15)",  dot: "#3b82f6" },
  CONTACTED: { label: "Contacted", color: "#fbbf24", bg: "rgba(245,158,11,0.15)",  dot: "#f59e0b" },
  FOLLOW_UP: { label: "Follow Up", color: "#a78bfa", bg: "rgba(139,92,246,0.15)",  dot: "#8b5cf6" },
  CONVERTED: { label: "Joined",    color: "#34d399", bg: "rgba(16,185,129,0.15)",  dot: "#10b981" },
  LOST:      { label: "Lost",      color: "#9ca3af", bg: "rgba(107,114,128,0.15)", dot: "#6b7280" },
};

const MEMBER_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE:   { label: "Active",   color: "#34d399", bg: "rgba(16,185,129,0.15)" },
  EXPIRED:  { label: "Expired",  color: "#f87171", bg: "rgba(239,68,68,0.12)"  },
  INACTIVE: { label: "Inactive", color: "#9ca3af", bg: "rgba(107,114,128,0.12)"},
  PROSPECT: { label: "Prospect", color: "#fbbf24", bg: "rgba(245,158,11,0.12)" },
};

const SOURCE_LABELS: Record<string, string> = {
  WALK_IN: "Walk-in", INSTAGRAM: "Instagram", REFERRAL: "Referral",
  PHONE: "Phone", WEBSITE: "Website", OTHER: "Other",
};
const STATUSES = ["NEW", "CONTACTED", "FOLLOW_UP", "CONVERTED", "LOST"];
const SOURCES  = ["WALK_IN", "INSTAGRAM", "REFERRAL", "PHONE", "WEBSITE", "OTHER"];
const PAYMENT_MODE_LABELS: Record<string, string> = {
  CASH: "Cash", CARD: "Card", UPI: "UPI", BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque", OTHER: "Other",
};

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
    byYear[y].push({ value: v, label: new Date(Number(y), Number(m) - 1).toLocaleDateString("en-IN", { month: "short" }) });
  }
  return Object.entries(byYear).sort(([a], [b]) => b.localeCompare(a))
    .map(([year, months]) => ({ year, months }));
}
function stripTag(notes: string | null) {
  return notes?.replace(/\s*\[prev_status:[A-Z_]+\]/, "").trim() || null;
}
function enquiryMonth(e: Enquiry) {
  const d = new Date(e.createdAt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ──────────────────────────────────────────────
// StatusPicker
// ──────────────────────────────────────────────
function StatusPicker({ enquiry, onSelect }: { enquiry: Enquiry; onSelect: (id: string, s: string) => void }) {
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
            <button key={s} onClick={() => { onSelect(enquiry.id, s); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-left active:opacity-70"
              style={{ color: STATUS_CONFIG[s].color, background: enquiry.status === s ? "rgba(255,255,255,0.06)" : "transparent" }}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: STATUS_CONFIG[s].dot }} />
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// MemberPaymentsSheet
// ──────────────────────────────────────────────
function MemberPaymentsSheet({ member, pin, employees, onClose }: {
  member: LinkedMember; pin: string; employees: Employee[]; onClose: () => void;
}) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/staff/members/${member.id}/payments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) setPayments(await res.json());
      setLoading(false);
    })();
  }, [member.id, pin]);

  async function assignSoldBy(paymentId: string, soldById: string) {
    setSaving(paymentId);
    const res = await fetch(`/api/staff/members/${member.id}/payments`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
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
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.75)" }} onClick={onClose}>
      <div className="rounded-t-3xl overflow-hidden max-h-[88vh] flex flex-col"
        style={{ background: "#1c1c1c", border: "1px solid rgba(255,255,255,0.08)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <p className="font-bold text-white">{toTitleCase(member.fullName)}</p>
            <p className="text-xs text-gray-500 mt-0.5">{member.memberId} · Payments</p>
          </div>
          <button onClick={onClose} className="text-gray-600"><X className="h-5 w-5" /></button>
        </div>
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
          ) : payments.map((p) => {
            const label   = p.categoryLabel ?? p.package?.name ?? p.paymentType;
            const net     = Number(p.amount) - Number(p.discount);
            const isSaving = saving === p.id;
            return (
              <div key={p.id} className="rounded-2xl p-4 space-y-3"
                style={{ background: "#242424", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-white text-sm">{label}</p>
                    {p.periodLabel && <p className="text-xs text-gray-500 mt-0.5">{p.periodLabel}</p>}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                        style={{ background: "rgba(255,255,255,0.06)", color: "#6b7280" }}>
                        {PAYMENT_MODE_LABELS[p.paymentMode] ?? p.paymentMode}
                      </span>
                      {p.receiptNumber && <span className="text-[10px] text-gray-600">#{p.receiptNumber}</span>}
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
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.75rem" }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Closed by</p>
                  <div className="flex items-center gap-2">
                    <select value={p.soldById ?? ""} disabled={isSaving}
                      onChange={(e) => assignSoldBy(p.id, e.target.value)}
                      className="flex-1 text-sm font-semibold rounded-xl px-3 py-2 outline-none disabled:opacity-50"
                      style={{ background: "#2a2a2a", border: `1px solid ${p.soldById ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.1)"}`, color: p.soldById ? "#34d399" : "#6b7280" }}>
                      <option value="">— Unassigned —</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>{toTitleCase(emp.fullName)}</option>
                      ))}
                    </select>
                    {isSaving
                      ? <div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin flex-shrink-0" />
                      : !isSaving && p.soldBy && <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// ConvertModal
// ──────────────────────────────────────────────
function ConvertModal({ enquiry, pin, employees, onClose, onDone }: {
  enquiry: Enquiry; pin: string; employees: Employee[];
  onClose: () => void; onDone: (updated: Enquiry) => void;
}) {
  const [step, setStep]         = useState<1 | 2>(1);
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<{ id: string; memberId: string; fullName: string; phone: string }[]>([]);
  const [selected, setSelected] = useState<{ id: string; memberId: string; fullName: string } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [linkedEnquiry, setLinkedEnquiry] = useState<Enquiry | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [saleAssigned, setSaleAssigned] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.trim().length < 2) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setSearchLoading(true);
      const res = await fetch("/api/staff/enquiries/members", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, q: query }),
      });
      if (res.ok) setResults(await res.json());
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query, pin]);

  async function confirmLink(memberId: string | null): Promise<boolean> {
    setSaving(true); setSaveError(null);
    try {
      const res = await fetch("/api/staff/enquiries", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, action: "convert", enquiryId: enquiry.id, memberId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSaveError(err.error ?? "Failed to save. Please try again.");
        return false;
      }
      const { enquiry: updated } = await res.json();
      setLinkedEnquiry(updated);
      if (memberId) {
        setPaymentsLoading(true);
        const pr = await fetch(`/api/staff/members/${memberId}/payments`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        });
        if (pr.ok) setPayments(await pr.json());
        setPaymentsLoading(false);
        setStep(2);
      }
      return true;
    } catch {
      setSaveError("Network error. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function assignSale(paymentId: string, soldById: string) {
    const memberId = linkedEnquiry?.member?.id;
    if (!memberId) return;
    const res = await fetch(`/api/staff/members/${memberId}/payments`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, paymentId, soldById }),
    });
    if (res.ok) {
      const updated = await res.json();
      setPayments((prev) => prev.map((p) => p.id === paymentId ? { ...p, ...updated } : p));
      setSaleAssigned(true);
    }
  }

  function finish() {
    if (linkedEnquiry) onDone(linkedEnquiry);
    onClose();
  }

  const stepLabel = step === 1 ? "1 of 2 · Link member" : "2 of 2 · Assign sale";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={step === 1 ? onClose : finish}>
      <div className="w-full max-w-lg rounded-t-3xl overflow-hidden max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#1c1c1c", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-white text-sm">Mark as Joined</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(249,115,22,0.15)", color: "#f97316" }}>
                {stepLabel}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{toTitleCase(enquiry.name)}</p>
          </div>
          <button onClick={finish} className="text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex gap-1 px-5 pt-3 flex-shrink-0">
          {[1, 2].map((s) => (
            <div key={s} className="h-1 flex-1 rounded-full transition-all"
              style={{ background: step >= s ? "#10b981" : "rgba(255,255,255,0.1)" }} />
          ))}
        </div>

        {step === 1 && (
          <>
            <div className="px-5 py-4 space-y-3 flex-1 overflow-y-auto">
              {saveError && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-400"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <X className="h-3.5 w-3.5 flex-shrink-0" /> {saveError}
                </div>
              )}
              <p className="text-xs text-gray-500">Search the member record they created after joining:</p>
              {!selected ? (
                <div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-600 pointer-events-none" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search by name, phone, or member ID…" autoFocus
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                      style={{ background: "#2a2a2a", border: "1px solid rgba(255,255,255,0.1)" }} />
                  </div>
                  {results.length > 0 && (
                    <div className="mt-1 rounded-xl overflow-hidden"
                      style={{ border: "1px solid rgba(255,255,255,0.08)", background: "#2a2a2a" }}>
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
                  {searchLoading && <p className="text-xs text-gray-600 mt-2">Searching…</p>}
                  {!searchLoading && query.length >= 2 && results.length === 0 && (
                    <p className="text-xs text-gray-600 mt-2">No members found</p>
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
            <div className="flex gap-3 px-5 py-4 flex-shrink-0"
              style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <button onClick={async () => { const ok = await confirmLink(null); if (ok) finish(); }} disabled={saving}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold disabled:opacity-50"
                style={{ background: "rgba(255,255,255,0.06)", color: "#9ca3af" }}>
                Skip
              </button>
              <button onClick={() => confirmLink(selected!.id)} disabled={saving || !selected}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
                {saving ? "Saving…" : "Next →"}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="px-5 py-4 flex-1 overflow-y-auto space-y-3">
              <p className="text-xs text-gray-500">Which payment is for this sale? Assign it to the staff who closed it.</p>
              {paymentsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                </div>
              ) : payments.length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-2">
                  <CreditCard className="h-8 w-8 text-gray-700" />
                  <p className="text-xs text-gray-500">No payments found for this member yet</p>
                </div>
              ) : payments.map((p) => {
                const label = p.categoryLabel ?? p.package?.name ?? p.paymentType;
                const net   = Number(p.amount) - Number(p.discount);
                return (
                  <div key={p.id} className="rounded-2xl p-4 space-y-3"
                    style={{ background: "#242424", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-white text-sm">{label}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                            style={{ background: "rgba(255,255,255,0.06)", color: "#6b7280" }}>
                            {p.paymentMode}
                          </span>
                          <span className="text-[10px] text-gray-600">
                            {new Date(p.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                          {p.receiptNumber && <span className="text-[10px] text-gray-600">#{p.receiptNumber}</span>}
                        </div>
                      </div>
                      <p className="font-extrabold text-white flex-shrink-0">₹{net.toLocaleString("en-IN")}</p>
                    </div>
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.75rem" }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Closed by</p>
                      <select value={p.soldById ?? ""}
                        onChange={(e) => assignSale(p.id, e.target.value)}
                        className="w-full text-sm font-semibold rounded-xl px-3 py-2 outline-none"
                        style={{ background: "#2a2a2a", border: `1px solid ${p.soldById ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.1)"}`, color: p.soldById ? "#34d399" : "#6b7280" }}>
                        <option value="">— Unassigned —</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>{toTitleCase(emp.fullName)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-4 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <button onClick={finish}
                className="w-full py-3 rounded-2xl text-sm font-bold"
                style={{ background: saleAssigned ? "linear-gradient(135deg, #10b981, #059669)" : "rgba(255,255,255,0.06)", color: saleAssigned ? "#fff" : "#9ca3af" }}>
                {saleAssigned ? "Done ✓" : "Skip — Done"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// EnquiryModal
// ──────────────────────────────────────────────
function EnquiryModal({ title, initial, employees, defaultAssignedToId, onClose, onSubmit, editOnly }: {
  title: string; initial?: Enquiry; employees: Employee[];
  defaultAssignedToId?: string; onClose: () => void;
  onSubmit: (form: FormData) => Promise<string | null>; editOnly?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setLoading(true);
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
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.75)" }} onClick={onClose}>
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
                  {STATUSES.filter((s) => s !== "CONVERTED").map((s) => (
                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                  ))}
                  {initial?.status === "CONVERTED" && (
                    <option value="CONVERTED" disabled>{STATUS_CONFIG.CONVERTED.label} (use Undo to revert)</option>
                  )}
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
              <textarea name="notes" rows={3} defaultValue={stripTag(initial?.notes ?? null) ?? ""}
                placeholder="Details about the enquiry…" style={{ ...inp, resize: "none" }} />
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

// ──────────────────────────────────────────────
// EnquiriesTab
// ──────────────────────────────────────────────
function EnquiriesTab({ pin }: { pin: string }) {
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
  const [paymentsTarget, setPaymentsTarget] = useState<LinkedMember | null>(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    fetchEnquiries();
  }, []);

  async function fetchEnquiries() {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/enquiries?pin=${pin}`);
      if (!res.ok) return;
      const data = await res.json();
      setEnquiries(data.enquiries ?? []);
      setEmployees(data.employees ?? []);
      setEmpId(data.employee?.id ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    const enq = enquiries.find((e) => e.id === id);
    if (enq?.status === status) return;
    if (status === "CONVERTED") { setConvertTarget(enq!); return; }
    const res = await fetch("/api/staff/enquiries", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, id, status }),
    });
    if (res.ok) {
      const { enquiry } = await res.json();
      setEnquiries((prev) => prev.map((e) => e.id === id ? enquiry : e));
    }
  }

  async function handleCreate(form: FormData): Promise<string | null> {
    const res = await fetch("/api/staff/enquiries", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pin, name: form.get("name"), phone: form.get("phone"),
        interest: form.get("interest"), source: form.get("source"),
        assignedToId: form.get("assignedToId") || undefined,
        followUpDate: form.get("followUpDate"), notes: form.get("notes"),
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
    if (!editing) return null;
    const res = await fetch("/api/staff/enquiries", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pin, id: editing.id, status: form.get("status"),
        notes: form.get("notes"), followUpDate: form.get("followUpDate"),
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
  const preFiltered = enquiries
    .filter((e) => monthFilter === "ALL" || enquiryMonth(e) === monthFilter)
    .filter((e) => staffFilter === "ALL" || e.assignedTo?.id === staffFilter);
  const counts: Record<string, number> = { ALL: preFiltered.length };
  for (const s of STATUSES) counts[s] = preFiltered.filter((e) => e.status === s).length;
  const q = search.toLowerCase();
  const filtered = preFiltered
    .filter((e) => statusFilter === "ALL" || e.status === statusFilter)
    .filter((e) => !q || e.name.toLowerCase().includes(q) || e.phone.includes(q) || (e.interest ?? "").toLowerCase().includes(q));
  const overdueCount = enquiries.filter((e) => {
    if (!e.followUpDate || e.status === "CONVERTED" || e.status === "LOST") return false;
    return daysUntil(e.followUpDate) <= 0;
  }).length;

  return (
    <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
      {/* Add button */}
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
          <Plus className="h-4 w-4" /> Add Enquiry
        </button>
      </div>

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

      <div className="flex gap-2">
        <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}
          className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold outline-none appearance-none"
          style={{ background: "#1c1c1c", color: monthFilter === "ALL" ? "#6b7280" : "#f97316", border: "1px solid rgba(255,255,255,0.06)" }}>
          <option value="ALL">All time</option>
          {monthTree.map(({ year, months }) => (
            <optgroup key={year} label={year}>
              {months.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </optgroup>
          ))}
        </select>
        <select value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)}
          className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold outline-none appearance-none"
          style={{ background: "#1c1c1c", color: staffFilter === "ALL" ? "#6b7280" : "#f97316", border: "1px solid rgba(255,255,255,0.06)" }}>
          <option value="ALL">Everyone</option>
          {employees.map((emp) => <option key={emp.id} value={emp.id}>{toTitleCase(emp.fullName)}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setFilter(e.target.value)}
          className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold outline-none appearance-none"
          style={{ background: "#1c1c1c", color: statusFilter === "ALL" ? "#6b7280" : "#f97316", border: "1px solid rgba(255,255,255,0.06)" }}>
          <option value="ALL">All ({counts.ALL})</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label} ({counts[s] ?? 0})</option>)}
        </select>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone, interest…"
          className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-sm text-white placeholder:text-gray-600 outline-none"
          style={{ background: "#1c1c1c", border: "1px solid rgba(255,255,255,0.06)" }} />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

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
        <div className="space-y-3 pb-6">
          {filtered.map((e) => {
            const followUpDays    = e.followUpDate ? daysUntil(e.followUpDate) : null;
            const followUpOverdue = followUpDays !== null && followUpDays < 0;
            const followUpToday   = followUpDays === 0;
            return (
              <div key={e.id} className="rounded-2xl p-4 space-y-3" style={{ background: "#1c1c1c" }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-white">{toTitleCase(e.name)}</p>
                      {e.member && (
                        <button onClick={(ev) => { ev.stopPropagation(); setPaymentsTarget(e.member!); }}
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
                {e.assignedTo && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <User className="h-3 w-3 text-gray-700 flex-shrink-0" />
                    {toTitleCase(e.assignedTo.fullName)}
                  </div>
                )}
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
                {e.member && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 flex-1 min-w-0">
                      <UserCheck className="h-3 w-3 flex-shrink-0" />
                      Joined as {toTitleCase(e.member.fullName)}
                      {e.convertedAt && <span className="text-gray-600 font-normal">· {formatDate(e.convertedAt)}</span>}
                    </div>
                    <button
                      onClick={async () => {
                        const res = await fetch("/api/staff/enquiries", {
                          method: "PATCH", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ pin, action: "unconvert", enquiryId: e.id }),
                        });
                        if (res.ok) {
                          const { enquiry: updated } = await res.json();
                          setEnquiries((prev) => prev.map((x) => x.id === updated.id ? updated : x));
                        }
                      }}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0"
                      style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>
                      Undo
                    </button>
                  </div>
                )}
                {stripTag(e.notes) && (
                  <p className="text-xs text-gray-500 flex items-start gap-1.5">
                    <StickyNote className="h-3 w-3 flex-shrink-0 mt-0.5 text-gray-700" />
                    {stripTag(e.notes)}
                  </p>
                )}
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

      {showAdd && (
        <EnquiryModal title="New Enquiry" employees={employees}
          defaultAssignedToId={currentEmpId ?? ""} onClose={() => setShowAdd(false)} onSubmit={handleCreate} />
      )}
      {editing && (
        <EnquiryModal title="Edit Enquiry" initial={editing} employees={employees}
          defaultAssignedToId={editing.assignedTo?.id ?? ""} onClose={() => setEditing(null)} onSubmit={handleUpdate} editOnly />
      )}
      {convertTarget && (
        <ConvertModal enquiry={convertTarget} pin={pin} employees={employees}
          onClose={() => setConvertTarget(null)}
          onDone={(updated) => setEnquiries((prev) => prev.map((e) => e.id === updated.id ? updated : e))} />
      )}
      {paymentsTarget && (
        <MemberPaymentsSheet member={paymentsTarget} pin={pin} employees={employees}
          onClose={() => setPaymentsTarget(null)} />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// RenewalsTab
// ──────────────────────────────────────────────
function RenewalsTab({ pin }: { pin: string }) {
  const [loading, setLoading]           = useState(true);
  const [expiringSoon, setExpiringSoon] = useState<MemberSummary[]>([]);
  const [expiredRecently, setExpiredRecently] = useState<MemberSummary[]>([]);
  const [subTab, setSubTab]             = useState<"soon" | "expired">("soon");
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    fetch("/api/staff/ping", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    })
      .then((r) => r.json())
      .then((data) => {
        setExpiringSoon(data.expiringSoon ?? []);
        setExpiredRecently(data.expiredRecently ?? []);
      })
      .finally(() => setLoading(false));
  }, [pin]);

  const list = subTab === "soon" ? expiringSoon : expiredRecently;
  const expired = subTab === "expired";

  return (
    <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
      <div className="flex gap-1 rounded-xl p-1" style={{ background: "#1c1c1c" }}>
        <button onClick={() => setSubTab("soon")}
          className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
          style={subTab === "soon" ? { background: "#f97316", color: "#fff" } : { color: "#6b7280" }}>
          Expiring Soon ({expiringSoon.length})
        </button>
        <button onClick={() => setSubTab("expired")}
          className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
          style={subTab === "expired" ? { background: "#ef4444", color: "#fff" } : { color: "#6b7280" }}>
          Expired ({expiredRecently.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="h-10 w-10 text-gray-700" />
          <p className="text-sm text-gray-500">None right now</p>
        </div>
      ) : (
        <div className="space-y-2 pb-6">
          {list.map((m) => {
            const expDate  = m.expiryDate ? new Date(m.expiryDate) : null;
            const daysLeft = expDate ? Math.round((expDate.getTime() - Date.now()) / 86400000) : null;
            const phone    = m.phone.replace(/\D/g, "").slice(-10);
            const daysColor = expired ? "#f87171" : daysLeft !== null && daysLeft <= 3 ? "#fb923c" : "#facc15";
            const daysLabel = daysLeft === null ? "" : expired ? `${Math.abs(daysLeft)}d ago` : daysLeft === 0 ? "today" : `${daysLeft}d left`;
            return (
              <div key={m.id} className="rounded-2xl px-4 py-3"
                style={{ background: "#1c1c1c", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-white text-sm font-bold truncate">{m.fullName}</p>
                  {daysLabel && (
                    <span className="text-[11px] font-bold flex-shrink-0" style={{ color: daysColor }}>
                      {daysLabel}
                    </span>
                  )}
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: "#6b7280" }}>
                  {m.memberId}
                  {m.packageName && <> · <span style={{ color: "#9ca3af" }}>{m.packageName}</span></>}
                  {expDate && <> · {expDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</>}
                </p>
                <div className="flex items-center justify-between mt-2 gap-2">
                  {phone && (
                    <a href={`tel:${phone}`}
                      className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                      style={{ background: "rgba(255,255,255,0.06)", color: "#9ca3af" }}>
                      <Phone className="h-3 w-3" /> {m.phone}
                    </a>
                  )}
                  {m.soldBy && (
                    <p className="text-[11px] font-semibold flex-shrink-0" style={{ color: "#f97316" }}>
                      {m.soldBy}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// MemberDetailsTab
// ──────────────────────────────────────────────
function MemberDetailsTab({ pin }: { pin: string }) {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<MemberDetail[]>([]);
  const [selected, setSelected] = useState<MemberDetail | null>(null);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(timer.current);
    if (selected) return;
    if (query.trim().length < 2) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setSearching(true);
      const res = await fetch("/api/staff/members", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, q: query }),
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.members ?? []);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer.current);
  }, [query, pin, selected]);

  function clearSelection() {
    setSelected(null);
    setResults([]);
    setQuery("");
  }

  const statusCfg = selected ? (MEMBER_STATUS_CONFIG[selected.status] ?? MEMBER_STATUS_CONFIG.INACTIVE) : null;
  const expiryDate = selected?.expiryDate ? new Date(selected.expiryDate) : null;
  const daysToExpiry = expiryDate ? Math.round((expiryDate.getTime() - Date.now()) / 86400000) : null;
  const isExpired = daysToExpiry !== null && daysToExpiry < 0;

  return (
    <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
          placeholder="Search by name, phone, or member ID…"
          className="w-full pl-9 pr-9 py-2.5 rounded-2xl text-sm text-white placeholder:text-gray-600 outline-none"
          style={{ background: "#1c1c1c", border: "1px solid rgba(255,255,255,0.06)" }}
        />
        {(query || selected) && (
          <button onClick={clearSelection} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!selected && results.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "#1c1c1c" }}>
          {results.map((m) => (
            <button key={m.id} onClick={() => { setSelected(m); setResults([]); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-white/[0.05] border-b last:border-b-0"
              style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(249,115,22,0.12)" }}>
                <span className="text-xs font-bold text-orange-400">
                  {m.fullName.trim().charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{toTitleCase(m.fullName)}</p>
                <p className="text-xs text-gray-500">{m.memberId} · {m.phone}</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: (MEMBER_STATUS_CONFIG[m.status] ?? MEMBER_STATUS_CONFIG.INACTIVE).bg, color: (MEMBER_STATUS_CONFIG[m.status] ?? MEMBER_STATUS_CONFIG.INACTIVE).color }}>
                {(MEMBER_STATUS_CONFIG[m.status] ?? MEMBER_STATUS_CONFIG.INACTIVE).label}
              </span>
            </button>
          ))}
        </div>
      )}

      {!selected && searching && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
        </div>
      )}

      {!selected && !searching && query.length >= 2 && results.length === 0 && (
        <div className="flex flex-col items-center py-12 gap-2">
          <UserCircle className="h-10 w-10 text-gray-700" />
          <p className="text-sm text-gray-500">No members found</p>
        </div>
      )}

      {!selected && query.length < 2 && (
        <div className="flex flex-col items-center py-16 gap-3">
          <Users className="h-12 w-12 text-gray-800" />
          <p className="text-sm text-gray-600">Search to look up a member</p>
        </div>
      )}

      {selected && statusCfg && (
        <div className="rounded-3xl overflow-hidden" style={{ background: "#1c1c1c" }}>
          {/* Name banner */}
          <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xl font-extrabold text-white leading-tight">{toTitleCase(selected.fullName)}</p>
                <p className="text-xs text-gray-500 mt-1">{selected.memberId}</p>
              </div>
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl flex-shrink-0 mt-1"
                style={{ background: statusCfg.bg, color: statusCfg.color }}>
                {statusCfg.label}
              </span>
            </div>
          </div>

          {/* Info rows */}
          <div className="px-5 py-4 space-y-3">
            {/* Phone */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 font-medium">Phone</p>
              <a href={`tel:${selected.phone}`}
                className="flex items-center gap-1.5 text-sm font-semibold text-white active:opacity-70">
                <Phone className="h-3.5 w-3.5 text-gray-500" />
                {selected.phone}
              </a>
            </div>

            {/* Package */}
            {selected.packageName && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 font-medium">Package</p>
                <p className="text-sm font-semibold text-white">{selected.packageName}</p>
              </div>
            )}

            {/* Expiry */}
            {expiryDate && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 font-medium">
                  {isExpired ? "Expired" : "Expires"}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold" style={{ color: isExpired ? "#f87171" : "#f9fafb" }}>
                    {expiryDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  {daysToExpiry !== null && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg"
                      style={{
                        background: isExpired ? "rgba(239,68,68,0.12)" : daysToExpiry <= 7 ? "rgba(251,146,60,0.12)" : "rgba(250,204,21,0.1)",
                        color: isExpired ? "#f87171" : daysToExpiry <= 7 ? "#fb923c" : "#facc15",
                      }}>
                      {isExpired ? `${Math.abs(daysToExpiry)}d ago` : daysToExpiry === 0 ? "today" : `${daysToExpiry}d`}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Start date */}
            {selected.startDate && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 font-medium">Started</p>
                <p className="text-sm font-semibold text-white">{formatDate(selected.startDate)}</p>
              </div>
            )}

            {/* Last payment */}
            {selected.lastPaymentDate && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 font-medium">Last payment</p>
                <p className="text-sm font-semibold text-white">{formatDate(selected.lastPaymentDate)}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────
const TABS = [
  { key: "enquiries" as const, label: "Enquiries",  Icon: ClipboardList },
  { key: "renewals"  as const, label: "Renewals",   Icon: RefreshCw     },
  { key: "member"    as const, label: "Member",     Icon: Users         },
];

export default function StaffMembersPage() {
  const router = useRouter();
  const [pin, setPin]           = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"enquiries" | "renewals" | "member">("enquiries");

  useEffect(() => {
    const stored = sessionStorage.getItem("staff_pin");
    if (!stored) { router.replace("/staff-dashboard"); return; }
    setPin(stored);
  }, [router]);

  if (!pin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
        <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0a0a" }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b sticky top-0 z-10"
        style={{ borderColor: "#1c1c1c", background: "#0a0a0a" }}>
        <button onClick={() => router.push("/staff-dashboard")}
          className="p-2 rounded-xl" style={{ background: "#1c1c1c", color: "#9ca3af" }}>
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Image src="/Logo.png" alt="Yos Fitness" width={26} height={26} className="rounded-lg" />
        <span className="text-white font-bold text-sm">Members</span>
      </div>

      {/* Tab strip */}
      <div className="flex sticky z-10 border-b" style={{ top: "57px", background: "#0a0a0a", borderColor: "#1c1c1c" }}>
        {TABS.map(({ key, label, Icon }) => {
          const active = activeTab === key;
          return (
            <button key={key} onClick={() => setActiveTab(key)}
              className="flex-1 flex flex-col items-center gap-1 py-3 text-[11px] font-bold transition-colors relative"
              style={{ color: active ? "#f97316" : "#6b7280" }}>
              <Icon className="h-4 w-4" />
              {label}
              {active && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full"
                  style={{ background: "#f97316" }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "enquiries" && <EnquiriesTab pin={pin} />}
      {activeTab === "renewals"  && <RenewalsTab  pin={pin} />}
      {activeTab === "member"    && <MemberDetailsTab pin={pin} />}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, Phone, MessageCircle, ChevronDown,
  Calendar, StickyNote, X, UserCircle, Dumbbell,
} from "lucide-react";

type Enquiry = {
  id: string; name: string; phone: string;
  interest: string | null; source: string; status: string;
  assignedTo: { id: string; fullName: string } | null;
  followUpDate: string | null; notes: string | null;
  createdAt: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  NEW:       { label: "New",       color: "#60a5fa", bg: "rgba(59,130,246,0.15)",  dot: "#3b82f6" },
  CONTACTED: { label: "Contacted", color: "#fbbf24", bg: "rgba(245,158,11,0.15)",  dot: "#f59e0b" },
  FOLLOW_UP: { label: "Follow Up", color: "#a78bfa", bg: "rgba(139,92,246,0.15)",  dot: "#8b5cf6" },
  CONVERTED: { label: "Converted", color: "#34d399", bg: "rgba(16,185,129,0.15)",  dot: "#10b981" },
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

export default function StaffEnquiriesPage() {
  const router = useRouter();
  const [pin, setPin]               = useState<string | null>(null);
  const [enquiries, setEnquiries]   = useState<Enquiry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [statusFilter, setFilter]   = useState("ALL");
  const [showAdd, setShowAdd]       = useState(false);
  const [editing, setEditing]       = useState<Enquiry | null>(null);

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
    } catch {
      setError("Failed to load enquiries");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(form: FormData) {
    if (!pin) return;
    const res = await fetch("/api/staff/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pin,
        name:         form.get("name"),
        phone:        form.get("phone"),
        interest:     form.get("interest"),
        source:       form.get("source"),
        followUpDate: form.get("followUpDate"),
        notes:        form.get("notes"),
      }),
    });
    if (res.ok) {
      const { enquiry } = await res.json();
      setEnquiries((prev) => [enquiry, ...prev]);
      setShowAdd(false);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    if (!pin) return;
    const res = await fetch("/api/staff/enquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, id, status }),
    });
    if (res.ok) {
      setEnquiries((prev) => prev.map((e) => e.id === id ? { ...e, status } : e));
    }
  }

  async function handleUpdate(form: FormData) {
    if (!pin || !editing) return;
    const res = await fetch("/api/staff/enquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pin,
        id:           editing.id,
        status:       form.get("status"),
        notes:        form.get("notes"),
        followUpDate: form.get("followUpDate"),
      }),
    });
    if (res.ok) {
      const { enquiry } = await res.json();
      setEnquiries((prev) => prev.map((e) => e.id === enquiry.id ? enquiry : e));
      setEditing(null);
    }
  }

  const filtered = statusFilter === "ALL"
    ? enquiries
    : enquiries.filter((e) => e.status === statusFilter);

  const counts: Record<string, number> = { ALL: enquiries.length };
  for (const s of STATUSES) counts[s] = enquiries.filter((e) => e.status === s).length;

  const overdueCount = enquiries.filter((e) => {
    if (!e.followUpDate || e.status === "CONVERTED" || e.status === "LOST") return false;
    return daysUntil(e.followUpDate) <= 0;
  }).length;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0a0a" }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-4 border-b sticky top-0 z-10" style={{ borderColor: "#1c1c1c", background: "#0a0a0a" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/staff-dashboard")}
            className="p-2 rounded-xl transition-colors" style={{ background: "#1c1c1c", color: "#9ca3af" }}>
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-orange-500 rounded-lg p-1.5">
              <Dumbbell className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-white font-bold text-sm">Enquiries</span>
          </div>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-4">

        {/* Overdue alert */}
        {overdueCount > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
            <Calendar className="h-4 w-4 text-purple-400 flex-shrink-0" />
            <p className="text-sm font-semibold text-purple-300">
              {overdueCount} follow-up{overdueCount > 1 ? "s" : ""} due or overdue
            </p>
            <button onClick={() => setFilter("FOLLOW_UP")}
              className="ml-auto text-xs font-bold text-purple-400">View →</button>
          </div>
        )}

        {/* Status filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[{ key: "ALL", label: `All (${counts.ALL})` }, ...STATUSES.map((s) => ({
            key: s, label: `${STATUS_CONFIG[s].label} (${counts[s] ?? 0})`
          }))].map(({ key, label }) => {
            const cfg = STATUS_CONFIG[key];
            const isActive = statusFilter === key;
            return (
              <button key={key} onClick={() => setFilter(key)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
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

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <UserCircle className="h-12 w-12 text-gray-700" />
            <p className="text-sm text-gray-500">No enquiries here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((e) => {
              const cfg = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.NEW;
              const followUpDays = e.followUpDate ? daysUntil(e.followUpDate) : null;
              const followUpOverdue = followUpDays !== null && followUpDays < 0;
              const followUpToday   = followUpDays === 0;

              return (
                <div key={e.id} className="rounded-2xl p-4 space-y-3" style={{ background: "#1c1c1c" }}>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-white">{toTitleCase(e.name)}</p>
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
                    {/* Status dropdown */}
                    <div className="relative group flex-shrink-0">
                      <button className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-xl"
                        style={{ background: cfg.bg, color: cfg.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
                        {cfg.label}
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      <div className="absolute right-0 top-full mt-1 z-20 rounded-xl overflow-hidden shadow-2xl hidden group-hover:block"
                        style={{ background: "#2a2a2a", border: "1px solid rgba(255,255,255,0.1)", minWidth: "130px" }}>
                        {STATUSES.map((s) => (
                          <button key={s} onClick={() => handleStatusChange(e.id, s)}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-left"
                            style={{ color: STATUS_CONFIG[s].color }}
                            onMouseEnter={(el) => { el.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                            onMouseLeave={(el) => { el.currentTarget.style.background = ""; }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_CONFIG[s].dot }} />
                            {STATUS_CONFIG[s].label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

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
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
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

      {/* Add modal */}
      {showAdd && (
        <EnquiryModal title="New Enquiry" onClose={() => setShowAdd(false)} onSubmit={handleCreate} />
      )}

      {/* Edit modal */}
      {editing && (
        <EnquiryModal title="Edit Enquiry" initial={editing} onClose={() => setEditing(null)} onSubmit={handleUpdate} editOnly />
      )}
    </div>
  );
}

function EnquiryModal({ title, initial, onClose, onSubmit, editOnly }: {
  title: string;
  initial?: Enquiry;
  onClose: () => void;
  onSubmit: (form: FormData) => Promise<void>;
  editOnly?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    await onSubmit(new FormData(e.currentTarget));
    setLoading(false);
  }

  const inp = {
    background: "#2a2a2a", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "0.75rem", padding: "0.625rem 0.875rem",
    color: "#f9fafb", fontSize: "0.875rem", outline: "none", width: "100%",
  };
  const lbl = { color: "#9ca3af", fontSize: "0.7rem", fontWeight: 600 as const, display: "block" as const, marginBottom: "0.3rem" };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}>
      <div className="rounded-t-3xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{ background: "#1c1c1c", border: "1px solid rgba(255,255,255,0.08)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h3 className="font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto">
          <div className="px-5 py-4 space-y-4">
            {!editOnly && (
              <>
                <div>
                  <label style={lbl}>Name *</label>
                  <input name="name" required placeholder="Full name" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Phone *</label>
                  <input name="phone" required placeholder="Mobile number" style={inp} />
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
                style={{ ...inp, resize: "none" as const }} />
            </div>
          </div>
          <div className="flex gap-3 px-5 py-4 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold"
              style={{ background: "rgba(255,255,255,0.06)", color: "#9ca3af" }}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-2 flex-1 py-3 rounded-2xl text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

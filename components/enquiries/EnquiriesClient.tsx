"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Plus, Phone, MessageCircle, Search, X, ChevronDown, UserCircle, Calendar, StickyNote, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toTitleCase } from "@/lib/utils/titleCase";
import { createEnquiry, updateEnquiry, deleteEnquiry } from "@/lib/actions/enquiries";
import type { UserRole } from "@prisma/client";

type Employee = { id: string; fullName: string; role: string };

type Enquiry = {
  id: string; name: string; phone: string;
  interest: string | null; source: string; status: string;
  assignedTo: { id: string; fullName: string } | null;
  createdBy: { id: string; name: string };
  followUpDate: Date | null; notes: string | null;
  createdAt: Date;
};

type Props = {
  enquiries: Enquiry[];
  employees: Employee[];
  userId: string;
  userRole: UserRole;
  userName: string;
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  NEW:        { label: "New",        bg: "rgba(59,130,246,0.12)",  color: "#60a5fa", dot: "#3b82f6" },
  CONTACTED:  { label: "Contacted",  bg: "rgba(245,158,11,0.12)",  color: "#fbbf24", dot: "#f59e0b" },
  FOLLOW_UP:  { label: "Follow Up",  bg: "rgba(139,92,246,0.12)",  color: "#a78bfa", dot: "#8b5cf6" },
  CONVERTED:  { label: "Converted",  bg: "rgba(16,185,129,0.12)",  color: "#34d399", dot: "#10b981" },
  LOST:       { label: "Lost",       bg: "rgba(107,114,128,0.12)", color: "#9ca3af", dot: "#6b7280" },
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

function daysUntil(d: Date) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

export function EnquiriesClient({ enquiries: initial, employees, userId, userRole, userName }: Props) {
  const [enquiries, setEnquiries] = useState<Enquiry[]>(initial);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showAdd, setShowAdd]     = useState(false);
  const [editing, setEditing]     = useState<Enquiry | null>(null);
  const [openStatusId, setOpenStatusId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isAdmin = userRole === "ADMIN";

  const filtered = enquiries.filter((e) => {
    if (statusFilter !== "ALL" && e.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return e.name.toLowerCase().includes(q) || e.phone.includes(q) || e.interest?.toLowerCase().includes(q);
    }
    return true;
  });

  const counts: Record<string, number> = { ALL: enquiries.length };
  for (const s of STATUSES) counts[s] = enquiries.filter((e) => e.status === s).length;

  function refresh() { window.location.reload(); }

  async function handleCreate(form: FormData) {
    await createEnquiry({
      name:         form.get("name") as string,
      phone:        form.get("phone") as string,
      interest:     form.get("interest") as string || undefined,
      source:       form.get("source") as any || "WALK_IN",
      assignedToId: form.get("assignedToId") as string || undefined,
      followUpDate: form.get("followUpDate") as string || undefined,
      notes:        form.get("notes") as string || undefined,
    });
    setShowAdd(false);
    refresh();
  }

  async function handleStatusChange(id: string, status: string) {
    startTransition(async () => {
      await updateEnquiry(id, { status: status as any });
      setEnquiries((prev) => prev.map((e) => e.id === id ? { ...e, status } : e));
    });
  }

  async function handleUpdate(form: FormData) {
    if (!editing) return;
    await updateEnquiry(editing.id, {
      interest:     form.get("interest") as string || null,
      assignedToId: form.get("assignedToId") as string || null,
      followUpDate: form.get("followUpDate") as string || null,
      notes:        form.get("notes") as string || null,
      status:       form.get("status") as any,
    });
    setEditing(null);
    refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this enquiry?")) return;
    await deleteEnquiry(id);
    setEnquiries((prev) => prev.filter((e) => e.id !== id));
  }

  const todayFollowUps = enquiries.filter((e) => {
    if (!e.followUpDate) return false;
    const d = daysUntil(e.followUpDate);
    return d <= 0 && e.status !== "CONVERTED" && e.status !== "LOST";
  }).length;

  return (
    <div className="space-y-5 pb-16">

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[{ key: "ALL", label: "All" }, ...STATUSES.map((s) => ({ key: s, label: STATUS_CONFIG[s].label }))].map(({ key, label }) => {
          const cfg = key === "ALL" ? null : STATUS_CONFIG[key];
          const isActive = statusFilter === key;
          return (
            <button key={key} onClick={() => setStatusFilter(key)}
              className="relative overflow-hidden rounded-2xl p-4 text-left transition-all"
              style={{
                background: isActive ? "rgba(255,255,255,0.06)" : "#161616",
                border: `1px solid ${isActive ? (cfg?.dot ?? "#f97316") + "50" : "rgba(255,255,255,0.06)"}`,
                boxShadow: isActive ? `0 0 0 1px ${(cfg?.dot ?? "#f97316")}40` : "none",
              }}>
              <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl" style={{ background: cfg?.dot ?? "#f97316" }} />
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-1 truncate">{label}</p>
              <p className="text-3xl font-extrabold mt-1.5" style={{ color: cfg?.color ?? "#fb923c" }}>{counts[key] ?? 0}</p>
            </button>
          );
        })}
      </div>

      {/* ── Follow-up alert ── */}
      {todayFollowUps > 0 && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl"
          style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)" }}>
          <Calendar className="h-4 w-4 text-purple-400 flex-shrink-0" />
          <p className="text-sm font-semibold text-purple-300">
            {todayFollowUps} follow-up{todayFollowUps > 1 ? "s" : ""} due today or overdue
          </p>
          <button onClick={() => setStatusFilter("FOLLOW_UP")}
            className="ml-auto text-xs font-bold text-purple-400 hover:text-purple-200 transition-colors">
            View →
          </button>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-600 pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, interest…"
            className="w-full pl-9 pr-8 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:ring-1 focus:ring-white/20"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
          style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
          <Plus className="h-4 w-4" /> Add Enquiry
        </button>
      </div>

      {/* ── List ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <UserCircle className="h-12 w-12 text-gray-700" />
            <p className="text-sm text-gray-500 font-medium">No enquiries found</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filtered.map((e, idx) => {
              const cfg = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.NEW;
              const followUpDays = e.followUpDate ? daysUntil(e.followUpDate) : null;
              const followUpOverdue = followUpDays !== null && followUpDays < 0;
              const followUpToday   = followUpDays === 0;

              return (
                <div key={e.id} className="px-5 py-4 hover:bg-white/[0.02] transition-colors"
                  style={{ background: idx % 2 === 0 ? "#161616" : "#181818" }}>
                  <div className="flex items-start gap-4">

                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 mt-0.5"
                      style={{ background: cfg.bg, color: cfg.color }}>
                      {e.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Row 1 */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">{toTitleCase(e.name)}</span>
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
                      </div>

                      {/* Row 2: assignee + follow-up */}
                      <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-500">
                        {e.assignedTo && (
                          <span className="flex items-center gap-1">
                            <UserCircle className="h-3 w-3" />
                            {toTitleCase(e.assignedTo.fullName)}
                          </span>
                        )}
                        {e.followUpDate && (
                          <span className="flex items-center gap-1 font-semibold"
                            style={{ color: followUpOverdue ? "#f87171" : followUpToday ? "#fb923c" : "#a78bfa" }}>
                            <Calendar className="h-3 w-3" />
                            {followUpOverdue
                              ? `Follow-up ${Math.abs(followUpDays!)}d overdue`
                              : followUpToday
                              ? "Follow up today"
                              : `Follow up ${formatDate(e.followUpDate)}`}
                          </span>
                        )}
                        <span className="text-gray-700">Added {formatDate(e.createdAt)}</span>
                      </div>

                      {/* Notes */}
                      {e.notes && (
                        <p className="mt-1.5 text-xs text-gray-500 flex items-start gap-1">
                          <StickyNote className="h-3 w-3 flex-shrink-0 mt-0.5 text-gray-700" />
                          {e.notes}
                        </p>
                      )}

                      {/* Row 3: actions */}
                      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        <a href={`tel:${e.phone}`}
                          className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg"
                          style={{ background: "rgba(255,255,255,0.06)" }}>
                          <Phone className="h-3 w-3" />{e.phone}
                        </a>
                        <a href={waLink(e.phone)} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg"
                          style={{ background: "rgba(37,211,102,0.12)", color: "#25d366" }}>
                          <MessageCircle className="h-3 w-3" />WhatsApp
                        </a>

                        {/* Status dropdown — click-based */}
                        <StatusDropdown
                          enquiryId={e.id}
                          status={e.status}
                          cfg={cfg}
                          open={openStatusId === e.id}
                          onToggle={() => setOpenStatusId(openStatusId === e.id ? null : e.id)}
                          onClose={() => setOpenStatusId(null)}
                          onChange={(s) => { handleStatusChange(e.id, s); setOpenStatusId(null); }}
                        />

                        <button onClick={() => setEditing(e)}
                          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors text-gray-400 hover:text-white ml-auto"
                          style={{ background: "rgba(255,255,255,0.06)" }}>
                          Edit
                        </button>
                        {isAdmin && (
                          <button onClick={() => handleDelete(e.id)}
                            className="p-1.5 rounded-lg text-gray-700 hover:text-red-400 transition-colors"
                            style={{ background: "rgba(255,255,255,0.04)" }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add dialog ── */}
      {showAdd && (
        <EnquiryDialog
          title="New Enquiry"
          employees={employees}
          onClose={() => setShowAdd(false)}
          onSubmit={handleCreate}
        />
      )}

      {/* ── Edit dialog ── */}
      {editing && (
        <EnquiryDialog
          title="Edit Enquiry"
          employees={employees}
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={handleUpdate}
        />
      )}
    </div>
  );
}

function StatusDropdown({ enquiryId, status, cfg, open, onToggle, onClose, onChange }: {
  enquiryId: string; status: string;
  cfg: { label: string; bg: string; color: string; dot: string };
  open: boolean; onToggle: () => void; onClose: () => void;
  onChange: (s: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors"
        style={{ background: cfg.bg, color: cfg.color }}>
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
        {cfg.label}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 rounded-xl overflow-hidden shadow-2xl"
          style={{ background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.1)", minWidth: "140px" }}>
          {STATUSES.map((s) => (
            <button key={s}
              onClick={(e) => { e.stopPropagation(); onChange(s); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-left hover:bg-white/[0.06] transition-colors"
              style={{ color: STATUS_CONFIG[s].color, background: s === status ? "rgba(255,255,255,0.04)" : undefined }}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: STATUS_CONFIG[s].dot }} />
              {STATUS_CONFIG[s].label}
              {s === status && <span className="ml-auto text-[10px] opacity-60">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EnquiryDialog({ title, employees, initial, onClose, onSubmit }: {
  title: string;
  employees: Employee[];
  initial?: Enquiry;
  onClose: () => void;
  onSubmit: (form: FormData) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    await onSubmit(new FormData(e.currentTarget));
    setLoading(false);
  }

  const inputStyle = {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "0.75rem", padding: "0.625rem 0.875rem",
    color: "#f9fafb", fontSize: "0.875rem", outline: "none", width: "100%",
  };

  const labelStyle = { color: "#9ca3af", fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.375rem", display: "block" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}
        style={{ background: "#1c1c1c", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h3 className="font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label style={labelStyle}>Name *</label>
                <input name="name" required defaultValue={initial?.name ? toTitleCase(initial.name) : ""}
                  placeholder="Full name" style={inputStyle} />
              </div>
              <div className="col-span-2">
                <label style={labelStyle}>Phone *</label>
                <input name="phone" required defaultValue={initial?.phone ?? ""} placeholder="10-digit mobile" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Interest</label>
                <input name="interest" defaultValue={initial?.interest ?? ""} placeholder="e.g. General Fitness" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Source</label>
                <select name="source" defaultValue={initial?.source ?? "WALK_IN"} style={inputStyle}>
                  {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
                </select>
              </div>
              {initial && (
                <div>
                  <label style={labelStyle}>Status</label>
                  <select name="status" defaultValue={initial.status} style={inputStyle}>
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                  </select>
                </div>
              )}
              <div className={initial ? "" : "col-span-2"}>
                <label style={labelStyle}>Assign to</label>
                <select name="assignedToId" defaultValue={initial?.assignedTo?.id ?? ""} style={inputStyle}>
                  <option value="">Unassigned</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{toTitleCase(emp.fullName)}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label style={labelStyle}>Follow-up Date</label>
                <input type="date" name="followUpDate"
                  defaultValue={initial?.followUpDate ? new Date(initial.followUpDate).toISOString().split("T")[0] : ""}
                  style={inputStyle} />
              </div>
              <div className="col-span-2">
                <label style={labelStyle}>Notes</label>
                <textarea name="notes" rows={3} defaultValue={initial?.notes ?? ""}
                  placeholder="Any details about the enquiry…"
                  style={{ ...inputStyle, resize: "none" }} />
              </div>
            </div>
          </div>
          <div className="flex gap-3 px-6 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.06)" }}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

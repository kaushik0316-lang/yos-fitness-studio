"use client";

import { useState, useMemo } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { Send, CheckSquare, Square, Users, AlertCircle, CheckCircle2, XCircle, Search, X, MessageSquare, Clock, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { toTitleCase } from "@/lib/utils/titleCase";
import { toast } from "@/hooks/use-toast";
import { WaSentSummary } from "@/components/whatsapp/WaSentSummary";

type Member = {
  id: string; memberId: string; fullName: string;
  phone: string | null; whatsapp: string | null;
  expiryDate: string | null; lastAttendanceDate: string | null;
  doNotDisturb: boolean; trainerName: string | null; packageName: string | null;
};

const DEFAULT_TEMPLATE =
  `Hi {name}!\n\nWe miss you at Yos Fitness Studio — come in this week!\n\nIf you've been coming, please remember to scan IN when you arrive and OUT when you leave at our kiosk. This helps us track your sessions properly.\n\nSee you soon! — Yos Fitness Studio`;

type ResultRow = { memberId: string; name: string; status: "sent" | "failed" | "skipped"; error?: string };
type LogEntry = { id: string; memberId: string | null; memberName: string; sentByName: string | null; sentAt: string | null; createdAt: string };

function interpolatePreview(tpl: string, member: Member | null): string {
  if (!member) return tpl;
  return tpl
    .replace(/\{name\}/g, toTitleCase(member.fullName))
    .replace(/\{expiry\}/g, member.expiryDate ? format(new Date(member.expiryDate), "dd MMM yyyy") : "—")
    .replace(/\{expiry_date\}/g, member.expiryDate ? format(new Date(member.expiryDate), "dd MMM yyyy") : "—")
    .replace(/\{trainer\}/g, member.trainerName ? toTitleCase(member.trainerName) : "your trainer");
}

function Avatar({ name }: { name: string }) {
  const initials = name.trim().split(/\s+/).map(w => w[0] ?? "").slice(0, 2).join("").toUpperCase();
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-[11px] font-black"
      style={{ background: "rgba(249,115,22,0.12)", color: "#fb923c", border: "1px solid rgba(249,115,22,0.2)" }}>
      {initials}
    </div>
  );
}

function MemberRow({ m, checked, onToggle, lastOutreach }: {
  m: Member; checked: boolean; onToggle: () => void;
  lastOutreach?: { lastAt: string | null; count: number };
}) {
  const lastSeen = m.lastAttendanceDate
    ? formatDistanceToNow(new Date(m.lastAttendanceDate), { addSuffix: true })
    : "Never";
  const expiry = m.expiryDate ? format(new Date(m.expiryDate), "dd MMM yy") : "—";
  const hasPhone = !!(m.whatsapp ?? m.phone);
  const disabled = m.doNotDisturb || !hasPhone;
  const outreachDateStr = lastOutreach?.lastAt
    ? new Date(lastOutreach.lastAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : null;

  return (
    <div
      onClick={() => !disabled && onToggle()}
      className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all select-none",
        disabled ? "opacity-35 cursor-not-allowed" : "cursor-pointer",
        checked ? "bg-orange-500/[0.08]" : !disabled && "hover:bg-white/[0.03]"
      )}
      style={{ border: `1px solid ${checked ? "rgba(249,115,22,0.25)" : "transparent"}` }}
    >
      {/* Checkbox */}
      <div className="flex-shrink-0">
        {checked
          ? <CheckSquare className="h-4 w-4 text-orange-400" />
          : <Square className="h-4 w-4 text-gray-700" />}
      </div>

      {/* Avatar */}
      <Avatar name={m.fullName} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-bold text-white leading-tight">{toTitleCase(m.fullName)}</span>
          <span className="text-[9px] font-mono text-gray-700">{m.memberId}</span>
          {m.doNotDisturb && (
            <span className="text-[9px] px-1 py-0.5 rounded font-bold" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>DND</span>
          )}
          {!hasPhone && (
            <span className="text-[9px] px-1 py-0.5 rounded font-bold" style={{ background: "rgba(255,255,255,0.05)", color: "#4b5563" }}>No phone</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[10px] text-gray-600">{m.packageName ?? "—"} · exp {expiry}</span>
          {outreachDateStr && (
            <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-bold"
              style={{ background: "rgba(251,146,60,0.1)", color: "#fb923c", border: "1px solid rgba(251,146,60,0.15)" }}>
              ✓ {outreachDateStr}{lastOutreach!.count > 1 ? ` ×${lastOutreach!.count}` : ""}
            </span>
          )}
        </div>
      </div>

      {/* Last seen */}
      <div className="flex-shrink-0 text-right">
        <div className="flex items-center gap-1 text-[10px]" style={{ color: "#4b5563" }}>
          <Clock className="h-2.5 w-2.5" />
          <span>{lastSeen}</span>
        </div>
      </div>
    </div>
  );
}

export function OutreachClient({ members, logs = [], onRefresh }: { members: Member[]; logs?: LogEntry[]; onRefresh?: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState(DEFAULT_TEMPLATE);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [q, setQ] = useState("");
  const [showComposer, setShowComposer] = useState(false);

  const outreachMap = useMemo(() =>
    logs.reduce<Record<string, { count: number; lastAt: string | null }>>((acc, log) => {
      if (!log.memberId) return acc;
      const at = log.sentAt ?? log.createdAt;
      if (!acc[log.memberId]) { acc[log.memberId] = { count: 1, lastAt: at }; }
      else { acc[log.memberId].count++; if (at && (!acc[log.memberId].lastAt || at > acc[log.memberId].lastAt!)) acc[log.memberId].lastAt = at; }
      return acc;
    }, {}),
  [logs]);

  const filtered = useMemo(() => {
    if (!q.trim()) return members;
    const lq = q.toLowerCase();
    return members.filter(m =>
      m.fullName.toLowerCase().includes(lq) ||
      m.memberId.toLowerCase().includes(lq) ||
      (m.phone ?? "").includes(lq)
    );
  }, [members, q]);

  const eligible = filtered.filter(m => !m.doNotDisturb && !!(m.whatsapp ?? m.phone));
  const allEligible = members.filter(m => !m.doNotDisturb && !!(m.whatsapp ?? m.phone));
  const allSelected = eligible.length > 0 && eligible.every(m => selected.has(m.id));
  const contactedCount = Object.keys(outreachMap).length;

  function toggleAll() {
    if (allSelected) {
      setSelected(prev => { const n = new Set(prev); eligible.forEach(m => n.delete(m.id)); return n; });
    } else {
      setSelected(prev => { const n = new Set(prev); eligible.forEach(m => n.add(m.id)); return n; });
    }
  }

  function toggle(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const preview = useMemo(() => {
    const first = members.find(m => selected.has(m.id)) ?? members[0] ?? null;
    return interpolatePreview(message, first);
  }, [message, selected, members]);

  async function send() {
    const ids = members.filter(m => selected.has(m.id)).map(m => m.id);
    if (!ids.length || !message.trim()) return;
    setSending(true); setResults(null);
    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: ids, message }),
      });
      const data = await res.json();
      setResults(data.results);
      setSelected(new Set());
      setShowComposer(false);
      toast({ title: `✓ Sent to ${data.sent} member${data.sent !== 1 ? "s" : ""}${data.failed ? ` · ${data.failed} failed` : ""}` });
      onRefresh?.();
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally { setSending(false); }
  }

  return (
    <>
      <WaSentSummary logs={logs} waType="OUTREACH" />

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-2xl px-4 py-3" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-[10px] text-gray-600 uppercase tracking-wider font-bold mb-1">Inactive Members</p>
          <p className="text-2xl font-black text-white">{members.length}</p>
          <p className="text-[10px] text-gray-700 mt-0.5">30+ days away</p>
        </div>
        <div className="rounded-2xl px-4 py-3" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-[10px] text-gray-600 uppercase tracking-wider font-bold mb-1">Reachable</p>
          <p className="text-2xl font-black" style={{ color: "#fb923c" }}>{allEligible.length}</p>
          <p className="text-[10px] text-gray-700 mt-0.5">with phone · no DND</p>
        </div>
        <div className="rounded-2xl px-4 py-3" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-[10px] text-gray-600 uppercase tracking-wider font-bold mb-1">Contacted</p>
          <p className="text-2xl font-black" style={{ color: "#22c55e" }}>{contactedCount}</p>
          <p className="text-[10px] text-gray-700 mt-0.5">last 30 days</p>
        </div>
      </div>

      {/* Search + select all */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <Search className="h-3.5 w-3.5 text-gray-600 flex-shrink-0" />
          <input
            type="text" placeholder="Search by name, ID or phone…" value={q} onChange={e => setQ(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-700 outline-none"
          />
          {q && <button onClick={() => setQ("")}><X className="h-3.5 w-3.5 text-gray-600 hover:text-gray-400" /></button>}
        </div>
        <button
          onClick={toggleAll}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
          style={{ background: allSelected ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.05)", color: allSelected ? "#f97316" : "#6b7280", border: `1px solid ${allSelected ? "rgba(249,115,22,0.2)" : "transparent"}` }}
        >
          {allSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
          All ({eligible.length})
        </button>
      </div>

      {/* Member list */}
      <div className="flex flex-col gap-0.5 overflow-y-auto rounded-2xl" style={{ maxHeight: "52vh" }}>
        {filtered.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.05)" }}>
            <Users className="h-8 w-8 text-gray-800 mx-auto mb-3" />
            <p className="text-gray-600 text-sm font-medium">{q ? "No members match your search" : "All members are active!"}</p>
          </div>
        ) : (
          filtered.map(m => (
            <MemberRow key={m.id} m={m} checked={selected.has(m.id)} onToggle={() => toggle(m.id)} lastOutreach={outreachMap[m.id]} />
          ))
        )}
      </div>

      {/* Send results */}
      {results && (
        <div className="mt-4 rounded-2xl p-4" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-xs font-bold text-gray-400 mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Send results
          </p>
          <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
            {results.map(r => (
              <div key={r.memberId} className="flex items-center gap-1.5 text-[11px]">
                {r.status === "sent" ? <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                  : r.status === "failed" ? <XCircle className="h-3 w-3 text-red-400 flex-shrink-0" />
                  : <AlertCircle className="h-3 w-3 text-gray-600 flex-shrink-0" />}
                <span className={cn("truncate", r.status === "sent" ? "text-gray-300" : r.status === "failed" ? "text-red-400" : "text-gray-600")}>
                  {r.name}{r.error && <span className="text-gray-600"> · {r.error}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating action bar */}
      {selected.size > 0 && !showComposer && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 rounded-2xl"
          style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 12px 40px rgba(0,0,0,0.6)" }}>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white" style={{ background: "#f97316" }}>
              {selected.size}
            </div>
            <span className="text-sm font-bold text-white">selected</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <button onClick={() => setSelected(new Set(allEligible.map(m => m.id)))}
            className="text-xs font-bold text-gray-500 hover:text-white transition-colors">
            Select all ({allEligible.length})
          </button>
          <button onClick={() => setSelected(new Set())}
            className="text-xs font-bold text-gray-500 hover:text-white transition-colors flex items-center gap-1">
            <X className="h-3 w-3" /> Clear
          </button>
          <div className="w-px h-4 bg-white/10" />
          <button
            onClick={() => setShowComposer(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg,#25d366,#128c7e)" }}>
            <MessageSquare className="h-3.5 w-3.5" />
            Compose & Send
          </button>
        </div>
      )}

      {/* Message composer modal */}
      {showComposer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-lg rounded-3xl flex flex-col gap-0 overflow-hidden"
            style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.08)", maxHeight: "90vh" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <p className="text-sm font-black text-white">Send Outreach Message</p>
                <p className="text-[11px] text-gray-600 mt-0.5">Sending to {selected.size} member{selected.size !== 1 ? "s" : ""}</p>
              </div>
              <button onClick={() => setShowComposer(false)} className="w-7 h-7 rounded-full flex items-center justify-center text-gray-600 hover:text-white hover:bg-white/10 transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4 p-5 overflow-y-auto">
              {/* Message editor */}
              <div className="rounded-2xl overflow-hidden" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Message</p>
                  <span className="text-[10px] text-gray-700">Use <code className="text-orange-600">{"{name}"}</code></span>
                </div>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={8}
                  className="w-full bg-transparent text-sm text-white resize-none outline-none leading-relaxed px-4 py-3"
                  style={{ caretColor: "#f97316" }}
                  placeholder="Type your message…"
                />
              </div>

              {/* Preview */}
              <div className="rounded-2xl p-4" style={{ background: "rgba(37,211,102,0.04)", border: "1px solid rgba(37,211,102,0.1)" }}>
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2">
                  Preview — {toTitleCase(members.find(m => selected.has(m.id))?.fullName ?? members[0]?.fullName ?? "Member")}
                </p>
                <p className="text-[12px] text-gray-300 leading-relaxed whitespace-pre-wrap">{preview}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 pt-2 flex gap-3">
              <button
                onClick={() => setShowComposer(false)}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-500 hover:text-white transition-colors"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                Cancel
              </button>
              <button
                onClick={send}
                disabled={!message.trim() || sending}
                className="flex-2 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
                style={{ background: "linear-gradient(135deg,#25d366,#128c7e)", flex: 2 }}>
                {sending
                  ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Sending…</>
                  : <><Send className="h-4 w-4" /> Send to {selected.size}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

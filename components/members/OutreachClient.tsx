"use client";

import { useState, useMemo } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { Send, CheckSquare, Square, Users, AlertCircle, CheckCircle2, XCircle, Search, X, MessageCircle } from "lucide-react";
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

function BulkWaPanel({ members, selected, message, onClose, onLogged }: {
  members: Member[]; selected: Set<string>; message: string; onClose: () => void; onLogged?: () => void;
}) {
  const [rowState, setRowState] = useState<Record<string, "idle" | "opened" | "sent">>({});
  const selectedList = members.filter(m => selected.has(m.id));
  const sentCount = Object.values(rowState).filter(s => s === "sent").length;

  async function markSent(memberId: string, personalisedMsg: string) {
    setRowState(r => ({ ...r, [memberId]: "sent" }));
    try {
      await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: [memberId], message: personalisedMsg, manualOnly: true }),
      });
      onLogged?.();
    } catch { /* silent — state already updated */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "80vh" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <p className="font-bold text-white">Bulk WhatsApp</p>
            <p className="text-xs text-gray-500 mt-0.5">{selectedList.length} members · {sentCount} opened</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: "calc(80vh - 80px)" }}>
          {selectedList.map(m => {
            const rawPhone = m.whatsapp ?? m.phone ?? "";
            const phone = rawPhone.replace(/\D/g, "").slice(-10);
            const personalised = message.replace(/\{name\}/g, toTitleCase(m.fullName));
            const state = rowState[m.id] ?? "idle";
            return (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{toTitleCase(m.fullName)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{m.phone ?? "—"}</p>
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
                    <a href={`https://wa.me/91${phone}?text=${encodeURIComponent(personalised)}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={() => setRowState(r => ({ ...r, [m.id]: "opened" }))}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                      style={{ background: "rgba(37,211,102,0.12)", color: "#25d366", border: "1px solid rgba(37,211,102,0.2)" }}>
                      <MessageCircle className="h-3.5 w-3.5" />
                      {state === "opened" ? "Re-open" : "Open Chat"}
                    </a>
                    {state === "opened" && (
                      <button onClick={() => markSent(m.id, personalised)}
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

function interpolatePreview(tpl: string, member: Member | null): string {
  if (!member) return tpl;
  return tpl
    .replace(/\{name\}/g, toTitleCase(member.fullName))
    .replace(/\{expiry\}/g, member.expiryDate ? format(new Date(member.expiryDate), "dd MMM yyyy") : "—")
    .replace(/\{expiry_date\}/g, member.expiryDate ? format(new Date(member.expiryDate), "dd MMM yyyy") : "—")
    .replace(/\{trainer\}/g, member.trainerName ? toTitleCase(member.trainerName) : "your trainer");
}

function MemberRow({ m, checked, onToggle }: { m: Member; checked: boolean; onToggle: () => void }) {
  const lastSeen = m.lastAttendanceDate
    ? formatDistanceToNow(new Date(m.lastAttendanceDate), { addSuffix: true })
    : "Never";
  const expiry = m.expiryDate ? format(new Date(m.expiryDate), "dd MMM yy") : "—";
  const hasPhone = !!(m.whatsapp ?? m.phone);

  return (
    <div
      onClick={() => !m.doNotDisturb && hasPhone && onToggle()}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
        m.doNotDisturb || !hasPhone
          ? "opacity-40 cursor-not-allowed"
          : checked
          ? "cursor-pointer"
          : "cursor-pointer hover:bg-white/[0.02]",
        checked && "bg-orange-500/8"
      )}
      style={{ border: checked ? "1px solid rgba(249,115,22,0.2)" : "1px solid transparent" }}
    >
      <div className="flex-shrink-0 text-gray-600">
        {checked ? <CheckSquare className="h-4 w-4 text-orange-400" /> : <Square className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-white truncate">{toTitleCase(m.fullName)}</p>
          <span className="text-[9px] font-mono text-gray-700">{m.memberId}</span>
          {m.doNotDisturb && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>DND</span>}
          {!hasPhone && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: "rgba(255,255,255,0.05)", color: "#6b7280" }}>No phone</span>}
        </div>
        <p className="text-[11px] text-gray-600 truncate">
          {m.packageName ?? "—"} · exp {expiry}
          {m.trainerName && <> · {toTitleCase(m.trainerName)}</>}
        </p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-[11px] font-medium" style={{ color: m.lastAttendanceDate ? "#9ca3af" : "#6b7280" }}>
          {lastSeen}
        </p>
      </div>
    </div>
  );
}

type LogEntry = { id: string; memberId: string | null; memberName: string; sentByName: string | null; sentAt: string | null; createdAt: string };

export function OutreachClient({ members, logs = [], onRefresh }: { members: Member[]; logs?: LogEntry[]; onRefresh?: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState(DEFAULT_TEMPLATE);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [q, setQ] = useState("");
  const [showBulkPanel, setShowBulkPanel] = useState(false);

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
  const allSelected = eligible.length > 0 && eligible.every(m => selected.has(m.id));

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
      toast({ title: `Sent ${data.sent} · Failed ${data.failed}` });
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally { setSending(false); }
  }

  return (
    <>
    <WaSentSummary logs={logs} waType="OUTREACH" />
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 h-full">
      {/* LEFT — member list */}
      <div className="flex flex-col gap-4 min-h-0">
        <p className="text-[11px] text-gray-600">
          Active members who haven't checked in for 30+ days — sorted by last check-in (least recent first).
        </p>

        {/* Search + select all */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Search className="h-3.5 w-3.5 text-gray-600 flex-shrink-0" />
            <input
              type="text" placeholder="Search members…" value={q} onChange={e => setQ(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-700 outline-none"
            />
          </div>
          <button
            onClick={toggleAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: "rgba(255,255,255,0.06)", color: allSelected ? "#f97316" : "#6b7280" }}
          >
            {allSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
            All ({eligible.length})
          </button>
        </div>

        {/* Member list */}
        <div className="flex-1 overflow-y-auto rounded-2xl flex flex-col gap-1 pr-1" style={{ maxHeight: "60vh" }}>
          {filtered.length === 0 ? (
            <div className="rounded-2xl p-10 text-center" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Users className="h-8 w-8 text-gray-700 mx-auto mb-2" />
              <p className="text-gray-600 text-sm">{q ? "No matches" : "No active members"}</p>
            </div>
          ) : (
            filtered.map(m => (
              <MemberRow key={m.id} m={m} checked={selected.has(m.id)} onToggle={() => toggle(m.id)} />
            ))
          )}
        </div>

        {/* Send result */}
        {results && (
          <div className="rounded-2xl p-4 space-y-2" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Send results
            </p>
            <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
              {results.map(r => (
                <div key={r.memberId} className="flex items-center gap-1.5 text-[11px]">
                  {r.status === "sent"
                    ? <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                    : r.status === "failed"
                    ? <XCircle className="h-3 w-3 text-red-400 flex-shrink-0" />
                    : <AlertCircle className="h-3 w-3 text-gray-600 flex-shrink-0" />}
                  <span className={cn("truncate", r.status === "sent" ? "text-gray-300" : r.status === "failed" ? "text-red-400" : "text-gray-600")}>
                    {r.name}
                    {r.error && <span className="text-gray-600"> · {r.error}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT — message editor + preview */}
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Message</p>
            <span className="text-[10px] text-gray-700">Use {"{name}"}</span>
          </div>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={10}
            className="w-full bg-transparent text-sm text-white resize-none outline-none leading-relaxed"
            style={{ caretColor: "#f97316" }}
            placeholder="Type your message…"
          />
        </div>

        {/* Preview */}
        <div className="rounded-2xl p-4" style={{ background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.12)" }}>
          <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-2">
            Preview — {toTitleCase(members.find(m => selected.has(m.id))?.fullName ?? members[0]?.fullName ?? "member")}
          </p>
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{preview}</p>
        </div>

        {/* Send button */}
        <button
          onClick={send}
          disabled={!selected.size || !message.trim() || sending}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: selected.size ? "linear-gradient(135deg,#f97316,#ea580c)" : "rgba(255,255,255,0.06)" }}
        >
          {sending ? (
            <span className="text-sm">Sending…</span>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span className="text-sm">
                {selected.size > 0 ? `Send to ${selected.size} member${selected.size > 1 ? "s" : ""}` : "Select members to send"}
              </span>
            </>
          )}
        </button>

        <p className="text-[10px] text-gray-700 text-center">
          Members marked DND or without a phone number are excluded. All messages are logged.
        </p>
      </div>
    </div>

    {/* Floating bar — shown when members are selected */}
    {selected.size > 0 && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl"
        style={{ background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
        <span className="text-sm font-bold text-white">{selected.size} selected</span>
        <div className="w-px h-5 bg-white/10" />
        <button onClick={() => { const e = eligible; setSelected(new Set(e.map(m => m.id))); }}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors">
          <CheckSquare className="h-3.5 w-3.5" />
          Select all ({eligible.length})
        </button>
        <button onClick={() => setSelected(new Set())}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors">
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
        <div className="w-px h-5 bg-white/10" />
        <button onClick={() => setShowBulkPanel(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all"
          style={{ background: "linear-gradient(135deg,#25d366,#128c7e)" }}>
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Bulk WhatsApp ({selected.size})
        </button>
      </div>
    )}

    {showBulkPanel && (
      <BulkWaPanel
        members={members}
        selected={selected}
        message={message}
        onClose={() => setShowBulkPanel(false)}
        onLogged={onRefresh}
      />
    )}
    </>
  );
}

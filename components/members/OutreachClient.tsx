"use client";

import { useState, useMemo } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { Send, CheckSquare, Square, Users, AlertCircle, CheckCircle2, XCircle, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { toTitleCase } from "@/lib/utils/titleCase";
import { toast } from "@/hooks/use-toast";

type Member = {
  id: string; memberId: string; fullName: string;
  phone: string | null; whatsapp: string | null;
  expiryDate: string | null; lastAttendanceDate: string | null;
  doNotDisturb: boolean; trainerName: string | null; packageName: string | null;
};

const DEFAULT_TEMPLATE =
  `Hi {name}! 👋\n\nWe miss you at Yos Fitness Studio — come in this week! 💪\n\nAlso a quick reminder: please remember to scan IN when you arrive and OUT when you leave at our kiosk. This helps us track your sessions properly.\n\nSee you soon! 🙏 — Yos Fitness Studio`;

type ResultRow = { memberId: string; name: string; status: "sent" | "failed" | "skipped"; error?: string };

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

export function OutreachClient({ members }: { members: Member[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState(DEFAULT_TEMPLATE);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [q, setQ] = useState("");

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
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 h-full">
      {/* LEFT — member list */}
      <div className="flex flex-col gap-4 min-h-0">
        <p className="text-[11px] text-gray-600">
          Active members with a package. Select who to message — sorted by last check-in (least recent first).
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
  );
}

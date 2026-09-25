"use client";

import { useState, useMemo } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { CheckSquare, Square, Users, CheckCircle2, Search, X, MessageCircle, Clock, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { toTitleCase } from "@/lib/utils/titleCase";
import { WaConfirmButton } from "@/components/whatsapp/WaConfirmButton";
import { waBusinessLink } from "@/lib/utils/waBusinessLink";
import { WaSentSummary } from "@/components/whatsapp/WaSentSummary";

type Member = {
  id: string; memberId: string; fullName: string;
  phone: string | null; whatsapp: string | null;
  expiryDate: string | null; lastAttendanceDate: string | null;
  doNotDisturb: boolean; trainerName: string | null; packageName: string | null;
};

type LogEntry = { id: string; memberId: string | null; memberName: string; sentByName: string | null; sentAt: string | null; createdAt: string };

const DEFAULT_TEMPLATE =
  `Hi {name}!\n\nWe miss you at Yos Fitness Studio — come in this week!\n\nIf you've been coming, please remember to scan IN when you arrive and OUT when you leave at our kiosk. This helps us track your sessions properly.\n\nSee you soon! — Yos Fitness Studio`;

function interpolateMessage(tpl: string, member: Member): string {
  return tpl
    .replace(/\{name\}/g, toTitleCase(member.fullName).split(" ")[0])
    .replace(/\{expiry\}/g, member.expiryDate ? format(new Date(member.expiryDate), "dd MMM yyyy") : "—")
    .replace(/\{trainer\}/g, member.trainerName ? toTitleCase(member.trainerName) : "your trainer");
}

function getInitials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0] ?? "").slice(0, 2).join("").toUpperCase();
}

// ── Bulk WA Panel ──────────────────────────────────────────────────────────────
function BulkWaPanel({ members, selected, onClose }: {
  members: Member[]; selected: Set<string>; onClose: () => void;
}) {
  const [rowState, setRowState] = useState<Record<string, "idle" | "opened" | "sent">>({});
  const selectedList = members.filter(m => selected.has(m.id));
  const sentCount = Object.values(rowState).filter(s => s === "sent").length;

  async function markSent(m: Member, msg: string) {
    setRowState(r => ({ ...r, [m.id]: "sent" }));
    try {
      const { logManualWA } = await import("@/lib/actions/whatsapp");
      await logManualWA(m.id, "OUTREACH", msg);
    } catch { /* silent */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "80vh" }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <p className="font-bold text-white">Bulk WhatsApp Business</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {selectedList.length} members · {sentCount} logged as sent
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
        {/* Member rows */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(80vh - 80px)" }}>
          {selectedList.map(m => {
            const phone = (m.whatsapp ?? m.phone ?? "").replace(/\D/g, "").slice(-10);
            const msg = interpolateMessage(DEFAULT_TEMPLATE, m);
            const expStr = m.expiryDate
              ? new Date(m.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
              : "—";
            const state = rowState[m.id] ?? "idle";

            return (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{toTitleCase(m.fullName)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{m.phone} · exp {expStr}</p>
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
                    <a href={waBusinessLink(phone, msg)}
                      target="_blank" rel="noopener noreferrer"
                      onClick={() => setRowState(r => ({ ...r, [m.id]: "opened" }))}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                      style={{ background: "rgba(37,211,102,0.12)", color: "#25d366", border: "1px solid rgba(37,211,102,0.2)" }}>
                      <MessageCircle className="h-3.5 w-3.5" />
                      {state === "opened" ? "Re-open" : "Open Chat"}
                    </a>
                    {state === "opened" && (
                      <button
                        onClick={() => markSent(m, msg)}
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

// ── Main Component ─────────────────────────────────────────────────────────────
export function OutreachClient({ members, logs = [] }: { members: Member[]; logs?: LogEntry[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [showBulkPanel, setShowBulkPanel] = useState(false);

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

  function toggle(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function selectAll() { setSelected(new Set(allEligible.map(m => m.id))); }
  function clearSelection() { setSelected(new Set()); }

  return (
    <div className="space-y-5 pb-28">
      <WaSentSummary logs={logs} waType="OUTREACH" />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
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

      {/* List panel */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
        {/* Search + select-all header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-600 pointer-events-none" />
            <input
              type="text" value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search name, ID or phone…"
              className="w-full pl-8 pr-8 py-2 rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:ring-1 focus:ring-white/20"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => { if (allSelected) { setSelected(prev => { const n = new Set(prev); eligible.forEach(m => n.delete(m.id)); return n; }); } else { setSelected(prev => { const n = new Set(prev); eligible.forEach(m => n.add(m.id)); return n; }); } }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
            style={{ background: allSelected ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.05)", color: allSelected ? "#f97316" : "#6b7280", border: `1px solid ${allSelected ? "rgba(249,115,22,0.2)" : "transparent"}` }}>
            {allSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
            All ({eligible.length})

          </button>
        </div>

        {/* Member rows */}
        <div className="divide-y divide-white/[0.04]">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Users className="h-10 w-10 text-gray-700" />
              <p className="text-sm text-gray-500 font-medium">{q ? "No members match your search" : "All members are active!"}</p>
            </div>
          ) : (
            filtered.map((m, idx) => {
              const hasPhone = !!(m.whatsapp ?? m.phone);
              const disabled = m.doNotDisturb || !hasPhone;
              const isSelected = selected.has(m.id);
              const waNumber = (m.whatsapp ?? m.phone) ?? "";
              const msg = interpolateMessage(DEFAULT_TEMPLATE, m);
              const lastSeen = m.lastAttendanceDate
                ? formatDistanceToNow(new Date(m.lastAttendanceDate), { addSuffix: true })
                : "Never";
              const expiry = m.expiryDate ? format(new Date(m.expiryDate), "dd MMM yy") : "—";
              const sent = outreachMap[m.id];
              const sentDateStr = sent?.lastAt
                ? new Date(sent.lastAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                : "";

              return (
                <div key={m.id}
                  onClick={() => !disabled && toggle(m.id)}
                  className={cn("px-5 py-4 transition-colors", disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-white/[0.02]")}
                  style={{ background: isSelected ? "rgba(59,130,246,0.06)" : idx % 2 === 0 ? "#161616" : "#181818" }}>

                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className="flex-shrink-0 mt-1">
                      {isSelected
                        ? <CheckSquare className="h-4 w-4 text-blue-400" />
                        : <Square className="h-4 w-4 text-gray-600" />}
                    </div>

                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0"
                      style={{ background: "rgba(255,255,255,0.06)", color: "#9ca3af" }}>
                      {getInitials(m.fullName)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Row 1: name + badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{toTitleCase(m.fullName)}</span>
                        <span className="text-[10px] font-mono text-gray-600">{m.memberId}</span>
                        {m.doNotDisturb && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>DND</span>
                        )}
                        {!hasPhone && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: "rgba(255,255,255,0.05)", color: "#4b5563" }}>No phone</span>
                        )}
                      </div>

                      {/* Row 2: package + expiry + last seen */}
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-gray-500">{m.packageName ?? "—"} · exp {expiry}</span>
                        <span className="flex items-center gap-1 text-xs text-gray-600">
                          <Clock className="h-3 w-3" />{lastSeen}
                        </span>
                      </div>

                      {/* Row 3: phone + WA button + sent badge */}
                      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        {hasPhone && (
                          <a href={`tel:${m.phone}`}
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg"
                            style={{ background: "rgba(255,255,255,0.06)" }}>
                            <Phone className="h-3 w-3" />
                            {m.phone}
                          </a>
                        )}
                        {!disabled && (
                          <WaConfirmButton
                            memberId={m.id}
                            phone={waNumber}
                            message={msg}
                            waType="OUTREACH"
                            label="WhatsApp Business"
                            className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors"
                            style={{ background: "rgba(37,211,102,0.12)", color: "#25d366" }}
                          />
                        )}
                        {sent && (
                          <span title={`Last sent: ${sentDateStr}`}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium"
                            style={{ background: "rgba(37,211,102,0.08)", color: "#25d366", border: "1px solid rgba(37,211,102,0.2)" }}>
                            ✓ {sent.count}× {sentDateStr && <span className="text-gray-500">{sentDateStr}</span>}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Floating action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl"
          style={{ background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
          <span className="text-sm font-bold text-white">{selected.size} selected</span>
          <div className="w-px h-5 bg-white/10" />
          <button onClick={selectAll}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors">
            <CheckSquare className="h-3.5 w-3.5" />
            Select all ({allEligible.length})
          </button>
          <button onClick={clearSelection}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors">
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
          <div className="w-px h-5 bg-white/10" />
          <button onClick={() => setShowBulkPanel(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all"
            style={{ background: "linear-gradient(135deg, #25d366, #128c7e)" }}>
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Bulk WhatsApp Business ({selected.size})
          </button>
        </div>
      )}

      {/* Bulk panel */}
      {showBulkPanel && (
        <BulkWaPanel
          members={members}
          selected={selected}
          onClose={() => setShowBulkPanel(false)}
        />
      )}
    </div>
  );
}

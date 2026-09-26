"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Lock, LockOpen, Search, X, User, Phone, Clock, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toTitleCase } from "@/lib/utils/titleCase";
import { toast } from "@/hooks/use-toast";

type Person = { id: string; fullName: string; memberId?: string; employeeId?: string; phone?: string };

type Locker = {
  id: string;
  number: number;
  status: "VACANT" | "OCCUPIED";
  holderName: string | null;
  allocatedDate: string | null;
  member: Person | null;
  employee: Person | null;
};

type HistoryRow = {
  id: string;
  holderName: string;
  allocatedDate: string | null;
  vacatedDate: string | null;
  member: { id: string; fullName: string; memberId: string } | null;
  employee: { id: string; fullName: string; employeeId: string } | null;
};

function daysHeld(allocatedDate: string | null): string {
  if (!allocatedDate) return "";
  const days = Math.floor((Date.now() - new Date(allocatedDate).getTime()) / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "1 day";
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  return `${months} mo${months > 1 ? "s" : ""}`;
}

// ── Member search combobox ─────────────────────────────────────────────────────
function MemberSearch({ onSelect }: { onSelect: (m: Person) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/members/search?q=${encodeURIComponent(q)}&limit=8`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
        setOpen(true);
      } catch { /* ignore */ }
    }, 250);
  }, [q]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-600 pointer-events-none" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => q.trim() && setOpen(true)}
          placeholder="Search member by name, ID or phone…"
          className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:ring-1 focus:ring-white/20"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-xl overflow-hidden max-h-56 overflow-y-auto"
          style={{ background: "#1c1c1c", border: "1px solid rgba(255,255,255,0.1)" }}>
          {results.map(m => (
            <button key={m.id} type="button"
              onClick={() => { onSelect(m); setQ(""); setResults([]); setOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/5 transition-colors">
              <span className="text-sm text-white">{toTitleCase(m.fullName)}</span>
              <span className="text-[10px] text-gray-600 font-mono">{m.memberId}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Assign modal ────────────────────────────────────────────────────────────────
function AssignModal({ locker, employees, onClose, onAssigned }: {
  locker: Locker; employees: Person[]; onClose: () => void; onAssigned: (l: Locker) => void;
}) {
  const [mode, setMode] = useState<"member" | "employee" | "other">("member");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [freeText, setFreeText] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAssign() {
    let holderName = "";
    let memberId: string | null = null;
    let employeeId: string | null = null;

    if (mode === "member" && selectedPerson) {
      holderName = selectedPerson.fullName;
      memberId = selectedPerson.id;
    } else if (mode === "employee" && selectedPerson) {
      holderName = selectedPerson.fullName;
      employeeId = selectedPerson.id;
    } else if (mode === "other") {
      holderName = freeText.trim();
    }

    if (!holderName) {
      toast({ title: "Enter a name", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/lockers/${locker.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holderName, memberId, employeeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onAssigned(data.locker);
      toast({ title: `Locker #${locker.number} assigned to ${toTitleCase(holderName)}` });
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message ?? "Failed to assign", variant: "destructive" });
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <p className="font-bold text-white">Assign Locker #{locker.number}</p>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Mode tabs */}
          <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
            {(["member", "employee", "other"] as const).map(m => (
              <button key={m} type="button"
                onClick={() => { setMode(m); setSelectedPerson(null); setFreeText(""); }}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-all"
                style={{
                  background: mode === m ? "rgba(249,115,22,0.15)" : "transparent",
                  color: mode === m ? "#fb923c" : "#6b7280",
                }}>
                {m === "other" ? "Staff/Other" : m}
              </button>
            ))}
          </div>

          {mode === "member" && (
            selectedPerson ? (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.2)" }}>
                <span className="text-sm text-white">{toTitleCase(selectedPerson.fullName)}</span>
                <button onClick={() => setSelectedPerson(null)}><X className="h-3.5 w-3.5 text-gray-500" /></button>
              </div>
            ) : (
              <MemberSearch onSelect={setSelectedPerson} />
            )
          )}

          {mode === "employee" && (
            <select
              value={selectedPerson?.id ?? ""}
              onChange={e => setSelectedPerson(employees.find(emp => emp.id === e.target.value) ?? null)}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <option value="">Select staff member…</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{toTitleCase(emp.fullName)}</option>
              ))}
            </select>
          )}

          {mode === "other" && (
            <input
              value={freeText}
              onChange={e => setFreeText(e.target.value)}
              placeholder="Name (vendor, doctor, guest…)"
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
          )}

          <button
            onClick={handleAssign}
            disabled={saving || (mode !== "other" && !selectedPerson) || (mode === "other" && !freeText.trim())}
            className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all"
            style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}>
            {saving ? "Assigning…" : "Assign Locker"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── History modal ───────────────────────────────────────────────────────────────
function HistoryModal({ locker, onClose }: { locker: Locker; onClose: () => void }) {
  const [history, setHistory] = useState<HistoryRow[] | null>(null);

  useEffect(() => {
    fetch(`/api/lockers/${locker.id}`)
      .then(r => r.json())
      .then(d => setHistory(d.locker?.history ?? []))
      .catch(() => setHistory([]));
  }, [locker.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "80vh" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <p className="font-bold text-white">Locker #{locker.number} — History</p>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: "calc(80vh - 70px)" }}>
          {history === null ? (
            <div className="py-10 text-center text-sm text-gray-600">Loading…</div>
          ) : history.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-600">No history yet</div>
          ) : (
            history.map(h => (
              <div key={h.id} className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
                <div>
                  <p className="text-sm font-semibold text-white">{toTitleCase(h.holderName)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {h.allocatedDate ? format(new Date(h.allocatedDate), "dd MMM yyyy") : "—"}
                    {" → "}
                    {h.vacatedDate ? format(new Date(h.vacatedDate), "dd MMM yyyy") : "current"}
                  </p>
                </div>
                {!h.vacatedDate && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80" }}>
                    ACTIVE
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Locker card ──────────────────────────────────────────────────────────────
function LockerCard({ locker, onAssign, onVacate, onHistory }: {
  locker: Locker; onAssign: () => void; onVacate: () => void; onHistory: () => void;
}) {
  const occupied = locker.status === "OCCUPIED";
  const holder = locker.member?.fullName ?? locker.employee?.fullName ?? locker.holderName;

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2.5 transition-all"
      style={{
        background: occupied ? "rgba(249,115,22,0.05)" : "#161616",
        border: `1px solid ${occupied ? "rgba(249,115,22,0.18)" : "rgba(255,255,255,0.06)"}`,
      }}>
      <div className="flex items-center justify-between">
        <span className="text-lg font-black text-white">#{locker.number}</span>
        {occupied
          ? <Lock className="h-4 w-4" style={{ color: "#fb923c" }} />
          : <LockOpen className="h-4 w-4 text-gray-700" />}
      </div>

      {occupied ? (
        <>
          <div className="flex items-center gap-1.5 min-w-0">
            <User className="h-3 w-3 text-gray-600 flex-shrink-0" />
            <span className="text-xs font-semibold text-white truncate">{toTitleCase(holder ?? "")}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-600">
            <Clock className="h-2.5 w-2.5" />
            {daysHeld(locker.allocatedDate)}
            {locker.member && <span className="text-gray-700"> · member</span>}
            {locker.employee && <span className="text-gray-700"> · staff</span>}
          </div>
          <div className="flex gap-1.5 mt-1">
            <button onClick={onVacate}
              className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-colors"
              style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>
              Vacate
            </button>
            <button onClick={onHistory}
              className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-colors"
              style={{ background: "rgba(255,255,255,0.05)", color: "#9ca3af" }}>
              History
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[11px] text-gray-700">Vacant</p>
          <div className="flex gap-1.5 mt-1">
            <button onClick={onAssign}
              className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-colors"
              style={{ background: "rgba(37,211,102,0.1)", color: "#25d366" }}>
              Assign
            </button>
            <button onClick={onHistory}
              className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-colors"
              style={{ background: "rgba(255,255,255,0.05)", color: "#9ca3af" }}>
              History
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────────
export function LockersClient({ lockers: initial, employees }: {
  lockers: Locker[]; employees: Person[]; isAdmin: boolean;
}) {
  const [lockers, setLockers] = useState<Locker[]>(initial);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "occupied" | "vacant">("all");
  const [assignTarget, setAssignTarget] = useState<Locker | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Locker | null>(null);
  const [vacating, setVacating] = useState<string | null>(null);

  const occupiedCount = lockers.filter(l => l.status === "OCCUPIED").length;
  const vacantCount = lockers.length - occupiedCount;

  const filtered = useMemo(() => {
    let list = lockers;
    if (filter === "occupied") list = list.filter(l => l.status === "OCCUPIED");
    if (filter === "vacant") list = list.filter(l => l.status === "VACANT");
    if (q.trim()) {
      const lq = q.toLowerCase();
      list = list.filter(l =>
        String(l.number).includes(lq) ||
        (l.holderName ?? "").toLowerCase().includes(lq) ||
        (l.member?.fullName ?? "").toLowerCase().includes(lq) ||
        (l.employee?.fullName ?? "").toLowerCase().includes(lq)
      );
    }
    return list;
  }, [lockers, q, filter]);

  function updateLocker(updated: Locker) {
    setLockers(prev => prev.map(l => l.id === updated.id ? updated : l));
  }

  async function handleVacate(locker: Locker) {
    if (!confirm(`Vacate locker #${locker.number}?`)) return;
    setVacating(locker.id);
    try {
      const res = await fetch(`/api/lockers/${locker.id}/vacate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      updateLocker(data.locker);
      toast({ title: `Locker #${locker.number} vacated` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setVacating(null); }
  }

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-2xl px-4 py-3" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-[10px] text-gray-600 uppercase tracking-wider font-bold mb-1">Total Lockers</p>
          <p className="text-2xl font-black text-white">{lockers.length}</p>
        </div>
        <div className="rounded-2xl px-4 py-3" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-[10px] text-gray-600 uppercase tracking-wider font-bold mb-1">Occupied</p>
          <p className="text-2xl font-black" style={{ color: "#fb923c" }}>{occupiedCount}</p>
        </div>
        <div className="rounded-2xl px-4 py-3" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-[10px] text-gray-600 uppercase tracking-wider font-bold mb-1">Vacant</p>
          <p className="text-2xl font-black" style={{ color: "#22c55e" }}>{vacantCount}</p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <Search className="h-3.5 w-3.5 text-gray-600 flex-shrink-0" />
          <input
            type="text" placeholder="Search by locker # or name…" value={q} onChange={e => setQ(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-700 outline-none"
          />
          {q && <button onClick={() => setQ("")}><X className="h-3.5 w-3.5 text-gray-600 hover:text-gray-400" /></button>}
        </div>
        {(["all", "occupied", "vacant"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap"
            style={{
              background: filter === f ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.05)",
              color: filter === f ? "#f97316" : "#6b7280",
            }}>
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-2xl p-12 text-center" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.05)" }}>
            <Lock className="h-8 w-8 text-gray-800 mx-auto mb-3" />
            <p className="text-gray-600 text-sm font-medium">No lockers match your search</p>
          </div>
        ) : (
          filtered.map(l => (
            <LockerCard
              key={l.id}
              locker={l}
              onAssign={() => setAssignTarget(l)}
              onVacate={() => handleVacate(l)}
              onHistory={() => setHistoryTarget(l)}
            />
          ))
        )}
      </div>

      {assignTarget && (
        <AssignModal
          locker={assignTarget}
          employees={employees}
          onClose={() => setAssignTarget(null)}
          onAssigned={updateLocker}
        />
      )}
      {historyTarget && (
        <HistoryModal locker={historyTarget} onClose={() => setHistoryTarget(null)} />
      )}
    </>
  );
}

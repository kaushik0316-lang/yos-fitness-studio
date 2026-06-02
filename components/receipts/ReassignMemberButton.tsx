"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, Search, Loader2, ArrowRight } from "lucide-react";
import { toTitleCase } from "@/lib/utils/titleCase";

type Member = { id: string; memberId: string; fullName: string; phone: string };

type Props = {
  paymentId: string;
  currentMember: { id: string; name: string; memberId: string; phone: string };
};

export function ReassignMemberButton({ paymentId, currentMember }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) { setQuery(""); setResults([]); setSelected(null); setDone(false); }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/members/search?q=${encodeURIComponent(query)}&limit=10`);
        const data = await res.json();
        setResults((Array.isArray(data) ? data : []).filter((m: Member) => m.id !== currentMember.id));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query, currentMember.id]);

  async function handleReassign() {
    if (!selected) return;
    if (!confirm(
      `Reassign this receipt from:\n\n"${currentMember.name}" (${currentMember.memberId})\n\nto:\n\n"${toTitleCase(selected.fullName)}" (${selected.memberId} · ${selected.phone})?\n\nThis will also move the linked membership.`
    )) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/reassign-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, newMemberId: selected.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setDone(true);
      setTimeout(() => { setOpen(false); router.refresh(); }, 1200);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        style={{ background: "rgba(239,68,68,0.08)", border: "2px solid rgba(239,68,68,0.25)", color: "#f87171" }}
      >
        <UserCheck className="h-4 w-4" />
        Reassign Member
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)" }}>

            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(239,68,68,0.1)" }}>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-red-400" /> Reassign Receipt to Correct Member
              </h3>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Current member */}
              <div className="rounded-xl p-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Currently assigned to</p>
                <p className="font-bold text-white text-sm">{currentMember.name}</p>
                <p className="text-xs text-gray-400 font-mono">{currentMember.memberId} · {currentMember.phone}</p>
              </div>

              <div className="flex items-center justify-center text-gray-600">
                <ArrowRight className="h-4 w-4" />
                <span className="text-xs ml-1">Reassign to</span>
              </div>

              {/* Search */}
              {!done ? (
                <>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                    <input
                      value={query}
                      onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
                      placeholder="Search name, ID, or phone…"
                      autoFocus
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#f9fafb" }}
                    />
                    {loading && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 animate-spin" />}
                  </div>

                  {results.length > 0 && !selected && (
                    <div className="rounded-xl overflow-hidden max-h-52 overflow-y-auto"
                      style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                      {results.map((m, idx) => (
                        <button key={m.id} type="button" onClick={() => setSelected(m)}
                          className="w-full text-left px-4 py-3 transition-colors hover:bg-white/5"
                          style={{ borderBottom: idx < results.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                          <p className="font-bold text-sm text-white">{toTitleCase(m.fullName)}</p>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">
                            {m.memberId} <span className="text-gray-600 mx-1">·</span>
                            <span className="font-sans">📱 {m.phone}</span>
                          </p>
                        </button>
                      ))}
                    </div>
                  )}

                  {selected && (
                    <div className="rounded-xl p-3" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
                      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">✓ New member selected</p>
                      <p className="font-bold text-white text-sm">{toTitleCase(selected.fullName)}</p>
                      <p className="text-xs text-gray-400 font-mono">{selected.memberId} · 📱 {selected.phone}</p>
                      <button onClick={() => setSelected(null)} className="text-xs text-gray-500 hover:text-gray-300 mt-1">Change</button>
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button onClick={() => setOpen(false)} type="button"
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-400 transition-colors"
                      style={{ background: "rgba(255,255,255,0.06)" }}>
                      Cancel
                    </button>
                    <button onClick={handleReassign} disabled={!selected || saving} type="button"
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                      style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Reassign Receipt"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-emerald-400 font-bold text-sm">✓ Receipt reassigned successfully!</p>
                  <p className="text-gray-500 text-xs mt-1">Refreshing…</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

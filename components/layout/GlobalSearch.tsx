"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X, User } from "lucide-react";
import { quickSearchMembers } from "@/lib/actions/search";
import { toTitleCase } from "@/lib/utils/titleCase";

type Result = {
  id: string;
  memberId: string;
  fullName: string;
  phone: string;
  status: string;
  expiryDate: Date | null;
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "#4ade80",
  INACTIVE: "#f87171",
  FROZEN: "#60a5fa",
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [selected, setSelected] = useState(0);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); }
    else { setQuery(""); setResults([]); setSelected(0); }
  }, [open]);

  const search = useCallback((q: string) => {
    startTransition(async () => {
      const res = await quickSearchMembers(q);
      setResults(res as Result[]);
      setSelected(0);
    });
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(() => search(query), 250);
    return () => clearTimeout(t);
  }, [query, search]);

  function navigate(id: string) {
    setOpen(false);
    router.push(`/members/${id}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[selected]) navigate(results[selected].id);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl text-gray-500 hover:text-gray-300 transition-colors text-xs"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        title="Global search (Cmd+K)"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search…</span>
        <kbd className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: "rgba(255,255,255,0.08)", color: "#6b7280" }}>⌘K</kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-start justify-center pt-[15vh]" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={() => setOpen(false)}>
      <div className="w-full max-w-md mx-4 rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.12)" }}
        onClick={(e) => e.stopPropagation()}>
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <Search className="h-4 w-4 text-gray-500 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search members by name, ID, or phone…"
            className="flex-1 bg-transparent text-white placeholder-gray-600 text-sm outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-gray-600 hover:text-gray-400">
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-600" style={{ background: "rgba(255,255,255,0.06)" }}>Esc</kbd>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="py-2 max-h-80 overflow-y-auto">
            {results.map((r, i) => (
              <button key={r.id} onClick={() => navigate(r.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                style={{ background: i === selected ? "rgba(249,115,22,0.10)" : "transparent" }}
                onMouseEnter={() => setSelected(i)}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-extrabold"
                  style={{ background: "rgba(249,115,22,0.15)", color: "#fb923c" }}>
                  {r.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{toTitleCase(r.fullName)}</p>
                  <p className="text-xs text-gray-600">{r.memberId} · {r.phone}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0"
                  style={{ background: `${STATUS_COLOR[r.status] ?? "#9ca3af"}18`, color: STATUS_COLOR[r.status] ?? "#9ca3af" }}>
                  {r.status}
                </span>
              </button>
            ))}
          </div>
        )}

        {query.length >= 2 && results.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-gray-600">No members found for &ldquo;{query}&rdquo;</div>
        )}

        {!query && (
          <div className="px-4 py-4 text-xs text-gray-700 text-center">Type to search members by name, ID, or phone</div>
        )}
      </div>
    </div>
  );
}

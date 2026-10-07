"use client";

import { useEffect, useState } from "react";
import { ChevronRight, PauseCircle } from "lucide-react";

type Req = { id: string; status: "PENDING" | "DONE" | "DECLINED"; fromDate: string | null; toDate: string | null; reason: string | null; staffNote: string | null; createdAt: string } | null;

const field = {
  background: "#111", border: "1px solid #2a2a2a", color: "#fff", colorScheme: "dark",
  borderRadius: "0.75rem", padding: "0.7rem 0.9rem", fontSize: "0.9rem", width: "100%", outline: "none",
} as const;
const label = "block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5";

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "";

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PauseRequestCard({ pin }: { pin: string }) {
  const [req, setReq] = useState<Req>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function call(body: object) {
    const res = await fetch("/api/member/requests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, ...body }),
    });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  }

  useEffect(() => {
    call({ action: "status" }).then(({ ok, data }) => { if (ok) setReq(data.request ?? null); }).finally(() => setReady(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      const { ok, data } = await call({ action: "freeze", fromDate: from, toDate: to, reason });
      if (ok) { setReq(data.request); setOpen(false); setFrom(""); setTo(""); setReason(""); }
      else setErr(data.error ?? "Could not send your request. Please try again.");
    } catch {
      setErr("Network error. Check your connection and try again.");
    } finally { setSaving(false); }
  }

  if (!ready) return null;
  const pending = req?.status === "PENDING";
  const showResult = req && req.status !== "PENDING";

  return (
    <div className="rounded-3xl col-span-2" style={{ background: "#1c1c1c" }}>
      <button type="button" disabled={pending} onClick={() => { setOpen((o) => !o); setErr(null); }}
        className="flex items-center gap-3 w-full p-5 text-left active:opacity-70 disabled:cursor-default">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(14,165,233,0.14)" }}>
          <PauseCircle className="h-6 w-6 text-sky-400" />
        </div>
        <div className="flex-1">
          <p className="text-white font-bold text-sm">Pause my membership</p>
          {pending ? (
            <p className="text-xs mt-0.5 text-amber-400">Requested {day(req!.fromDate)} to {day(req!.toDate)}. Waiting for the studio to confirm.</p>
          ) : (
            <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>Travelling or unwell? Ask the studio for a pause</p>
          )}
        </div>
        {!pending && <ChevronRight className="h-4 w-4 transition-transform" style={{ color: "#374151", transform: open ? "rotate(90deg)" : "none" }} />}
      </button>

      {showResult && !open && (
        <p className="px-5 pb-4 -mt-2 text-xs" style={{ color: req!.status === "DONE" ? "#4ade80" : "#f87171" }}>
          Your last request ({day(req!.fromDate)} to {day(req!.toDate)}) was {req!.status === "DONE" ? "approved" : "declined"}
          {req!.staffNote ? `: ${req!.staffNote}` : "."}
        </p>
      )}

      {open && !pending && (
        <form onSubmit={submit} className="px-5 pb-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>First day</label>
              <input type="date" required min={todayLocal()} value={from} onChange={(e) => { setFrom(e.target.value); if (to && e.target.value > to) setTo(""); }} style={field} />
            </div>
            <div>
              <label className={label}>Last day</label>
              <input type="date" required min={from || todayLocal()} value={to} onChange={(e) => setTo(e.target.value)} style={field} />
            </div>
          </div>
          <div>
            <label className={label}>Reason (optional)</label>
            <textarea rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Out of town, injury"
              style={{ ...field, resize: "none" }} />
          </div>
          <p className="text-xs text-gray-500">The studio will review your request and confirm. Your membership isn&apos;t changed until they do.</p>
          {err && <p role="alert" className="text-sm font-medium rounded-xl px-3 py-2" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>{err}</p>}
          <button type="submit" disabled={saving}
            className="w-full py-3 rounded-2xl font-bold text-sm text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #0ea5e9, #0284c7)" }}>
            {saving ? "Sending…" : "Send request"}
          </button>
        </form>
      )}
    </div>
  );
}

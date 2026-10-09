"use client";

import { useCallback, useEffect, useState } from "react";
import { Dumbbell } from "lucide-react";

type Row = { id: string; status: string; date: string; time: string; durationMins: number; expiresAt: string | null; member: string };

const t12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
const dayLong = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const answerBy = (iso: string | null) => iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }) : "";

// Personal-training requests for a trainer, shown on the staff dashboard.
export function TrainerPtCard({ pin }: { pin: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const call = useCallback(async (body: object) => {
    const res = await fetch("/api/trainer/pt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin, ...body }) });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  }, [pin]);

  const refresh = useCallback(async () => {
    try {
      const { ok, data } = await call({ action: "list" });
      if (ok) { setRows(data.bookings); setLoaded(true); }
    } catch { /* offline: try again next tick */ }
  }, [call]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30_000);
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVisible); };
  }, [refresh]);

  async function respond(id: string, decision: "confirm" | "decline") {
    setBusy(id); setErr(null);
    try {
      const { ok, data } = await call({ action: "respond", bookingId: id, decision });
      if (!ok) setErr(data.error ?? "Could not save your answer.");
      if (data.bookings) setRows(data.bookings); else await refresh();
    } catch { setErr("Network error. Check your connection and try again."); }
    finally { setBusy(null); }
  }

  if (!loaded) return null;

  const requests = rows.filter((r) => r.status === "REQUESTED");
  const awaiting = rows.filter((r) => r.status === "PENDING_PAYMENT");
  const booked = rows.filter((r) => r.status === "CONFIRMED");

  return (
    <div className="rounded-3xl p-5" style={{ background: "#1c1c1c" }}>
      <div className="flex items-center gap-2 mb-3">
        <Dumbbell className="h-4 w-4" style={{ color: "#f97316" }} />
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#4b5563" }}>
          Personal Training
        </p>
        {requests.length > 0 && (
          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "#f97316" }}>
            {requests.length} waiting
          </span>
        )}
      </div>

      {err && <p role="alert" className="text-xs text-red-400 rounded-xl px-3 py-2 mb-3" style={{ background: "rgba(239,68,68,0.12)" }}>{err}</p>}

      {requests.length === 0 ? (
        <p className="text-xs mb-1" style={{ color: "#6b7280" }}>No session requests right now. This refreshes by itself.</p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="rounded-2xl p-4" style={{ background: "#111", border: "1px solid rgba(245,158,11,0.3)" }}>
              <p className="text-white font-bold text-sm">{dayLong(r.date)} · {t12(r.time)}</p>
              <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>{r.member} · {r.durationMins} min</p>
              <p className="text-[11px] text-amber-400 mt-2">Is this slot free? Please answer by {answerBy(r.expiresAt)}.</p>
              <div className="flex gap-2 mt-3">
                <button type="button" disabled={!!busy} onClick={() => respond(r.id, "confirm")}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}>
                  {busy === r.id ? "Saving…" : "Slot is free"}
                </button>
                <button type="button" disabled={!!busy} onClick={() => respond(r.id, "decline")}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-300 disabled:opacity-50"
                  style={{ background: "rgba(255,255,255,0.08)" }}>Not free</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {awaiting.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "#4b5563" }}>Confirmed, waiting for payment</p>
          {awaiting.map((r) => <p key={r.id} className="text-xs py-1.5" style={{ color: "#d1d5db" }}>{dayLong(r.date)} · {t12(r.time)} · {r.member}</p>)}
        </div>
      )}

      <div className="mt-4">
        <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "#4b5563" }}>Booked and paid ({booked.length})</p>
        {booked.length === 0
          ? <p className="text-xs" style={{ color: "#6b7280" }}>Nothing booked yet.</p>
          : booked.map((r) => <p key={r.id} className="text-xs py-1.5" style={{ color: "#d1d5db" }}>{dayLong(r.date)} · {t12(r.time)} · {r.member}</p>)}
      </div>
    </div>
  );
}

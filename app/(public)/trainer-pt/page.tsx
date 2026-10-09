"use client";

import { useEffect, useState } from "react";

type Row = { id: string; status: string; date: string; time: string; durationMins: number; expiresAt: string | null; member: string };

const t12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
const dayLong = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
const answerBy = (iso: string | null) => iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }) : "";

export default function TrainerPtPage() {
  const [pin, setPin] = useState("");
  const [name, setName] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function call(body: object, usePin = pin) {
    const res = await fetch("/api/trainer/pt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: usePin, ...body }) });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  }

  async function open(usePin: string) {
    setLoading(true); setErr(null);
    try {
      const { ok, data } = await call({ action: "list" }, usePin);
      if (!ok) { setErr(data.error ?? "Could not open."); setName(null); sessionStorage.removeItem("trainer_pin"); return; }
      sessionStorage.setItem("trainer_pin", usePin);
      setName(data.trainer); setRows(data.bookings);
    } catch { setErr("Network error. Check your connection and try again."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const saved = sessionStorage.getItem("trainer_pin");
    if (saved) { setPin(saved); open(saved); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the list fresh while the page is open
  useEffect(() => {
    if (!name) return;
    const t = setInterval(() => open(pin), 30_000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, pin]);

  async function respond(id: string, decision: "confirm" | "decline") {
    setBusy(id); setErr(null);
    try {
      const { ok, data } = await call({ action: "respond", bookingId: id, decision });
      if (!ok) setErr(data.error ?? "Could not save your answer.");
      if (data.bookings) setRows(data.bookings); else await open(pin);
    } catch { setErr("Network error. Check your connection and try again."); }
    finally { setBusy(null); }
  }

  const requests = rows.filter((r) => r.status === "REQUESTED");
  const awaiting = rows.filter((r) => r.status === "PENDING_PAYMENT");
  const booked = rows.filter((r) => r.status === "CONFIRMED");

  const card = { background: "#161616", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "1.25rem" } as const;

  return (
    <main className="min-h-screen px-4 py-8" style={{ background: "#0c0c0c", color: "#fff" }}>
      <div className="max-w-md mx-auto">
        <p className="text-green-400/70 text-[11px] font-bold uppercase tracking-[0.2em]">Yos Fitness Studio</p>
        <h1 className="text-2xl font-extrabold mt-1">PT session requests</h1>

        {!name ? (
          <form className="mt-6 p-5" style={card} onSubmit={(e) => { e.preventDefault(); open(pin); }}>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Your staff PIN</label>
            <input type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="w-full rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none"
              style={{ background: "#111", border: "1px solid #2a2a2a", color: "#fff" }} placeholder="••••" />
            {err && <p role="alert" className="text-sm text-red-400 mt-3">{err}</p>}
            <button type="submit" disabled={pin.length !== 4 || loading} className="w-full mt-4 py-3 rounded-xl font-bold disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}>{loading ? "Opening…" : "Open"}</button>
          </form>
        ) : (
          <div className="mt-2 space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-sm">Hi {name.split(" ")[0]}</p>
              <button type="button" className="text-xs text-gray-500 underline" onClick={() => { sessionStorage.removeItem("trainer_pin"); setName(null); setPin(""); setRows([]); }}>Sign out</button>
            </div>
            {err && <p role="alert" className="text-sm text-red-400 rounded-xl px-3 py-2" style={{ background: "rgba(239,68,68,0.12)" }}>{err}</p>}

            <section className="space-y-3">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Waiting for your answer ({requests.length})</h2>
              {requests.length === 0 && <p className="text-sm text-gray-500 p-5" style={card}>No requests right now. This page refreshes by itself.</p>}
              {requests.map((r) => (
                <div key={r.id} className="p-5" style={{ ...card, border: "1px solid rgba(245,158,11,0.3)" }}>
                  <p className="font-bold">{dayLong(r.date)} · {t12(r.time)}</p>
                  <p className="text-sm text-gray-400 mt-0.5">{r.member} · {r.durationMins} min</p>
                  <p className="text-xs text-amber-400 mt-2">Is this slot free for you? Please answer by {answerBy(r.expiresAt)}.</p>
                  <div className="flex gap-3 mt-4">
                    <button type="button" disabled={!!busy} onClick={() => respond(r.id, "confirm")} className="flex-1 py-3 rounded-xl font-bold disabled:opacity-50" style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}>
                      {busy === r.id ? "Saving…" : "Slot is free"}
                    </button>
                    <button type="button" disabled={!!busy} onClick={() => respond(r.id, "decline")} className="flex-1 py-3 rounded-xl font-bold text-gray-300 disabled:opacity-50" style={{ background: "rgba(255,255,255,0.08)" }}>Not free</button>
                  </div>
                </div>
              ))}
            </section>

            {awaiting.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Confirmed, waiting for payment</h2>
                {awaiting.map((r) => <p key={r.id} className="text-sm text-gray-300 p-4" style={card}>{dayLong(r.date)} · {t12(r.time)} · {r.member}</p>)}
              </section>
            )}

            <section className="space-y-2">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Booked and paid ({booked.length})</h2>
              {booked.length === 0 && <p className="text-sm text-gray-600">Nothing booked yet.</p>}
              {booked.map((r) => <p key={r.id} className="text-sm text-gray-300 p-4" style={card}>{dayLong(r.date)} · {t12(r.time)} · {r.member}</p>)}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, Dumbbell, CheckCircle2 } from "lucide-react";

type Booking = { id: string; status: string; date: string; time: string; durationMins: number; price: number; payUrl: string | null; trainer: string };
type Day = { date: string; slots: { trainerId: string; trainerName: string; time: string }[] };
type Overview = { eligible: boolean; price: number; durationMins: number; bookings: Booking[]; days: Day[] };

const rupees = (n: number) => `₹${new Intl.NumberFormat("en-IN").format(n)}`;
const t12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
const dayLong = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const first = (name: string) => name.trim().split(/\s+/)[0];

const chip = (active: boolean) => ({
  background: active ? "rgba(249,115,22,0.18)" : "#111",
  border: `1px solid ${active ? "rgba(249,115,22,0.5)" : "#2a2a2a"}`,
  color: active ? "#fb923c" : "#d1d5db",
  borderRadius: "0.75rem", padding: "0.55rem 0.8rem", fontSize: "0.85rem", fontWeight: 600,
} as const);

export function PtSessionCard({ pin }: { pin: string }) {
  const [data, setData] = useState<Overview | null>(null);
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const [pick, setPick] = useState<{ trainerId: string; trainerName: string; time: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [paidMsg, setPaidMsg] = useState<string | null>(null);
  const polls = useRef(0);

  async function call(body: object) {
    const res = await fetch("/api/member/pt", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, ...body }),
    });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  }

  async function load() {
    const { ok, data } = await call({ action: "overview" });
    if (ok) setData(data as Overview);
    return ok ? (data as Overview) : null;
  }

  useEffect(() => {
    load();
    // Back from the payment page: wait for the confirmation to arrive
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("pt") === "paid") setConfirming(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  useEffect(() => {
    if (!confirming) return;
    const t = setInterval(async () => {
      polls.current += 1;
      const d = await load();
      const stillPending = d?.bookings.some((b) => b.status === "PENDING_PAYMENT");
      if (d && !stillPending) {
        setConfirming(false);
        setPaidMsg(d.bookings.some((b) => b.status === "CONFIRMED") ? "Payment received. Your session is booked." : "Payment received. The studio will confirm your session shortly.");
        clearInterval(t);
      } else if (polls.current >= 12) {
        setConfirming(false);
        setPaidMsg("We're still confirming your payment. It will show here shortly; if not, contact the studio.");
        clearInterval(t);
      }
    }, 3000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirming]);

  if (!data || !data.eligible) return null;
  const pending = data.bookings.find((b) => b.status === "PENDING_PAYMENT");
  if (data.days.length === 0 && data.bookings.length === 0 && !pending) return null;

  const times = day ? data.days.find((d) => d.date === day)?.slots ?? [] : [];

  async function book() {
    if (!day || !pick) return;
    setBusy(true); setErr(null);
    try {
      const { ok, data: r } = await call({ action: "book", trainerId: pick.trainerId, date: day, time: pick.time });
      if (ok && r.payUrl) { window.location.href = r.payUrl; return; }
      setErr(r.error ?? "Could not start the payment. Please try again.");
      await load();
      setPick(null);
    } catch {
      setErr("Network error. Check your connection and try again.");
    } finally { setBusy(false); }
  }

  async function release(id: string) {
    setBusy(true); setErr(null);
    try { await call({ action: "cancel", bookingId: id }); await load(); } finally { setBusy(false); }
  }

  return (
    <div className="rounded-3xl col-span-2" style={{ background: "#1c1c1c" }}>
      <button type="button" onClick={() => { setOpen((o) => !o); setErr(null); }} className="flex items-center gap-3 w-full p-5 text-left active:opacity-70">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(249,115,22,0.15)" }}>
          <Dumbbell className="h-6 w-6 text-orange-400" />
        </div>
        <div className="flex-1">
          <p className="text-white font-bold text-sm">Book a personal training session</p>
          <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>{rupees(data.price)} per session · {data.durationMins} min · pay one session at a time</p>
        </div>
        <ChevronRight className="h-4 w-4 transition-transform" style={{ color: "#374151", transform: open ? "rotate(90deg)" : "none" }} />
      </button>

      {(confirming || paidMsg) && (
        <p role="status" className="mx-5 mb-3 text-sm font-medium rounded-xl px-3 py-2"
          style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80" }}>
          {confirming ? "Confirming your payment…" : paidMsg}
        </p>
      )}

      {data.bookings.length > 0 && (
        <div className="px-5 pb-4 space-y-2">
          {data.bookings.map((b) => (
            <div key={b.id} className="rounded-2xl px-4 py-3" style={{ background: "#111", border: "1px solid #2a2a2a" }}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">{dayLong(b.date)} · {t12(b.time)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">with {first(b.trainer)} · {b.durationMins} min</p>
                </div>
                {b.status === "CONFIRMED" ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: "rgba(34,197,94,0.14)", color: "#4ade80" }}>
                    <CheckCircle2 className="h-3 w-3" /> Booked
                  </span>
                ) : b.status === "PENDING_PAYMENT" ? (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: "rgba(245,158,11,0.14)", color: "#fbbf24" }}>Waiting for payment</span>
                ) : (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: "rgba(239,68,68,0.14)", color: "#f87171" }}>Contact studio</span>
                )}
              </div>
              {b.status === "PENDING_PAYMENT" && (
                <div className="flex gap-2 mt-3">
                  {b.payUrl && <a href={b.payUrl} className="flex-1 text-center py-2 rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}>Pay {rupees(b.price)}</a>}
                  <button type="button" disabled={busy} onClick={() => release(b.id)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-300 disabled:opacity-50" style={{ background: "rgba(255,255,255,0.07)" }}>Release</button>
                </div>
              )}
              {b.status === "PAID_SLOT_LOST" && <p className="text-xs text-red-400 mt-2">Your slot was taken before payment completed. The studio will contact you to reschedule or refund.</p>}
            </div>
          ))}
        </div>
      )}

      {open && !pending && (
        <div className="px-5 pb-5 space-y-4">
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">1. Choose a day</p>
            <div className="flex flex-wrap gap-2">
              {data.days.map((d) => (
                <button key={d.date} type="button" onClick={() => { setDay(d.date); setPick(null); setErr(null); }} style={chip(day === d.date)}>{dayLong(d.date)}</button>
              ))}
            </div>
          </div>

          {day && (
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">2. Choose a time and trainer</p>
              <div className="flex flex-wrap gap-2">
                {times.map((s) => {
                  const active = pick?.trainerId === s.trainerId && pick.time === s.time;
                  return (
                    <button key={s.trainerId + s.time} type="button" onClick={() => { setPick(s); setErr(null); }} style={chip(active)}>
                      {t12(s.time)} · {first(s.trainerName)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {day && pick && (
            <div className="rounded-2xl p-4" style={{ background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.2)" }}>
              <p className="text-sm text-white font-bold">{dayLong(day)} · {t12(pick.time)} with {first(pick.trainerName)}</p>
              <p className="text-xs text-gray-400 mt-1">{rupees(data.price)} for {data.durationMins} minutes. You pay now to secure the slot, and it is held for 25 minutes while you pay.</p>
            </div>
          )}

          {err && <p role="alert" className="text-sm font-medium rounded-xl px-3 py-2" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>{err}</p>}

          <button type="button" disabled={!day || !pick || busy} onClick={book}
            className="w-full py-3 rounded-2xl font-bold text-sm text-white disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
            {busy ? "Please wait…" : pick ? `Pay ${rupees(data.price)} and book` : "Choose a day, time and trainer"}
          </button>
          <p className="text-xs text-gray-600">Need to change or cancel a booked session? Contact the front desk.</p>
        </div>
      )}
    </div>
  );
}

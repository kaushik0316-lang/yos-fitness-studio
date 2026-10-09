"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toTitleCase } from "@/lib/utils/titleCase";
import { savePtConfig, saveTrainerPt, setPtBookingStatus, respondToPtRequest } from "@/lib/actions/ptSlots";
import { openWaBusinessLink } from "@/lib/utils/waBusinessLink";

type Windows = Record<string, { start: string; end: string }>;
type Trainer = { id: string; fullName: string; ptEnabled: boolean; windows: Windows };
type Booking = {
  id: string; status: string; date: string; time: string; durationMins: number; price: number;
  staffNote: string | null; paymentId: string | null; trainer: string; trainerPhone: string;
  payUrl: string | null; expiresAt: string | null; respondedByName: string | null;
  member: { id: string; memberId: string; fullName: string; phone: string };
};
type Config = { enabled: boolean; price: number; leadHours: number; daysAhead: number };

// Monday first, since that's how the week reads at the gym. Keys are JS weekdays (0 = Sunday).
const DAYS: { key: string; label: string }[] = [
  { key: "1", label: "Monday" }, { key: "2", label: "Tuesday" }, { key: "3", label: "Wednesday" },
  { key: "4", label: "Thursday" }, { key: "5", label: "Friday" }, { key: "6", label: "Saturday" }, { key: "0", label: "Sunday" },
];

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  REQUESTED:       { label: "Waiting for trainer", bg: "rgba(245,158,11,0.12)", color: "#fbbf24" },
  PENDING_PAYMENT: { label: "Confirmed, waiting for payment", bg: "rgba(14,165,233,0.12)", color: "#38bdf8" },
  CONFIRMED:       { label: "Confirmed and paid", bg: "rgba(34,197,94,0.12)", color: "#4ade80" },
  COMPLETED:       { label: "Completed", bg: "rgba(59,130,246,0.12)", color: "#60a5fa" },
  NO_SHOW:         { label: "No-show", bg: "rgba(239,68,68,0.12)", color: "#f87171" },
  DECLINED:        { label: "Trainer declined", bg: "rgba(107,114,128,0.15)", color: "#9ca3af" },
  CANCELLED:       { label: "Cancelled", bg: "rgba(107,114,128,0.15)", color: "#9ca3af" },
  PAID_SLOT_LOST:  { label: "Paid, slot lost", bg: "rgba(239,68,68,0.18)", color: "#f87171" },
};

const card = { background: "#161616", border: "1px solid rgba(255,255,255,0.06)" } as const;
const input = {
  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff",
  borderRadius: "0.6rem", padding: "0.45rem 0.6rem", fontSize: "0.85rem", outline: "none", colorScheme: "dark",
} as const;

const TRAINER_PAGE = "https://www.yosfitnessstudio.in/staff-dashboard";
const dayLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const t12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
const rupees = (n: number) => `₹${new Intl.NumberFormat("en-IN").format(n)}`;
const firstName = (n: string) => n.trim().split(/\s+/)[0];
const byTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }) : "";

function SettingsCard({ config, isAdmin }: { config: Config; isAdmin: boolean }) {
  const router = useRouter();
  const [c, setC] = useState({ enabled: config.enabled, price: String(config.price), leadHours: String(config.leadHours), daysAhead: String(config.daysAhead) });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setBusy(true); setMsg(null);
    try {
      const r = await savePtConfig({ enabled: c.enabled, price: Number(c.price), leadHours: Number(c.leadHours), daysAhead: Number(c.daysAhead) });
      setMsg(r.ok ? { ok: true, text: "Saved." } : { ok: false, text: r.error });
      if (r.ok) router.refresh();
    } catch { setMsg({ ok: false, text: "Could not save. Check your connection and try again." }); }
    finally { setBusy(false); }
  }

  const lab = "block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5";
  return (
    <section className="rounded-2xl p-5" style={card}>
      <h3 className="font-bold text-white mb-1">Booking settings</h3>
      <p className="text-xs text-gray-500 mb-4">Members see the PT card on their dashboard only when this is on and at least one trainer has open hours. They request a slot, the trainer confirms it is free, and only then do they pay.</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
        <label className="flex items-center gap-2 text-sm text-white col-span-2 sm:col-span-1">
          <input type="checkbox" disabled={!isAdmin} checked={c.enabled} onChange={(e) => setC({ ...c, enabled: e.target.checked })} /> Bookings on
        </label>
        <div><label className={lab}>Price per session (₹)</label><input disabled={!isAdmin} type="number" inputMode="numeric" min={1} value={c.price} onChange={(e) => setC({ ...c, price: e.target.value })} style={{ ...input, width: "100%" }} /></div>
        <div><label className={lab}>Notice needed (hours)</label><input disabled={!isAdmin} type="number" inputMode="numeric" min={0} max={72} value={c.leadHours} onChange={(e) => setC({ ...c, leadHours: e.target.value })} style={{ ...input, width: "100%" }} /></div>
        <div><label className={lab}>Book up to (days ahead)</label><input disabled={!isAdmin} type="number" inputMode="numeric" min={1} max={60} value={c.daysAhead} onChange={(e) => setC({ ...c, daysAhead: e.target.value })} style={{ ...input, width: "100%" }} /></div>
      </div>
      {isAdmin && (
        <div className="flex items-center gap-3 mt-4">
          <button type="button" onClick={save} disabled={busy} className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}>
            {busy ? "Saving…" : "Save settings"}
          </button>
          {msg && <span role="alert" className="text-sm" style={{ color: msg.ok ? "#4ade80" : "#f87171" }}>{msg.text}</span>}
        </div>
      )}
    </section>
  );
}

function TrainerCard({ trainer, isAdmin }: { trainer: Trainer; isAdmin: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(trainer.ptEnabled);
  const [w, setW] = useState<Windows>(trainer.windows);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const toggleDay = (k: string, checked: boolean) =>
    setW((prev) => { const n = { ...prev }; if (checked) n[k] = n[k] ?? { start: "07:00", end: "10:00" }; else delete n[k]; return n; });
  const setTime = (k: string, part: "start" | "end", v: string) => setW((prev) => ({ ...prev, [k]: { ...prev[k], [part]: v } }));

  async function save() {
    setBusy(true); setMsg(null);
    try {
      const r = await saveTrainerPt(trainer.id, on, w);
      setMsg(r.ok ? { ok: true, text: "Saved." } : { ok: false, text: r.error });
      if (r.ok) router.refresh();
    } catch { setMsg({ ok: false, text: "Could not save. Check your connection and try again." }); }
    finally { setBusy(false); }
  }

  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-white">{toTitleCase(trainer.fullName)}</p>
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" disabled={!isAdmin} checked={on} onChange={(e) => setOn(e.target.checked)} /> Takes PT bookings
        </label>
      </div>
      {on && (
        <div className="space-y-2">
          {DAYS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 w-28 text-sm text-gray-300">
                <input type="checkbox" disabled={!isAdmin} checked={!!w[key]} onChange={(e) => toggleDay(key, e.target.checked)} /> {label}
              </label>
              {w[key] ? (
                <>
                  <input disabled={!isAdmin} type="time" value={w[key].start} onChange={(e) => setTime(key, "start", e.target.value)} style={input} />
                  <span className="text-gray-600 text-sm">to</span>
                  <input disabled={!isAdmin} type="time" value={w[key].end} onChange={(e) => setTime(key, "end", e.target.value)} style={input} />
                </>
              ) : <span className="text-xs text-gray-600">not available</span>}
            </div>
          ))}
          <p className="text-[11px] text-gray-600 pt-1">Each hour inside these times can be requested as one session. The trainer still confirms each request, so these are the times they are usually free.</p>
        </div>
      )}
      {isAdmin && (
        <div className="flex items-center gap-3 mt-3">
          <button type="button" onClick={save} disabled={busy} className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: "rgba(255,255,255,0.1)" }}>
            {busy ? "Saving…" : "Save"}
          </button>
          {msg && <span role="alert" className="text-sm" style={{ color: msg.ok ? "#4ade80" : "#f87171" }}>{msg.text}</span>}
        </div>
      )}
    </div>
  );
}

function BookingRow({ b }: { b: Booking }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const s = STATUS[b.status] ?? STATUS.CANCELLED;
  const when = `${dayLabel(b.date)}, ${t12(b.time)}`;

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true); setErr(null);
    try {
      const r = await fn();
      if (!r.ok) setErr(r.error ?? "Could not save."); else router.refresh();
    } catch { setErr("Could not save. Check your connection and try again."); }
    finally { setBusy(false); }
  }

  function cancel() {
    const paid = !!b.paymentId;
    const note = window.prompt(paid ? "Cancel this paid session. Note for the record (the member must be refunded in Razorpay):" : "Reason for releasing it (optional):", "");
    if (note === null) return;
    run(() => setPtBookingStatus(b.id, "CANCELLED", note));
  }

  const btn = (bg: string, color = "#fff") => ({ background: bg, color } as const);
  const small = "px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50";

  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm text-white font-semibold">{dayLabel(b.date)} · {t12(b.time)} · {b.durationMins} min</p>
          <p className="text-xs text-gray-400 mt-0.5">
            <Link href={`/members/${b.member.id}`} className="hover:text-orange-400">{toTitleCase(b.member.fullName)}</Link>
            <span className="text-gray-600 font-mono"> {b.member.memberId}</span> with {toTitleCase(b.trainer)} · {rupees(b.price)}
            {b.paymentId && <> · <Link href={`/payments/${b.paymentId}/receipt`} className="text-sky-400 hover:underline">receipt</Link></>}
          </p>
          {b.status === "REQUESTED" && <p className="text-xs text-amber-400 mt-1">The trainer should answer by {byTime(b.expiresAt)}.</p>}
          {b.status === "PENDING_PAYMENT" && <p className="text-xs text-sky-400 mt-1">Confirmed{b.respondedByName ? ` by ${b.respondedByName}` : ""}. The member should pay by {byTime(b.expiresAt)}.</p>}
          {b.status === "DECLINED" && b.respondedByName && <p className="text-xs text-gray-500 mt-1">Declined by {b.respondedByName}.</p>}
          {b.staffNote && <p className="text-xs text-gray-500 mt-0.5">“{b.staffNote}”</p>}
          {b.status === "PAID_SLOT_LOST" && (
            <p className="text-xs text-red-400 mt-1">Paid after the hold expired and the slot was taken. Reschedule them with the trainer, or cancel and refund in Razorpay.</p>
          )}
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: s.bg, color: s.color }}>{s.label}</span>
      </div>

      <div className="flex gap-2 mt-3 flex-wrap">
        {b.status === "REQUESTED" && (
          <>
            <button type="button" disabled={busy} className={small} style={btn("rgba(34,197,94,0.55)")}
              onClick={() => { if (window.confirm(`Confirm that ${firstName(b.trainer)} is free on ${when}? The member will then be asked to pay.`)) run(() => respondToPtRequest(b.id, "confirm")); }}>
              Slot is free
            </button>
            <button type="button" disabled={busy} className={small} style={btn("rgba(255,255,255,0.1)")} onClick={() => run(() => respondToPtRequest(b.id, "decline"))}>Not free</button>
            <button type="button" className={small} style={btn("rgba(37,211,102,0.15)", "#25d366")}
              onClick={() => openWaBusinessLink(b.trainerPhone, `Hi ${firstName(b.trainer)}, PT session request from ${toTitleCase(b.member.fullName)} for ${when}. Please confirm whether the slot is free: ${TRAINER_PAGE}`)}>
              Message trainer
            </button>
          </>
        )}
        {b.status === "PENDING_PAYMENT" && b.payUrl && (
          <button type="button" className={small} style={btn("rgba(37,211,102,0.15)", "#25d366")}
            onClick={() => openWaBusinessLink(b.member.phone, `Hi ${firstName(toTitleCase(b.member.fullName))}, ${firstName(b.trainer)} has confirmed your personal training session on ${when}. Please pay ${rupees(b.price)} to secure it: ${b.payUrl}`)}>
            Message member the pay link
          </button>
        )}
        {b.status === "CONFIRMED" && (
          <>
            <button type="button" disabled={busy} className={small} style={btn("rgba(59,130,246,0.5)")} onClick={() => run(() => setPtBookingStatus(b.id, "COMPLETED"))}>Mark completed</button>
            <button type="button" disabled={busy} className={small} style={btn("rgba(255,255,255,0.1)")} onClick={() => run(() => setPtBookingStatus(b.id, "NO_SHOW"))}>No-show</button>
          </>
        )}
        {(b.status === "REQUESTED" || b.status === "PENDING_PAYMENT" || b.status === "CONFIRMED" || b.status === "PAID_SLOT_LOST") && (
          <button type="button" disabled={busy} className={small} style={btn("rgba(239,68,68,0.12)", "#fca5a5")} onClick={cancel}>
            {b.status === "REQUESTED" || b.status === "PENDING_PAYMENT" ? "Release" : "Cancel"}
          </button>
        )}
      </div>
      {err && <p role="alert" className="text-xs text-red-400 mt-2">{err}</p>}
    </div>
  );
}

export function PtSlotsClient({ isAdmin, config, trainers, bookings, today }: {
  isAdmin: boolean; config: Config; trainers: Trainer[]; bookings: Booking[]; today: string;
}) {
  const requests = bookings.filter((b) => b.status === "REQUESTED");
  const awaiting = bookings.filter((b) => b.status === "PENDING_PAYMENT");
  const upcoming = bookings.filter((b) => b.date >= today && (b.status === "CONFIRMED" || b.status === "PAID_SLOT_LOST"));
  const recent = bookings
    .filter((b) => !requests.includes(b) && !awaiting.includes(b) && !upcoming.includes(b))
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const live = trainers.filter((t) => t.ptEnabled && Object.keys(t.windows).length > 0).length;

  return (
    <div className="max-w-3xl space-y-6">
      {config.enabled && live === 0 && (
        <p className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#fbbf24" }}>
          Bookings are on, but no trainer has open hours yet, so members won&apos;t see the PT card. Turn on a trainer and set their hours below.
        </p>
      )}

      <section>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Waiting for the trainer ({requests.length})</h3>
        <div className="rounded-2xl overflow-hidden divide-y divide-white/[0.05]" style={{ ...card, border: requests.length ? "1px solid rgba(245,158,11,0.3)" : card.border }}>
          {requests.length === 0
            ? <p className="px-5 py-6 text-center text-sm text-gray-500">No requests waiting. A member asks for a slot, then the trainer says whether it is free.</p>
            : requests.map((b) => <BookingRow key={b.id} b={b} />)}
        </div>
        <p className="text-[11px] text-gray-600 mt-2">Trainers can also answer on their own staff dashboard (<span className="font-mono">/staff-dashboard</span>) using their staff PIN.</p>
      </section>

      {awaiting.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Confirmed, waiting for payment ({awaiting.length})</h3>
          <div className="rounded-2xl overflow-hidden divide-y divide-white/[0.05]" style={card}>
            {awaiting.map((b) => <BookingRow key={b.id} b={b} />)}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Upcoming sessions ({upcoming.length})</h3>
        <div className="rounded-2xl overflow-hidden divide-y divide-white/[0.05]" style={card}>
          {upcoming.length === 0 ? <p className="px-5 py-8 text-center text-sm text-gray-500">No upcoming paid sessions yet.</p> : upcoming.map((b) => <BookingRow key={b.id} b={b} />)}
        </div>
      </section>

      <SettingsCard config={config} isAdmin={isAdmin} />

      <section className="rounded-2xl p-5" style={card}>
        <h3 className="font-bold text-white mb-3">Trainers and their usual hours</h3>
        {trainers.length === 0 ? <p className="text-sm text-gray-500">No active trainers found.</p> : (
          <div className="space-y-3">{trainers.map((t) => <TrainerCard key={t.id} trainer={t} isAdmin={isAdmin} />)}</div>
        )}
        {!isAdmin && <p className="text-xs text-gray-600 mt-3">Only an admin can change these.</p>}
      </section>

      {recent.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Recent</h3>
          <div className="rounded-2xl overflow-hidden divide-y divide-white/[0.05]" style={card}>
            {recent.map((b) => <BookingRow key={b.id} b={b} />)}
          </div>
        </section>
      )}
    </div>
  );
}

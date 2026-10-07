"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Clock, PauseCircle } from "lucide-react";
import { toTitleCase } from "@/lib/utils/titleCase";
import { resolveMemberRequest } from "@/lib/actions/memberRequests";

type Req = {
  id: string; status: "PENDING" | "DONE" | "DECLINED";
  fromDate: string | null; toDate: string | null; reason: string | null;
  staffNote: string | null; handledByName: string | null; handledAt: string | null; createdAt: string;
  member: { id: string; memberId: string; fullName: string; phone: string; status: string; expiryDate: string | null; packageName: string | null };
};

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—";
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const days = (a: string | null, b: string | null) =>
  a && b ? Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000) + 1 : null;

function PendingCard({ r }: { r: Req }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"DONE" | "DECLINED" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const n = days(r.fromDate, r.toDate);

  async function decide(decision: "DONE" | "DECLINED") {
    setBusy(decision); setErr(null);
    try {
      const res = await resolveMemberRequest(r.id, decision, note);
      if (!res.ok) setErr(res.error); else router.refresh();
    } catch {
      setErr("Could not save. Check your connection and try again.");
    } finally { setBusy(null); }
  }

  return (
    <div className="rounded-2xl p-5" style={{ background: "#161616", border: "1px solid rgba(245,158,11,0.25)" }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link href={`/members/${r.member.id}`} className="font-bold text-white hover:text-orange-400 transition-colors">
            {toTitleCase(r.member.fullName)}
          </Link>
          <p className="text-xs text-gray-500 mt-0.5 font-mono">{r.member.memberId} · {r.member.phone}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {r.member.packageName ?? "—"} · valid until {day(r.member.expiryDate)}
          </p>
        </div>
        <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: "rgba(245,158,11,0.12)", color: "#fbbf24" }}>
          <Clock className="h-3 w-3" /> Waiting · asked {when(r.createdAt)}
        </span>
      </div>

      <div className="mt-4 rounded-xl px-4 py-3" style={{ background: "rgba(14,165,233,0.07)", border: "1px solid rgba(14,165,233,0.15)" }}>
        <p className="text-sm text-white font-semibold flex items-center gap-2">
          <PauseCircle className="h-4 w-4 text-sky-400" />
          Pause {day(r.fromDate)} to {day(r.toDate)}{n ? ` (${n} day${n === 1 ? "" : "s"})` : ""}
        </p>
        {r.reason && <p className="text-xs text-gray-400 mt-1.5">“{r.reason}”</p>}
      </div>

      <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Note to the member (optional)"
        className="mt-4 w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} />
      <p className="text-[11px] text-gray-600 mt-2">
        Approving records your decision only. After approving, set the member to Frozen and adjust their expiry on their profile.
      </p>
      {err && <p role="alert" className="text-sm text-red-400 mt-2">{err}</p>}
      <div className="flex gap-3 mt-4">
        <button type="button" disabled={!!busy} onClick={() => decide("DONE")}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}>
          {busy === "DONE" ? "Saving…" : "Approve"}
        </button>
        <button type="button" disabled={!!busy} onClick={() => decide("DECLINED")}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-300 disabled:opacity-50"
          style={{ background: "rgba(255,255,255,0.07)" }}>
          {busy === "DECLINED" ? "Saving…" : "Decline"}
        </button>
      </div>
    </div>
  );
}

export function RequestsClient({ requests }: { requests: Req[] }) {
  const pending = requests.filter((r) => r.status === "PENDING");
  const handled = requests.filter((r) => r.status !== "PENDING");

  return (
    <div className="max-w-3xl space-y-8">
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Waiting for you ({pending.length})</h3>
        {pending.length === 0 ? (
          <div className="rounded-2xl p-10 text-center" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
            <CheckCircle2 className="h-8 w-8 text-gray-700 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No requests waiting. New ones from the member portal show up here.</p>
          </div>
        ) : pending.map((r) => <PendingCard key={r.id} r={r} />)}
      </section>

      {handled.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Recently handled</h3>
          <div className="rounded-2xl overflow-hidden divide-y divide-white/[0.05]" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
            {handled.map((r) => (
              <div key={r.id} className="px-5 py-3.5 flex items-start gap-3">
                {r.status === "DONE"
                  ? <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                  : <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />}
                <div className="min-w-0">
                  <p className="text-sm text-white">
                    <Link href={`/members/${r.member.id}`} className="font-semibold hover:text-orange-400">{toTitleCase(r.member.fullName)}</Link>
                    <span className="text-gray-500"> · {day(r.fromDate)} to {day(r.toDate)}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {r.status === "DONE" ? "Approved" : "Declined"}
                    {r.handledByName ? ` by ${r.handledByName}` : ""}{r.handledAt ? ` · ${when(r.handledAt)}` : ""}
                    {r.staffNote ? ` · “${r.staffNote}”` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

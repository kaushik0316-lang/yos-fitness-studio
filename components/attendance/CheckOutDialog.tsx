"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, X, LogOut, Clock, Trophy } from "lucide-react";
import { checkOutMember } from "@/lib/actions/attendance";
import { format, differenceInMinutes, parseISO } from "date-fns";

type Props = {
  open: boolean;
  onClose: () => void;
  attendance: {
    id: string;
    checkInTime: string;   // ISO string
    checkOutTime: string | null;
  };
  member: {
    fullName: string;
    memberId: string;
  };
};

export function CheckOutDialog({ open, onClose, attendance, member }: Props) {
  const checkInIST = new Date(new Date(attendance.checkInTime).getTime());
  const defaultTime = format(new Date(), "HH:mm");

  const [time, setTime]       = useState(defaultTime);
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [done, setDone]       = useState(false);

  if (!open) return null;

  // Calculate duration from check-in to selected checkout time
  const [h, m] = time.split(":").map(Number);
  const checkInDate = new Date(attendance.checkInTime);
  // Build checkout datetime: same calendar date as check-in (in IST), but with selected time
  const checkInIST8 = new Date(checkInDate.getTime() + 5.5 * 60 * 60 * 1000);
  const checkoutIST = new Date(
    Date.UTC(
      checkInIST8.getUTCFullYear(),
      checkInIST8.getUTCMonth(),
      checkInIST8.getUTCDate(),
      h, m, 0
    ) - 5.5 * 60 * 60 * 1000
  );

  const durationMins = differenceInMinutes(checkoutIST, checkInDate);
  const isValidTime  = durationMins > 0;
  const countsForChallenge = durationMins >= 50;

  function durationLabel(mins: number) {
    if (mins <= 0) return "—";
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? mins % 60 + "m" : ""}`.trim();
  }

  async function handleSave() {
    if (!isValidTime) { setError("Check-out time must be after check-in time."); return; }
    setSaving(true); setError("");
    try {
      await checkOutMember({ attendanceId: attendance.id, checkOutTime: time, remarks: remarks || undefined });
      setDone(true);
      setTimeout(handleClose, 1200);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setTime(defaultTime); setRemarks(""); setError(""); setDone(false);
    onClose();
  }

  const inputCls   = "w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors";
  const inputStyle = { background: "#1c1c1c", border: "1px solid #2a2a2a", color: "#f3f4f6" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "#111", border: "1px solid #2a2a2a" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid #1e1e1e" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(239,68,68,0.1)" }}>
              <LogOut className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm leading-tight">{member.fullName}</h3>
              <p className="text-[11px] text-gray-600">{member.memberId}</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {done ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <CheckCircle2 className="h-12 w-12 text-green-400" />
              <p className="text-white font-bold">Checked out!</p>
              <p className="text-gray-500 text-sm">{member.fullName} · {durationLabel(durationMins)}</p>
            </div>
          ) : (
            <>
              {/* Check-in info */}
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-[11px] text-gray-500 font-medium">Checked in</span>
                </div>
                <span className="text-emerald-400 text-sm font-bold">
                  {format(checkInDate, "hh:mm a")}
                </span>
              </div>

              {/* Checkout time */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                  Check-Out Time (IST)
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                  autoFocus
                />
              </div>

              {/* Duration + challenge badge */}
              <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                style={{
                  background: !isValidTime ? "rgba(239,68,68,0.06)" : countsForChallenge ? "rgba(234,179,8,0.06)" : "rgba(249,115,22,0.06)",
                  border: `1px solid ${!isValidTime ? "rgba(239,68,68,0.15)" : countsForChallenge ? "rgba(234,179,8,0.2)" : "rgba(249,115,22,0.2)"}`,
                }}>
                <div>
                  <p className="text-[11px] text-gray-500 font-medium">Duration</p>
                  <p className="text-white font-extrabold text-lg leading-tight">
                    {isValidTime ? durationLabel(durationMins) : "—"}
                  </p>
                </div>
                {isValidTime && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                    style={{
                      background: countsForChallenge ? "rgba(234,179,8,0.12)" : "rgba(249,115,22,0.1)",
                    }}>
                    <Trophy className="h-3.5 w-3.5" style={{ color: countsForChallenge ? "#eab308" : "#f97316" }} />
                    <span className="text-[11px] font-bold" style={{ color: countsForChallenge ? "#eab308" : "#f97316" }}>
                      {countsForChallenge ? "Counts for challenge" : "Under 50 min"}
                    </span>
                  </div>
                )}
              </div>

              {/* Remarks */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                  Remarks <span className="normal-case font-normal text-gray-600">(optional)</span>
                </label>
                <input
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Left early, forgot to scan QR"
                  className={inputCls}
                  style={inputStyle}
                />
              </div>

              {/* Existing checkout warning */}
              {attendance.checkOutTime && (
                <p className="text-xs text-amber-400 px-3 py-2 rounded-lg"
                  style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.15)" }}>
                  Already checked out at {format(new Date(attendance.checkOutTime), "hh:mm a")} — this will override it.
                </p>
              )}

              {error && (
                <p className="text-xs text-red-400 text-center px-2 py-1.5 rounded-lg"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        {!done && (
          <div className="px-5 pb-5 flex gap-3">
            <button onClick={handleClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: "#1c1c1c", color: "#6b7280", border: "1px solid #2a2a2a" }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || !isValidTime}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-40"
              style={{ background: "#ef4444" }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Check Out"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

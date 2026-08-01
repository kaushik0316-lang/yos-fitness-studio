"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, X, Pencil, Clock, Trophy, Trash2 } from "lucide-react";
import { editMemberAttendance } from "@/lib/actions/attendance";
import { format, differenceInMinutes } from "date-fns";

function utcToISTTime(iso: string): string {
  const ist = new Date(new Date(iso).getTime() + 5.5 * 60 * 60 * 1000);
  return `${String(ist.getUTCHours()).padStart(2, "0")}:${String(ist.getUTCMinutes()).padStart(2, "0")}`;
}

function fmtIST(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

type Props = {
  open: boolean;
  onClose: () => void;
  record: {
    id: string;
    date: string;          // "YYYY-MM-DD"
    checkInTime: string;   // ISO UTC
    checkOutTime: string | null;
    autoCheckedOut: boolean;
    remarks: string | null;
  };
  member: { fullName: string; memberId: string };
};

export function EditAttendanceDialog({ open, onClose, record, member }: Props) {
  const [checkIn,  setCheckIn]  = useState(utcToISTTime(record.checkInTime));
  const [checkOut, setCheckOut] = useState(record.checkOutTime ? utcToISTTime(record.checkOutTime) : "");
  const [remarks,  setRemarks]  = useState(record.remarks ?? "");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [done,     setDone]     = useState(false);

  if (!open) return null;

  // Live duration
  const [ih, im] = checkIn.split(":").map(Number);
  const [oh, om] = checkOut ? checkOut.split(":").map(Number) : [0, 0];
  const durationMins = checkOut ? (oh * 60 + om) - (ih * 60 + im) : null;
  const isValidTime  = durationMins === null || durationMins > 0;
  const countsForChallenge = durationMins !== null && durationMins >= 50;

  function durationLabel(mins: number) {
    if (mins <= 0) return "—";
    return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? mins % 60 + "m" : ""}`.trim();
  }

  const displayDate = (() => {
    const [y, m, d] = record.date.split("-").map(Number);
    return format(new Date(y, m - 1, d), "EEE, d MMM yyyy");
  })();

  async function handleSave() {
    if (!isValidTime) { setError("Check-out time must be after check-in."); return; }
    setSaving(true); setError("");
    try {
      await editMemberAttendance({
        attendanceId: record.id,
        checkInTime:  checkIn,
        checkOutTime: checkOut || null,
        remarks:      remarks || null,
      });
      setDone(true);
      setTimeout(handleClose, 1200);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally { setSaving(false); }
  }

  function handleClose() {
    setCheckIn(utcToISTTime(record.checkInTime));
    setCheckOut(record.checkOutTime ? utcToISTTime(record.checkOutTime) : "");
    setRemarks(record.remarks ?? ""); setError(""); setDone(false);
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
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #1e1e1e" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(249,115,22,0.1)" }}>
              <Pencil className="h-4 w-4 text-orange-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm leading-tight">{member.fullName}</h3>
              <p className="text-[11px] text-gray-600">{member.memberId} · {displayDate}</p>
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
              <p className="text-white font-bold">Record updated!</p>
            </div>
          ) : (
            <>
              {record.autoCheckedOut && (
                <p className="text-xs text-amber-400 px-3 py-2 rounded-lg"
                  style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.15)" }}>
                  ⚡ This was auto-checked out by the system.
                </p>
              )}

              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Check-In (IST)</label>
                  <input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)}
                    className={inputCls} style={inputStyle} autoFocus />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Check-Out (IST)</label>
                  <input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)}
                    className={inputCls} style={inputStyle} placeholder="—" />
                </div>
              </div>

              {/* Duration + challenge */}
              {durationMins !== null && (
                <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                  style={{
                    background: !isValidTime ? "rgba(239,68,68,0.06)" : countsForChallenge ? "rgba(234,179,8,0.06)" : "rgba(249,115,22,0.06)",
                    border: `1px solid ${!isValidTime ? "rgba(239,68,68,0.2)" : countsForChallenge ? "rgba(234,179,8,0.2)" : "rgba(249,115,22,0.2)"}`,
                  }}>
                  <div>
                    <p className="text-[11px] text-gray-500">Duration</p>
                    <p className="text-white font-extrabold text-lg">{isValidTime ? durationLabel(durationMins) : "Invalid"}</p>
                  </div>
                  {isValidTime && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                      style={{ background: countsForChallenge ? "rgba(234,179,8,0.12)" : "rgba(249,115,22,0.1)" }}>
                      <Trophy className="h-3.5 w-3.5" style={{ color: countsForChallenge ? "#eab308" : "#f97316" }} />
                      <span className="text-[11px] font-bold" style={{ color: countsForChallenge ? "#eab308" : "#f97316" }}>
                        {countsForChallenge ? "Challenge ✓" : "Under 50 min"}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Remarks */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                  Remarks <span className="normal-case font-normal text-gray-600">(optional)</span>
                </label>
                <input value={remarks} onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Corrected auto-checkout time"
                  className={inputCls} style={inputStyle} />
              </div>

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
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "#1c1c1c", color: "#6b7280", border: "1px solid #2a2a2a" }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || !isValidTime}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
              style={{ background: "#f97316" }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

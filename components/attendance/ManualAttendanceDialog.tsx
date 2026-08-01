"use client";

import { useState, useRef } from "react";
import { Loader2, CheckCircle2, Search, X } from "lucide-react";
import { manualMarkMemberAttendance } from "@/lib/actions/attendance";
import { format } from "date-fns";

type Member = { id: string; memberId: string; fullName: string; phone: string };

type Props = {
  open: boolean;
  onClose: () => void;
  allMembers: Member[];
  defaultDate: string; // "YYYY-MM-DD"
};

export function ManualAttendanceDialog({ open, onClose, allMembers, defaultDate }: Props) {
  const [memberSearch, setMemberSearch] = useState("");
  const [selected, setSelected]         = useState<Member | null>(null);
  const [date, setDate]                 = useState(defaultDate);
  const [checkIn, setCheckIn]           = useState("06:00");
  const [checkOut, setCheckOut]         = useState("07:00");
  const [remarks, setRemarks]           = useState("");
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState("");
  const [done, setDone]                 = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const filtered = memberSearch.length >= 1
    ? allMembers.filter((m) =>
        m.fullName.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.memberId.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.phone.includes(memberSearch)
      ).slice(0, 8)
    : [];

  async function handleSave() {
    if (!selected) { setError("Please select a member."); return; }
    if (!checkIn || !checkOut) { setError("Check-in and check-out times are required."); return; }
    setSaving(true); setError("");
    try {
      await manualMarkMemberAttendance({
        memberId:    selected.id,
        date,
        checkInTime:  checkIn,
        checkOutTime: checkOut,
        remarks:     remarks || undefined,
      });
      setDone(true);
      setTimeout(() => { handleClose(); }, 1200);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setMemberSearch(""); setSelected(null);
    setDate(defaultDate); setCheckIn("06:00"); setCheckOut("07:00");
    setRemarks(""); setError(""); setDone(false);
    onClose();
  }

  const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors";
  const inputStyle = { background: "#1c1c1c", border: "1px solid #2a2a2a", color: "#f3f4f6" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "#111", border: "1px solid #2a2a2a" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid #1e1e1e" }}>
          <h3 className="font-bold text-white text-base">Manual Attendance Entry</h3>
          <button onClick={handleClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {done ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <CheckCircle2 className="h-12 w-12 text-green-400" />
              <p className="text-white font-bold">Attendance saved!</p>
              <p className="text-gray-500 text-sm">{selected?.fullName} · {date}</p>
            </div>
          ) : (
            <>
              {/* Member search */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Member</label>
                {selected ? (
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                    style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                    <div>
                      <p className="text-white text-sm font-semibold">{selected.fullName}</p>
                      <p className="text-green-400/70 text-[11px]">{selected.memberId}</p>
                    </div>
                    <button onClick={() => { setSelected(null); setMemberSearch(""); setTimeout(() => searchRef.current?.focus(), 50); }}
                      className="text-gray-500 hover:text-white transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      ref={searchRef}
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search name, ID or phone…"
                      className={inputCls + " pl-9"}
                      style={inputStyle}
                      autoFocus
                    />
                    {filtered.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-10 shadow-xl"
                        style={{ background: "#1c1c1c", border: "1px solid #2a2a2a" }}>
                        {filtered.map((m) => (
                          <button key={m.id}
                            onClick={() => { setSelected(m); setMemberSearch(""); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 transition-colors">
                            <div>
                              <p className="text-white text-sm font-medium">{m.fullName}</p>
                              <p className="text-gray-500 text-[11px]">{m.memberId} · {m.phone}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  max={format(new Date(), "yyyy-MM-dd")}
                  className={inputCls} style={inputStyle} />
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Check-In (IST)</label>
                  <input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)}
                    className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Check-Out (IST)</label>
                  <input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)}
                    className={inputCls} style={inputStyle} />
                </div>
              </div>

              {/* Duration hint */}
              {checkIn && checkOut && checkOut > checkIn && (() => {
                const [ih, im] = checkIn.split(":").map(Number);
                const [oh, om] = checkOut.split(":").map(Number);
                const mins = (oh * 60 + om) - (ih * 60 + im);
                const label = mins < 60 ? `${mins}m` : `${Math.floor(mins/60)}h ${mins%60 > 0 ? mins%60+"m" : ""}`.trim();
                const countsForChallenge = mins >= 50;
                return (
                  <p className="text-xs text-center -mt-1" style={{ color: countsForChallenge ? "#22c55e" : "#f97316" }}>
                    Duration: {label} {countsForChallenge ? "✓ counts for Aug Challenge" : "⚠ under 50 mins — won't count for challenge"}
                  </p>
                );
              })()}

              {/* Remarks */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Remarks <span className="text-gray-600 normal-case font-normal">(optional)</span></label>
                <input value={remarks} onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Manual entry — forgot to scan QR"
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
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: "#1c1c1c", color: "#6b7280", border: "1px solid #2a2a2a" }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || !selected}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-40"
              style={{ background: "#22c55e" }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Save Entry"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  Dumbbell, LogOut, ChevronRight, CalendarCheck,
  CheckCircle2, Clock, Delete, AlertCircle,
} from "lucide-react";

type Phase = "input" | "loading" | "dashboard" | "setup" | "error";
type SetupStep = "memberId" | "phone" | "choosePin" | "confirmPin" | "done";

interface MemberData {
  id: string; memberId: string; fullName: string;
  status: string; expiryDate: string | null; packageName: string | null;
}

const TOTAL_DIGITS = 4;
const NUMPAD_KEYS  = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

function todayLabel() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata",
  });
}
function fmtExpiry(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function Screen({ children, green }: { children: React.ReactNode; green?: boolean }) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden select-none"
      style={{ background: green
        ? "linear-gradient(150deg, #0c0c0c 0%, #080d11 55%, #0c1108 100%)"
        : "linear-gradient(150deg, #0c0c0c 0%, #0a0a0a 100%)" }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full opacity-[0.12]"
          style={{ background: `radial-gradient(circle, ${green ? "#22c55e" : "#22c55e"} 0%, transparent 65%)` }} />
        <div className="absolute -bottom-48 -right-24 w-[440px] h-[440px] rounded-full opacity-[0.08]"
          style={{ background: "radial-gradient(circle, #16a34a 0%, transparent 65%)" }} />
      </div>
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }} />
      <div className="relative flex-1 flex flex-col">{children}</div>
    </div>
  );
}

export default function MemberPortalPage() {
  const [phase, setPhase]         = useState<Phase>("input");
  const [pin, setPin]             = useState("");
  const [errorMsg, setErrorMsg]   = useState("");
  const [member, setMember]       = useState<MemberData | null>(null);
  const [todayCheckIn, setToday]  = useState<string | null>(null);
  const [shaking, setShaking]     = useState(false);
  const submittingRef             = useRef(false);

  // Setup PIN state
  const [setupStep, setSetupStep]         = useState<SetupStep>("memberId");
  const [setupMemberId, setSetupMemberId] = useState("");
  const [setupPhone4, setSetupPhone4]     = useState("");
  const [setupPin, setSetupPin]           = useState("");
  const [confirmPin, setConfirmPin]       = useState("");
  const [setupLoading, setSetupLoading]   = useState(false);
  const [setupError, setSetupError]       = useState("");
  const [setupName, setSetupName]         = useState("");

  // Check for ?setup=1 param
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("setup") === "1") setPhase("setup");
    }
  }, []);

  // Restore session
  useEffect(() => {
    const stored = sessionStorage.getItem("member_pin");
    if (stored) {
      setPhase("loading");
      fetch("/api/member/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: stored }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.member) {
            setMember(data.member);
            setToday(data.todayCheckIn);
            setPin(stored);
            setPhase("dashboard");
          } else {
            sessionStorage.removeItem("member_pin");
            setPhase("input");
          }
        })
        .catch(() => { sessionStorage.removeItem("member_pin"); setPhase("input"); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(enteredPin: string) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setPhase("loading");
    try {
      const res = await fetch("/api/member/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: enteredPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Invalid PIN. Try again.");
        setPin(""); setShaking(true);
        setTimeout(() => setShaking(false), 500);
        setPhase("error");
        return;
      }
      setMember(data.member);
      setToday(data.todayCheckIn);
      setPin(enteredPin);
      sessionStorage.setItem("member_pin", enteredPin);
      setPhase("dashboard");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setPin(""); setPhase("error");
    } finally {
      submittingRef.current = false;
    }
  }

  function pressKey(key: string) {
    if (phase === "loading") return;
    if (key === "⌫") {
      setPin((p) => p.slice(0, -1));
      if (phase === "error") setPhase("input");
      setErrorMsg(""); return;
    }
    setPin((prev) => {
      if (prev.length >= TOTAL_DIGITS) return prev;
      const next = prev + key;
      if (next.length === TOTAL_DIGITS) setTimeout(() => submit(next), 60);
      return next;
    });
    if (phase === "error") { setPhase("input"); setErrorMsg(""); }
  }

  // Physical keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase === "loading" || phase === "dashboard" || phase === "setup") return;
      if (e.key >= "0" && e.key <= "9") pressKey(e.key);
      if (e.key === "Backspace") pressKey("⌫");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, pin]);

  function signOut() {
    sessionStorage.removeItem("member_pin");
    setPin(""); setMember(null); setToday(null);
    setErrorMsg(""); setPhase("input"); submittingRef.current = false;
  }

  // ── SETUP PIN ──────────────────────────────────────────────────────────────
  async function handleSetupSubmit() {
    if (setupStep === "memberId") {
      if (!setupMemberId.trim()) { setSetupError("Please enter your Membership ID."); return; }
      setSetupError("");
      setSetupStep("phone");
      return;
    }
    if (setupStep === "phone") {
      if (!/^\d{4}$/.test(setupPhone4)) { setSetupError("Please enter the last 4 digits of your phone number."); return; }
      setSetupError("");
      setSetupStep("choosePin");
      return;
    }
    if (setupStep === "choosePin") {
      if (!/^\d{4}$/.test(setupPin)) { setSetupError("PIN must be exactly 4 digits."); return; }
      setSetupError(""); setSetupStep("confirmPin");
      return;
    }
    if (setupStep === "confirmPin") {
      if (confirmPin !== setupPin) { setSetupError("PINs do not match. Please try again."); setConfirmPin(""); return; }
      setSetupLoading(true); setSetupError("");
      try {
        const res = await fetch("/api/member/setup-pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberId: setupMemberId.trim().toUpperCase(),
            phone4:   setupPhone4,
            pin:      setupPin,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setSetupError(data.error ?? "Something went wrong."); setSetupLoading(false); return; }
        setSetupName(data.fullName);
        setSetupStep("done");
      } catch { setSetupError("Network error. Please try again."); }
      finally { setSetupLoading(false); }
    }
  }

  // ── SETUP SCREEN ────────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <Screen green>
        <div className="flex items-center justify-center pt-10 pb-2">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl p-2.5 shadow-xl"
              style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 6px 24px -4px rgba(34,197,94,0.5)" }}>
              <Dumbbell className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-white font-extrabold text-lg leading-none uppercase tracking-wide">Yos Fitness Studio</p>
              <p className="text-green-400/50 text-[10px] mt-0.5 uppercase tracking-[0.2em]">Member Portal</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10">
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-extrabold text-white mb-1">Set Up Your PIN</h1>
              <p className="text-gray-500 text-sm">Use this PIN to check in and view your attendance</p>
            </div>

            {setupStep === "done" ? (
              <div className="text-center">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
                  style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)" }}>
                  <CheckCircle2 className="h-10 w-10 text-green-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">PIN Set Successfully!</h2>
                <p className="text-gray-400 text-sm mb-8">Welcome, <strong className="text-white">{setupName}</strong>. You can now use your PIN to check in.</p>
                <button onClick={() => { setPhase("input"); setSetupStep("memberId"); setSetupMemberId(""); setSetupPhone4(""); setSetupPin(""); setConfirmPin(""); setSetupError(""); }}
                  className="w-full py-4 rounded-2xl font-bold text-white text-sm"
                  style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>
                  Go to Login →
                </button>
              </div>
            ) : (
              <div className="rounded-3xl p-6" style={{ background: "#1c1c1c" }}>
                {/* Step indicator */}
                <div className="flex items-center gap-2 mb-6">
                  {["memberId", "phone", "choosePin", "confirmPin"].map((step, i) => (
                    <div key={step} className="flex items-center gap-2 flex-1">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          background: setupStep === step ? "#22c55e" : ["memberId","phone","choosePin","confirmPin"].indexOf(setupStep) > i ? "rgba(34,197,94,0.3)" : "#2a2a2a",
                          color: setupStep === step ? "#fff" : "#6b7280",
                        }}>
                        {i + 1}
                      </div>
                      {i < 3 && <div className="flex-1 h-px" style={{ background: ["memberId","phone","choosePin","confirmPin"].indexOf(setupStep) > i ? "rgba(34,197,94,0.4)" : "#2a2a2a" }} />}
                    </div>
                  ))}
                </div>

                {setupStep === "memberId" && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Your Membership ID</label>
                    <input
                      type="text" value={setupMemberId}
                      onChange={(e) => { setSetupMemberId(e.target.value.toUpperCase()); setSetupError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleSetupSubmit()}
                      placeholder="e.g. YF-0001"
                      className="w-full px-4 py-3 rounded-xl text-white font-bold text-lg text-center outline-none focus:ring-2 focus:ring-green-500"
                      style={{ background: "#111", border: "1px solid #2a2a2a", caretColor: "#22c55e" }}
                      autoFocus
                    />
                    <p className="text-xs text-gray-600 mt-2 text-center">Found on your membership card or receipt</p>
                  </div>
                )}

                {setupStep === "phone" && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Last 4 digits of your phone</label>
                    <input
                      type="tel" inputMode="numeric" maxLength={4} value={setupPhone4}
                      onChange={(e) => { setSetupPhone4(e.target.value.replace(/\D/g,"")); setSetupError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleSetupSubmit()}
                      placeholder="e.g. 9381"
                      className="w-full px-4 py-3 rounded-xl text-white font-bold text-lg text-center outline-none focus:ring-2 focus:ring-green-500"
                      style={{ background: "#111", border: "1px solid #2a2a2a", caretColor: "#22c55e" }}
                      autoFocus
                    />
                    <p className="text-xs text-gray-600 mt-2 text-center">The number registered with the gym</p>
                  </div>
                )}

                {(setupStep === "choosePin" || setupStep === "confirmPin") && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                      {setupStep === "choosePin" ? "Choose a 4-digit PIN" : "Confirm your PIN"}
                    </label>
                    <div className="flex gap-3 justify-center my-4">
                      {Array.from({ length: 4 }).map((_, i) => {
                        const val = setupStep === "choosePin" ? setupPin : confirmPin;
                        const filled = i < val.length;
                        return (
                          <div key={i} className="w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all"
                            style={{ background: filled ? "rgba(34,197,94,0.12)" : "#111", borderColor: filled ? "#22c55e" : "#2a2a2a" }}>
                            {filled && <div className="w-3 h-3 rounded-full" style={{ background: "#22c55e" }} />}
                          </div>
                        );
                      })}
                    </div>
                    {/* Mini numpad for PIN setup */}
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {NUMPAD_KEYS.map((key, i) => {
                        if (key === "") return <div key={i} />;
                        const isBack = key === "⌫";
                        return (
                          <button key={i}
                            onClick={() => {
                              setSetupError("");
                              if (setupStep === "choosePin") {
                                setSetupPin((p) => key === "⌫" ? p.slice(0,-1) : p.length < 4 ? p + key : p);
                              } else {
                                setConfirmPin((p) => key === "⌫" ? p.slice(0,-1) : p.length < 4 ? p + key : p);
                              }
                            }}
                            className="h-12 rounded-xl flex items-center justify-center font-bold text-lg active:scale-90 transition-all"
                            style={{ background: isBack ? "transparent" : "#111", color: isBack ? "#6b7280" : "#fff", border: isBack ? "none" : "1px solid #2a2a2a" }}>
                            {isBack ? <Delete className="h-4 w-4" /> : key}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {setupError && (
                  <div className="flex items-center gap-2 mt-4 p-3 rounded-xl"
                    style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)" }}>
                    <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                    <p className="text-red-400 text-sm">{setupError}</p>
                  </div>
                )}

                <button
                  onClick={handleSetupSubmit}
                  disabled={setupLoading ||
                    (setupStep === "memberId" && !setupMemberId.trim()) ||
                    (setupStep === "phone" && setupPhone4.length < 4) ||
                    (setupStep === "choosePin" && setupPin.length < 4) ||
                    (setupStep === "confirmPin" && confirmPin.length < 4)}
                  className="w-full py-3.5 rounded-2xl font-bold text-white mt-5 disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>
                  {setupLoading ? "Please wait…" : setupStep === "confirmPin" ? "Set PIN" : "Continue →"}
                </button>
              </div>
            )}

            <div className="text-center mt-6">
              <button onClick={() => { setPhase("input"); setSetupStep("memberId"); setSetupMemberId(""); setSetupPhone4(""); setSetupPin(""); setConfirmPin(""); }} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                ← Back to login
              </button>
            </div>
          </div>
        </div>
      </Screen>
    );
  }

  // ── PIN ENTRY ──────────────────────────────────────────────────────────────
  if (phase !== "dashboard") {
    return (
      <Screen green>
        <div className="flex items-center justify-center pt-10 pb-2">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl p-2.5 shadow-xl"
              style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 6px 24px -4px rgba(34,197,94,0.5)" }}>
              <Dumbbell className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-white font-extrabold text-lg leading-none uppercase tracking-wide">Yos Fitness Studio</p>
              <p className="text-green-400/50 text-[10px] mt-0.5 uppercase tracking-[0.2em]">Member Portal</p>
            </div>
          </div>
        </div>

        <div className="relative flex-1 flex flex-col items-center justify-center px-6 pb-6">
          <div className="w-full max-w-[300px]">
            <div className="text-center mb-8">
              <p className="text-green-400/70 text-[11px] font-bold uppercase tracking-[0.2em] mb-2">{todayLabel()}</p>
              <h1 className="text-2xl font-extrabold text-white uppercase tracking-wide">Member Login</h1>
              <p className="text-gray-500 text-sm mt-1.5">Enter your 4-digit PIN</p>
            </div>

            <div className="flex gap-3.5 justify-center mb-2"
              style={{ animation: shaking ? "shake 0.45s ease-in-out" : "none" }}>
              {Array.from({ length: TOTAL_DIGITS }).map((_, i) => {
                const filled = i < pin.length;
                return (
                  <div key={i} className="w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-150"
                    style={{
                      background: filled ? "rgba(34,197,94,0.12)" : "#161616",
                      borderColor: filled ? "#22c55e" : i === pin.length ? "#3a3a3a" : "#222222",
                      boxShadow: filled ? "0 0 20px rgba(34,197,94,0.2)" : "none",
                    }}>
                    {filled && <div className="w-3.5 h-3.5 rounded-full"
                      style={{ background: "linear-gradient(135deg, #4ade80, #22c55e)" }} />}
                  </div>
                );
              })}
            </div>

            <div className="h-10 flex items-center justify-center mb-3">
              {phase === "error" && <p className="text-red-400 text-sm font-medium text-center">{errorMsg}</p>}
              {phase === "loading" && (
                <div className="flex items-center gap-2">
                  <Spinner />
                  <span className="text-gray-500 text-sm">Verifying…</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {NUMPAD_KEYS.map((key, i) => {
                if (key === "") return <div key={i} />;
                const isBackspace = key === "⌫";
                return (
                  <button key={i} onClick={() => pressKey(key)} disabled={phase === "loading"}
                    className="h-[68px] rounded-2xl flex items-center justify-center font-bold text-2xl transition-all duration-100 active:scale-90 disabled:opacity-30"
                    style={{
                      background: isBackspace ? "transparent" : "#1e1e1e",
                      color: isBackspace ? "#6b7280" : "#ffffff",
                      border: isBackspace ? "none" : "1px solid #2e2e2e",
                      boxShadow: isBackspace ? "none" : "0 2px 8px rgba(0,0,0,0.4)",
                    }}>
                    {isBackspace ? <Delete className="h-5 w-5" /> : key}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 text-center">
              <button onClick={() => setPhase("setup")}
                className="text-xs font-medium uppercase tracking-widest transition-colors"
                style={{ color: "#374151" }}>
                New member? Set up your PIN →
              </button>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes shake {
            0%,100% { transform: translateX(0); }
            20% { transform: translateX(-8px); }
            40% { transform: translateX(8px); }
            60% { transform: translateX(-6px); }
            80% { transform: translateX(6px); }
          }
        `}</style>
      </Screen>
    );
  }

  // ── DASHBOARD ──────────────────────────────────────────────────────────────
  const isActive  = member?.status === "ACTIVE";
  const isExpired = member?.status === "EXPIRED";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0a0a" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#1c1c1c" }}>
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-1.5" style={{ background: "#22c55e" }}>
            <Dumbbell className="h-4 w-4 text-white" />
          </div>
          <span className="text-white font-bold text-sm uppercase tracking-wide">Yos Fitness</span>
        </div>
        <button onClick={signOut}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: "#6b7280", background: "#1c1c1c" }}>
          <LogOut className="h-3 w-3" />
          Sign out
        </button>
      </div>

      <div className="flex-1 w-full max-w-md mx-auto px-4 py-5 flex flex-col gap-4">
        {/* Welcome card */}
        <div className="rounded-3xl p-6 relative overflow-hidden"
          style={{ background: isActive
            ? "linear-gradient(135deg, #16a34a 0%, #15803d 100%)"
            : "linear-gradient(135deg, #374151 0%, #1f2937 100%)" }}>
          <div className="absolute right-4 top-4 text-8xl opacity-10 select-none font-black">YOS</div>
          <p className="text-green-100/80 text-xs font-semibold uppercase tracking-widest">{todayLabel()}</p>
          <h2 className="text-2xl font-extrabold text-white mt-1 leading-tight uppercase">
            {member?.fullName ?? ""} 💪
          </h2>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(0,0,0,0.2)", color: isActive ? "#bbf7d0" : "#9ca3af" }}>
              {isActive ? "Active Member" : isExpired ? "Membership Expired" : member?.status}
            </span>
            <span className="text-green-100/60 text-[11px]">{member?.memberId}</span>
          </div>
          {member?.packageName && (
            <p className="text-green-100/60 text-xs mt-1">{member.packageName}</p>
          )}
          {member?.expiryDate && (
            <p className="text-green-100/50 text-[11px] mt-1">
              {isExpired ? "Expired" : "Valid until"}: {fmtExpiry(member.expiryDate)}
            </p>
          )}
        </div>

        {/* Today's check-in */}
        <div className="rounded-3xl p-5" style={{ background: "#1c1c1c" }}>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "#4b5563" }}>
            Today&apos;s Attendance
          </p>
          {todayCheckIn ? (
            <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "#111" }}>
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-sm font-semibold text-green-400">
                ✓ Checked in at {fmtTime(todayCheckIn)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 py-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "#2a2a2a" }}>
                <Clock className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Not checked in yet</p>
                <p className="text-xs text-gray-600">Use Check In below</p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/member-checkin"
            className="flex flex-col gap-3 rounded-3xl p-5 transition-opacity active:opacity-70"
            style={{ background: "#1c1c1c" }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(34,197,94,0.15)" }}>
              <CheckCircle2 className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Check In</p>
              <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>Mark today&apos;s attendance</p>
            </div>
            <ChevronRight className="h-4 w-4 self-end" style={{ color: "#374151" }} />
          </Link>

          <Link href="/my-membership"
            className="flex flex-col gap-3 rounded-3xl p-5 transition-opacity active:opacity-70"
            style={{ background: "#1c1c1c" }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(59,130,246,0.15)" }}>
              <CalendarCheck className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">My Attendance</p>
              <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>View visit history</p>
            </div>
            <ChevronRight className="h-4 w-4 self-end" style={{ color: "#374151" }} />
          </Link>
        </div>

        {/* Expired notice */}
        {isExpired && (
          <div className="rounded-3xl p-5" style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)" }}>
            <p className="text-red-400 font-bold text-sm mb-1">Membership Expired</p>
            <p className="text-gray-500 text-sm">Please visit the front desk to renew your membership and continue training.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

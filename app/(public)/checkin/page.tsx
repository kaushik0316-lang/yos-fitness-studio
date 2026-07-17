"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { Dumbbell, Delete, ArrowLeft, LogIn, LogOut } from "lucide-react";

type Phase = "input" | "locating" | "loading" | "success" | "error";

interface SuccessData {
  action: "checkin" | "checkout";
  employeeName: string;
  time: string;
  shiftNumber?: number;
}

const TOTAL_DIGITS  = 4;
const NUMPAD_KEYS   = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
const AUTO_RESET_MS = 5000;

function todayLabel() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata",
  });
}

/* ── shared dark background wrapper ── */
function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: "linear-gradient(150deg, #0c0c0c 0%, #110800 55%, #1a0c00 100%)" }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full opacity-[0.18]"
          style={{ background: "radial-gradient(circle, #f97316 0%, transparent 65%)" }} />
        <div className="absolute -bottom-48 -right-24 w-[440px] h-[440px] rounded-full opacity-[0.13]"
          style={{ background: "radial-gradient(circle, #ea580c 0%, transparent 65%)" }} />
      </div>
      <div className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="relative flex-1 flex flex-col">{children}</div>
    </div>
  );
}

/* ── logo bar ── */
function LogoBar() {
  return (
    <div className="flex items-center justify-center pt-10 pb-2">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl p-2.5 shadow-xl"
          style={{
            background: "linear-gradient(135deg, #f97316, #ea580c)",
            boxShadow: "0 6px 24px -4px rgba(249,115,22,0.5)",
          }}>
          <Dumbbell className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-white font-extrabold text-lg leading-none uppercase tracking-wide">
            Yos Fitness Studio
          </p>
          <p className="text-orange-400/50 text-[10px] mt-0.5 uppercase tracking-[0.2em]">
            Mylapore, Chennai
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CheckInPage() {
  const [pin, setPin]             = useState("");
  const [phase, setPhase]         = useState<Phase>("input");
  const [successData, setSuccess] = useState<SuccessData | null>(null);
  const [errorMsg, setErrorMsg]   = useState("");
  const [shaking, setShaking]     = useState(false);
  const deviceId                  = useRef<string>("");
  const submittingRef             = useRef(false);
  const hiddenInputRef            = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let id = localStorage.getItem("kiosk_device_id");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("kiosk_device_id", id); }
    deviceId.current = id;
  }, []);

  // Auto-focus hidden input so mobile keyboard is available
  useEffect(() => {
    if (phase === "input" || phase === "error") {
      hiddenInputRef.current?.focus();
    }
  }, [phase]);

  // Auto-reset after success
  useEffect(() => {
    if (phase !== "success") return;
    const t = setTimeout(() => resetForm(), AUTO_RESET_MS);
    return () => clearTimeout(t);
  }, [phase]);

  // Physical keyboard support
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== "input" && phase !== "error") return;
      if (e.key >= "0" && e.key <= "9") pressKey(e.key);
      if (e.key === "Backspace") pressKey("⌫");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, pin]);

  function resetForm() {
    setPin(""); setPhase("input"); setSuccess(null);
    setErrorMsg(""); submittingRef.current = false;
  }

  function pressKey(key: string) {
    if (phase === "locating" || phase === "loading") return;
    if (key === "⌫") {
      setPin((p) => p.slice(0, -1));
      if (phase === "error") { setPhase("input"); setErrorMsg(""); }
      return;
    }
    setPin((prev) => {
      if (prev.length >= TOTAL_DIGITS) return prev;
      const next = prev + key;
      if (next.length === TOTAL_DIGITS) {
        setTimeout(() => submit(next), 60);
      }
      return next;
    });
    if (phase === "error") { setPhase("input"); setErrorMsg(""); }
  }

  async function submit(enteredPin: string) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setPhase("locating");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setPhase("loading");
        try {
          const res = await fetch("/api/checkin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pin: enteredPin,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              deviceId: deviceId.current,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            setErrorMsg(data.error ?? "Something went wrong.");
            setPin("");
            setShaking(true);
            setTimeout(() => setShaking(false), 500);
            setPhase("error");
          } else {
            setSuccess({
              action: data.action,
              employeeName: data.employee.fullName,
              time: data.time,
              shiftNumber: data.shiftNumber,
            });
            setPhase("success");
          }
        } catch {
          setErrorMsg("Network error. Check your connection and try again.");
          setPin("");
          setPhase("error");
        } finally {
          submittingRef.current = false;
        }
      },
      (err) => {
        submittingRef.current = false;
        const msg = err.code === 1
          ? "Location permission denied. Please allow location access and try again."
          : "Could not get your location. Please enable GPS and try again.";
        setErrorMsg(msg);
        setPin("");
        setPhase("error");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  // ── SUCCESS ────────────────────────────────────────────────────────────────
  if (phase === "success" && successData) {
    const isIn = successData.action === "checkin";
    return (
      <Screen>
        <LogoBar />
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10">
          <div className="w-full max-w-sm text-center">

            <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl"
              style={{
                background: isIn
                  ? "linear-gradient(135deg, #16a34a, #15803d)"
                  : "linear-gradient(135deg, #f97316, #ea580c)",
                boxShadow: isIn
                  ? "0 8px 32px -4px rgba(22,163,74,0.5)"
                  : "0 8px 32px -4px rgba(249,115,22,0.5)",
              }}>
              {isIn ? <LogIn className="h-10 w-10 text-white" /> : <LogOut className="h-10 w-10 text-white" />}
            </div>

            <span
              className="inline-block px-4 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest mb-4"
              style={{
                background: isIn ? "rgba(22,163,74,0.15)" : "rgba(249,115,22,0.15)",
                color: isIn ? "#4ade80" : "#fb923c",
                border: `1px solid ${isIn ? "rgba(22,163,74,0.3)" : "rgba(249,115,22,0.3)"}`,
              }}>
              {isIn ? "Checked In" : "Checked Out"}
            </span>

            <h2 className="text-3xl font-extrabold text-white uppercase tracking-wide mb-1">
              {successData.employeeName}
            </h2>
            {successData.shiftNumber && successData.shiftNumber > 1 && (
              <p className="text-gray-500 text-sm mb-1 uppercase tracking-widest">
                Shift {successData.shiftNumber}
              </p>
            )}
            <p className="text-gray-400 text-xl mb-10">{successData.time}</p>

            <Link href="/my-attendance"
              className="block w-full py-3.5 rounded-2xl font-semibold text-sm mb-3 uppercase tracking-wide"
              style={{ background: "#1e1e1e", color: "#6b7280", border: "1px solid #2a2a2a" }}>
              View My Attendance →
            </Link>
            <button onClick={resetForm}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm uppercase tracking-widest"
              style={{
                background: "linear-gradient(135deg, #f97316, #ea580c)",
                boxShadow: "0 8px 24px -4px rgba(249,115,22,0.4)",
              }}>
              Done
            </button>
            <p className="text-gray-700 text-xs mt-4 uppercase tracking-widest">
              Resets automatically in 5 seconds
            </p>
          </div>
        </div>
      </Screen>
    );
  }

  // ── INPUT / LOCATING / LOADING / ERROR ─────────────────────────────────────
  const isProcessing = phase === "locating" || phase === "loading";

  return (
    <Screen>
      {/* Hidden input — receives native keyboard input on mobile */}
      <input
        ref={hiddenInputRef}
        type="tel"
        inputMode="numeric"
        pattern="\d*"
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          digits.split("").forEach((d) => pressKey(d));
          e.target.value = "";
        }}
        onKeyDown={(e) => { if (e.key === "Backspace") pressKey("⌫"); }}
        style={{ position: "fixed", left: "-9999px", top: "50%", width: "48px", height: "48px", opacity: 0 }}
        autoComplete="off"
      />
      <LogoBar />
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6"
        onClick={() => hiddenInputRef.current?.focus()}>
        <div className="w-full max-w-[300px]">

          <div className="text-center mb-8">
            <p className="text-orange-400/70 text-[11px] font-bold uppercase tracking-[0.2em] mb-2">
              {todayLabel()}
            </p>
            <h1 className="text-2xl font-extrabold text-white uppercase tracking-wide">
              Staff Sign In
            </h1>
            <p className="text-gray-500 text-sm mt-1.5">Enter your 4-digit PIN</p>
          </div>

          {/* PIN dots */}
          <div className="flex gap-3.5 justify-center mb-2"
            style={{ animation: shaking ? "shake 0.45s ease-in-out" : "none" }}>
            {Array.from({ length: TOTAL_DIGITS }).map((_, i) => {
              const filled = i < pin.length;
              return (
                <div key={i}
                  className="w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-150"
                  style={{
                    background: filled ? "rgba(249,115,22,0.12)" : "#161616",
                    borderColor: filled ? "#f97316" : i === pin.length ? "#3a3a3a" : "#222222",
                    boxShadow: filled ? "0 0 20px rgba(249,115,22,0.2)" : "none",
                  }}>
                  {filled && (
                    <div className="w-3.5 h-3.5 rounded-full"
                      style={{ background: "linear-gradient(135deg, #fb923c, #f97316)" }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Status line */}
          <div className="h-10 flex items-center justify-center mb-3">
            {phase === "error" && (
              <p className="text-red-400 text-sm font-medium text-center">{errorMsg}</p>
            )}
            {phase === "locating" && (
              <div className="flex items-center gap-2">
                <Spinner />
                <span className="text-gray-500 text-sm">Getting location…</span>
              </div>
            )}
            {phase === "loading" && (
              <div className="flex items-center gap-2">
                <Spinner />
                <span className="text-gray-500 text-sm">Marking attendance…</span>
              </div>
            )}
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2.5">
            {NUMPAD_KEYS.map((key, i) => {
              if (key === "") return <div key={i} />;
              const isBackspace = key === "⌫";
              return (
                <button key={i}
                  onClick={() => pressKey(key)}
                  disabled={isProcessing}
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
            <Link href="/staff-dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest transition-colors"
              style={{ color: "#374151" }}>
              <ArrowLeft className="h-3 w-3" />
              Staff Dashboard
            </Link>
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

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

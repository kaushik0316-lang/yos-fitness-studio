"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { Dumbbell, Delete, ArrowLeft, CheckCircle2 } from "lucide-react";

type Phase = "input" | "locating" | "loading" | "success" | "checkoutSuccess" | "error";

interface SuccessData { fullName: string; time: string; streak?: number; }

const TOTAL_DIGITS  = 4;
const NUMPAD_KEYS   = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

const CHECKIN_TIPS = [
  "Warm up for 5 minutes before lifting — it prevents injury and improves performance.",
  "Stay hydrated! Drink water before, during, and after your workout.",
  "Focus on form over weight — good technique gives better results and prevents injury.",
  "Compound movements like squats and deadlifts burn more calories than isolation exercises.",
  "Getting 7–8 hours of sleep is when your muscles actually grow.",
  "Consistency beats intensity — showing up regularly matters more than one hard session.",
  "Don't skip your cool-down — stretching after a workout reduces soreness.",
  "Protein within 30 minutes after training helps muscle recovery.",
  "Track your progress — what gets measured gets improved.",
  "A strong core protects your spine in every exercise you do.",
  "Rest days are not lazy days — they are when your body gets stronger.",
  "Breathe out on exertion — exhale when you push or pull.",
];

const CHECKOUT_MSGS = [
  "Rest well — recovery is part of the process. See you next time! 💪",
  "Great session! Refuel with a good meal within the next hour.",
  "Your muscles are rebuilding stronger right now. Rest up!",
  "Consistency is the secret. Same time tomorrow? 🙌",
  "One more session done. You're closer to your goal than yesterday.",
  "Stretch, hydrate, and sleep well — your body will thank you.",
  "Every rep counts. Well done today! 💪",
];

function dailyPick<T>(arr: T[]): T {
  const day = Math.floor(Date.now() / 86_400_000);
  return arr[day % arr.length];
}
const AUTO_RESET_MS = 60 * 60 * 1000; // 1 hour — used for both success screens

function todayLabel() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata",
  });
}

function currentTimeIST() {
  return new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata",
  });
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: "linear-gradient(150deg, #0c0c0c 0%, #080d11 55%, #0c1108 100%)" }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full opacity-[0.15]"
          style={{ background: "radial-gradient(circle, #22c55e 0%, transparent 65%)" }} />
        <div className="absolute -bottom-48 -right-24 w-[440px] h-[440px] rounded-full opacity-[0.10]"
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

function LogoBar() {
  return (
    <div className="flex items-center justify-center pt-10 pb-2">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl p-2.5 shadow-xl"
          style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 6px 24px -4px rgba(34,197,94,0.5)" }}>
          <Dumbbell className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-white font-extrabold text-lg leading-none uppercase tracking-wide">Yos Fitness Studio</p>
          <p className="text-green-400/50 text-[10px] mt-0.5 uppercase tracking-[0.2em]">Mylapore, Chennai</p>
        </div>
      </div>
    </div>
  );
}

export default function MemberCheckinPage() {
  const [pin, setPin]                       = useState("");
  const [phase, setPhase]                   = useState<Phase>("input");
  const [successData, setSuccess]           = useState<SuccessData | null>(null);
  const [errorMsg, setErrorMsg]             = useState("");
  const [shaking, setShaking]               = useState(false);
  const [liveTime, setLiveTime]             = useState(currentTimeIST);
  const submittingRef                       = useRef(false);
  const hiddenInputRef                      = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setInterval(() => setLiveTime(currentTimeIST()), 10000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (phase !== "checkoutSuccess" && phase !== "success") return;
    const t = setTimeout(resetForm, AUTO_RESET_MS);
    return () => clearTimeout(t);
  }, [phase]);

  // No auto-focus — auto-focusing opens the native keyboard which covers the on-screen numpad

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== "input" && phase !== "error") return;
      // Skip if the hidden input is focused — onChange already handles it, avoid double-fire
      if (e.target === hiddenInputRef.current) return;
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
      if (next.length === TOTAL_DIGITS) setTimeout(() => submit(next), 60);
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
        await doSubmit(enteredPin, pos.coords.latitude, pos.coords.longitude);
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

  async function doSubmit(enteredPin: string, lat: number, lng: number) {
    setPhase("loading");
    try {
      const res = await fetch("/api/member-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: enteredPin, lat, lng }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong.");
        setPin("");
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
        setPhase("error");
      } else if (data.checkoutPending) {
        // Already checked in — check out immediately, no extra tap needed
        setPin("");
        await performCheckout(data.attendanceId, data.fullName);
      } else {
        setSuccess({ fullName: data.fullName, time: data.time, streak: data.streak });
        setPhase("success");
      }
    } catch {
      setErrorMsg("Network error. Check your connection and try again.");
      setPin(""); setPhase("error");
    } finally {
      submittingRef.current = false;
    }
  }

  async function performCheckout(attendanceId: string, fullName: string) {
    setPhase("loading");
    try {
      const res = await fetch("/api/member-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceId }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error ?? "Checkout failed."); setPhase("error"); return; }
      setSuccess({ fullName, time: data.time });
      setPhase("checkoutSuccess");
    } catch {
      setErrorMsg("Network error. Please try again."); setPhase("error");
    } finally {
      submittingRef.current = false;
    }
  }

  // ── SUCCESS ──────────────────────────────────────────────────────────────────
  if (phase === "success" && successData) {
    return (
      <Screen>
        <LogoBar />
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10">
          <div className="w-full max-w-sm text-center">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl"
              style={{ background: "linear-gradient(135deg, #16a34a, #15803d)", boxShadow: "0 8px 32px -4px rgba(22,163,74,0.5)" }}>
              <CheckCircle2 className="h-12 w-12 text-white" />
            </div>
            <span className="inline-block px-4 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest mb-4"
              style={{ background: "rgba(22,163,74,0.15)", color: "#4ade80", border: "1px solid rgba(22,163,74,0.3)" }}>
              Checked In
            </span>
            <h2 className="text-3xl font-extrabold text-white uppercase tracking-wide mb-1">
              {successData.fullName}
            </h2>
            <p className="text-gray-400 text-xl mb-4">{successData.time}</p>
            {successData.streak && successData.streak >= 2 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl mb-6"
                style={{ background: successData.streak >= 14 ? "rgba(234,179,8,0.12)" : "rgba(249,115,22,0.12)", border: successData.streak >= 14 ? "1px solid rgba(234,179,8,0.3)" : "1px solid rgba(249,115,22,0.25)" }}>
                <span className="text-2xl">{successData.streak >= 14 ? "🏆" : "🔥"}</span>
                <div className="text-left">
                  <p className="font-extrabold text-sm" style={{ color: successData.streak >= 14 ? "#fbbf24" : "#fb923c" }}>
                    {successData.streak} Day Streak!
                  </p>
                  <p className="text-[11px]" style={{ color: successData.streak >= 14 ? "#92400e" : "#7c2d12" }}>
                    {successData.streak >= 30 ? "Unstoppable! 💪" : successData.streak >= 14 ? "Two weeks strong!" : successData.streak >= 7 ? "One week in, keep it up!" : "Keep the momentum!"}
                  </p>
                </div>
              </div>
            )}
            {(!successData.streak || successData.streak < 2) && <div className="mb-2" />}
            <div className="mb-6 mx-auto max-w-xs rounded-xl px-4 py-3 text-left"
              style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
              <p className="text-green-400/60 text-[10px] uppercase tracking-widest font-semibold mb-1">Today&apos;s tip</p>
              <p className="text-gray-400 text-sm">{dailyPick(CHECKIN_TIPS)}</p>
            </div>
            <Link href="/member-portal"
              className="block w-full py-4 rounded-2xl font-bold text-white text-sm uppercase tracking-widest mb-3"
              style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 8px 24px -4px rgba(34,197,94,0.4)" }}>
              Go to My Dashboard →
            </Link>
            <button onClick={resetForm}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm uppercase tracking-wide"
              style={{ background: "#1e1e1e", color: "#6b7280", border: "1px solid #2a2a2a" }}>
              Done
            </button>
          </div>
        </div>
      </Screen>
    );
  }

  // ── CHECKOUT SUCCESS ──────────────────────────────────────────────────────────
  if (phase === "checkoutSuccess" && successData) {
    return (
      <Screen>
        <LogoBar />
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10">
          <div className="w-full max-w-sm text-center">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl"
              style={{ background: "linear-gradient(135deg, #1d4ed8, #1e40af)", boxShadow: "0 8px 32px -4px rgba(29,78,216,0.5)" }}>
              <CheckCircle2 className="h-12 w-12 text-white" />
            </div>
            <span className="inline-block px-4 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest mb-4"
              style={{ background: "rgba(29,78,216,0.15)", color: "#93c5fd", border: "1px solid rgba(29,78,216,0.3)" }}>
              Checked Out
            </span>
            <h2 className="text-3xl font-extrabold text-white uppercase tracking-wide mb-1">
              {successData.fullName}
            </h2>
            <p className="text-gray-400 text-xl mb-5">{successData.time}</p>
            <div className="mb-6 mx-auto max-w-xs rounded-xl px-4 py-3 text-left"
              style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
              <p className="text-indigo-400/60 text-[10px] uppercase tracking-widest font-semibold mb-1">Well done!</p>
              <p className="text-gray-400 text-sm">{dailyPick(CHECKOUT_MSGS)}</p>
            </div>
            <button onClick={resetForm}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm uppercase tracking-widest mb-3"
              style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 8px 24px -4px rgba(34,197,94,0.4)" }}>
              Check In Again
            </button>
            <button onClick={resetForm}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm uppercase tracking-wide"
              style={{ background: "#1e1e1e", color: "#6b7280", border: "1px solid #2a2a2a" }}>
              Done
            </button>
          </div>
        </div>
      </Screen>
    );
  }

  // ── INPUT / LOADING / ERROR ───────────────────────────────────────────────────
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
        style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "1px", height: "1px", opacity: 0, border: "none", outline: "none" }}
        autoComplete="off"
      />
      <LogoBar />
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6">
        <div className="w-full max-w-[300px]">
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-3 mb-1">
              <p className="text-green-400/70 text-[11px] font-bold uppercase tracking-[0.2em]">
                {todayLabel()}
              </p>
              <span className="text-green-400/40 text-[11px]">·</span>
              <p className="text-green-400/70 text-[11px] font-bold uppercase tracking-[0.2em]">
                {liveTime}
              </p>
            </div>
            <h1 className="text-2xl font-extrabold text-white uppercase tracking-wide">
              Check In / Check Out
            </h1>
            <p className="text-gray-500 text-sm mt-1">Enter your 4-digit PIN</p>
            {/* Inline reminder row */}
            <div className="mt-3 mx-auto rounded-xl px-4 py-2"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-[10px] uppercase tracking-widest text-green-400/60 font-semibold mb-1.5">Before you enter</p>
              <div className="flex items-center justify-center gap-3">
              {[
                { icon: "👟", text: "Clean footwear" },
                { icon: "🧴", text: "Towel" },
                { icon: "💧", text: "Water bottle" },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-1">
                  <span className="text-sm">{icon}</span>
                  <span className="text-gray-500 text-[11px]">{text}</span>
                </div>
              ))}
              </div>
            </div>
            <div className="mt-2 mx-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.25)" }}>
              <span className="text-sm leading-none">📍</span>
              <p className="text-yellow-400/80 text-[11px] font-medium">Allow location — you must be at the gym</p>
            </div>
          </div>

          {/* PIN dots */}
          <div className="flex gap-3 justify-center mb-2"
            style={{ animation: shaking ? "shake 0.45s ease-in-out" : "none" }}>
            {Array.from({ length: TOTAL_DIGITS }).map((_, i) => {
              const filled = i < pin.length;
              const isNext = i === pin.length;
              return (
                <div key={i}
                  className="w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-150"
                  style={{
                    background: filled ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.03)",
                    borderColor: filled ? "#22c55e" : isNext ? "#4b5563" : "#2a2a2a",
                    boxShadow: filled ? "0 0 24px rgba(34,197,94,0.25)" : isNext ? "0 0 0 1px rgba(75,85,99,0.3)" : "none",
                  }}>
                  {filled && <div className="w-4 h-4 rounded-full"
                    style={{ background: "linear-gradient(135deg, #4ade80, #22c55e)", boxShadow: "0 0 10px rgba(34,197,94,0.6)" }} />}
                </div>
              );
            })}
          </div>

          {/* Status line */}
          <div className="h-8 flex items-center justify-center mb-2">
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
                  className="h-[60px] rounded-2xl flex items-center justify-center font-bold text-2xl transition-all duration-100 active:scale-90 disabled:opacity-30"
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

          <div className="mt-4 text-center space-y-2">
            <Link href="/member-portal"
              className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest transition-colors"
              style={{ color: "#374151" }}>
              <ArrowLeft className="h-3 w-3" />
              Member Portal
            </Link>
            <div>
              <Link href="/member-portal?setup=1"
                className="text-[11px] text-green-600/60 hover:text-green-500 transition-colors">
                New member? Set up your PIN →
              </Link>
            </div>
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
    <svg className="animate-spin h-4 w-4 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

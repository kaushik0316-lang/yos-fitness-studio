"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type Phase = "form" | "submitting" | "success" | "error";

const ROLE_OPTIONS = [
  { value: "FRONT_DESK", label: "Front Desk" },
  { value: "TRAINER",    label: "Trainer" },
  { value: "CLEANER",    label: "Cleaner" },
];

export default function JoinPage() {
  const [phase, setPhase] = useState<Phase>("form");
  const [form, setForm] = useState({ joinCode: "", fullName: "", phone: "", role: "FRONT_DESK", pin: "", pinConfirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ employeeId: string; fullName: string } | null>(null);
  const [serverError, setServerError] = useState("");

  function validate() {
    const e: Record<string, string> = {};
    if (form.joinCode.trim().length < 1) e.joinCode = "Join code is required";
    if (form.fullName.trim().length < 2) e.fullName = "Enter your full name";
    if (!/^\d{10}$/.test(form.phone.replace(/\s/g, ""))) e.phone = "Enter a valid 10-digit phone number";
    if (!/^\d{4}$/.test(form.pin)) e.pin = "PIN must be exactly 4 digits";
    if (form.pin !== form.pinConfirm) e.pinConfirm = "PINs do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setPhase("submitting");
    setServerError("");
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: form.joinCode.trim(), fullName: form.fullName.trim(), phone: form.phone.trim(), role: form.role, pin: form.pin }),
      });
      const data = await res.json();
      if (!res.ok) { setServerError(data.error ?? "Something went wrong."); setPhase("error"); return; }
      setResult({ employeeId: data.employeeId, fullName: data.fullName });
      setPhase("success");
    } catch { setServerError("Network error. Please try again."); setPhase("error"); }
  }

  // ── Success ────────────────────────────────────────────────────────────────

  if (phase === "success" && result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: "#0f0f0f" }}>
        <div className="w-full max-w-sm text-center">
          <Image src="/Logo.png" alt="Yos" width={160} height={40} className="h-10 w-auto object-contain mx-auto mb-8" />
          <div className="text-6xl mb-6">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome, {result.fullName}!</h2>
          <p className="text-gray-400 mb-2">You're registered as</p>
          <div className="inline-block px-4 py-2 rounded-xl font-mono font-bold text-lg text-white mb-4" style={{ background: "#1a1a1a" }}>
            {result.employeeId}
          </div>

          {/* Pending approval notice */}
          <div className="w-full rounded-xl px-4 py-3 mb-4 text-left" style={{ background: "#1a1a1a", borderLeft: "3px solid #d97706" }}>
            <p className="text-yellow-400 text-sm font-bold mb-1">⏳ Waiting for admin approval</p>
            <p className="text-gray-400 text-xs">Your account has been created but check-in is disabled until the manager activates it. You'll be notified once you're active.</p>
          </div>

          <p className="text-gray-400 text-sm mb-1">Your check-in PIN (save this)</p>
          <div className="inline-block px-6 py-3 rounded-xl font-mono font-bold text-3xl text-white mb-8 tracking-widest" style={{ background: "#dc2626" }}>
            {form.pin}
          </div>
          <p className="text-gray-500 text-sm mb-8">Once the manager activates your account, use this PIN every day to check in at the gym.</p>
          <Link href="/" className="block w-full py-4 rounded-xl font-semibold text-white text-base text-center" style={{ background: "#1a1a1a" }}>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (phase === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#0f0f0f" }}>
        <div className="text-7xl mb-6">❌</div>
        <h2 className="text-xl font-bold text-white mb-4">Couldn't register</h2>
        <p className="text-gray-300 text-base mb-10 text-center">{serverError}</p>
        <button onClick={() => setPhase("form")} className="w-full max-w-xs py-4 rounded-xl font-semibold text-white" style={{ background: "#dc2626" }}>
          Try Again
        </button>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: "#0f0f0f" }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/Logo.png" alt="Yos" width={160} height={40} className="h-10 w-auto object-contain mb-6" priority />
          <h1 className="text-2xl font-bold text-white text-center">Join Yos Fitness</h1>
          <p className="text-gray-400 text-sm text-center mt-2">Fill in your details to register as staff</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Join Code */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Staff Join Code</label>
            <p className="text-xs text-gray-600 mb-2">Ask your manager for the join code before registering</p>
            <input
              value={form.joinCode}
              onChange={(e) => { const v = e.target.value.toUpperCase(); setForm(f => ({ ...f, joinCode: v })); }}
              type="text" placeholder="Enter join code"
              className="w-full py-3.5 px-4 rounded-xl text-sm text-white outline-none border-2 transition-colors tracking-widest font-mono"
              style={{ background: "#1a1a1a", borderColor: errors.joinCode ? "#dc2626" : "#2a2a2a", textTransform: "uppercase" }}
            />
            {errors.joinCode && <p className="text-xs text-red-500 mt-1">{errors.joinCode}</p>}
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Full Name</label>
            <input
              value={form.fullName}
              onChange={(e) => { const v = e.target.value.toUpperCase(); setForm(f => ({ ...f, fullName: v })); }}
              placeholder="Your full name"
              className="w-full py-3.5 px-4 rounded-xl text-sm text-white outline-none border-2 transition-colors"
              style={{ background: "#1a1a1a", borderColor: errors.fullName ? "#dc2626" : "#2a2a2a", textTransform: "uppercase" }}
            />
            {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Phone Number</label>
            <input
              value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })}
              type="tel" inputMode="numeric" placeholder="98765 43210"
              className="w-full py-3.5 px-4 rounded-xl text-sm text-white outline-none border-2 transition-colors"
              style={{ background: "#1a1a1a", borderColor: errors.phone ? "#dc2626" : "#2a2a2a" }}
            />
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Your Role</label>
            <select
              value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full py-3.5 px-4 rounded-xl text-sm text-white outline-none border-2 appearance-none"
              style={{ background: "#1a1a1a", borderColor: "#2a2a2a" }}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* PIN */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Choose Your PIN</label>
            <p className="text-xs text-gray-600 mb-2">4 digits · You'll use this every day to check in and view attendance</p>
            <input
              value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
              type="tel" inputMode="numeric" maxLength={4} placeholder="e.g. 1234"
              className="w-full py-3.5 px-4 rounded-xl text-sm text-white outline-none border-2 font-mono tracking-widest transition-colors"
              style={{ background: "#1a1a1a", borderColor: errors.pin ? "#dc2626" : "#2a2a2a" }}
            />
            {errors.pin && <p className="text-xs text-red-500 mt-1">{errors.pin}</p>}
          </div>

          {/* Confirm PIN */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Confirm PIN</label>
            <input
              value={form.pinConfirm} onChange={(e) => setForm({ ...form, pinConfirm: e.target.value.replace(/\D/g, "").slice(0, 4) })}
              type="tel" inputMode="numeric" maxLength={4} placeholder="Re-enter PIN"
              className="w-full py-3.5 px-4 rounded-xl text-sm text-white outline-none border-2 font-mono tracking-widest transition-colors"
              style={{ background: "#1a1a1a", borderColor: errors.pinConfirm ? "#dc2626" : "#2a2a2a" }}
            />
            {errors.pinConfirm && <p className="text-xs text-red-500 mt-1">{errors.pinConfirm}</p>}
          </div>

          <button
            type="submit" disabled={phase === "submitting"}
            className="w-full py-4 rounded-xl font-semibold text-white text-base flex items-center justify-center gap-3 disabled:opacity-60 mt-2"
            style={{ background: "#dc2626" }}
          >
            {phase === "submitting" ? <><Spinner /> Registering...</> : "Register"}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-6">
          Already registered?{" "}
          <Link href="/checkin" className="text-gray-400 hover:text-white transition-colors">Sign In →</Link>
        </p>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

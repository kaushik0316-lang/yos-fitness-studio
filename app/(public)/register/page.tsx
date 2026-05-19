"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

type Company = "YOS_FITNESS" | "YOS_FITNESS_STUDIO";
type Phase = "form" | "submitting" | "success" | "error";

const BLOOD_GROUPS = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"];
const INTENTIONS = [
  "Weight Loss", "Muscle Gain", "General Fitness", "Strength Training",
  "Flexibility & Mobility", "Sports Performance", "Rehabilitation", "Other",
];

export default function RegisterPage() {
  const [company, setCompany] = useState<Company>("YOS_FITNESS");
  const [phase, setPhase] = useState<Phase>("form");
  const [showOptional, setShowOptional] = useState(false);
  const [result, setResult] = useState<{ memberId: string; fullName: string } | null>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    fullName: "", phone: "", whatsapp: "", gender: "",
    dateOfBirth: "", email: "", bloodGroup: "", weight: "", height: "",
    healthConditions: "", intentionOfJoining: "", emergencyContact: "",
    emergencyPhone: "", address: "",
  });

  function set(key: keyof typeof form, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim() || !form.phone.trim()) return;
    setPhase("submitting");
    setError("");

    try {
      const res = await fetch("/api/register-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, primaryCompany: company }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); setPhase("error"); return; }
      setResult(data);
      setPhase("success");
    } catch {
      setError("Network error. Please check your connection and try again.");
      setPhase("error");
    }
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (phase === "success" && result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-5">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900">You're registered!</h2>
          <p className="text-gray-500 text-sm mt-2 leading-relaxed">
            Welcome to {company === "YOS_FITNESS" ? "Yos Fitness" : "Yos Fitness Studio"}, {result.fullName.split(" ")[0]}!
          </p>
          <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Your Member ID</p>
            <p className="text-3xl font-extrabold text-orange-500 tracking-wider">{result.memberId}</p>
            <p className="text-xs text-gray-400 mt-2">Save this — staff will use it to set up your membership</p>
          </div>
          <p className="text-xs text-gray-400 mt-6 leading-relaxed">
            Please visit the front desk with this ID to complete your membership and make your first payment.
          </p>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-orange-400 transition-colors bg-white";
  const labelClass = "block text-xs font-semibold text-gray-600 mb-1.5";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gray-950 px-6 pt-10 pb-8">
        <div className="flex justify-center mb-5">
          <Image src="/Logo.png" alt="Yos Fitness Studio" width={120} height={32}
            className="h-8 w-auto object-contain" priority />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-white leading-tight">Join Us Today</h1>
          <p className="text-gray-400 text-sm mt-1.5">Fill in your details and we'll get you started</p>
        </div>

        {/* Company toggle */}
        <div className="flex mt-6 rounded-2xl overflow-hidden border border-white/10">
          <button type="button"
            onClick={() => setCompany("YOS_FITNESS")}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${company === "YOS_FITNESS" ? "bg-orange-500 text-white" : "bg-white/5 text-gray-400"}`}>
            Yos Fitness
          </button>
          <button type="button"
            onClick={() => setCompany("YOS_FITNESS_STUDIO")}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${company === "YOS_FITNESS_STUDIO" ? "bg-indigo-500 text-white" : "bg-white/5 text-gray-400"}`}>
            Yos Studio
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-5 py-6 space-y-5 max-w-lg mx-auto">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Required fields */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Personal Details</p>

          <div>
            <label className={labelClass}>Full Name <span className="text-orange-500">*</span></label>
            <input className={inputClass} placeholder="e.g. Priya Sharma"
              value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required />
          </div>

          <div>
            <label className={labelClass}>Phone Number <span className="text-orange-500">*</span></label>
            <input className={inputClass} type="tel" placeholder="10-digit mobile number"
              value={form.phone} onChange={(e) => set("phone", e.target.value)} required />
          </div>

          <div>
            <label className={labelClass}>WhatsApp Number <span className="text-gray-300 font-normal">(if different)</span></label>
            <input className={inputClass} type="tel" placeholder="Leave blank if same as phone"
              value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Gender</label>
              <select className={inputClass} value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                <option value="">Select</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Date of Birth</label>
              <input className={inputClass} type="date"
                value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelClass}>What brings you here?</label>
            <select className={inputClass} value={form.intentionOfJoining} onChange={(e) => set("intentionOfJoining", e.target.value)}>
              <option value="">Select a goal</option>
              {INTENTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
        </div>

        {/* Optional section toggle */}
        <button type="button"
          onClick={() => setShowOptional((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
          <span>Additional Details <span className="text-gray-400 font-normal">(optional)</span></span>
          {showOptional ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>

        {showOptional && (
          <div className="space-y-5">

            {/* Contact & Personal */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contact & Address</p>

              <div>
                <label className={labelClass}>Email</label>
                <input className={inputClass} type="email" placeholder="your@email.com"
                  value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>

              <div>
                <label className={labelClass}>Address</label>
                <input className={inputClass} placeholder="Street, area"
                  value={form.address} onChange={(e) => set("address", e.target.value)} />
              </div>
            </div>

            {/* Health */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Health Info</p>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Blood Group</label>
                  <select className={inputClass} value={form.bloodGroup} onChange={(e) => set("bloodGroup", e.target.value)}>
                    <option value="">—</option>
                    {BLOOD_GROUPS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Weight (kg)</label>
                  <input className={inputClass} type="number" placeholder="70"
                    value={form.weight} onChange={(e) => set("weight", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Height (cm)</label>
                  <input className={inputClass} type="number" placeholder="170"
                    value={form.height} onChange={(e) => set("height", e.target.value)} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Health Conditions / Injuries</label>
                <textarea className={`${inputClass} resize-none`} rows={2}
                  placeholder="e.g. Lower back pain, diabetes, knee injury..."
                  value={form.healthConditions} onChange={(e) => set("healthConditions", e.target.value)} />
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Emergency Contact</p>
              <div>
                <label className={labelClass}>Contact Name</label>
                <input className={inputClass} placeholder="Parent / Spouse / Friend"
                  value={form.emergencyContact} onChange={(e) => set("emergencyContact", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Contact Phone</label>
                <input className={inputClass} type="tel" placeholder="10-digit number"
                  value={form.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} />
              </div>
            </div>

          </div>
        )}

        {/* Submit */}
        <button type="submit" disabled={phase === "submitting" || !form.fullName.trim() || !form.phone.trim()}
          className="w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
          style={{ background: company === "YOS_FITNESS" ? "#f97316" : "#6366f1" }}>
          {phase === "submitting" ? <><Spinner /> Submitting...</> : "Submit Registration"}
        </button>

        <p className="text-center text-xs text-gray-400 pb-4">
          Your information is private and used only by Yos Fitness Studio
        </p>

      </form>
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

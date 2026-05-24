"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";

type Phase = "form" | "submitting" | "success" | "error";

const BLOOD_GROUPS = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"];
const GOALS = [
  "Weight Loss", "Muscle Gain", "General Fitness", "Strength Training",
  "Flexibility & Mobility", "Sports Performance", "Rehabilitation", "Other",
];

export default function RegisterPage() {
  const [phase, setPhase] = useState<Phase>("form");
  const [result, setResult] = useState<{ memberId: string; fullName: string } | null>(null);
  const [error, setError] = useState("");

  const [termsAccepted, setTermsAccepted] = useState(false);

  const [form, setForm] = useState({
    fullName: "", phone: "", gender: "", dateOfBirth: "",
    address: "", weight: "", height: "", healthConditions: "",
    // optional
    email: "", bloodGroup: "", emergencyContact: "", emergencyPhone: "",
    intentionOfJoining: "",
  });

  function set(key: keyof typeof form, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  const requiredFilled =
    form.fullName.trim() && form.phone.trim() && form.gender &&
    form.dateOfBirth && form.address.trim() &&
    form.weight && form.height && form.healthConditions.trim() &&
    termsAccepted;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!requiredFilled) return;
    setPhase("submitting");
    setError("");

    try {
      const res = await fetch("/api/register-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          whatsapp: form.phone, // phone is WhatsApp
          primaryCompany: "YOS_FITNESS", // staff assigns correct company later
        }),
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
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-gray-50">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900">You're all set!</h2>
          <p className="text-gray-500 text-sm mt-2 leading-relaxed">
            Thank you for registering, {result.fullName.split(" ")[0]}.<br />
            Please show this to the front desk.
          </p>
          <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Your Member ID</p>
            <p className="text-4xl font-extrabold text-orange-500 tracking-wider">{result.memberId}</p>
            <p className="text-xs text-gray-400 mt-3 leading-relaxed">
              Share this with the front desk to complete your membership and payment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  const inp = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-orange-400 transition-colors bg-white";
  const lbl = "block text-xs font-semibold text-gray-600 mb-1.5";
  const req = <span className="text-orange-500 ml-0.5">*</span>;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-gray-950 px-6 pt-10 pb-8 text-center">
        <div className="flex justify-center mb-5">
          <Image src="/Logo.png" alt="Yos Fitness Studio" width={120} height={32}
            className="h-8 w-auto object-contain" priority />
        </div>
        <h1 className="text-2xl font-extrabold text-white">Member Registration</h1>
        <p className="text-gray-400 text-sm mt-1.5 leading-relaxed">
          Fill in your details below to get started
        </p>
      </div>

      <form onSubmit={handleSubmit} className="px-5 py-6 space-y-4 max-w-lg mx-auto pb-12">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* ── Required ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Required Information</p>

          <div>
            <label className={lbl}>Full Name {req}</label>
            <input className={inp} placeholder="As per ID proof"
              value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required />
          </div>

          <div>
            <label className={lbl}>WhatsApp Number {req}</label>
            <input className={inp} type="tel" inputMode="numeric" placeholder="10-digit number"
              value={form.phone} onChange={(e) => set("phone", e.target.value)} required />
            <p className="text-[11px] text-gray-400 mt-1">We'll use this to send membership updates</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Gender {req}</label>
              <select className={inp} value={form.gender}
                onChange={(e) => set("gender", e.target.value)} required>
                <option value="">Select</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Date of Birth {req}</label>
              <input className={inp} type="date"
                value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} required />
            </div>
          </div>

          <div>
            <label className={lbl}>Address {req}</label>
            <input className={inp} placeholder="Street, area, city"
              value={form.address} onChange={(e) => set("address", e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Weight (kg) {req}</label>
              <input className={inp} type="number" min="20" max="300" placeholder="e.g. 70"
                value={form.weight} onChange={(e) => set("weight", e.target.value)} required />
            </div>
            <div>
              <label className={lbl}>Height (cm) {req}</label>
              <input className={inp} type="number" min="100" max="250" placeholder="e.g. 170"
                value={form.height} onChange={(e) => set("height", e.target.value)} required />
            </div>
          </div>

          <div>
            <label className={lbl}>Health Conditions / Injuries {req}</label>
            <textarea className={`${inp} resize-none`} rows={3}
              placeholder="List any medical conditions, injuries, or medications. Type 'None' if not applicable."
              value={form.healthConditions}
              onChange={(e) => set("healthConditions", e.target.value)} required />
          </div>
        </div>

        {/* ── Additional Info ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Email</label>
              <input className={inp} type="email" placeholder="your@email.com"
                value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Blood Group</label>
              <select className={inp} value={form.bloodGroup} onChange={(e) => set("bloodGroup", e.target.value)}>
                <option value="">—</option>
                {BLOOD_GROUPS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={lbl}>What is your fitness goal?</label>
            <select className={inp} value={form.intentionOfJoining}
              onChange={(e) => set("intentionOfJoining", e.target.value)}>
              <option value="">Select a goal</option>
              {GOALS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div>
            <label className={lbl}>Emergency Contact Name</label>
            <input className={inp} placeholder="Parent / Spouse / Friend"
              value={form.emergencyContact} onChange={(e) => set("emergencyContact", e.target.value)} />
          </div>

          <div>
            <label className={lbl}>Emergency Contact Phone</label>
            <input className={inp} type="tel" inputMode="numeric" placeholder="10-digit number"
              value={form.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} />
          </div>
        </div>

        {/* ── Terms & Conditions ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 pt-4 pb-2 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-widest">Terms of Use &amp; Membership</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Please read carefully before submitting</p>
          </div>

          {/* Scrollable T&C text */}
          <div className="px-5 py-3 max-h-52 overflow-y-auto text-[11.5px] text-gray-600 leading-relaxed space-y-3 bg-gray-50">
            <p className="font-semibold text-gray-800">Your health and safety is of utmost importance to us.</p>

            <div>
              <p className="font-semibold text-gray-700 mb-1">Terms of Use</p>
              <ol className="list-decimal list-outside ml-4 space-y-1.5">
                <li>Members are obligated to inform the management of any conditions that may pose potential risk or hazard to life or health.</li>
                <li>Please keep a pair of shoes exclusive for use at the Gym. Do not use regular footwear within the facilities.</li>
                <li>Please wear appropriate sports clothing at all times.</li>
                <li>Follow all instructions from trainers/instructors. Inform them of any discomfort while exercising or using equipment.</li>
                <li>Assured Results programs are subject to conditions. Please read them carefully.</li>
                <li>Mobile phone usage within the facilities is restricted. It is prohibited while performing exercises or using equipment.</li>
                <li>All gym equipment must be used carefully and only as directed. Management reserves the right to restrict use in case of wilful misuse.</li>
                <li>Smoking and consumption of alcohol within the facilities is strictly prohibited. Members are not allowed in inebriated condition.</li>
                <li>No eatables are allowed within the facilities.</li>
                <li>The management of Yos Fitness takes no responsibility for loss of property or any injuries/damages while using the facilities. <strong>Usage is entirely at the risk of the member.</strong></li>
                <li>I have no objection to publishing my photo/video on social and other media.</li>
              </ol>
            </div>

            <div>
              <p className="font-semibold text-gray-700 mb-1">Terms of Membership &amp; Rights of Admission</p>
              <ol className="list-decimal list-outside ml-4 space-y-1.5">
                <li>Membership to Yos Fitness is non-transferrable.</li>
                <li>Periods of absence cannot be compensated or refunded.</li>
                <li>All members must show proof of membership upon demand (membership card or payment receipt).</li>
                <li>The right of entry is at the discretion of the management. Memberships can be revoked in case of repeated or extreme delinquency.</li>
                <li>Memberships must be renewed within three months from date of expiry, failing which membership may be cancelled.</li>
                <li>Fees are subject to change without notice. Please consult the front desk for queries.</li>
                <li><strong>All fees are payable in advance. No refunds will be entertained under any circumstances.</strong></li>
              </ol>
            </div>

            <p className="text-gray-500 italic">Yos Fitness and its management reserves all rights to amend or modify these terms without notice.</p>

            <div className="border-t border-gray-200 pt-2">
              <p className="font-semibold text-gray-700">Timings</p>
              <p>General: 6:00 am – 12:00 pm &amp; 4:30 pm – 9:00 pm</p>
              <p>Ladies: 12:00 pm – 4:30 pm <span className="text-gray-400">(subject to availability)</span></p>
            </div>
          </div>

          {/* Checkbox */}
          <label className="flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-orange-50 transition-colors">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-500 accent-orange-500 flex-shrink-0"
            />
            <span className="text-xs text-gray-700 leading-relaxed">
              I have read and understood the Terms of Use and Terms of Membership. I agree to abide by all the rules and conditions of Yos Fitness Studio.
            </span>
          </label>
        </div>

        {/* Submit */}
        <button type="submit"
          disabled={!requiredFilled || phase === "submitting"}
          className="w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-40 transition-opacity flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700">
          {phase === "submitting" ? <><Spinner /> Submitting...</> : "Submit Registration →"}
        </button>

        <p className="text-center text-xs text-gray-400 pb-2">
          Your information is private and only shared with Yos Fitness Studio staff
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

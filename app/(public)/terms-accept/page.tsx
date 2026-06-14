"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CheckCircle2, ShieldCheck } from "lucide-react";

type Phase = "loading" | "form" | "submitting" | "success" | "already" | "error" | "notfound";

export default function TermsAcceptPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [memberId, setMemberId] = useState("");
  const [fullName, setFullName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id") ?? "";
    if (!id) { setPhase("error"); setErrorMsg("Invalid link. Please ask the gym for a new one."); return; }
    setMemberId(id);

    fetch(`/api/terms-accept?id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error === "Member not found.") { setPhase("notfound"); return; }
        if (data.error) { setPhase("error"); setErrorMsg(data.error); return; }
        setFullName(data.fullName);
        if (data.termsAcceptedAt) { setPhase("already"); return; }
        setPhase("form");
      })
      .catch(() => { setPhase("error"); setErrorMsg("Network error. Please try again."); });
  }, []);

  async function handleAccept() {
    if (!accepted) return;
    setPhase("submitting");
    try {
      const res = await fetch("/api/terms-accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      const data = await res.json();
      if (!res.ok) { setPhase("error"); setErrorMsg(data.error ?? "Something went wrong."); return; }
      setPhase("success");
    } catch {
      setPhase("error");
      setErrorMsg("Network error. Please try again.");
    }
  }

  // ── Loading ──
  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Already accepted ──
  if (phase === "already") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-16 text-center">
        <ShieldCheck className="h-16 w-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-extrabold text-gray-900">Already Accepted</h2>
        <p className="text-gray-500 text-sm mt-2">
          {fullName.split(" ")[0]}, you&apos;ve already accepted the Yos Fitness membership terms. You&apos;re all set!
        </p>
      </div>
    );
  }

  // ── Success ──
  if (phase === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900">Terms Accepted!</h2>
        <p className="text-gray-500 text-sm mt-2 leading-relaxed">
          Thank you, {fullName.split(" ")[0]}.<br />
          Your acceptance has been recorded. Welcome to Yos Fitness Studio!
        </p>
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Member ID</p>
          <p className="text-3xl font-extrabold text-orange-500 tracking-wider">{memberId}</p>
        </div>
      </div>
    );
  }

  // ── Not found / error ──
  if (phase === "notfound" || phase === "error") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-4xl mb-4">⚠️</p>
        <h2 className="text-xl font-extrabold text-gray-900">
          {phase === "notfound" ? "Member Not Found" : "Something went wrong"}
        </h2>
        <p className="text-gray-500 text-sm mt-2">
          {phase === "notfound"
            ? "This link appears to be invalid. Please contact the gym."
            : errorMsg}
        </p>
      </div>
    );
  }

  // ── Form ──
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gray-950 px-6 pt-10 pb-8 text-center">
        <div className="flex justify-center mb-5">
          <Image src="/Logo.png" alt="Yos Fitness Studio" width={120} height={32}
            className="h-8 w-auto object-contain" priority />
        </div>
        <h1 className="text-2xl font-extrabold text-white">Membership Terms</h1>
        <p className="text-gray-400 text-sm mt-1.5">
          Hi {fullName.split(" ")[0]}! Please read and accept the terms below.
        </p>
      </div>

      <div className="px-5 py-6 space-y-4 max-w-lg mx-auto pb-12">
        {/* T&C card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-4 pb-2 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-widest">Terms of Use &amp; Membership</p>
          </div>

          <div className="px-5 py-4 max-h-[55vh] overflow-y-auto text-[12px] text-gray-600 leading-relaxed space-y-3">
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
                <li>All members must show proof of membership upon demand.</li>
                <li>The right of entry is at the discretion of the management. Memberships can be revoked in case of repeated or extreme delinquency.</li>
                <li>Memberships must be renewed within three months from date of expiry, failing which membership may be cancelled.</li>
                <li>Fees are subject to change without notice.</li>
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
          <label className="flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-orange-50 transition-colors border-t border-gray-100">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-orange-500 flex-shrink-0"
            />
            <span className="text-xs text-gray-700 leading-relaxed">
              I have read and understood the Terms of Use and Terms of Membership. I agree to abide by all the rules and conditions of Yos Fitness Studio.
            </span>
          </label>
        </div>

        <button
          onClick={handleAccept}
          disabled={!accepted || phase === "submitting"}
          className="w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-40 transition-opacity flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700">
          {phase === "submitting"
            ? <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</>
            : "I Accept the Terms →"}
        </button>

        <p className="text-center text-xs text-gray-400 pb-2">
          Your acceptance is recorded with a timestamp. Member ID: {memberId}
        </p>
      </div>
    </div>
  );
}

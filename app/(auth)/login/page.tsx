"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dumbbell, Eye, EyeOff, Loader2, ArrowRight,
  Users, CalendarCheck, TrendingUp, Mail, Lock, Zap,
} from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type LoginForm = z.infer<typeof loginSchema>;

const features = [
  { icon: Users,        title: "Member Management", desc: "Memberships, renewals and payments in one place" },
  { icon: CalendarCheck, title: "Staff Attendance",  desc: "PIN-based check-in with shift tracking"          },
  { icon: TrendingUp,   title: "Revenue Reports",   desc: "Real-time collections and payroll overview"       },
];

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginForm) {
    setError("");
    const result = await signIn("credentials", {
      email: data.email, password: data.password, redirect: false,
    });
    if (result?.error) { setError("Invalid email or password. Please try again."); return; }
    router.push("/staff-tools");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex bg-white">

      {/* ── LEFT BRAND PANEL ── */}
      <div
        className="hidden lg:flex flex-col w-[520px] relative overflow-hidden flex-shrink-0"
        style={{ background: "linear-gradient(150deg, #0c0c0c 0%, #110800 60%, #1a0c00 100%)" }}
      >
        {/* Mesh gradient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full opacity-25"
            style={{ background: "radial-gradient(circle, #f97316 0%, transparent 65%)" }} />
          <div className="absolute -bottom-40 -right-20 w-[420px] h-[420px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #ea580c 0%, transparent 65%)" }} />
          <div className="absolute top-1/2 -left-10 w-[260px] h-[260px] rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #fb923c 0%, transparent 65%)" }} />
        </div>

        {/* Dot-grid texture */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Diagonal accent line */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(45deg, rgba(249,115,22,0.6) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative flex flex-col h-full p-12">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="rounded-2xl p-2.5 shadow-2xl ring-1 ring-orange-400/20"
              style={{
                background: "linear-gradient(135deg, #f97316, #ea580c)",
                boxShadow: "0 8px 32px -4px rgba(249,115,22,0.5)",
              }}
            >
              <Dumbbell className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-white font-extrabold text-xl leading-none uppercase tracking-wide">
                Yos Fitness Studio
              </p>
              <p className="text-orange-400/50 text-xs mt-0.5 uppercase tracking-[0.2em]">
                Mylapore, Chennai
              </p>
            </div>
          </div>

          {/* Headline block */}
          <div className="mt-auto">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              <span className="text-orange-400 text-xs font-bold uppercase tracking-widest">
                Built for Yos Fitness
              </span>
            </div>

            <h1 className="text-[3.2rem] font-extrabold text-white leading-[1.05] tracking-tight uppercase">
              Your gym,<br />
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: "linear-gradient(90deg, #fb923c 0%, #f97316 50%, #ea580c 100%)" }}
              >
                fully in control.
              </span>
            </h1>
            <p className="text-gray-400 mt-5 text-[0.95rem] leading-relaxed max-w-[340px]">
              Everything your gym runs on — in one place.
            </p>

            {/* Feature list */}
            <div className="mt-10 space-y-4">
              {features.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4 group cursor-default">
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-2.5 flex-shrink-0 mt-0.5 group-hover:bg-orange-500/20 group-hover:border-orange-400/30 transition-all duration-200">
                    <Icon className="h-4 w-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold uppercase tracking-wide">{title}</p>
                    <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto pt-10 border-t border-white/[0.06]">
            <p className="text-gray-700 text-xs uppercase tracking-widest">
              © 2026 Yos Fitness Studio · Mylapore, Chennai
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT SIGN-IN PANEL ── */}
      <div
        className="flex-1 flex items-center justify-center p-8"
        style={{ background: "linear-gradient(160deg, #fafafa 0%, #fff8f4 45%, #fafafa 100%)" }}
      >
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="rounded-xl p-2.5" style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}>
              <Dumbbell className="h-6 w-6 text-white" />
            </div>
            <span className="text-gray-900 font-extrabold text-2xl uppercase tracking-wide">
              Yos Fitness Studio
            </span>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl border border-gray-100 p-8"
            style={{ boxShadow: "0 24px 64px -12px rgba(0,0,0,0.1), 0 4px 16px -4px rgba(249,115,22,0.08)" }}
          >

            {/* Card header */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-100 rounded-full px-3 py-1 mb-5">
                <Zap className="h-3 w-3 text-orange-500 fill-orange-500" />
                <span className="text-orange-600 text-[10px] font-extrabold uppercase tracking-[0.18em]">
                  Manager Portal
                </span>
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900 uppercase tracking-tight leading-none">
                Sign In
              </h2>
              <p className="text-gray-400 text-sm mt-2">
                Good to see you. Let's get to work.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              {error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[10px] font-black">!</span>
                  </div>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-[0.15em]">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="admin@yosfitness.in"
                    autoComplete="email"
                    className="w-full border-2 border-gray-100 bg-gray-50/80 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-orange-400 focus:bg-white transition-all duration-200 placeholder:text-gray-300"
                  />
                </div>
                {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-[0.15em]">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full border-2 border-gray-100 bg-gray-50/80 rounded-xl pl-10 pr-12 py-3 text-sm focus:outline-none focus:border-orange-400 focus:bg-white transition-all duration-200 placeholder:text-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 text-white font-extrabold rounded-xl py-3.5 text-sm transition-all mt-2 uppercase tracking-widest disabled:opacity-60"
                style={{
                  background: isSubmitting
                    ? "#f97316"
                    : "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                  boxShadow: "0 8px 24px -4px rgba(249,115,22,0.45), 0 2px 8px -2px rgba(234,88,12,0.3)",
                }}
              >
                {isSubmitting
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <ArrowRight className="h-4 w-4" />}
                {isSubmitting ? "Signing in..." : "Sign in to Dashboard"}
              </button>

            </form>

            <p className="text-center text-[11px] text-gray-400 mt-6 uppercase tracking-wide">
              Forgot your password?{" "}
              <a
                href="https://wa.me/919840690418?text=Hi%2C+I+need+help+resetting+my+Yos+CRM+login+password."
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-500 hover:text-orange-600 font-bold uppercase transition-colors"
              >
                Contact admin on WhatsApp
              </a>
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}

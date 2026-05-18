"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dumbbell, Eye, EyeOff, Loader2, ArrowRight, Users, CalendarCheck, TrendingUp } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type LoginForm = z.infer<typeof loginSchema>;

const features = [
  { icon: Users, title: "Member Management", desc: "Track 400+ members across both gyms" },
  { icon: CalendarCheck, title: "Quick Attendance", desc: "One-tap check-in at the front desk" },
  { icon: TrendingUp, title: "Revenue Reports", desc: "Real-time collections per company" },
];

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginForm) {
    setError("");
    const result = await signIn("credentials", { email: data.email, password: data.password, redirect: false });
    if (result?.error) { setError("Invalid email or password. Please try again."); return; }
    router.push("/employee-attendance");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* ── Left brand panel ── */}
      <div className="hidden lg:flex flex-col w-[520px] bg-gray-950 relative overflow-hidden flex-shrink-0">
        {/* Gradient blobs */}
        <div className="absolute top-[-80px] left-[-80px] w-[360px] h-[360px] rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute bottom-[-100px] right-[-60px] w-[300px] h-[300px] rounded-full bg-orange-600/15 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full bg-orange-400/10 blur-2xl" />

        <div className="relative flex flex-col h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 rounded-2xl p-2.5 shadow-2xl shadow-orange-900/40">
              <Dumbbell className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-white font-extrabold text-xl leading-none">Yos CRM</p>
              <p className="text-gray-500 text-xs mt-0.5">Fitness Management Platform</p>
            </div>
          </div>

          {/* Headline */}
          <div className="mt-auto">
            <h1 className="text-5xl font-extrabold text-white leading-[1.1] tracking-tight">
              Your gym,<br />
              <span className="text-orange-400">fully in control.</span>
            </h1>
            <p className="text-gray-400 mt-5 text-base leading-relaxed max-w-sm">
              Members, attendance, renewals, payments and payroll — all in one streamlined dashboard.
            </p>

            {/* Feature list */}
            <div className="mt-10 space-y-5">
              {features.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="bg-orange-500/15 border border-orange-500/20 rounded-xl p-2.5 flex-shrink-0 mt-0.5">
                    <Icon className="h-4 w-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{title}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto pt-12">
            <p className="text-gray-700 text-xs">© 2026 Yos Fitness · Yos Fitness Studio · Bengaluru</p>
          </div>
        </div>
      </div>

      {/* ── Right sign-in panel ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="bg-orange-500 rounded-xl p-2.5">
              <Dumbbell className="h-6 w-6 text-white" />
            </div>
            <span className="text-gray-900 font-extrabold text-2xl">Yos CRM</span>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/80 border border-gray-100 p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-extrabold text-gray-900">Sign in</h2>
              <p className="text-gray-500 text-sm mt-1">Welcome back — enter your credentials below</p>
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

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800">Email</label>
                <input
                  {...register("email")}
                  type="email"
                  placeholder="admin@yosfitness.in"
                  autoComplete="email"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 transition-colors placeholder:text-gray-400"
                />
                {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-800">Password</label>
                <div className="relative">
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm pr-12 focus:outline-none focus:border-orange-400 transition-colors placeholder:text-gray-400"
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-60 text-white font-bold rounded-xl py-3.5 text-sm transition-all shadow-lg shadow-orange-200 mt-2"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {isSubmitting ? "Signing in..." : "Sign in to dashboard"}
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}

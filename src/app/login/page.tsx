"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles } from "lucide-react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email) e.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email.";
    if (!form.password) e.password = "Password is required.";
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setTimeout(() => setLoading(false), 2000); // placeholder
  };

  return (
    <div className="flex min-h-screen bg-[#F8F6F1]">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-[#1A1817] p-14 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full bg-[#2A6558]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-[#2A6558]/10 blur-3xl" />
        <Link href="/" className="flex items-center gap-2 relative z-10">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2A6558] text-white font-bold text-sm">V</span>
          <span className="text-xl font-bold tracking-tight text-white">Ven<span className="text-[#7BC4B8]">YOU</span></span>
        </Link>
        <div className="relative z-10">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white/60">
            <Sparkles size={11} /> AI-Powered Venue Discovery
          </span>
          <h2 className="text-4xl font-extrabold leading-tight text-white mb-4">
            Welcome Back.<br />
            <span className="text-[#7BC4B8]">Let&apos;s Find Your Next Venue.</span>
          </h2>
          <p className="text-[#A8A0A0] leading-relaxed max-w-sm">
            Log back in to view your saved events, pick up where you left off, and discover new AI-matched venues.
          </p>
        </div>
        <div className="relative z-10">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm italic text-white/70 mb-3">
              &quot;VenYOU found us the most beautiful garden venue in 20 seconds — we booked immediately!&quot;
            </p>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#2A6558] to-[#7BC4B8]" />
              <div>
                <p className="text-xs font-semibold text-white">Maria Santos</p>
                <p className="text-[10px] text-white/50">Wedding Planner · Manila</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="mb-10 flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2A6558] text-white font-bold text-sm">V</span>
            <span className="text-xl font-bold tracking-tight text-[#1A1817]">Ven<span className="text-[#2A6558]">YOU</span></span>
          </Link>

          <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-[#1A1817]">Sign In</h1>
          <p className="mb-8 text-sm text-[#7C7671]">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-[#2A6558] hover:underline">Create one</Link>
          </p>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#1A1817]">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C7671]" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className={`w-full rounded-xl border bg-white py-3 pl-10 pr-4 text-sm text-[#1A1817] outline-none placeholder:text-[#C4BDBA] transition focus:border-[#2A6558] focus:ring-2 focus:ring-[#2A6558]/20 ${
                    errors.email ? "border-[#C0392B]" : "border-[#E0DDD5]"
                  }`}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-[#C0392B]">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-[#1A1817]">Password</label>
                <Link href="/forgot-password" className="text-xs text-[#2A6558] hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C7671]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className={`w-full rounded-xl border bg-white py-3 pl-10 pr-10 text-sm text-[#1A1817] outline-none placeholder:text-[#C4BDBA] transition focus:border-[#2A6558] focus:ring-2 focus:ring-[#2A6558]/20 ${
                    errors.password ? "border-[#C0392B]" : "border-[#E0DDD5]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7C7671] hover:text-[#1A1817]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-[#C0392B]">{errors.password}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#2A6558] py-3 text-sm font-semibold text-white transition hover:bg-[#215249] disabled:opacity-60"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>Sign In <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 border-t border-[#E0DDD5]" />
            <span className="text-xs text-[#7C7671]">or continue with</span>
            <div className="flex-1 border-t border-[#E0DDD5]" />
          </div>

          {/* Social buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 rounded-xl border border-[#E0DDD5] bg-white py-2.5 text-sm font-medium text-[#1A1817] transition hover:border-[#2A6558]">
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
              Google
            </button>
            <button className="flex items-center justify-center gap-2 rounded-xl border border-[#E0DDD5] bg-white py-2.5 text-sm font-medium text-[#1A1817] transition hover:border-[#2A6558]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Facebook
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/lib/ToastContext";
import { buildAuthRedirectUrl } from "@/lib/authRedirect";
import { ROUTES } from "@/lib/routes";

function sanitizeRedirectPath(nextPath: string | null) {
  if (!nextPath) return "/dashboard";
  if (!nextPath.startsWith("/")) return "/dashboard";
  if (nextPath.startsWith("//")) return "/dashboard";
  if (nextPath === ROUTES.admin || nextPath.startsWith(`${ROUTES.admin}/`)) {
    return "/dashboard";
  }
  if (nextPath === ROUTES.login || nextPath === ROUTES.register || nextPath.startsWith("/auth/")) {
    return "/dashboard";
  }
  return nextPath;
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { error: showError, success } = useToast();

  const redirectPath = useMemo(
    () => sanitizeRedirectPath(searchParams.get("next")),
    [searchParams]
  );

  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email.";
    if (!form.password) e.password = "Password is required.";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim().toLowerCase(),
      password: form.password,
    });

    if (error) {
      const normalized = error.message.toLowerCase();
      const message =
        normalized.includes("email not confirmed")
          ? "Please verify your email before signing in."
          : normalized.includes("invalid") || normalized.includes("credentials")
          ? "Invalid email or password."
          : "Unable to sign in right now. Please try again.";

      setErrors({ auth: message });
      showError("Sign in failed", message);
      setLoading(false);
      return;
    }

    const { data: adminProfile } = await supabase.rpc("current_admin_profile");
    const isAdmin = Array.isArray(adminProfile) && adminProfile.length > 0;

    success("Signed in", "Welcome back to VenYOU.");
    router.replace(isAdmin ? ROUTES.admin : redirectPath);
    router.refresh();
  };

  const handleOAuthLogin = async (provider: "google" | "github") => {
    setOauthLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: buildAuthRedirectUrl("/register"),
      },
    });

    if (error) {
      const providerName = provider === "google" ? "Google" : "GitHub";
      showError(`${providerName} sign in failed`, "Please try again.");
      setOauthLoading(null);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#F8F6F1]">
      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        <div className="absolute inset-y-0 left-0 w-1/2 bg-[#1A1817]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1440px]">
        <div className="relative hidden overflow-hidden bg-[#1A1817] p-14 lg:flex lg:w-1/2 lg:flex-col lg:justify-between">
          <Link href="/" className="relative z-10 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2A6558] text-sm font-bold text-white">
              V
            </span>
            <span className="text-xl font-bold tracking-tight text-white">
              Ven<span className="text-[#7BC4B8]">YOU</span>
            </span>
          </Link>

          <div className="relative z-10">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white/60">
              <Sparkles size={11} /> AI-Powered Venue Discovery
            </span>
            <h2 className="mb-4 text-4xl font-extrabold leading-tight text-white">
              Welcome Back.
              <br />
              <span className="text-[#7BC4B8]">Find Your Next Venue Faster.</span>
            </h2>
            <p className="max-w-sm leading-relaxed text-[#A8A0A0]">
              Sign in to manage your events, review venue matches, and continue planning with your saved preferences.
            </p>
          </div>

          <div className="relative z-10 rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="mb-3 text-sm italic text-white/70">
              &quot;VenYOU helped us pick a venue in minutes instead of weeks.&quot;
            </p>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-[#2A6558]" />
              <div>
                <p className="text-xs font-semibold text-white">Maria Santos</p>
                <p className="text-[10px] text-white/50">Wedding Planner - Manila</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
          <div className="w-full max-w-md">
            <Link href="/" className="mb-10 flex items-center gap-2 lg:hidden">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2A6558] text-sm font-bold text-white">
                V
              </span>
              <span className="text-xl font-bold tracking-tight text-[#1A1817]">
                Ven<span className="text-[#2A6558]">YOU</span>
              </span>
            </Link>

            <Link
              href="/"
              className="mb-4 inline-flex items-center text-sm font-medium text-[#2A6558] hover:underline"
            >
              ← Back to Home
            </Link>

            <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-[#1A1817]">Sign In</h1>
            <p className="mb-8 text-sm text-[#7C7671]">
              Do not have an account?{" "}
              <Link href="/register" className="font-semibold text-[#2A6558] hover:underline">
                Create one
              </Link>
            </p>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#1A1817]">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C7671]" />
                  <input
                    type="email"
                    autoComplete="email"
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

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#1A1817]">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C7671]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Enter your password"
                    className={`w-full rounded-xl border bg-white py-3 pl-10 pr-10 text-sm text-[#1A1817] outline-none placeholder:text-[#C4BDBA] transition focus:border-[#2A6558] focus:ring-2 focus:ring-[#2A6558]/20 ${
                      errors.password ? "border-[#C0392B]" : "border-[#E0DDD5]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7C7671] hover:text-[#1A1817]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-[#C0392B]">{errors.password}</p>}
              </div>

              {errors.auth && (
                <p className="rounded-xl border border-[#F2C5BE] bg-[#FDECEA] px-3 py-2 text-xs text-[#C0392B]">
                  {errors.auth}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || Boolean(oauthLoading)}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#2A6558] py-3 text-sm font-semibold text-white transition hover:bg-[#215249] disabled:opacity-60"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    Sign In <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 border-t border-[#E0DDD5]" />
              <span className="text-xs text-[#7C7671]">or continue with</span>
              <div className="flex-1 border-t border-[#E0DDD5]" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => void handleOAuthLogin("google")}
                disabled={Boolean(oauthLoading)}
                className="flex items-center justify-center gap-2 rounded-xl border border-[#E0DDD5] bg-white py-2.5 text-sm font-medium text-[#1A1817] transition hover:border-[#2A6558] disabled:opacity-60"
              >
                {oauthLoading === "google" ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1A1817] border-t-transparent" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                    <path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/>
                    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
                  </svg>
                )}
                Google
              </button>

              <button
                type="button"
                onClick={() => void handleOAuthLogin("github")}
                disabled={Boolean(oauthLoading)}
                className="flex items-center justify-center gap-2 rounded-xl border border-[#E0DDD5] bg-white py-2.5 text-sm font-medium text-[#1A1817] transition hover:border-[#2A6558] disabled:opacity-60"
              >
                {oauthLoading === "github" ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1A1817] border-t-transparent" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#1A1817">
                    <path d="M12 2C6.477 2 2 6.591 2 12.253c0 4.529 2.865 8.372 6.839 9.728.5.095.682-.22.682-.49 0-.24-.008-.875-.013-1.717-2.782.617-3.369-1.377-3.369-1.377-.455-1.17-1.11-1.48-1.11-1.48-.908-.635.069-.622.069-.622 1.004.072 1.532 1.055 1.532 1.055.892 1.568 2.341 1.115 2.91.853.091-.663.35-1.116.636-1.373-2.22-.258-4.555-1.138-4.555-5.066 0-1.119.389-2.034 1.028-2.75-.103-.259-.446-1.303.098-2.717 0 0 .84-.276 2.75 1.05A9.399 9.399 0 0 1 12 6.872c.85.004 1.705.117 2.504.344 1.909-1.326 2.748-1.05 2.748-1.05.546 1.414.203 2.458.1 2.717.64.716 1.027 1.631 1.027 2.75 0 3.938-2.339 4.804-4.566 5.057.359.318.678.945.678 1.905 0 1.375-.012 2.484-.012 2.822 0 .272.18.59.688.49C19.138 20.621 22 16.779 22 12.253 22 6.591 17.523 2 12 2z" />
                  </svg>
                )}
                GitHub
              </button>
            </div>

            <p className="mt-3 text-center text-xs text-[#7C7671]">
              New social accounts will continue to the step-by-step registration flow.
            </p>

            <p className="mt-6 text-center text-xs text-[#7C7671]">
              Protected by Supabase Auth with secure session cookies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F8F6F1]">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A6558] border-t-transparent" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StepIndicator from "@/components/StepIndicator";
import LegalModal from "@/components/LegalModal";
import { privacyPolicy, termsOfService } from "@/lib/legalContent";
import { useToast } from "@/lib/ToastContext";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/AuthContext";
import { buildAuthRedirectUrl } from "@/lib/authRedirect";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

const requirements = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
];

const registerSteps = [
  { id: 1, label: "Account" },
  { id: 2, label: "Questions" },
  { id: 3, label: "Verify" },
  { id: 4, label: "Terms" },
];

const planningForOptions = [
  "My own event",
  "A client",
  "My company",
  "Family or friend",
];

const eventTypeOptions = [
  "Wedding",
  "Birthday",
  "Corporate",
  "Debut",
  "Workshop",
  "Other",
];

const timelineOptions = ["Within 1 month", "1-3 months", "3-6 months", "6+ months"];

interface RegisterForm {
  fullName: string;
  email: string;
  password: string;
  planningFor: string;
  eventType: string;
  eventTimeline: string;
  agreeTerms: boolean;
  agreePrivacy: boolean;
  newsletter: boolean;
}

const emailRegex = /\S+@\S+\.\S+/;
type LegalKey = "terms" | "privacy" | null;

type CompletionState = "needs_verification" | "signed_in" | null;

function resolveDisplayName(metadata: Record<string, unknown> | undefined) {
  const options = [
    metadata?.full_name,
    metadata?.name,
    metadata?.user_name,
    metadata?.preferred_username,
  ];

  const value = options.find(
    (item): item is string => typeof item === "string" && item.trim().length > 0
  );

  return value?.trim() ?? "";
}

export default function RegisterPage() {
  const router = useRouter();
  const { error: showError, success } = useToast();
  const { user, needsOnboarding, signOut } = useAuth();

  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<RegisterForm>({
    fullName: "",
    email: "",
    password: "",
    planningFor: "",
    eventType: "",
    eventTimeline: "",
    agreeTerms: false,
    agreePrivacy: false,
    newsletter: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [openLegal, setOpenLegal] = useState<LegalKey>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);
  const [terminating, setTerminating] = useState(false);
  const [done, setDone] = useState<CompletionState>(null);

  const isSocialOnboarding = Boolean(
    user?.app_metadata?.provider && user.app_metadata.provider !== "email"
  );
  const prefilledName = isSocialOnboarding
    ? resolveDisplayName((user?.user_metadata ?? {}) as Record<string, unknown>)
    : "";
  const prefilledEmail = isSocialOnboarding ? user?.email ?? "" : "";
  const fullNameValue = form.fullName || prefilledName;
  const emailValue = form.email || prefilledEmail;
  const hasPendingOnboardingSession = needsOnboarding;

  useEffect(() => {
    return () => {
      if (hasPendingOnboardingSession && !done) {
        void supabase.auth.signOut();
      }
    };
  }, [done, hasPendingOnboardingSession]);

  const handleCancelRegistration = async () => {
    setTerminating(true);
    try {
      await signOut();
      router.replace("/login");
    } catch {
      showError("Unable to cancel sign up", "Please try again.");
      setTerminating(false);
    }
  };

  const handleOAuthSignUp = async (provider: "google" | "github") => {
    setOauthLoading(provider);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: buildAuthRedirectUrl("/register"),
      },
    });

    if (error) {
      const providerName = provider === "google" ? "Google" : "GitHub";
      showError(`${providerName} sign up failed`, "Please try again.");
      setOauthLoading(null);
    }
  };

  const validateStep = (targetStep: number) => {
    const e: Record<string, string> = {};

    if (targetStep === 1) {
      if (!fullNameValue.trim()) e.fullName = "Full name is required.";
      if (!emailValue) e.email = "Email is required.";
      else if (!emailRegex.test(emailValue)) e.email = "Enter a valid email.";
      if (!isSocialOnboarding) {
        if (!form.password) e.password = "Password is required.";
        else if (form.password.length < 8) e.password = "Password must be at least 8 characters.";
        else if (!/[A-Z]/.test(form.password)) e.password = "Password must include an uppercase letter.";
        else if (!/\d/.test(form.password)) e.password = "Password must include a number.";
      }
    }

    if (targetStep === 2) {
      if (!form.planningFor) e.planningFor = "Please choose who this account is for.";
      if (!form.eventType) e.eventType = "Select your most common event type.";
      if (!form.eventTimeline) e.eventTimeline = "Pick your event timeline.";
    }

    if (targetStep === 4) {
      if (!form.agreeTerms) e.agreeTerms = "You must agree to the terms.";
      if (!form.agreePrivacy) e.agreePrivacy = "You must accept the privacy policy.";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(registerSteps.length, s + 1));
  };

  const backStep = () => {
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step < registerSteps.length) {
      nextStep();
      return;
    }

    if (!validateStep(step)) return;

    setLoading(true);
    setErrors({});

    const metadataPayload = {
      full_name: fullNameValue.trim(),
      planning_for: form.planningFor,
      event_type: form.eventType,
      event_timeline: form.eventTimeline,
      newsletter: form.newsletter,
      agreed_terms_at: new Date().toISOString(),
      agreed_privacy_at: new Date().toISOString(),
      onboarding_complete: true,
    };

    if (isSocialOnboarding) {
      const { error } = await supabase.auth.updateUser({
        data: metadataPayload,
      });

      if (error) {
        setErrors({ auth: "Unable to finish registration right now. Please try again." });
        showError("Registration incomplete", "Please try again.");
        setLoading(false);
        return;
      }

      await supabase.auth.refreshSession();

      setLoading(false);
      success("Account updated", "Registration complete. Welcome to VenYOU.");
      setDone("signed_in");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: emailValue.trim().toLowerCase(),
      password: form.password,
      options: {
        data: metadataPayload,
      },
    });

    if (error) {
      const message = error.message.toLowerCase().includes("already")
        ? "An account with this email already exists. Try signing in."
        : "Unable to create account right now. Please try again.";

      setErrors({ auth: message });
      showError("Sign up failed", message);
      setLoading(false);
      return;
    }

    setLoading(false);

    if (data.session) {
      success("Account created", "Welcome to VenYOU.");
      setDone("signed_in");
      return;
    }

    success("Verify your email", "We sent a confirmation link to your inbox.");
    setDone("needs_verification");
  };

  const stepTitle =
    step === 1
      ? "Account Details"
      : step === 2
        ? "A Few Quick Questions"
        : step === 3
          ? "Verify Your Email"
          : "Terms and Conditions";

  const stepDescription =
    step === 1
      ? isSocialOnboarding
        ? "Confirm your name and email from social sign in."
        : "Set up your name, email, and password."
      : step === 2
        ? "We use these answers to personalize recommendations."
        : step === 3
          ? isSocialOnboarding
            ? "Social accounts are already verified. Review before completing signup."
            : "After account creation, we send a secure email verification link."
          : "Review and accept before creating your account.";

  const primaryActionLabel =
    loading
      ? isSocialOnboarding
        ? "Finalizing..."
        : "Creating account..."
      : step === registerSteps.length
        ? isSocialOnboarding
          ? "Complete Registration"
          : "Create Account"
        : "Continue";

  const activeDocument =
    openLegal === "terms" ? termsOfService : openLegal === "privacy" ? privacyPolicy : null;

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F6F1] px-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#EAF2F0]">
            <CheckCircle2 size={40} className="text-[#2A6558]" />
          </div>

          {done === "signed_in" ? (
            <>
              <h2 className="mb-3 text-3xl font-extrabold text-[#1A1817]">You are In</h2>
              <p className="mb-8 text-[#7C7671]">
                Welcome to VenYOU, {fullNameValue.split(" ")[0] || "there"}. Your account is ready.
              </p>
              <button
                type="button"
                onClick={() => router.replace("/dashboard")}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2A6558] py-3 text-sm font-semibold text-white hover:bg-[#215249]"
              >
                Go to Dashboard <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <>
              <h2 className="mb-3 text-3xl font-extrabold text-[#1A1817]">Check Your Email</h2>
              <p className="mb-8 text-[#7C7671]">
                We sent a verification link to <strong>{emailValue}</strong>. Confirm your email, then sign in.
              </p>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 rounded-xl bg-[#2A6558] py-3 text-sm font-semibold text-white hover:bg-[#215249]"
              >
                Go to Sign In <ArrowRight size={16} />
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#F8F6F1]">
      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        <div className="absolute inset-y-0 left-0 w-1/2 bg-[#2A6558]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1440px]">
        <div className="relative hidden overflow-hidden bg-[#2A6558] p-14 lg:flex lg:w-1/2 lg:flex-col lg:justify-between">

        <Link href="/" className="relative z-10 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold text-[#2A6558]">V</span>
          <span className="text-xl font-bold tracking-tight text-white">VenYOU</span>
        </Link>

        <div className="relative z-10">
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-white">
            Join VenYOU.
            <br />
            <span className="text-[#C8E0DA]">Smart planning starts here.</span>
          </h2>
          <p className="mb-8 max-w-sm leading-relaxed text-white/70">
            Complete a short onboarding flow to unlock AI-powered venue discovery built around your event needs.
          </p>
          <div className="flex flex-col gap-3">
            {["Step-by-step onboarding", "Secure authentication", "Profile-based recommendations", "Transparent terms acceptance"].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 size={16} className="shrink-0 text-white" />
                <span className="text-sm text-white/80">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/40">You can go back between steps anytime before submission.</p>
      </div>

        <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
          <div className="w-full max-w-md">
          <Link href="/" className="mb-10 flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2A6558] text-sm font-bold text-white">V</span>
            <span className="text-xl font-bold tracking-tight text-[#1A1817]">
              Ven<span className="text-[#2A6558]">YOU</span>
            </span>
          </Link>

          <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-[#1A1817]">Create Account</h1>
          <p className="mb-6 text-sm text-[#7C7671]">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#2A6558] hover:underline">
              Sign in
            </Link>
          </p>

          {!isSocialOnboarding ? (
            <>
              <div className="mb-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => void handleOAuthSignUp("google")}
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
                  onClick={() => void handleOAuthSignUp("github")}
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

              <p className="mb-6 text-center text-xs text-[#7C7671]">
                Google/GitHub pre-fills your name and email. You still complete all steps and accept terms.
              </p>
            </>
          ) : (
            <div className="mb-6 rounded-xl border border-[#C8E0DA] bg-[#EAF2F0] px-3 py-3">
              <p className="text-center text-xs text-[#215249]">
                Social sign in connected. Continue the steps below to finish registration.
              </p>
              <button
                type="button"
                onClick={() => void handleCancelRegistration()}
                disabled={terminating}
                className="mt-2 w-full rounded-lg border border-[#2A6558]/30 bg-white px-3 py-2 text-xs font-semibold text-[#2A6558] transition hover:bg-[#F8F6F1] disabled:opacity-60"
              >
                {terminating ? "Cancelling..." : "Cancel Sign Up"}
              </button>
            </div>
          )}

          <div className="mb-8 rounded-2xl border border-[#E0DDD5] bg-white px-5 py-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#7C7671]">
              Step {step} of {registerSteps.length}
            </p>
            <StepIndicator steps={registerSteps} currentStep={step} />
          </div>

          <form onSubmit={handleSubmit} noValidate className="rounded-2xl border border-[#E0DDD5] bg-white p-6 md:p-7">
            <div className="mb-6">
              <h2 className="text-2xl font-extrabold text-[#1A1817]">{stepTitle}</h2>
              <p className="mt-1 text-sm text-[#7C7671]">{stepDescription}</p>
            </div>

            {step === 1 && (
              <div className="flex flex-col gap-5 page-fade">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#1A1817]">Full Name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C7671]" />
                    <input
                      type="text"
                      autoComplete="name"
                      value={fullNameValue}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      placeholder="Juan dela Cruz"
                      className={`w-full rounded-xl border bg-white py-3 pl-10 pr-4 text-sm text-[#1A1817] outline-none placeholder:text-[#C4BDBA] transition focus:border-[#2A6558] focus:ring-2 focus:ring-[#2A6558]/20 ${
                        errors.fullName ? "border-[#C0392B]" : "border-[#E0DDD5]"
                      }`}
                    />
                  </div>
                  {errors.fullName && <p className="mt-1 text-xs text-[#C0392B]">{errors.fullName}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#1A1817]">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C7671]" />
                    <input
                      type="email"
                      autoComplete="email"
                      value={emailValue}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="you@example.com"
                      className={`w-full rounded-xl border bg-white py-3 pl-10 pr-4 text-sm text-[#1A1817] outline-none placeholder:text-[#C4BDBA] transition focus:border-[#2A6558] focus:ring-2 focus:ring-[#2A6558]/20 ${
                        errors.email ? "border-[#C0392B]" : "border-[#E0DDD5]"
                      }`}
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-xs text-[#C0392B]">{errors.email}</p>}
                </div>

                {!isSocialOnboarding ? (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#1A1817]">Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C7671]" />
                      <input
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="Create a strong password"
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

                    {form.password.length > 0 && (
                      <div className="mt-2 flex flex-col gap-1">
                        {requirements.map((req) => (
                          <div key={req.label} className="flex items-center gap-1.5">
                            <div
                              className={`h-1.5 w-1.5 rounded-full ${
                                req.test(form.password) ? "bg-[#2A6558]" : "bg-[#E0DDD5]"
                              }`}
                            />
                            <span className={`text-xs ${req.test(form.password) ? "text-[#2A6558]" : "text-[#7C7671]"}`}>
                              {req.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="rounded-xl border border-[#E0DDD5] bg-[#F8F6F1] px-3 py-2 text-xs text-[#7C7671]">
                    Password is managed by your social provider for this account.
                  </p>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-6 page-fade">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#1A1817]">Who are you planning for?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {planningForOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setForm({ ...form, planningFor: option })}
                        className={`rounded-xl border px-3 py-2.5 text-sm transition ${
                          form.planningFor === option
                            ? "border-[#2A6558] bg-[#EAF2F0] font-semibold text-[#2A6558]"
                            : "border-[#E0DDD5] text-[#7C7671] hover:border-[#2A6558]"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {errors.planningFor && <p className="mt-1 text-xs text-[#C0392B]">{errors.planningFor}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#1A1817]">Most common event type</label>
                  <select
                    value={form.eventType}
                    onChange={(e) => setForm({ ...form, eventType: e.target.value })}
                    className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558] focus:ring-2 focus:ring-[#2A6558]/20 ${
                      errors.eventType ? "border-[#C0392B]" : "border-[#E0DDD5]"
                    }`}
                  >
                    <option value="">Select an event type</option>
                    {eventTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {errors.eventType && <p className="mt-1 text-xs text-[#C0392B]">{errors.eventType}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#1A1817]">When is your next event?</label>
                  <div className="flex flex-col gap-2">
                    {timelineOptions.map((option) => (
                      <label
                        key={option}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition ${
                          form.eventTimeline === option
                            ? "border-[#2A6558] bg-[#EAF2F0]"
                            : "border-[#E0DDD5] bg-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name="eventTimeline"
                          value={option}
                          checked={form.eventTimeline === option}
                          onChange={(e) => setForm({ ...form, eventTimeline: e.target.value })}
                          className="h-4 w-4 accent-[#2A6558]"
                        />
                        <span className={form.eventTimeline === option ? "font-semibold text-[#2A6558]" : "text-[#7C7671]"}>
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>
                  {errors.eventTimeline && <p className="mt-1 text-xs text-[#C0392B]">{errors.eventTimeline}</p>}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col gap-5 page-fade">
                <div className="rounded-xl border border-[#C8E0DA] bg-[#EAF2F0] p-4 text-sm text-[#215249]">
                  <div className="mb-1.5 flex items-center gap-2 font-semibold">
                    <ShieldCheck size={16} />
                    Email verification
                  </div>
                  {isSocialOnboarding ? (
                    <p>
                      Your <strong>{user?.app_metadata?.provider ?? "social"}</strong> account already verified{" "}
                      <strong>{emailValue || "your email"}</strong>. Continue to terms.
                    </p>
                  ) : (
                    <p>
                      After creating your account, we will send a secure verification link to <strong>{emailValue || "your email"}</strong>.
                    </p>
                  )}
                </div>
                <p className="rounded-xl border border-[#E0DDD5] bg-[#F8F6F1] px-3 py-2 text-xs text-[#1A1817]">
                  {isSocialOnboarding
                    ? "Social sign in pre-fills basic info. You still need to complete all onboarding steps."
                    : "Verification protects your account and ensures only you can access your event data."}
                </p>
              </div>
            )}

            {step === 4 && (
              <div className="flex flex-col gap-5 page-fade">
                <div className="rounded-xl border border-[#E0DDD5] bg-[#F8F6F1] p-4 text-sm text-[#7C7671]">
                  <p className="mb-2 font-semibold text-[#1A1817]">Before we create your account:</p>
                  <p>Please review and accept the agreements below. This is required to continue using VenYOU.</p>
                </div>

                <div>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={form.agreeTerms}
                      onChange={(e) => setForm({ ...form, agreeTerms: e.target.checked })}
                      className="mt-0.5 h-4 w-4 rounded border-[#E0DDD5] accent-[#2A6558]"
                    />
                    <span className="text-sm text-[#7C7671]">
                      I agree to VenYOU&apos;s{" "}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setOpenLegal("terms");
                        }}
                        className="text-[#2A6558] underline-offset-2 hover:underline"
                      >
                        Terms of Service
                      </button>
                      .
                    </span>
                  </label>
                  {errors.agreeTerms && <p className="mt-1 text-xs text-[#C0392B]">{errors.agreeTerms}</p>}
                </div>

                <div>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={form.agreePrivacy}
                      onChange={(e) => setForm({ ...form, agreePrivacy: e.target.checked })}
                      className="mt-0.5 h-4 w-4 rounded border-[#E0DDD5] accent-[#2A6558]"
                    />
                    <span className="text-sm text-[#7C7671]">
                      I accept the{" "}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setOpenLegal("privacy");
                        }}
                        className="text-[#2A6558] underline-offset-2 hover:underline"
                      >
                        Privacy Policy
                      </button>
                      .
                    </span>
                  </label>
                  {errors.agreePrivacy && <p className="mt-1 text-xs text-[#C0392B]">{errors.agreePrivacy}</p>}
                </div>

                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={form.newsletter}
                    onChange={(e) => setForm({ ...form, newsletter: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded border-[#E0DDD5] accent-[#2A6558]"
                  />
                  <span className="text-sm text-[#7C7671]">Send me product updates and venue insights (optional).</span>
                </label>
              </div>
            )}

            {errors.auth && (
              <p className="mt-5 rounded-xl border border-[#F2C5BE] bg-[#FDECEA] px-3 py-2 text-xs text-[#C0392B]">
                {errors.auth}
              </p>
            )}

            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={backStep}
                disabled={terminating}
                className={`flex items-center gap-2 rounded-xl border border-[#E0DDD5] px-5 py-2.5 text-sm font-medium text-[#7C7671] transition hover:border-[#1A1817] hover:text-[#1A1817] ${
                  step === 1 ? "invisible" : ""
                }`}
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                type="submit"
                disabled={loading || Boolean(oauthLoading) || terminating}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#2A6558] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#215249] disabled:opacity-60"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    {primaryActionLabel}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>

      {activeDocument && (
        <LegalModal
          open={Boolean(activeDocument)}
          title={activeDocument.title}
          lastUpdated={activeDocument.lastUpdated}
          intro={activeDocument.intro}
          sections={activeDocument.sections}
          onClose={() => setOpenLegal(null)}
        />
      )}
    </div>
  );
}

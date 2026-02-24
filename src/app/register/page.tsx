"use client";

import { useState } from "react";
import Link from "next/link";
import StepIndicator from "@/components/StepIndicator";
import LegalModal from "@/components/LegalModal";
import { privacyPolicy, termsOfService } from "@/lib/legalContent";
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

export default function RegisterPage() {
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
  const [mockCode, setMockCode] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [openLegal, setOpenLegal] = useState<LegalKey>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const validateStep = (targetStep: number) => {
    const e: Record<string, string> = {};

    if (targetStep === 1) {
      if (!form.fullName.trim()) e.fullName = "Full name is required.";
      if (!form.email) e.email = "Email is required.";
      else if (!emailRegex.test(form.email)) e.email = "Enter a valid email.";
      if (!form.password) e.password = "Password is required.";
      else if (form.password.length < 8) e.password = "Password must be at least 8 characters.";
      else if (!/[A-Z]/.test(form.password)) e.password = "Password must include an uppercase letter.";
      else if (!/\d/.test(form.password)) e.password = "Password must include a number.";
    }

    if (targetStep === 2) {
      if (!form.planningFor) e.planningFor = "Please choose who this account is for.";
      if (!form.eventType) e.eventType = "Select your most common event type.";
      if (!form.eventTimeline) e.eventTimeline = "Pick your event timeline.";
    }

    if (targetStep === 3) {
      if (!verificationSent) e.verification = "Send a verification code first.";
      if (!verificationCode.trim()) e.verificationCode = "Enter the 6-digit code.";
      else if (verificationCode.trim() !== mockCode) e.verificationCode = "Incorrect code. Use the latest mock code.";
    }

    if (targetStep === 4) {
      if (!form.agreeTerms) e.agreeTerms = "You must agree to the terms.";
      if (!form.agreePrivacy) e.agreePrivacy = "You must accept the privacy policy.";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const sendVerificationCode = () => {
    if (!emailRegex.test(form.email)) {
      setStep(1);
      setErrors({ email: "Enter a valid email before verification." });
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setMockCode(code);
    setVerificationCode("");
    setVerificationSent(true);
    setVerificationMessage(`Mock code sent to ${form.email}. Use ${code} to continue.`);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.verification;
      delete next.verificationCode;
      return next;
    });
  };

  const nextStep = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(registerSteps.length, s + 1));
  };

  const backStep = () => {
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
  };

  const handleEmailChange = (value: string) => {
    setForm({ ...form, email: value });
    if (verificationSent) {
      setMockCode("");
      setVerificationCode("");
      setVerificationSent(false);
      setVerificationMessage("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (step < registerSteps.length) {
      nextStep();
      return;
    }

    if (!validateStep(step)) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setDone(true);
    }, 1600);
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
      ? "Set up your name, email, and password."
      : step === 2
      ? "We use these answers to personalize recommendations."
      : step === 3
      ? "Mock verification for now. We will wire real email verification later."
      : "Review and accept before creating your account.";

  const primaryActionLabel =
    loading ? "Creating account..." : step === registerSteps.length ? "Create Account" : "Continue";

  const activeDocument =
    openLegal === "terms" ? termsOfService : openLegal === "privacy" ? privacyPolicy : null;

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F6F1] px-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#EAF2F0]">
            <CheckCircle2 size={40} className="text-[#2A6558]" />
          </div>
          <h2 className="mb-3 text-3xl font-extrabold text-[#1A1817]">You&apos;re In!</h2>
          <p className="mb-8 text-[#7C7671]">
            Welcome to VenYOU, {form.fullName.split(" ")[0]}! Your account is ready.
          </p>
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#2A6558] py-3 text-sm font-semibold text-white hover:bg-[#215249]"
          >
            Go to Dashboard <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8F6F1]">
      {/* Left panel */}
      <div className="relative hidden overflow-hidden bg-[#2A6558] p-14 lg:flex lg:w-1/2 lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -top-20 right-0 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-96 w-96 rounded-full bg-[#1A1817]/20 blur-3xl" />
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
            {[
              "Step-by-step sign up",
              "Profile-based recommendations",
              "Mock email verification ready",
              "Transparent terms acceptance",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 size={16} className="shrink-0 text-white" />
                <span className="text-sm text-white/80">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-xs text-white/40">
          You can go back between steps anytime before submission.
        </p>
      </div>

      {/* Right panel */}
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

            {/* Step 1: account */}
            {step === 1 && (
              <div className="flex flex-col gap-5 page-fade">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#1A1817]">Full Name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C7671]" />
                    <input
                      type="text"
                      value={form.fullName}
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
                      value={form.email}
                      onChange={(e) => handleEmailChange(e.target.value)}
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
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Create a strong password"
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
              </div>
            )}

            {/* Step 2: questions */}
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
                    className={`w-full rounded-xl border bg-white py-3 px-4 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558] focus:ring-2 focus:ring-[#2A6558]/20 ${
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

            {/* Step 3: verification */}
            {step === 3 && (
              <div className="flex flex-col gap-5 page-fade">
                <div className="rounded-xl border border-[#C8E0DA] bg-[#EAF2F0] p-4 text-sm text-[#215249]">
                  <div className="mb-1.5 flex items-center gap-2 font-semibold">
                    <ShieldCheck size={16} />
                    Email verification (mock)
                  </div>
                  <p>
                    We will verify <strong>{form.email}</strong>. Click send, then enter the code below.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={sendVerificationCode}
                  className="rounded-xl border border-[#2A6558] bg-white py-2.5 text-sm font-semibold text-[#2A6558] transition hover:bg-[#EAF2F0]"
                >
                  {verificationSent ? "Resend Mock Code" : "Send Mock Code"}
                </button>

                {verificationMessage && (
                  <p className="rounded-xl border border-[#E0DDD5] bg-[#F8F6F1] px-3 py-2 text-xs text-[#1A1817]">
                    {verificationMessage}
                  </p>
                )}
                {errors.verification && <p className="text-xs text-[#C0392B]">{errors.verification}</p>}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#1A1817]">Verification Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 6-digit code"
                    className={`w-full rounded-xl border bg-white py-3 px-4 text-sm tracking-[0.3em] text-[#1A1817] outline-none placeholder:tracking-normal placeholder:text-[#C4BDBA] transition focus:border-[#2A6558] focus:ring-2 focus:ring-[#2A6558]/20 ${
                      errors.verificationCode ? "border-[#C0392B]" : "border-[#E0DDD5]"
                    }`}
                  />
                  {errors.verificationCode && <p className="mt-1 text-xs text-[#C0392B]">{errors.verificationCode}</p>}
                </div>
              </div>
            )}

            {/* Step 4: terms */}
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
                  <span className="text-sm text-[#7C7671]">
                    Send me product updates and venue insights (optional).
                  </span>
                </label>
              </div>
            )}

            {/* Footer nav */}
            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={backStep}
                className={`flex items-center gap-2 rounded-xl border border-[#E0DDD5] px-5 py-2.5 text-sm font-medium text-[#7C7671] transition hover:border-[#1A1817] hover:text-[#1A1817] ${
                  step === 1 ? "invisible" : ""
                }`}
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                type="submit"
                disabled={loading}
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

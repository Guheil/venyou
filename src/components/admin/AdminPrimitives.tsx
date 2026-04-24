import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { ROUTES } from "@/lib/routes";
import type { PaymentStatus, ReservationStatus } from "@/lib/adminData";

export function AdminPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[28px] border border-[#E0DDD5] bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

export function AdminSectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2A6558]">
            {eyebrow}
          </p>
        )}
        <h2 className="text-xl font-extrabold tracking-tight text-[#1A1817]">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-[#7C7671]">
          {description}
        </p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function AdminMetricCard({
  icon,
  label,
  value,
  detail,
  tone = "light",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone?: "light" | "dark" | "accent";
}) {
  const toneClasses = {
    light: "border-[#E0DDD5] bg-white text-[#1A1817]",
    dark: "border-[#1A1817] bg-[#1A1817] text-white",
    accent: "border-[#C8E0DA] bg-[#EAF2F0] text-[#1A1817]",
  } as const;

  return (
    <div className={`rounded-[24px] border p-5 shadow-sm ${toneClasses[tone]}`}>
      <div
        className={`mb-4 flex h-10 w-10 items-center justify-center rounded-2xl ${
          tone === "dark" ? "bg-white/10 text-[#7BC4B8]" : "bg-[#EAF2F0] text-[#2A6558]"
        }`}
      >
        {icon}
      </div>
      <p
        className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
          tone === "dark" ? "text-white/55" : "text-[#7C7671]"
        }`}
      >
        {label}
      </p>
      <p className="mt-2 text-2xl font-extrabold tracking-tight">{value}</p>
      <p className={`mt-1 text-sm ${tone === "dark" ? "text-white/60" : "text-[#7C7671]"}`}>
        {detail}
      </p>
    </div>
  );
}

export function AdminLoadingState({ label = "Loading admin data" }: { label?: string }) {
  return (
    <AdminPanel className="flex min-h-64 items-center justify-center">
      <div className="flex items-center gap-3 text-sm font-semibold text-[#1A1817]">
        <Loader2 size={18} className="animate-spin text-[#2A6558]" />
        {label}
      </div>
    </AdminPanel>
  );
}

export function AdminAccessDenied() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10 sm:px-6">
      <AdminPanel className="w-full">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FDECEA] text-[#C0392B]">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C0392B]">
              Admin access required
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#1A1817]">
              This account is not enabled for admin operations.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#7C7671]">
              Add this signed-in user to public.admin_users, then refresh the admin portal.
            </p>
            <Link
              href={ROUTES.dashboard}
              className="mt-5 inline-flex items-center justify-center rounded-full bg-[#2A6558] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#215249]"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </AdminPanel>
    </main>
  );
}

export function ReservationStatusPill({
  status,
  paymentStatus,
}: {
  status: ReservationStatus;
  paymentStatus?: PaymentStatus;
}) {
  const styles = {
    pending_payment: "border-[#F8E3A7] bg-[#FEF3C7] text-[#92400E]",
    confirmed: "border-[#C8E0DA] bg-[#EAF2F0] text-[#2A6558]",
    cancelled: "border-[#E0DDD5] bg-[#F8F6F1] text-[#7C7671]",
  } as const;

  const Icon =
    status === "confirmed"
      ? CheckCircle2
      : status === "cancelled"
        ? XCircle
        : AlertCircle;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      <Icon size={12} />
      {status === "pending_payment" ? "Pending" : status}
      {paymentStatus ? ` / ${paymentStatus}` : ""}
    </span>
  );
}

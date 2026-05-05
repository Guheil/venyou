import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import {
  type PaymentStatus,
  type ReservationStatus,
  reservationStatusLabel,
} from "@/lib/adminData";

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

export function AdminSortSelect<T extends string>({
  label = "Sort",
  value,
  onChange,
  options,
}: {
  label?: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
}) {
  return (
    <label className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-[#E0DDD5] bg-[#FCFBF8] pl-3 pr-2 text-xs font-semibold text-[#7C7671]">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-8 min-w-36 rounded-lg bg-transparent text-sm font-bold text-[#1A1817] outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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

export function AdminStatusPill({
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
      {reservationStatusLabel(status)}
      {paymentStatus ? ` / ${paymentStatus}` : ""}
    </span>
  );
}

export function AdminLoadingState({ label = "Loading admin data" }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F6F1] px-6">
      <div className="flex items-center gap-3 rounded-2xl border border-[#E0DDD5] bg-white px-5 py-4 text-sm font-semibold text-[#1A1817] shadow-sm">
        <Loader2 size={18} className="animate-spin text-[#2A6558]" />
        {label}
      </div>
    </div>
  );
}

export function AdminDeniedState() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10 sm:px-6">
      <AdminPanel className="w-full">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FDECEA] text-[#C0392B]">
            <AlertCircle size={22} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C0392B]">
              Admin access required
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#1A1817]">
              This account is not enabled for admin operations.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#7C7671]">
              Run the admin migrations, then add this signed-in user to
              public.admin_users.
            </p>
          </div>
        </div>
      </AdminPanel>
    </main>
  );
}

export function ProgressRow({
  label,
  value,
  total,
  detail,
}: {
  label: string;
  value: number;
  total: number;
  detail: string;
}) {
  const width = total > 0 ? Math.max((value / total) * 100, value > 0 ? 8 : 0) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <div>
          <p className="font-semibold text-[#1A1817]">{label}</p>
          <p className="text-xs text-[#7C7671]">{detail}</p>
        </div>
        <span className="font-bold text-[#1A1817]">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#ECE8E1]">
        <div className="h-2 rounded-full bg-[#2A6558]" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/AuthContext";
import { formatPeso as formatBudgetPeso } from "@/lib/budget";
import { supabase } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import {
  type VenueReservation,
  type VenueReservationRow,
  mapReservationRow,
} from "@/lib/types";
import {
  CalendarCheck,
  CalendarDays,
  Clock,
  Users,
  MapPin,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Plus,
  Banknote,
  Smartphone,
  Copy,
  Check,
} from "lucide-react";
import { useToast } from "@/lib/ToastContext";

// ─── helpers ────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH")}`;
}

function formatTime(t: string): string {
  const [h] = t.split(":");
  const hour = parseInt(h, 10);
  if (hour === 0) return "12:00 AM";
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return "12:00 PM";
  return `${hour - 12}:00 PM`;
}

// ─── Status badge ────────────────────────────────────────────

function StatusBadge({ status }: { status: VenueReservation["reservationStatus"] }) {
  const map = {
    pending_payment: {
      label: "Awaiting Payment",
      class: "bg-amber-50 text-amber-700 border-amber-200",
      icon: <AlertCircle size={12} />,
    },
    confirmed: {
      label: "Confirmed",
      class: "bg-[#EAF2F0] text-[#2A6558] border-[#C8E0DA]",
      icon: <CheckCircle2 size={12} />,
    },
    cancelled: {
      label: "Cancelled",
      class: "bg-[#F8F6F1] text-[#7C7671] border-[#E0DDD5]",
      icon: <XCircle size={12} />,
    },
  };
  const { label, class: cls, icon } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}>
      {icon} {label}
    </span>
  );
}

// ─── Reservation card ────────────────────────────────────────

function ReservationCard({
  reservation,
  onCancel,
}: {
  reservation: VenueReservation;
  onCancel: (id: string) => Promise<void>;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(reservation.referenceNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCancel = async () => {
    setCancelling(true);
    await onCancel(reservation.id);
    setCancelling(false);
    setConfirmCancel(false);
  };

  const isExpired =
    reservation.reservationStatus === "pending_payment" &&
    reservation.expiresAt != null &&
    new Date(reservation.expiresAt) < new Date();

  return (
    <div
      className={`rounded-2xl border bg-white overflow-hidden transition-all ${
        reservation.reservationStatus === "cancelled" || isExpired
          ? "border-[#E0DDD5] opacity-60"
          : reservation.reservationStatus === "confirmed"
          ? "border-[#C8E0DA]"
          : "border-amber-200"
      }`}
    >
      {/* Color strip */}
      <div
        className="h-2"
        style={{
          background:
            reservation.venueImageColor ||
            "linear-gradient(135deg, #BDD7D2 0%, #D6E8E4 100%)",
        }}
      />

      <div className="p-5">
        {/* Top row */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="font-extrabold text-[#1A1817] text-base leading-tight">
              {reservation.venueName ?? "Venue"}
            </h3>
            <p className="text-xs text-[#7C7671] mt-0.5">
              {reservation.venueType}
            </p>
          </div>
          <StatusBadge status={reservation.reservationStatus} />
        </div>

        {/* Details grid */}
        <div className="mb-4 grid grid-cols-2 gap-2 text-xs text-[#44504C]">
          <DetailItem icon={<CalendarDays size={12} />} text={formatDate(reservation.eventDate)} />
          <DetailItem
            icon={<Clock size={12} />}
            text={`${formatTime(reservation.startTime)} - ${reservation.durationHours}h`}
          />
          <DetailItem
            icon={<Users size={12} />}
            text={`${reservation.guestCount.toLocaleString()} guests`}
          />
          <DetailItem
            icon={<MapPin size={12} />}
            text={reservation.venueAddress ?? ""}
            truncate
          />
        </div>

        {/* Payment row */}
        <div className="mb-4 flex items-center justify-between rounded-xl bg-[#F8F6F1] border border-[#E0DDD5] px-3 py-2.5">
          <div className="flex items-center gap-2 text-xs text-[#7C7671]">
            {reservation.paymentMethod === "gcash" ? (
              <Smartphone size={13} className="text-blue-500" />
            ) : (
              <Banknote size={13} className="text-[#2A6558]" />
            )}
            {reservation.paymentMethod === "gcash" ? "GCash" : "Cash"}
          </div>
          <span className="text-sm font-extrabold text-[#2A6558]">
            {formatBudgetPeso(reservation.totalAmount)}
          </span>
        </div>

        {/* Reference */}
        <div className="mb-4 flex items-center justify-between rounded-xl bg-[#EAF2F0] border border-[#C8E0DA] px-3 py-2">
          <div>
            <p className="text-[10px] text-[#7C7671]">Booking Reference</p>
            <p className="text-sm font-extrabold tracking-wider text-[#2A6558]">
              {reservation.referenceNumber}
            </p>
          </div>
          <button
            onClick={handleCopy}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#C8E0DA] bg-white text-[#7C7671] hover:text-[#2A6558]"
            title="Copy reference"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>

        {/* Expiry warning */}
        {reservation.reservationStatus === "pending_payment" && !isExpired && reservation.expiresAt && (
          <p className="mb-3 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            Payment slot expires{" "}
            <strong>{formatDateTime(reservation.expiresAt)}</strong>. Complete payment to confirm your booking.
          </p>
        )}

        {isExpired && (
          <p className="mb-3 text-[11px] text-[#7C7671] bg-[#F8F6F1] border border-[#E0DDD5] rounded-lg px-3 py-1.5">
            This pending reservation has expired.
          </p>
        )}

        {/* Booking date */}
        <p className="text-[10px] text-[#7C7671] mb-3">
          Booked on {formatDateTime(reservation.createdAt)}
        </p>

        {/* Cancel button */}
        {reservation.reservationStatus !== "cancelled" && !isExpired && (
          <>
            {!confirmCancel ? (
              <button
                onClick={() => setConfirmCancel(true)}
                className="w-full rounded-xl border border-[#E0DDD5] py-2.5 text-xs font-semibold text-[#7C7671] hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                Cancel Reservation
              </button>
            ) : (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 space-y-2">
                <p className="text-xs text-red-700 font-medium">
                  Are you sure you want to cancel this reservation?{" "}
                  {reservation.paymentStatus === "paid"
                    ? "Your payment will be marked for refund."
                    : "This action cannot be undone."}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmCancel(false)}
                    className="flex-1 rounded-lg border border-[#E0DDD5] py-2 text-xs font-semibold text-[#7C7671] bg-white hover:bg-[#F8F6F1] transition-colors"
                  >
                    Keep Reservation
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                  >
                    {cancelling && <Loader2 size={11} className="animate-spin" />}
                    Yes, Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DetailItem({
  icon,
  text,
  truncate,
}: {
  icon: ReactNode;
  text: string;
  truncate?: boolean;
}) {
  return (
    <div className={`flex items-start gap-1.5 ${truncate ? "min-w-0" : ""}`}>
      <span className="text-[#2A6558] mt-0.5 shrink-0">{icon}</span>
      <span className={truncate ? "truncate" : ""}>{text}</span>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────

function Panel({
  children,
  className = "",
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "dark";
}) {
  const toneClass =
    tone === "dark"
      ? "border-[#1A1817] bg-[#1A1817] text-white"
      : "border-[#E0DDD5] bg-white";

  return (
    <section
      className={`rounded-[28px] border p-5 shadow-sm sm:p-6 ${toneClass} ${className}`}
    >
      {children}
    </section>
  );
}

function SectionHeader({
  title,
  description,
  eyebrow,
  action,
}: {
  title: string;
  description: string;
  eyebrow?: string;
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
        <p className="mt-1 text-sm text-[#7C7671]">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#E0DDD5] bg-[#FCFBF8] p-5 shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EAF2F0] text-[#2A6558]">
        {icon}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7C7671]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#1A1817]">
        {value}
      </p>
      <p className="mt-1 text-sm text-[#7C7671]">{detail}</p>
    </div>
  );
}

export default function ReservationsPage() {
  const { user, loading: authLoading } = useAuth();
  const { success, error: showError } = useToast();
  const [reservations, setReservations] = useState<VenueReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "confirmed" | "pending_payment" | "cancelled">("all");
  const [reloadToken, setReloadToken] = useState(0);
  const triggerReload = useCallback(() => {
    setReloadToken((value) => value + 1);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    let active = true;

    void (async () => {
      if (!user) {
        if (!active) return;
        setReservations([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      // First release any expired pending reservations
      await supabase.rpc("release_expired_reservations").then(() => null, () => null);

      const { data, error } = await supabase
        .from("venue_reservations")
        .select(
          `id, created_at, updated_at, user_id, venue_id, event_id,
           event_date, start_time, duration_hours,
           guest_count, price_per_head, total_amount,
           contact_name, contact_phone, special_requests,
           payment_method, payment_status, gcash_number,
           payment_reference, reservation_status,
           reference_number, expires_at,
           venues ( name, address, image_color, type )`
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!active) return;

      if (error) {
        showError("Could not load reservations", "Please refresh the page.");
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as unknown as VenueReservationRow[];
      setReservations(rows.map(mapReservationRow));
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [authLoading, reloadToken, showError, user]);

  const handleCancel = async (id: string) => {
    const res = await fetch(`/api/reservations/${id}/cancel`, {
      method: "POST",
    });
    if (res.ok) {
      success("Reservation cancelled", "Your booking has been cancelled.");
      triggerReload();
    } else {
      showError("Could not cancel", "Please try again.");
    }
  };

  const filtered = useMemo(
    () => reservations.filter((reservation) => filter === "all" || reservation.reservationStatus === filter),
    [filter, reservations]
  );

  const counts = {
    all: reservations.length,
    confirmed: reservations.filter((r) => r.reservationStatus === "confirmed").length,
    pending_payment: reservations.filter((r) => r.reservationStatus === "pending_payment").length,
    cancelled: reservations.filter((r) => r.reservationStatus === "cancelled").length,
  };

  const tabs: { key: typeof filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "confirmed", label: "Confirmed" },
    { key: "pending_payment", label: "Pending" },
    { key: "cancelled", label: "Cancelled" },
  ];
  const totalReservedValue = reservations
    .filter((reservation) => reservation.reservationStatus !== "cancelled")
    .reduce((sum, reservation) => sum + reservation.totalAmount, 0);
  const upcomingCount = reservations.filter((reservation) => {
    const eventDate = new Date(`${reservation.eventDate}T00:00:00`);
    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    return eventDate >= startOfToday && reservation.reservationStatus !== "cancelled";
  }).length;
  const activeReservations = reservations.filter(
    (reservation) => reservation.reservationStatus !== "cancelled"
  );
  const confirmedReservations = reservations.filter(
    (reservation) => reservation.reservationStatus === "confirmed"
  );
  const pendingReservations = reservations.filter(
    (reservation) => reservation.reservationStatus === "pending_payment"
  );
  const confirmedValue = confirmedReservations.reduce(
    (sum, reservation) => sum + reservation.totalAmount,
    0
  );
  const pendingValue = pendingReservations.reduce(
    (sum, reservation) => sum + reservation.totalAmount,
    0
  );
  const nextReservation = [...activeReservations]
    .sort(
      (left, right) =>
        new Date(`${left.eventDate}T00:00:00`).getTime() -
        new Date(`${right.eventDate}T00:00:00`).getTime()
    )[0];
  const nextReservationDaysAway = nextReservation
    ? Math.round(
        (new Date(`${nextReservation.eventDate}T00:00:00`).getTime() -
          new Date(new Date().setHours(0, 0, 0, 0)).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;
  const paymentWatch = [...pendingReservations]
    .sort((left, right) => {
      const leftTime = left.expiresAt
        ? new Date(left.expiresAt).getTime()
        : new Date(left.createdAt).getTime();
      const rightTime = right.expiresAt
        ? new Date(right.expiresAt).getTime()
        : new Date(right.createdAt).getTime();
      return leftTime - rightTime;
    })
    .slice(0, 3);
  const recentReservations = reservations.slice(0, 3);

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="rounded-[30px] border border-[#E0DDD5] bg-gradient-to-br from-[#FCFBF8] via-white to-[#F0F6F4] p-6 sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#C8E0DA] bg-[#EAF2F0] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2A6558]">
                  Reservation Desk
                </span>
                <span className="rounded-full border border-[#E0DDD5] bg-white px-3 py-1 text-xs text-[#7C7671]">
                  Booking overview
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#1A1817] sm:text-4xl">
                Track every venue hold, payment state, and confirmed booking in one place.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#6B6661] sm:text-base">
                Review the status of each reservation, refresh time-sensitive holds, and keep active bookings close to the rest of your planning workflow.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={triggerReload}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D8D3C9] bg-white px-5 py-3 text-sm font-semibold text-[#1A1817] transition hover:border-[#2A6558] hover:text-[#2A6558] disabled:opacity-60"
              >
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
              <Link
                href={ROUTES.recommendations}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2A6558] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#215249]"
              >
                <Plus size={15} />
                New Booking
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={<CalendarCheck size={18} />}
            label="Active Bookings"
            value={loading ? "-" : String(counts.confirmed + counts.pending_payment)}
            detail="Confirmed and still-active pending reservations"
          />
          <KpiCard
            icon={<CheckCircle2 size={18} />}
            label="Confirmed"
            value={loading ? "-" : String(counts.confirmed)}
            detail="Reservations that are already fully locked in"
          />
          <KpiCard
            icon={<AlertCircle size={18} />}
            label="Upcoming"
            value={loading ? "-" : String(upcomingCount)}
            detail="Future reservation dates still on your calendar"
          />
          <KpiCard
            icon={<Banknote size={18} />}
            label="Reserved Value"
            value={loading ? "-" : formatBudgetPeso(totalReservedValue)}
            detail="Total amount across non-cancelled reservations"
          />
        </section>

        <Panel className="mt-6">
          <SectionHeader
            eyebrow="Status"
            title="Filter your booking pipeline"
            description="Switch between all reservations, confirmed bookings, pending payment holds, and cancelled records."
          />

          <div className="flex gap-2 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button
                type="button"
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all ${
                  filter === tab.key
                    ? "border-[#2A6558] bg-[#2A6558] text-white"
                    : "border-[#E0DDD5] bg-white text-[#7C7671] hover:border-[#2A6558]/40"
                }`}
              >
                {tab.label}{" "}
                <span
                  className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${
                    filter === tab.key
                      ? "bg-white/20 text-white"
                      : "bg-[#F0EEEA] text-[#7C7671]"
                  }`}
                >
                  {counts[tab.key]}
                </span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="mt-6">
            <SectionHeader
              eyebrow="Reservations"
              title={
                filter === "all"
                  ? "Your booking lineup"
                  : `${tabs.find((tab) => tab.key === filter)?.label ?? "Filtered"} reservations`
              }
              description="Each reservation keeps the event date, payment state, booking reference, and cancellation controls in one place."
              action={
                <span className="inline-flex rounded-full border border-[#E0DDD5] bg-[#FCFBF8] px-3 py-1 text-xs font-semibold text-[#7C7671]">
                  {filtered.length} visible
                </span>
              }
            />

            {loading ? (
              <div className="flex min-h-[320px] items-center justify-center rounded-[24px] border border-[#E0DDD5] bg-[#FCFBF8]">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A6558] border-t-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#E0DDD5] bg-[#FCFBF8] px-8 py-14 text-center">
                <CalendarDays size={32} className="mx-auto mb-4 text-[#C8C2BB]" />
                <h2 className="mb-1 text-lg font-extrabold text-[#1A1817]">
                  {filter === "all"
                    ? "No reservations yet"
                    : `No ${filter.replace("_", " ")} reservations`}
                </h2>
                <p className="mb-6 text-sm text-[#7C7671]">
                  {filter === "all"
                    ? "Browse venues from your event recommendations and reserve one."
                    : 'Switch to "All" to see the full booking pipeline.'}
                </p>
                {filter === "all" && (
                  <Link
                    href={ROUTES.recommendations}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#2A6558] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#215249]"
                  >
                    <Plus size={14} /> Browse Venues
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                {filtered.map((reservation) => (
                  <ReservationCard
                    key={reservation.id}
                    reservation={reservation}
                    onCancel={handleCancel}
                  />
                ))}
              </div>
            )}
        </Panel>
      </main>
    </AppShell>
  );
}

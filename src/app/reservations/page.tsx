"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import {
  type VenueReservation,
  type VenueReservationRow,
  mapReservationRow,
} from "@/lib/types";
import {
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
            text={`${formatTime(reservation.startTime)} · ${reservation.durationHours}h`}
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
            {formatPeso(reservation.totalAmount)}
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
            ⏳ Payment slot expires{" "}
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
  icon: React.ReactNode;
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

export default function ReservationsPage() {
  const { success, error: showError } = useToast();
  const [reservations, setReservations] = useState<VenueReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "confirmed" | "pending_payment" | "cancelled">("all");

  const load = useCallback(async () => {
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
      .order("created_at", { ascending: false });

    if (error) {
      showError("Could not load reservations", "Please refresh the page.");
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as unknown as VenueReservationRow[];
    setReservations(rows.map(mapReservationRow));
    setLoading(false);
  }, [showError]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCancel = async (id: string) => {
    const res = await fetch(`/api/reservations/${id}/cancel`, {
      method: "POST",
    });
    if (res.ok) {
      success("Reservation cancelled", "Your booking has been cancelled.");
      void load();
    } else {
      showError("Could not cancel", "Please try again.");
    }
  };

  const filtered = reservations.filter(
    (r) => filter === "all" || r.reservationStatus === filter
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

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-[#1A1817]">
              My Reservations
            </h1>
            <p className="mt-1 text-sm text-[#7C7671]">
              All your venue bookings in one place
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void load()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-[#E0DDD5] bg-white px-3 py-2 text-sm font-medium text-[#7C7671] hover:bg-[#F8F6F1] transition-colors"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <Link
              href={ROUTES.recommendations}
              className="flex items-center gap-1.5 rounded-xl bg-[#2A6558] px-4 py-2 text-sm font-semibold text-white hover:bg-[#215249] transition-colors"
            >
              <Plus size={14} /> New Booking
            </Link>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all ${
                filter === tab.key
                  ? "border-[#2A6558] bg-[#2A6558] text-white"
                  : "border-[#E0DDD5] bg-white text-[#7C7671] hover:border-[#2A6558]/40"
              }`}
            >
              {tab.label}{" "}
              <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${
                filter === tab.key ? "bg-white/20 text-white" : "bg-[#F0EEEA] text-[#7C7671]"
              }`}>
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A6558] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E0DDD5] bg-white px-8 py-16 text-center">
            <CalendarDays size={32} className="mx-auto mb-4 text-[#C8C2BB]" />
            <h2 className="mb-1 text-lg font-extrabold text-[#1A1817]">
              {filter === "all" ? "No reservations yet" : `No ${filter.replace("_", " ")} reservations`}
            </h2>
            <p className="mb-6 text-sm text-[#7C7671]">
              {filter === "all"
                ? "Browse venues from your event recommendations and reserve one."
                : 'Switch to "All" to see everything.'}
            </p>
            {filter === "all" && (
              <Link
                href={ROUTES.recommendations}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2A6558] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#215249] transition-colors"
              >
                <Plus size={14} /> Browse Venues
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {filtered.map((r) => (
              <ReservationCard key={r.id} reservation={r} onCancel={handleCancel} />
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}

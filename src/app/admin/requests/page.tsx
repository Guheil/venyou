"use client";

import { useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import {
  AdminDeniedState,
  AdminLoadingState,
  AdminMetricCard,
  AdminPanel,
  AdminSectionHeader,
  AdminStatusPill,
} from "@/components/admin/AdminUI";
import {
  type ReservationStatus,
  formatAdminDate,
  formatAdminDateTime,
  formatAdminTime,
} from "@/lib/adminData";
import { formatPeso } from "@/lib/budget";
import { supabase } from "@/lib/supabase/client";
import { useAdminData } from "@/lib/useAdminData";
import { useToast } from "@/lib/ToastContext";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Smartphone,
  XCircle,
} from "lucide-react";

type RequestFilter = "all" | ReservationStatus;

const filters: { key: RequestFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending_payment", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "cancelled", label: "Cancelled" },
];

export default function AdminRequestsPage() {
  const { accessState, loadingData, refreshData, reservations, summary } = useAdminData();
  const { success, error: showError } = useToast();
  const [filter, setFilter] = useState<RequestFilter>("all");
  const [paymentRefs, setPaymentRefs] = useState<Record<string, string>>({});
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      reservations.filter(
        (reservation) => filter === "all" || reservation.reservationStatus === filter
      ),
    [filter, reservations]
  );

  const counts = {
    all: reservations.length,
    pending_payment: reservations.filter(
      (reservation) => reservation.reservationStatus === "pending_payment"
    ).length,
    confirmed: reservations.filter(
      (reservation) => reservation.reservationStatus === "confirmed"
    ).length,
    cancelled: reservations.filter(
      (reservation) => reservation.reservationStatus === "cancelled"
    ).length,
  };

  const pendingValue = reservations
    .filter(
      (reservation) =>
        reservation.reservationStatus === "pending_payment" &&
        reservation.paymentStatus === "pending"
    )
    .reduce((sum, reservation) => sum + reservation.totalAmount, 0);

  const handleConfirmPayment = async (
    reservationId: string,
    paymentMethod: string,
    existingReference: string | null
  ) => {
    const enteredReference = paymentRefs[reservationId]?.trim();
    const referenceToUse = enteredReference || existingReference?.trim() || null;

    if (paymentMethod === "cash" && !referenceToUse) {
      showError(
        "Reference required",
        "Enter a payment reference before confirming cash payment."
      );
      return;
    }

    setSubmittingAction(`confirm-${reservationId}`);

    const { data, error } = await supabase.rpc("admin_confirm_reservation_payment", {
      p_reservation_id: reservationId,
      p_payment_reference: referenceToUse,
      p_admin_note: adminNotes[reservationId]?.trim() ?? "",
    });

    setSubmittingAction(null);

    if (error || data === false) {
      showError("Could not confirm payment", "The request may already be settled.");
      return;
    }

    success(
      "Payment confirmed",
      `${referenceToUse ?? existingReference ?? "Payment"} is now confirmed.`
    );
    setPaymentRefs((prev) => ({ ...prev, [reservationId]: "" }));
    setAdminNotes((prev) => ({ ...prev, [reservationId]: "" }));
    refreshData();
  };

  const handleCancelReservation = async (reservationId: string, referenceNumber: string) => {
    setSubmittingAction(`cancel-${reservationId}`);

    const { data, error } = await supabase.rpc("admin_cancel_reservation", {
      p_reservation_id: reservationId,
      p_admin_note: adminNotes[reservationId]?.trim() ?? "",
    });

    setSubmittingAction(null);

    if (error || data === false) {
      showError("Could not cancel request", "The request may already be closed.");
      return;
    }

    success("Request cancelled", `${referenceNumber} was cancelled.`);
    setAdminNotes((prev) => ({ ...prev, [reservationId]: "" }));
    refreshData();
  };

  if (accessState === "loading") {
    return (
      <AdminShell>
        <AdminLoadingState label="Loading payment requests" />
      </AdminShell>
    );
  }

  if (accessState === "denied") {
    return (
      <AdminShell>
        <AdminDeniedState />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 page-fade sm:px-6 sm:py-10">
        <section className="rounded-[30px] border border-[#E0DDD5] bg-gradient-to-br from-[#FCFBF8] via-white to-[#F0F6F4] p-6 sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#C8E0DA] bg-[#EAF2F0] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2A6558]">
                <Clock size={13} />
                Request Desk
              </span>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#1A1817] sm:text-4xl">
                Full reservation and payment request list.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#6B6661] sm:text-base">
                Every reservation record includes customer contact, venue details,
                event schedule, payment fields, internal notes, and admin actions.
              </p>
            </div>
            <button
              type="button"
              onClick={refreshData}
              disabled={loadingData}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D8D3C9] bg-white px-5 py-3 text-sm font-semibold text-[#1A1817] transition hover:border-[#2A6558] hover:text-[#2A6558] disabled:opacity-60"
            >
              <RefreshCw size={15} className={loadingData ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            icon={<AlertCircle size={18} />}
            label="Pending"
            value={String(summary.pending_requests)}
            detail={`${formatPeso(pendingValue)} waiting for confirmation`}
            tone="accent"
          />
          <AdminMetricCard
            icon={<CheckCircle2 size={18} />}
            label="Confirmed"
            value={String(summary.confirmed_reservations)}
            detail="Paid and locked reservations"
          />
          <AdminMetricCard
            icon={<XCircle size={18} />}
            label="Cancelled"
            value={String(summary.cancelled_reservations)}
            detail="Closed or failed requests"
          />
          <AdminMetricCard
            icon={<Banknote size={18} />}
            label="Total Value"
            value={formatPeso(summary.total_reserved_value)}
            detail="Active non-cancelled reservations"
            tone="dark"
          />
        </section>

        <AdminPanel className="mt-6">
          <AdminSectionHeader
            eyebrow="Filters"
            title="Reservation status"
            description="Switch between all records or a single lifecycle state."
            action={
              <span className="rounded-full border border-[#E0DDD5] bg-[#FCFBF8] px-3 py-1 text-xs font-semibold text-[#7C7671]">
                {filtered.length} visible
              </span>
            }
          />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filters.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                  filter === item.key
                    ? "border-[#2A6558] bg-[#2A6558] text-white"
                    : "border-[#E0DDD5] bg-white text-[#7C7671] hover:border-[#2A6558]"
                }`}
              >
                {item.label}
                <span className="ml-1 opacity-75">{counts[item.key]}</span>
              </button>
            ))}
          </div>
        </AdminPanel>

        <div className="mt-6 space-y-5">
          {filtered.map((reservation) => {
            const isPending =
              reservation.reservationStatus === "pending_payment" &&
              reservation.paymentStatus === "pending";

            return (
              <article
                key={reservation.id}
                className="overflow-hidden rounded-[28px] border border-[#E0DDD5] bg-white shadow-sm"
              >
                <div
                  className="h-2"
                  style={{
                    background:
                      reservation.venueImageColor ??
                      "linear-gradient(135deg, #BDD7D2 0%, #D6E8E4 100%)",
                  }}
                />
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <AdminStatusPill
                          status={reservation.reservationStatus}
                          paymentStatus={reservation.paymentStatus}
                        />
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#E0DDD5] bg-[#FCFBF8] px-2.5 py-1 text-xs font-semibold text-[#7C7671]">
                          {reservation.paymentMethod === "gcash" ? (
                            <Smartphone size={12} />
                          ) : (
                            <Banknote size={12} />
                          )}
                          {reservation.paymentMethod.toUpperCase()}
                        </span>
                      </div>
                      <h2 className="text-xl font-extrabold text-[#1A1817]">
                        {reservation.referenceNumber}
                      </h2>
                      <p className="mt-1 text-sm text-[#7C7671]">
                        Created {formatAdminDateTime(reservation.createdAt)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#1A1817] px-5 py-4 text-white xl:text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7BC4B8]">
                        Total amount
                      </p>
                      <p className="mt-1 text-2xl font-extrabold">
                        {formatPeso(reservation.totalAmount)}
                      </p>
                      <p className="text-xs text-white/60">
                        {formatPeso(reservation.pricePerHead)} per head
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 xl:grid-cols-3">
                    <DetailBlock title="Customer">
                      <DetailRow label="Name" value={reservation.contactName} />
                      <DetailRow label="Phone" value={reservation.contactPhone} />
                      <DetailRow label="User ID" value={reservation.userId} mono />
                      <DetailRow
                        label="Special requests"
                        value={reservation.specialRequests || "None"}
                      />
                    </DetailBlock>

                    <DetailBlock title="Event">
                      <DetailRow label="Event" value={reservation.eventName} />
                      <DetailRow label="Occasion" value={reservation.eventOccasion} />
                      <DetailRow
                        label="Schedule"
                        value={`${formatAdminDate(reservation.eventDate)} at ${formatAdminTime(
                          reservation.startTime
                        )}`}
                      />
                      <DetailRow
                        label="Duration"
                        value={`${reservation.durationHours} hours`}
                      />
                      <DetailRow
                        label="Guests"
                        value={reservation.guestCount.toLocaleString()}
                      />
                      <DetailRow label="Event ID" value={reservation.eventId ?? "None"} mono />
                    </DetailBlock>

                    <DetailBlock title="Venue & payment">
                      <DetailRow label="Venue" value={reservation.venueName} />
                      <DetailRow label="Type" value={reservation.venueType} />
                      <DetailRow
                        label="Location"
                        value={`${reservation.venueCity}${reservation.venueArea ? `, ${reservation.venueArea}` : ""}`}
                      />
                      <DetailRow label="Address" value={reservation.venueAddress} />
                      <DetailRow label="Venue ID" value={reservation.venueId} mono />
                      <DetailRow
                        label="GCash number"
                        value={reservation.gcashNumber ?? "Not provided"}
                      />
                      <DetailRow
                        label="Payment reference"
                        value={reservation.paymentReference ?? "Not set"}
                      />
                      <DetailRow
                        label="Confirmed at"
                        value={
                          reservation.paymentConfirmedAt
                            ? formatAdminDateTime(reservation.paymentConfirmedAt)
                            : "Not confirmed"
                        }
                      />
                      <DetailRow
                        label="Expires at"
                        value={
                          reservation.expiresAt
                            ? formatAdminDateTime(reservation.expiresAt)
                            : "No expiry"
                        }
                      />
                      <DetailRow
                        label="Admin note"
                        value={reservation.adminNote || "No note"}
                      />
                    </DetailBlock>
                  </div>

                  {isPending && (
                    <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
                      <input
                        value={paymentRefs[reservation.id] ?? reservation.paymentReference ?? ""}
                        onChange={(event) =>
                          setPaymentRefs((prev) => ({
                            ...prev,
                            [reservation.id]: event.target.value,
                          }))
                        }
                        placeholder={
                          reservation.paymentMethod === "cash"
                            ? "Payment reference (required for cash)"
                            : "Payment reference"
                        }
                        className="h-11 rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558]"
                      />
                      <input
                        value={adminNotes[reservation.id] ?? ""}
                        onChange={(event) =>
                          setAdminNotes((prev) => ({
                            ...prev,
                            [reservation.id]: event.target.value,
                          }))
                        }
                        placeholder="Internal note"
                        className="h-11 rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          void handleConfirmPayment(
                            reservation.id,
                            reservation.paymentMethod,
                            reservation.paymentReference
                          )
                        }
                        disabled={submittingAction === `confirm-${reservation.id}`}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2A6558] px-4 text-sm font-semibold text-white transition hover:bg-[#215249] disabled:opacity-60"
                      >
                        {submittingAction === `confirm-${reservation.id}` ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={15} />
                        )}
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void handleCancelReservation(
                            reservation.id,
                            reservation.referenceNumber
                          )
                        }
                        disabled={submittingAction === `cancel-${reservation.id}`}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#F2C5BE] bg-[#FDECEA] px-4 text-sm font-semibold text-[#C0392B] transition hover:border-[#C0392B] disabled:opacity-60"
                      >
                        {submittingAction === `cancel-${reservation.id}` ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <XCircle size={15} />
                        )}
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </AdminShell>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[24px] border border-[#E0DDD5] bg-[#FCFBF8] p-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2A6558]">
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid gap-1 text-sm sm:grid-cols-[120px_minmax(0,1fr)]">
      <span className="text-xs font-semibold text-[#7C7671]">{label}</span>
      <span
        className={`min-w-0 break-words font-medium text-[#1A1817] ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

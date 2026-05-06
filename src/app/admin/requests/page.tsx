"use client";

import { useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import {
  AdminDeniedState,
  AdminLoadingState,
  AdminMetricCard,
  AdminPanel,
  AdminSectionHeader,
  AdminSortSelect,
  AdminStatusPill,
} from "@/components/admin/AdminUI";
import {
  type AdminReservation,
  type PaymentMethod,
  type ReservationStatus,
  formatAdminCompactNumber,
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
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Smartphone,
  User,
  Users,
  XCircle,
  ImageIcon,
} from "lucide-react";

type RequestFilter = "all" | ReservationStatus;
type RequestSort = "latest" | "oldest" | "event_date" | "amount_desc" | "amount_asc";

const filters: { key: RequestFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending_payment", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "cancelled", label: "Cancelled" },
];

const requestSortOptions: { value: RequestSort; label: string }[] = [
  { value: "latest", label: "Latest" },
  { value: "oldest", label: "Oldest" },
  { value: "event_date", label: "Event date" },
  { value: "amount_desc", label: "Amount high to low" },
  { value: "amount_asc", label: "Amount low to high" },
];

function toTime(value: string | null | undefined) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function compareRequests(left: AdminReservation, right: AdminReservation, sort: RequestSort) {
  if (sort === "oldest") return toTime(left.createdAt) - toTime(right.createdAt);
  if (sort === "event_date") return left.eventDate.localeCompare(right.eventDate);
  if (sort === "amount_desc") return right.totalAmount - left.totalAmount;
  if (sort === "amount_asc") return left.totalAmount - right.totalAmount;
  return toTime(right.createdAt) - toTime(left.createdAt);
}

export default function AdminRequestsPage() {
  const { accessState, loadingData, refreshData, reservations, summary } = useAdminData();
  const { success, error: showError } = useToast();
  const [filter, setFilter] = useState<RequestFilter>("all");
  const [sortOrder, setSortOrder] = useState<RequestSort>("latest");
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentRefs, setPaymentRefs] = useState<Record<string, string>>({});
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);
  const [proofModal, setProofModal] = useState<string | null>(null);
  const [cashReferenceChecks, setCashReferenceChecks] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return reservations
      .filter((reservation) => {
        const matchesFilter = filter === "all" || reservation.reservationStatus === filter;
        const matchesSearch =
          !q ||
          reservation.referenceNumber.toLowerCase().includes(q) ||
          reservation.contactName.toLowerCase().includes(q) ||
          reservation.venueName.toLowerCase().includes(q) ||
          reservation.contactPhone.toLowerCase().includes(q) ||
          reservation.eventName.toLowerCase().includes(q);
        return matchesFilter && matchesSearch;
      })
      .sort((left, right) => compareRequests(left, right, sortOrder));
  }, [filter, searchQuery, reservations, sortOrder]);

  const selectedReservation = useMemo(
    () => reservations.find((r) => r.id === selectedId) ?? null,
    [reservations, selectedId]
  );

  const closeRequestModal = () => {
    setSelectedId(null);
    setCancelConfirmId(null);
  };

  const openRequestModal = (reservationId: string) => {
    setCancelConfirmId(null);
    setSelectedId(reservationId);
  };

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
    paymentMethod: PaymentMethod,
    existingReference: string | null,
    paymentProofUrl: string | null
  ) => {
    const enteredReference = paymentRefs[reservationId]?.trim();
    const referenceToUse = enteredReference || existingReference?.trim() || null;

    if (paymentMethod === "cash" && !referenceToUse) {
      showError("Reference required", "Enter a payment reference before confirming cash payment.");
      return;
    }

    if (paymentMethod === "cash" && !cashReferenceChecks[reservationId]) {
      showError("Reference check required", "Double-check the cash reference number before confirming.");
      return;
    }

    if (paymentMethod === "gcash" && !paymentProofUrl) {
      showError("Payment proof required", "Review the uploaded GCash receipt before confirming payment.");
      return;
    }

    setSubmittingAction(`confirm-${reservationId}`);
    const adminPaymentType = paymentMethod === "gcash" ? "online" : "face_to_face";

    await supabase
      .from("venue_reservations")
      .update({ admin_payment_type: adminPaymentType })
      .eq("id", reservationId);

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

    success("Payment confirmed", `${referenceToUse ?? existingReference ?? "Payment"} is now confirmed.`);
    setPaymentRefs((prev) => ({ ...prev, [reservationId]: "" }));
    setAdminNotes((prev) => ({ ...prev, [reservationId]: "" }));
    setCashReferenceChecks((prev) => { const next = { ...prev }; delete next[reservationId]; return next; });
    closeRequestModal();
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
    closeRequestModal();
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

        {/* Header */}
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
                Every reservation includes customer contact, venue details, event schedule,
                payment fields, and admin actions. Click any card to review and act.
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

        {/* KPI cards */}
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

        {/* Search + filter */}
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
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C7671]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by reference, customer name, venue or phone…"
                className="h-10 w-full rounded-xl border border-[#E0DDD5] bg-[#FCFBF8] pl-9 pr-4 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558]"
              />
            </div>
            <AdminSortSelect
              value={sortOrder}
              onChange={setSortOrder}
              options={requestSortOptions}
            />
          </div>
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

        {/* Compact 3-column card grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.length === 0 ? (
            <div className="col-span-full rounded-[24px] border border-dashed border-[#DAD6CE] bg-[#FCFBF8] p-8 text-center text-sm text-[#7C7671]">
              No requests match your search or filter.
            </div>
          ) : (
            filtered.map((reservation) => {
              const isPending =
                reservation.reservationStatus === "pending_payment" &&
                reservation.paymentStatus === "pending";
              return (
                <button
                  key={reservation.id}
                  type="button"
                  onClick={() => openRequestModal(reservation.id)}
                  className="group text-left overflow-hidden rounded-[24px] border border-[#E0DDD5] bg-white shadow-sm transition hover:border-[#2A6558] hover:shadow-md"
                >
                  <div
                    className="h-1.5 w-full"
                    style={{
                      background:
                        reservation.venueImageColor ??
                        "linear-gradient(135deg, #BDD7D2 0%, #D6E8E4 100%)",
                    }}
                  />
                  <div className="p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <AdminStatusPill
                        status={reservation.reservationStatus}
                        paymentStatus={reservation.paymentStatus}
                      />
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#E0DDD5] bg-[#FCFBF8] px-2 py-0.5 text-[10px] font-semibold text-[#7C7671]">
                        {reservation.paymentMethod === "gcash" ? (
                          <Smartphone size={10} />
                        ) : (
                          <Banknote size={10} />
                        )}
                        {reservation.paymentMethod === "gcash" ? "GCash" : "Cash"}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-[#7C7671]">
                      {reservation.referenceNumber}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-extrabold text-[#1A1817]">
                      {reservation.venueName}
                    </p>
                    <p className="truncate text-xs text-[#7C7671]">{reservation.contactName}</p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-xs text-[#7C7671]">
                        {formatAdminDate(reservation.eventDate)}
                      </span>
                      <span className="rounded-full bg-[#1A1817] px-2.5 py-1 text-xs font-extrabold text-white">
                        {formatPeso(reservation.totalAmount)}
                      </span>
                    </div>
                    {isPending && (
                      <div className="mt-2 rounded-lg border border-[#F2C5BE] bg-[#FDECEA] px-2.5 py-1 text-[10px] font-semibold text-[#C0392B]">
                        Action needed
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </main>

      {/* Reservation detail + action modal */}
      {selectedReservation &&
        (() => {
          const isPending =
            selectedReservation.reservationStatus === "pending_payment" &&
            selectedReservation.paymentStatus === "pending";
          const paymentMethodLabel =
            selectedReservation.paymentMethod === "gcash" ? "GCash" : "Cash";
          const paymentTypeLabel =
            selectedReservation.adminPaymentType === "online"
              ? "Online"
              : selectedReservation.adminPaymentType === "face_to_face"
                ? "Face-to-face"
                : "Not confirmed";
          const location = [
            selectedReservation.venueCity,
            selectedReservation.venueArea,
          ].filter(Boolean).join(", ");

          return (
            <div
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6"
              onClick={closeRequestModal}
            >
              <div
                className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="h-2 w-full"
                  style={{
                    background:
                      selectedReservation.venueImageColor ??
                      "linear-gradient(135deg, #BDD7D2 0%, #D6E8E4 100%)",
                  }}
                />

                <header className="border-b border-[#E0DDD5] bg-white px-5 py-5 sm:px-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <AdminStatusPill
                          status={selectedReservation.reservationStatus}
                          paymentStatus={selectedReservation.paymentStatus}
                        />
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#E0DDD5] bg-[#FCFBF8] px-2.5 py-1 text-xs font-semibold text-[#7C7671]">
                          {selectedReservation.paymentMethod === "gcash" ? (
                            <Smartphone size={11} />
                          ) : (
                            <Banknote size={11} />
                          )}
                          {paymentMethodLabel}
                        </span>
                      </div>
                      <h2 className="break-words text-2xl font-extrabold tracking-tight text-[#1A1817]">
                        {selectedReservation.referenceNumber}
                      </h2>
                      <p className="mt-1 text-sm text-[#7C7671]">
                        {selectedReservation.eventName} at {selectedReservation.venueName}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:items-start">
                      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#E0DDD5] bg-[#FCFBF8] p-3 text-sm">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7C7671]">
                            Amount
                          </p>
                          <p className="mt-1 font-extrabold text-[#1A1817]">
                            {formatPeso(selectedReservation.totalAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7C7671]">
                            Submitted
                          </p>
                          <p className="mt-1 font-semibold text-[#1A1817]">
                            {formatAdminDateTime(selectedReservation.createdAt)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={closeRequestModal}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-[#E0DDD5] bg-white px-4 text-sm font-semibold text-[#7C7671] transition hover:border-[#1A1817] hover:text-[#1A1817]"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </header>

                <div className="overflow-y-auto bg-[#FCFBF8] p-5 sm:p-6">
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
                    <div className="space-y-5">
                      <InfoSection
                        title="Requestor"
                        icon={<User size={16} />}
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          <InfoRow label="Name" value={selectedReservation.contactName} />
                          <InfoRow label="Phone" value={selectedReservation.contactPhone} />
                        </div>
                        <InfoRow
                          label="Special requests"
                          value={selectedReservation.specialRequests || "None"}
                          icon={<MessageSquare size={14} />}
                        />
                      </InfoSection>

                      <InfoSection
                        title="Event schedule"
                        icon={<CalendarDays size={16} />}
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          <InfoRow label="Event" value={selectedReservation.eventName} />
                          <InfoRow label="Occasion" value={selectedReservation.eventOccasion} />
                          <InfoRow
                            label="Date and time"
                            value={`${formatAdminDate(selectedReservation.eventDate)} at ${formatAdminTime(selectedReservation.startTime)}`}
                            icon={<Clock size={14} />}
                          />
                          <InfoRow
                            label="Duration"
                            value={`${selectedReservation.durationHours} hours`}
                          />
                          <InfoRow
                            label="Guests"
                            value={formatAdminCompactNumber(selectedReservation.guestCount)}
                            icon={<Users size={14} />}
                          />
                        </div>
                      </InfoSection>

                      <InfoSection title="Venue" icon={<MapPin size={16} />}>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <InfoRow label="Venue" value={selectedReservation.venueName} />
                          <InfoRow label="Type" value={selectedReservation.venueType} />
                          <InfoRow
                            label="Location"
                            value={location || selectedReservation.venueAddress || "Not provided"}
                            icon={<MapPin size={14} />}
                          />
                          <InfoRow
                            label="Full address"
                            value={selectedReservation.venueAddress || "Not provided"}
                          />
                        </div>
                      </InfoSection>
                    </div>

                    <aside className="space-y-5">
                      <InfoSection
                        title="Payment review"
                        icon={
                          selectedReservation.paymentMethod === "gcash" ? (
                            <Smartphone size={16} />
                          ) : (
                            <Banknote size={16} />
                          )
                        }
                      >
                        <div className="space-y-3">
                          <InfoRow label="Method" value={paymentMethodLabel} />
                          <InfoRow
                            label="Payment reference"
                            value={selectedReservation.paymentReference ?? "Not set"}
                            mono
                          />
                          {selectedReservation.paymentMethod === "gcash" && (
                            <>
                              <InfoRow
                                label="Venue GCash receiving number"
                                value={selectedReservation.venueGcashNumber || "Not configured"}
                                icon={<Smartphone size={14} />}
                              />
                              <InfoRow
                                label="Customer GCash number"
                                value={selectedReservation.gcashNumber ?? "Not provided"}
                                icon={<Phone size={14} />}
                              />
                            </>
                          )}
                          <InfoRow
                            label="Confirmed"
                            value={
                              selectedReservation.paymentConfirmedAt
                                ? formatAdminDateTime(selectedReservation.paymentConfirmedAt)
                                : "Not confirmed"
                            }
                          />
                          <InfoRow label="Payment type" value={paymentTypeLabel} />
                          <InfoRow
                            label="Admin note"
                            value={selectedReservation.adminNote || "None"}
                          />
                        </div>

                        {selectedReservation.paymentMethod === "gcash" && (
                          <div
                            className={`mt-4 rounded-2xl border p-4 ${
                              selectedReservation.paymentProofUrl
                                ? "border-[#C8E0DA] bg-[#EAF2F0]"
                                : "border-[#F2C5BE] bg-[#FDECEA]"
                            }`}
                          >
                            <p
                              className={`text-xs font-bold ${
                                selectedReservation.paymentProofUrl
                                  ? "text-[#2A6558]"
                                  : "text-[#C0392B]"
                              }`}
                            >
                              {selectedReservation.paymentProofUrl
                                ? "Payment proof uploaded"
                                : "Payment proof missing"}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-[#6B6661]">
                              {selectedReservation.paymentProofUrl
                                ? "Open the receipt screenshot before approving this request."
                                : "Ask the requestor to upload a receipt before confirming."}
                            </p>
                            {selectedReservation.paymentProofUrl && (
                              <button
                                type="button"
                                onClick={() => setProofModal(selectedReservation.paymentProofUrl)}
                                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#2A6558] bg-white px-3 py-2 text-xs font-semibold text-[#2A6558] transition hover:bg-[#F8FBFA]"
                              >
                                <ImageIcon size={13} />
                                View proof
                                <ExternalLink size={12} />
                              </button>
                            )}
                          </div>
                        )}
                      </InfoSection>

                      {isPending && (
                        <InfoSection title="Admin action" icon={<CheckCircle2 size={16} />}>
                          {selectedReservation.paymentMethod === "cash" ? (
                            <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                              <input
                                type="checkbox"
                                checked={Boolean(cashReferenceChecks[selectedReservation.id])}
                                onChange={(e) =>
                                  setCashReferenceChecks((prev) => ({
                                    ...prev,
                                    [selectedReservation.id]: e.target.checked,
                                  }))
                                }
                                className="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-300 text-[#2A6558]"
                              />
                              <span>
                                I checked the cash payment against booking reference{" "}
                                <strong>{selectedReservation.referenceNumber}</strong> and payment reference{" "}
                                <strong>{selectedReservation.paymentReference ?? "not set"}</strong>.
                              </span>
                            </label>
                          ) : (
                            <div
                              className={`rounded-2xl border p-3 text-xs leading-relaxed ${
                                selectedReservation.paymentProofUrl
                                  ? "border-[#C8E0DA] bg-[#EAF2F0] text-[#2A6558]"
                                  : "border-[#F2C5BE] bg-[#FDECEA] text-[#C0392B]"
                              }`}
                            >
                              {selectedReservation.paymentProofUrl
                                ? "Receipt is available. Review it, then confirm payment."
                                : "No GCash proof was uploaded yet."}
                            </div>
                          )}

                          <div className="mt-4 grid gap-3">
                            <label>
                              <span className="mb-1.5 block text-xs font-semibold text-[#7C7671]">
                                Payment reference
                              </span>
                              <input
                                value={
                                  paymentRefs[selectedReservation.id] ??
                                  selectedReservation.paymentReference ??
                                  ""
                                }
                                onChange={(e) =>
                                  setPaymentRefs((prev) => ({
                                    ...prev,
                                    [selectedReservation.id]: e.target.value,
                                  }))
                                }
                                placeholder="Payment reference"
                                className="h-10 w-full rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558]"
                              />
                            </label>
                            <label>
                              <span className="mb-1.5 block text-xs font-semibold text-[#7C7671]">
                                Internal note
                              </span>
                              <input
                                value={adminNotes[selectedReservation.id] ?? ""}
                                onChange={(e) =>
                                  setAdminNotes((prev) => ({
                                    ...prev,
                                    [selectedReservation.id]: e.target.value,
                                  }))
                                }
                                placeholder="Optional note"
                                className="h-10 w-full rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558]"
                              />
                            </label>
                          </div>

                          <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            <button
                              type="button"
                              onClick={() =>
                                void handleConfirmPayment(
                                  selectedReservation.id,
                                  selectedReservation.paymentMethod,
                                  selectedReservation.paymentReference,
                                  selectedReservation.paymentProofUrl
                                )
                              }
                              disabled={submittingAction === `confirm-${selectedReservation.id}`}
                              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2A6558] px-4 text-sm font-semibold text-white transition hover:bg-[#215249] disabled:opacity-60"
                            >
                              {submittingAction === `confirm-${selectedReservation.id}` ? (
                                <Loader2 size={15} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={15} />
                              )}
                              Confirm
                            </button>
                            {cancelConfirmId !== selectedReservation.id && (
                              <button
                                type="button"
                                onClick={() => setCancelConfirmId(selectedReservation.id)}
                                disabled={submittingAction === `cancel-${selectedReservation.id}`}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#F2C5BE] bg-[#FDECEA] px-4 text-sm font-semibold text-[#C0392B] transition hover:border-[#C0392B] disabled:opacity-60"
                              >
                                <XCircle size={15} />
                                Cancel request
                              </button>
                            )}
                          </div>
                          {cancelConfirmId === selectedReservation.id && (
                            <div className="mt-3 rounded-xl border border-[#F2C5BE] bg-[#FDECEA] p-3">
                              <p className="text-xs font-semibold text-[#C0392B]">
                                Cancel this payment request?
                              </p>
                              <p className="mt-1 text-xs leading-relaxed text-[#7C7671]">
                                This marks the request as cancelled and removes it from the active queue.
                              </p>
                              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                <button
                                  type="button"
                                  onClick={() => setCancelConfirmId(null)}
                                  disabled={submittingAction === `cancel-${selectedReservation.id}`}
                                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[#E0DDD5] bg-white px-3 text-xs font-semibold text-[#7C7671] transition hover:border-[#1A1817] hover:text-[#1A1817] disabled:opacity-60"
                                >
                                  Keep request
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleCancelReservation(
                                      selectedReservation.id,
                                      selectedReservation.referenceNumber
                                    )
                                  }
                                  disabled={submittingAction === `cancel-${selectedReservation.id}`}
                                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#C0392B] px-3 text-xs font-semibold text-white transition hover:bg-[#A93226] disabled:opacity-60"
                                >
                                  {submittingAction === `cancel-${selectedReservation.id}` ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <XCircle size={14} />
                                  )}
                                  Yes, cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </InfoSection>
                      )}

                      {selectedReservation.reservationStatus === "confirmed" && (
                        cancelConfirmId === selectedReservation.id ? (
                          <div className="rounded-xl border border-[#F2C5BE] bg-[#FDECEA] p-3">
                            <p className="text-xs font-semibold text-[#C0392B]">
                              Cancel this confirmed reservation?
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-[#7C7671]">
                              This removes the reservation from the active event schedule.
                            </p>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              <button
                                type="button"
                                onClick={() => setCancelConfirmId(null)}
                                disabled={submittingAction === `cancel-${selectedReservation.id}`}
                                className="inline-flex h-10 items-center justify-center rounded-xl border border-[#E0DDD5] bg-white px-3 text-xs font-semibold text-[#7C7671] transition hover:border-[#1A1817] hover:text-[#1A1817] disabled:opacity-60"
                              >
                                Keep reservation
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleCancelReservation(
                                    selectedReservation.id,
                                    selectedReservation.referenceNumber
                                  )
                                }
                                disabled={submittingAction === `cancel-${selectedReservation.id}`}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#C0392B] px-3 text-xs font-semibold text-white transition hover:bg-[#A93226] disabled:opacity-60"
                              >
                                {submittingAction === `cancel-${selectedReservation.id}` ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <XCircle size={14} />
                                )}
                                Yes, cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCancelConfirmId(selectedReservation.id)}
                            disabled={submittingAction === `cancel-${selectedReservation.id}`}
                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#F2C5BE] bg-[#FDECEA] px-4 text-sm font-semibold text-[#C0392B] transition hover:border-[#C0392B] disabled:opacity-60"
                          >
                            <XCircle size={15} />
                            Cancel reservation
                          </button>
                        )
                      )}
                    </aside>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Proof image modal */}
      {proofModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setProofModal(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-[#1A1817]">Payment Receipt / Screenshot</p>
              <button
                type="button"
                onClick={() => setProofModal(null)}
                className="rounded-lg border border-[#E0DDD5] px-3 py-1 text-xs font-semibold text-[#7C7671] hover:border-[#1A1817]"
              >
                Close
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proofModal}
              alt="Payment proof"
              className="w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function InfoSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-[#E0DDD5] bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#EAF2F0] text-[#2A6558]">
          {icon}
        </span>
        <h3 className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#2A6558]">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function InfoRow({
  label,
  value,
  icon,
  mono,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#F0EEEA] bg-[#FCFBF8] px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7C7671]">
        {icon && <span className="text-[#2A6558]">{icon}</span>}
        {label}
      </div>
      <p
        className={`min-w-0 whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed text-[#1A1817] ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

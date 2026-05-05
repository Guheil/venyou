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
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Smartphone,
  XCircle,
  ImageIcon,
  CreditCard,
  HandCoins,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentRefs, setPaymentRefs] = useState<Record<string, string>>({});
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);
  const [proofModal, setProofModal] = useState<string | null>(null);
  const [paymentTypeSelection, setPaymentTypeSelection] = useState<Record<string, "online" | "face_to_face">>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return reservations.filter((reservation) => {
      const matchesFilter = filter === "all" || reservation.reservationStatus === filter;
      const matchesSearch =
        !q ||
        reservation.referenceNumber.toLowerCase().includes(q) ||
        reservation.contactName.toLowerCase().includes(q) ||
        reservation.venueName.toLowerCase().includes(q) ||
        reservation.contactPhone.toLowerCase().includes(q) ||
        reservation.eventName.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [filter, searchQuery, reservations]);

  const selectedReservation = useMemo(
    () => reservations.find((r) => r.id === selectedId) ?? null,
    [reservations, selectedId]
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
    const selectedType = paymentTypeSelection[reservationId];

    if (!selectedType) {
      showError("Payment type required", "Please select Online Payment or Face-to-Face before confirming.");
      return;
    }

    if (paymentMethod === "cash" && !referenceToUse) {
      showError("Reference required", "Enter a payment reference before confirming cash payment.");
      return;
    }

    setSubmittingAction(`confirm-${reservationId}`);

    await supabase
      .from("venue_reservations")
      .update({ admin_payment_type: selectedType })
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
    setPaymentTypeSelection((prev) => { const next = { ...prev }; delete next[reservationId]; return next; });
    setSelectedId(null);
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
    setSelectedId(null);
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
                  onClick={() => setSelectedId(reservation.id)}
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
      {selectedReservation && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#E0DDD5] bg-white px-5 py-4 sm:px-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
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
                    {selectedReservation.paymentMethod === "gcash" ? "GCash" : "Cash"}
                  </span>
                </div>
                <p className="mt-1 text-lg font-extrabold text-[#1A1817]">
                  {selectedReservation.referenceNumber}
                </p>
                <p className="text-sm text-[#7C7671]">
                  {formatPeso(selectedReservation.totalAmount)} &middot;{" "}
                  {formatAdminDateTime(selectedReservation.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="shrink-0 rounded-xl border border-[#E0DDD5] px-3 py-2 text-xs font-semibold text-[#7C7671] hover:border-[#1A1817]"
              >
                Close
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              {/* Details grid */}
              <div className="grid gap-4 sm:grid-cols-3">
                <DetailBlock title="Customer">
                  <DetailRow label="Name" value={selectedReservation.contactName} />
                  <DetailRow label="Phone" value={selectedReservation.contactPhone} />
                  <DetailRow
                    label="Requests"
                    value={selectedReservation.specialRequests || "None"}
                  />
                </DetailBlock>
                <DetailBlock title="Event">
                  <DetailRow label="Event" value={selectedReservation.eventName} />
                  <DetailRow label="Occasion" value={selectedReservation.eventOccasion} />
                  <DetailRow
                    label="Date"
                    value={`${formatAdminDate(selectedReservation.eventDate)} at ${formatAdminTime(selectedReservation.startTime)}`}
                  />
                  <DetailRow
                    label="Duration"
                    value={`${selectedReservation.durationHours} hours`}
                  />
                  <DetailRow
                    label="Guests"
                    value={formatAdminCompactNumber(selectedReservation.guestCount)}
                  />
                </DetailBlock>
                <DetailBlock title="Venue & payment">
                  <DetailRow label="Venue" value={selectedReservation.venueName} />
                  <DetailRow label="Type" value={selectedReservation.venueType} />
                  <DetailRow
                    label="Location"
                    value={`${selectedReservation.venueCity}${selectedReservation.venueArea ? `, ${selectedReservation.venueArea}` : ""}`}
                  />
                  <DetailRow
                    label="GCash no."
                    value={selectedReservation.gcashNumber ?? "Not provided"}
                  />
                  <DetailRow
                    label="Reference"
                    value={selectedReservation.paymentReference ?? "Not set"}
                  />
                  <DetailRow
                    label="Confirmed"
                    value={
                      selectedReservation.paymentConfirmedAt
                        ? formatAdminDateTime(selectedReservation.paymentConfirmedAt)
                        : "Not confirmed"
                    }
                  />
                  <DetailRow
                    label="Admin note"
                    value={selectedReservation.adminNote || "None"}
                  />
                  <DetailRow
                    label="Payment type"
                    value={
                      selectedReservation.adminPaymentType === "online"
                        ? "Online (GCash / Bank)"
                        : selectedReservation.adminPaymentType === "face_to_face"
                          ? "Face-to-Face (Cash)"
                          : "Not yet confirmed"
                    }
                  />
                </DetailBlock>
              </div>

              {/* Payment proof */}
              {selectedReservation.paymentProofUrl && (
                <div className="rounded-xl border border-[#C8E0DA] bg-[#EAF2F0] p-3">
                  <p className="mb-2 text-xs font-semibold text-[#2A6558]">
                    Payment Proof Submitted
                  </p>
                  <button
                    type="button"
                    onClick={() => setProofModal(selectedReservation.paymentProofUrl!)}
                    className="flex items-center gap-2 rounded-lg border border-[#2A6558] bg-white px-3 py-2 text-xs font-semibold text-[#2A6558] transition hover:bg-[#EAF2F0]"
                  >
                    <ImageIcon size={13} />
                    View Receipt / Screenshot
                    <ExternalLink size={12} />
                  </button>
                </div>
              )}

              {/* Actions — pending */}
              {selectedReservation.reservationStatus === "pending_payment" &&
                selectedReservation.paymentStatus === "pending" && (
                  <div className="space-y-3 rounded-[20px] border border-[#E0DDD5] bg-[#FCFBF8] p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#2A6558]">
                      Confirm Payment
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPaymentTypeSelection((prev) => ({
                            ...prev,
                            [selectedReservation.id]: "online",
                          }))
                        }
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                          paymentTypeSelection[selectedReservation.id] === "online"
                            ? "border-[#2A6558] bg-[#EAF2F0] text-[#2A6558]"
                            : "border-[#E0DDD5] bg-white text-[#7C7671] hover:border-[#2A6558]"
                        }`}
                      >
                        <CreditCard size={13} />
                        Online Payment
                        <span className="text-[10px] opacity-70">(GCash / Bank)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPaymentTypeSelection((prev) => ({
                            ...prev,
                            [selectedReservation.id]: "face_to_face",
                          }))
                        }
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                          paymentTypeSelection[selectedReservation.id] === "face_to_face"
                            ? "border-[#2A6558] bg-[#EAF2F0] text-[#2A6558]"
                            : "border-[#E0DDD5] bg-white text-[#7C7671] hover:border-[#2A6558]"
                        }`}
                      >
                        <HandCoins size={13} />
                        Face-to-Face
                        <span className="text-[10px] opacity-70">(Cash)</span>
                      </button>
                    </div>
                    {!paymentTypeSelection[selectedReservation.id] && (
                      <p className="text-[11px] text-[#C0392B]">
                        Select a payment type to proceed.
                      </p>
                    )}
                    <div className="grid gap-2 sm:grid-cols-2">
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
                        placeholder={
                          selectedReservation.paymentMethod === "cash"
                            ? "Payment reference (required)"
                            : "Payment reference"
                        }
                        className="h-10 rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm text-[#1A1817] outline-none focus:border-[#2A6558]"
                      />
                      <input
                        value={adminNotes[selectedReservation.id] ?? ""}
                        onChange={(e) =>
                          setAdminNotes((prev) => ({
                            ...prev,
                            [selectedReservation.id]: e.target.value,
                          }))
                        }
                        placeholder="Internal note"
                        className="h-10 rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm text-[#1A1817] outline-none focus:border-[#2A6558]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void handleConfirmPayment(
                            selectedReservation.id,
                            selectedReservation.paymentMethod,
                            selectedReservation.paymentReference
                          )
                        }
                        disabled={submittingAction === `confirm-${selectedReservation.id}`}
                        className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#2A6558] px-4 text-sm font-semibold text-white transition hover:bg-[#215249] disabled:opacity-60"
                      >
                        {submittingAction === `confirm-${selectedReservation.id}` ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={15} />
                        )}
                        Confirm payment
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
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#F2C5BE] bg-[#FDECEA] px-4 text-sm font-semibold text-[#C0392B] transition hover:border-[#C0392B] disabled:opacity-60"
                      >
                        {submittingAction === `cancel-${selectedReservation.id}` ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <XCircle size={15} />
                        )}
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

              {/* Cancel-only for confirmed */}
              {selectedReservation.reservationStatus === "confirmed" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      void handleCancelReservation(
                        selectedReservation.id,
                        selectedReservation.referenceNumber
                      )
                    }
                    disabled={submittingAction === `cancel-${selectedReservation.id}`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#F2C5BE] bg-[#FDECEA] px-4 text-sm font-semibold text-[#C0392B] transition hover:border-[#C0392B] disabled:opacity-60"
                  >
                    {submittingAction === `cancel-${selectedReservation.id}` ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <XCircle size={15} />
                    )}
                    Cancel reservation
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

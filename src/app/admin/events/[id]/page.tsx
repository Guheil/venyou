"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import AdminShell from "@/components/AdminShell";
import {
  AdminDeniedState,
  AdminLoadingState,
  AdminPanel,
  AdminSectionHeader,
  AdminStatusPill,
} from "@/components/admin/AdminUI";
import {
  type AdminReservation,
  formatAdminCompactNumber,
  formatAdminDate,
  formatAdminDateTime,
  formatAdminTime,
} from "@/lib/adminData";
import { formatPeso } from "@/lib/budget";
import { ROUTES } from "@/lib/routes";
import { useAdminData } from "@/lib/useAdminData";
import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Hash,
  MapPin,
  MessageSquare,
  Phone,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Tag,
  User,
  Users,
} from "lucide-react";

function readParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] : "";
}

function venueLocation(event: AdminReservation) {
  const cityArea = [event.venueCity, event.venueArea].filter(Boolean).join(", ");
  return event.venueAddress || cityArea || "Not provided";
}

function paymentMethodLabel(event: AdminReservation) {
  return event.paymentMethod === "gcash" ? "GCash" : "Cash";
}

function adminPaymentTypeLabel(event: AdminReservation) {
  if (event.adminPaymentType === "online") return "Online";
  if (event.adminPaymentType === "face_to_face") return "Face to face";
  return event.paymentMethod === "gcash" ? "Online" : "Face to face";
}

function Breadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-sm">
      <Link href={ROUTES.admin} className="font-semibold text-[#7C7671] transition hover:text-[#2A6558]">
        Admin
      </Link>
      <ChevronRight size={14} className="text-[#B0ABA5]" />
      <Link
        href={ROUTES.adminEvents}
        className="font-semibold text-[#7C7671] transition hover:text-[#2A6558]"
      >
        Events
      </Link>
      <ChevronRight size={14} className="text-[#B0ABA5]" />
      <span className="font-bold text-[#1A1817]">{current}</span>
    </nav>
  );
}

function SummaryTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E0DDD5] bg-white/85 p-4 shadow-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF2F0] text-[#2A6558]">
        {icon}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7C7671]">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-extrabold text-[#1A1817]">{value}</p>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[#F0EEEA] bg-[#FCFBF8] p-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#2A6558] shadow-sm">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7C7671]">
          {label}
        </p>
        <div className="mt-1 break-words text-sm font-bold leading-relaxed text-[#1A1817]">
          {value}
        </div>
        {detail && <div className="mt-1 break-words text-xs leading-relaxed text-[#7C7671]">{detail}</div>}
      </div>
    </div>
  );
}

function NotFoundState() {
  return (
    <AdminShell>
      <main className="mx-auto w-full max-w-5xl px-4 py-6 page-fade sm:px-6 sm:py-10">
        <Breadcrumb current="Not found" />
        <AdminPanel>
          <div className="flex flex-col items-start gap-4 sm:flex-row">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAF2F0] text-[#2A6558]">
              <CalendarDays size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2A6558]">
                Event detail
              </p>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#1A1817]">
                Event not found
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#7C7671]">
                This event may have been cancelled, deleted, or it may still be waiting for payment confirmation.
              </p>
              <Link
                href={ROUTES.adminEvents}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#2A6558] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#215249]"
              >
                <ArrowLeft size={15} />
                Back to events
              </Link>
            </div>
          </div>
        </AdminPanel>
      </main>
    </AdminShell>
  );
}

export default function AdminEventDetailPage() {
  const params = useParams();
  const id = readParam(params.id);
  const { accessState, loadingData, reservations } = useAdminData();

  const event = useMemo(
    () =>
      reservations.find(
        (reservation) =>
          reservation.id === id && reservation.reservationStatus === "confirmed"
      ) ?? null,
    [id, reservations]
  );

  if (accessState === "loading" || loadingData) {
    return (
      <AdminShell>
        <AdminLoadingState label="Loading event details" />
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

  if (!event) {
    return <NotFoundState />;
  }

  const paymentIcon = event.paymentMethod === "gcash" ? <Smartphone size={15} /> : <Banknote size={15} />;
  const location = venueLocation(event);
  const reference = event.paymentReference ?? event.referenceNumber;
  const proofLink =
    event.paymentProofUrl && event.paymentProofUrl.trim().length > 0 ? event.paymentProofUrl : null;

  return (
    <AdminShell>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 page-fade sm:px-6 sm:py-10">
        <Breadcrumb current={event.referenceNumber} />

        <Link
          href={ROUTES.adminEvents}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#E0DDD5] bg-white px-4 py-2 text-sm font-bold text-[#1A1817] transition hover:border-[#2A6558] hover:text-[#2A6558]"
        >
          <ArrowLeft size={15} />
          Back to events
        </Link>

        <section className="overflow-hidden rounded-[30px] border border-[#E0DDD5] bg-gradient-to-br from-[#FCFBF8] via-white to-[#F0F6F4] shadow-sm">
          <div
            className="h-2 w-full"
            style={{
              background:
                event.venueImageColor ??
                "linear-gradient(135deg, #BDD7D2 0%, #D6E8E4 100%)",
            }}
          />
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <AdminStatusPill status={event.reservationStatus} paymentStatus={event.paymentStatus} />
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#E0DDD5] bg-white px-2.5 py-1 text-xs font-semibold text-[#7C7671]">
                    {paymentIcon}
                    {paymentMethodLabel(event)}
                  </span>
                </div>
                <h1 className="break-words text-3xl font-extrabold tracking-tight text-[#1A1817] sm:text-4xl">
                  {event.eventName}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#6B6661] sm:text-base">
                  {event.eventOccasion} for {event.contactName}. Reservation reference {event.referenceNumber}.
                </p>
              </div>
              <div className="rounded-2xl border border-[#E0DDD5] bg-white p-4 xl:min-w-64">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7C7671]">
                  Reserved value
                </p>
                <p className="mt-1 text-2xl font-extrabold text-[#1A1817]">
                  {formatPeso(event.totalAmount)}
                </p>
                <p className="mt-1 break-words text-xs text-[#7C7671]">{reference}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryTile icon={<CalendarDays size={17} />} label="Date" value={formatAdminDate(event.eventDate)} />
              <SummaryTile
                icon={<Clock size={17} />}
                label="Time"
                value={`${formatAdminTime(event.startTime)} - ${event.durationHours} hours`}
              />
              <SummaryTile
                icon={<Users size={17} />}
                label="Guests"
                value={`${formatAdminCompactNumber(event.guestCount)} guests`}
              />
              <SummaryTile icon={<Building2 size={17} />} label="Venue" value={event.venueName} />
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]">
          <div className="grid gap-5">
            <AdminPanel>
              <AdminSectionHeader
                eyebrow="Event"
                title="Event details"
                description="Core schedule, guest count, and request information for this confirmed reservation."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow icon={<Tag size={15} />} label="Occasion" value={event.eventOccasion} />
                <InfoRow icon={<CalendarCheck size={15} />} label="Event name" value={event.eventName} />
                <InfoRow icon={<CalendarDays size={15} />} label="Date" value={formatAdminDate(event.eventDate)} />
                <InfoRow icon={<Clock size={15} />} label="Start time" value={formatAdminTime(event.startTime)} />
                <InfoRow icon={<Clock size={15} />} label="Duration" value={`${event.durationHours} hours`} />
                <InfoRow
                  icon={<Users size={15} />}
                  label="Guest count"
                  value={`${formatAdminCompactNumber(event.guestCount)} guests`}
                />
                <InfoRow
                  icon={<MessageSquare size={15} />}
                  label="Special requests"
                  value={event.specialRequests || "None"}
                />
                <InfoRow icon={<Hash size={15} />} label="Event ID" value={event.eventId ?? "Not linked"} />
              </div>
            </AdminPanel>

            <AdminPanel>
              <AdminSectionHeader
                eyebrow="Venue"
                title="Venue details"
                description="Reserved venue information connected to this event."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow icon={<Building2 size={15} />} label="Venue" value={event.venueName} />
                <InfoRow icon={<Tag size={15} />} label="Type" value={event.venueType} />
                <InfoRow
                  icon={<Smartphone size={15} />}
                  label="Venue GCash receiving number"
                  value={event.venueGcashNumber || "Not configured"}
                />
                <InfoRow icon={<MapPin size={15} />} label="Location" value={location} />
                <InfoRow icon={<MapPin size={15} />} label="City / area" value={[event.venueCity, event.venueArea].filter(Boolean).join(", ") || "Not provided"} />
                <InfoRow icon={<Hash size={15} />} label="Venue ID" value={event.venueId} />
              </div>
            </AdminPanel>
          </div>

          <aside className="grid gap-5 content-start">
            <AdminPanel>
              <AdminSectionHeader
                eyebrow="Requestor"
                title="Customer"
                description="Contact attached to the reservation request."
              />
              <div className="grid gap-3">
                <InfoRow icon={<User size={15} />} label="Name" value={event.contactName} />
                <InfoRow icon={<Phone size={15} />} label="Phone" value={event.contactPhone} />
                <InfoRow icon={<Hash size={15} />} label="User ID" value={event.userId} />
              </div>
            </AdminPanel>

            <AdminPanel>
              <AdminSectionHeader
                eyebrow="Payment"
                title="Confirmation"
                description="Payment method, reference, and admin confirmation details."
              />
              <div className="grid gap-3">
                <InfoRow icon={paymentIcon} label="Payment method" value={paymentMethodLabel(event)} />
                <InfoRow icon={<ShieldCheck size={15} />} label="Admin payment type" value={adminPaymentTypeLabel(event)} />
                <InfoRow icon={<ReceiptText size={15} />} label="Payment status" value={event.paymentStatus} />
                <InfoRow icon={<Banknote size={15} />} label="Total amount" value={formatPeso(event.totalAmount)} />
                <InfoRow icon={<Hash size={15} />} label="Reference" value={reference} />
                {event.paymentMethod === "gcash" && (
                  <>
                    <InfoRow
                      icon={<Smartphone size={15} />}
                      label="Venue GCash receiving number"
                      value={event.venueGcashNumber || "Not configured"}
                    />
                    <InfoRow
                      icon={<Smartphone size={15} />}
                      label="Customer GCash number"
                      value={event.gcashNumber ?? "Not provided"}
                    />
                  </>
                )}
                <InfoRow
                  icon={<ShieldCheck size={15} />}
                  label="Confirmed"
                  value={
                    event.paymentConfirmedAt
                      ? formatAdminDateTime(event.paymentConfirmedAt)
                      : "Confirmed by admin"
                  }
                />
                <InfoRow icon={<FileText size={15} />} label="Admin note" value={event.adminNote || "None"} />
                {event.paymentMethod === "gcash" && (
                  <InfoRow
                    icon={<FileText size={15} />}
                    label="Proof of payment"
                    value={
                      proofLink ? (
                        <a
                          href={proofLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#2A6558] transition hover:text-[#1F4F45]"
                        >
                          Open uploaded proof
                          <ExternalLink size={13} />
                        </a>
                      ) : (
                        "No uploaded proof"
                      )
                    }
                  />
                )}
              </div>
            </AdminPanel>

            <AdminPanel>
              <AdminSectionHeader
                eyebrow="Record"
                title="Reservation record"
                description="Audit dates for this confirmed request."
              />
              <div className="grid gap-3">
                <InfoRow icon={<CalendarDays size={15} />} label="Submitted" value={formatAdminDateTime(event.createdAt)} />
                <InfoRow icon={<Clock size={15} />} label="Last updated" value={formatAdminDateTime(event.updatedAt)} />
                <InfoRow icon={<Hash size={15} />} label="Reservation ID" value={event.id} />
              </div>
            </AdminPanel>
          </aside>
        </div>
      </main>
    </AdminShell>
  );
}

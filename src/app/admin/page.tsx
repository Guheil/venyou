"use client";

import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import {
  AdminDeniedState,
  AdminLoadingState,
  AdminMetricCard,
  AdminPanel,
  AdminSectionHeader,
  AdminStatusPill,
} from "@/components/admin/AdminUI";
import { formatPeso } from "@/lib/budget";
import { formatAdminDate, formatAdminTime } from "@/lib/adminData";
import { ROUTES } from "@/lib/routes";
import { useAdminData } from "@/lib/useAdminData";
import {
  ArrowRight,
  Banknote,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";

export default function AdminOverviewPage() {
  const {
    accessState,
    adminProfile,
    loadingData,
    reservations,
    summary,
    venues,
    events,
  } = useAdminData();

  if (accessState === "loading") {
    return (
      <AdminShell>
        <AdminLoadingState label="Loading admin overview" />
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

  const totalOutcomes =
    summary.pending_requests +
    summary.confirmed_reservations +
    summary.cancelled_reservations;
  const confirmationRate =
    totalOutcomes > 0
      ? Math.round((summary.confirmed_reservations / totalOutcomes) * 100)
      : 0;
  const pendingReservations = reservations.filter(
    (reservation) =>
      reservation.reservationStatus === "pending_payment" &&
      reservation.paymentStatus === "pending"
  );
  const activeVenues = venues.filter((venue) => venue.isActive).length;
  const recentReservations = reservations.slice(0, 5);
  const upcomingEvents = events
    .filter((event) => event.eventDate)
    .sort(
      (left, right) =>
        new Date(`${left.eventDate}T00:00:00`).getTime() -
        new Date(`${right.eventDate}T00:00:00`).getTime()
    )
    .slice(0, 4);

  return (
    <AdminShell>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 page-fade sm:px-6 sm:py-10">
        <section className="rounded-[30px] border border-[#E0DDD5] bg-gradient-to-br from-[#FCFBF8] via-white to-[#F0F6F4] p-6 sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#C8E0DA] bg-[#EAF2F0] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2A6558]">
                  <ShieldCheck size={13} />
                  Admin Overview
                </span>
                <span className="rounded-full border border-[#E0DDD5] bg-white px-3 py-1 text-xs font-semibold text-[#7C7671]">
                  {adminProfile?.role ?? "admin"}
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#1A1817] sm:text-4xl">
                Operations snapshot for requests, venues, events, and booking health.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#6B6661] sm:text-base">
                Use the dedicated admin pages for full lists and record-level details.
                This overview only keeps the current workload and system health visible.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:w-[360px]">
              <Link
                href={ROUTES.adminRequests}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2A6558] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#215249]"
              >
                Open requests
                <ArrowRight size={15} />
              </Link>
              <Link
                href={ROUTES.adminVenues}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D8D3C9] bg-white px-5 py-3 text-sm font-semibold text-[#1A1817] transition hover:border-[#2A6558] hover:text-[#2A6558]"
              >
                Manage venues
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            icon={<Clock size={18} />}
            label="Pending Requests"
            value={loadingData ? "-" : String(summary.pending_requests)}
            detail={`${formatPeso(summary.pending_value)} awaiting admin review`}
            tone="accent"
          />
          <AdminMetricCard
            icon={<CheckCircle2 size={18} />}
            label="Confirmed"
            value={loadingData ? "-" : String(summary.confirmed_reservations)}
            detail={`${confirmationRate}% of tracked outcomes`}
          />
          <AdminMetricCard
            icon={<Banknote size={18} />}
            label="Reserved Value"
            value={loadingData ? "-" : formatPeso(summary.total_reserved_value)}
            detail="Active non-cancelled reservation value"
            tone="dark"
          />
          <AdminMetricCard
            icon={<Building2 size={18} />}
            label="Venue Stock"
            value={loadingData ? "-" : String(activeVenues)}
            detail={`${summary.inactive_venues} inactive, ${venues.length} total`}
          />
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <AdminPanel>
            <AdminSectionHeader
              eyebrow="Needs attention"
              title="Oldest pending requests"
              description="A short queue preview. The Requests page contains the full list with all fields and actions."
              action={
                <Link
                  href={ROUTES.adminRequests}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-[#2A6558] hover:text-[#215249]"
                >
                  Full list
                  <ArrowRight size={14} />
                </Link>
              }
            />
            {pendingReservations.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#DAD6CE] bg-[#FCFBF8] p-6 text-sm text-[#7C7671]">
                No pending payment requests right now.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingReservations.slice(0, 5).map((reservation) => (
                  <Link
                    key={reservation.id}
                    href={ROUTES.adminRequests}
                    className="block rounded-[22px] border border-[#E0DDD5] bg-[#FCFBF8] p-4 transition hover:border-[#2A6558]"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="mb-2">
                          <AdminStatusPill
                            status={reservation.reservationStatus}
                            paymentStatus={reservation.paymentStatus}
                          />
                        </div>
                        <p className="truncate font-bold text-[#1A1817]">
                          {reservation.referenceNumber} - {reservation.venueName}
                        </p>
                        <p className="mt-1 text-xs text-[#7C7671]">
                          {reservation.contactName} - {formatAdminDate(reservation.eventDate)} at{" "}
                          {formatAdminTime(reservation.startTime)}
                        </p>
                      </div>
                      <span className="text-sm font-extrabold text-[#2A6558]">
                        {formatPeso(reservation.totalAmount)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </AdminPanel>

          <AdminPanel>
            <AdminSectionHeader
              eyebrow="Calendar"
              title="Upcoming event briefs"
              description="Recent event demand across customers. Open Events for every event field."
              action={
                <Link
                  href={ROUTES.adminEvents}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-[#2A6558] hover:text-[#215249]"
                >
                  Events
                  <ArrowRight size={14} />
                </Link>
              }
            />
            <div className="space-y-3">
              {upcomingEvents.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#DAD6CE] bg-[#FCFBF8] p-6 text-sm text-[#7C7671]">
                  No dated event briefs found.
                </div>
              ) : (
                upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-[22px] border border-[#E0DDD5] bg-[#FCFBF8] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-[#1A1817]">
                          {event.eventName}
                        </p>
                        <p className="mt-1 text-xs text-[#7C7671]">
                          {event.occasion} - {event.city}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#EAF2F0] px-2.5 py-1 text-xs font-semibold text-[#2A6558]">
                        {event.status}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#44504C]">
                      <span className="inline-flex items-center gap-1">
                        <CalendarCheck size={12} className="text-[#2A6558]" />
                        {formatAdminDate(event.eventDate)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users size={12} className="text-[#2A6558]" />
                        {event.pax.toLocaleString()} guests
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </AdminPanel>
        </div>

        <AdminPanel className="mt-6">
          <AdminSectionHeader
            eyebrow="Latest movement"
            title="Recent reservations"
            description="A compact feed for the newest booking records. Activity contains the complete audit-style list."
            action={
              <Link
                href={ROUTES.adminActivity}
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#2A6558] hover:text-[#215249]"
              >
                Activity
                <ArrowRight size={14} />
              </Link>
            }
          />
          <div className="grid gap-3 xl:grid-cols-2">
            {recentReservations.map((reservation) => (
              <div
                key={reservation.id}
                className="rounded-[22px] border border-[#E0DDD5] bg-[#FCFBF8] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-[#1A1817]">
                      {reservation.referenceNumber}
                    </p>
                    <p className="mt-1 text-xs text-[#7C7671]">
                      {reservation.venueName} - {reservation.contactName}
                    </p>
                  </div>
                  <AdminStatusPill
                    status={reservation.reservationStatus}
                    paymentStatus={reservation.paymentStatus}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-[#7C7671]">
                    {formatAdminDate(reservation.eventDate)}
                  </span>
                  <span className="font-extrabold text-[#2A6558]">
                    {formatPeso(reservation.totalAmount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <AdminMetricCard
            icon={<CalendarCheck size={18} />}
            label="Upcoming Reservations"
            value={String(summary.upcoming_reservations)}
            detail="Active bookings dated today or later"
          />
          <AdminMetricCard
            icon={<Users size={18} />}
            label="Event Briefs"
            value={String(summary.total_events)}
            detail="All saved customer event briefs"
          />
          <AdminMetricCard
            icon={<TrendingUp size={18} />}
            label="Active Venues"
            value={String(summary.active_venues)}
            detail="Visible to customer recommendations"
          />
        </section>
      </main>
    </AdminShell>
  );
}

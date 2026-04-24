"use client";

import AdminShell from "@/components/AdminShell";
import {
  AdminDeniedState,
  AdminLoadingState,
  AdminMetricCard,
  AdminPanel,
  AdminSectionHeader,
  ProgressRow,
} from "@/components/admin/AdminUI";
import { formatPeso } from "@/lib/budget";
import { formatAdminCompactNumber } from "@/lib/adminData";
import { useAdminData } from "@/lib/useAdminData";
import {
  Banknote,
  BarChart3,
  Building2,
  CalendarCheck,
  RefreshCw,
  Smartphone,
  TrendingUp,
  Users,
} from "lucide-react";

export default function AdminAnalyticsPage() {
  const { accessState, loadingData, refreshData, reservations, venues, events, summary } =
    useAdminData();

  if (accessState === "loading") {
    return (
      <AdminShell>
        <AdminLoadingState label="Loading analytics" />
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
  const activeReservations = reservations.filter(
    (reservation) => reservation.reservationStatus !== "cancelled"
  );
  const averageReservationValue =
    activeReservations.length > 0
      ? Math.round(summary.total_reserved_value / activeReservations.length)
      : 0;
  const totalGuests = events.reduce((sum, event) => sum + event.pax, 0);
  const averageCapacity =
    venues.length > 0
      ? Math.round(venues.reduce((sum, venue) => sum + venue.capacity, 0) / venues.length)
      : 0;

  const topVenues = Object.entries(
    activeReservations.reduce<Record<string, { count: number; value: number }>>(
      (map, reservation) => {
        map[reservation.venueName] = map[reservation.venueName] ?? {
          count: 0,
          value: 0,
        };
        map[reservation.venueName].count += 1;
        map[reservation.venueName].value += reservation.totalAmount;
        return map;
      },
      {}
    )
  )
    .sort((left, right) => right[1].value - left[1].value)
    .slice(0, 6);
  const topVenueMax = Math.max(1, ...topVenues.map(([, stats]) => stats.value));

  const cityMix = Object.entries(
    reservations.reduce<Record<string, number>>((map, reservation) => {
      const city = reservation.venueCity || reservation.eventCity || "Unassigned";
      map[city] = (map[city] ?? 0) + 1;
      return map;
    }, {})
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6);
  const cityMax = Math.max(1, ...cityMix.map(([, count]) => count));

  return (
    <AdminShell>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 page-fade sm:px-6 sm:py-10">
        <section className="rounded-[30px] border border-[#E0DDD5] bg-gradient-to-br from-[#FCFBF8] via-white to-[#F0F6F4] p-6 sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#C8E0DA] bg-[#EAF2F0] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2A6558]">
                <BarChart3 size={13} />
                Analytics
              </span>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#1A1817] sm:text-4xl">
                Operations analytics across requests, bookings, venues, and events.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#6B6661] sm:text-base">
                Track confirmation performance, pending payment mix, active value,
                demand by venue, demand by city, and catalog coverage.
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
            icon={<TrendingUp size={18} />}
            label="Confirmation Rate"
            value={`${confirmationRate}%`}
            detail="Confirmed against tracked outcomes"
            tone="accent"
          />
          <AdminMetricCard
            icon={<Banknote size={18} />}
            label="Active Value"
            value={formatPeso(summary.total_reserved_value)}
            detail={`${formatPeso(averageReservationValue)} average active booking`}
            tone="dark"
          />
          <AdminMetricCard
            icon={<Users size={18} />}
            label="Event Guests"
            value={formatAdminCompactNumber(totalGuests)}
            detail={`${events.length} event briefs`}
          />
          <AdminMetricCard
            icon={<Building2 size={18} />}
            label="Venue Capacity"
            value={averageCapacity.toLocaleString()}
            detail="Average capacity per venue"
          />
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <AdminPanel>
            <AdminSectionHeader
              eyebrow="Pipeline"
              title="Status and payment mix"
              description="Reservation state and payment type distribution."
            />
            <div className="space-y-5">
              <ProgressRow
                label="Pending requests"
                value={summary.pending_requests}
                total={Math.max(1, totalOutcomes)}
                detail="Awaiting admin review"
              />
              <ProgressRow
                label="Confirmed reservations"
                value={summary.confirmed_reservations}
                total={Math.max(1, totalOutcomes)}
                detail="Paid and confirmed"
              />
              <ProgressRow
                label="Cancelled reservations"
                value={summary.cancelled_reservations}
                total={Math.max(1, totalOutcomes)}
                detail="Closed or failed"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] border border-[#E0DDD5] bg-[#FCFBF8] p-4">
                  <Smartphone size={18} className="mb-3 text-[#2A6558]" />
                  <p className="text-2xl font-extrabold text-[#1A1817]">
                    {summary.gcash_pending}
                  </p>
                  <p className="text-sm text-[#7C7671]">GCash pending</p>
                </div>
                <div className="rounded-[22px] border border-[#E0DDD5] bg-[#FCFBF8] p-4">
                  <Banknote size={18} className="mb-3 text-[#2A6558]" />
                  <p className="text-2xl font-extrabold text-[#1A1817]">
                    {summary.cash_pending}
                  </p>
                  <p className="text-sm text-[#7C7671]">Cash pending</p>
                </div>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminSectionHeader
              eyebrow="Demand"
              title="Top venue value"
              description="Active reservation value grouped by venue."
            />
            <div className="space-y-4">
              {topVenues.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#DAD6CE] bg-[#FCFBF8] p-6 text-sm text-[#7C7671]">
                  Reservation demand appears once bookings exist.
                </div>
              ) : (
                topVenues.map(([name, stats]) => (
                  <div key={name}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[#1A1817]">{name}</p>
                        <p className="text-xs text-[#7C7671]">
                          {stats.count} active reservation{stats.count === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span className="shrink-0 font-bold text-[#1A1817]">
                        {formatPeso(stats.value)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#ECE8E1]">
                      <div
                        className="h-2 rounded-full bg-[#2A6558]"
                        style={{ width: `${Math.max((stats.value / topVenueMax) * 100, 8)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </AdminPanel>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <AdminPanel>
            <AdminSectionHeader
              eyebrow="Markets"
              title="City mix"
              description="Reservation volume grouped by venue or event city."
            />
            <div className="space-y-4">
              {cityMix.map(([city, count]) => (
                <div key={city}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <p className="font-semibold text-[#1A1817]">{city}</p>
                    <span className="font-bold text-[#1A1817]">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#ECE8E1]">
                    <div
                      className="h-2 rounded-full bg-[#2A6558]"
                      style={{ width: `${Math.max((count / cityMax) * 100, 8)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminSectionHeader
              eyebrow="Coverage"
              title="Catalog health"
              description="Venue availability and upcoming active booking coverage."
            />
            <div className="space-y-5">
              <ProgressRow
                label="Active venues"
                value={summary.active_venues}
                total={Math.max(1, venues.length)}
                detail="Currently visible in recommendations"
              />
              <ProgressRow
                label="Inactive venues"
                value={summary.inactive_venues}
                total={Math.max(1, venues.length)}
                detail="Hidden from customer flows"
              />
              <ProgressRow
                label="Upcoming reservations"
                value={summary.upcoming_reservations}
                total={Math.max(1, activeReservations.length)}
                detail="Active bookings with future dates"
              />
              <div className="rounded-[24px] border border-[#E0DDD5] bg-[#FCFBF8] p-5">
                <CalendarCheck size={18} className="mb-3 text-[#2A6558]" />
                <p className="text-2xl font-extrabold text-[#1A1817]">
                  {summary.upcoming_reservations}
                </p>
                <p className="text-sm text-[#7C7671]">
                  Upcoming active reservations on the admin calendar
                </p>
              </div>
            </div>
          </AdminPanel>
        </div>
      </main>
    </AdminShell>
  );
}

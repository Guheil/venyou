"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/AuthContext";
import {
  formatBudgetInput,
  formatBudgetRange,
  formatPeso,
  midpointBudget,
  totalBudget,
} from "@/lib/budget";
import { useEventsContext } from "@/lib/EventsContext";
import { ROUTES } from "@/lib/routes";
import { supabase } from "@/lib/supabase/client";
import type { SavedEvent } from "@/lib/types";
import {
  AlertCircle,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  FileText,
  PieChart,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

type EventStatus = SavedEvent["status"];

const statusColor: Record<EventStatus, string> = {
  Draft: "bg-[#F0EDEA] text-[#7C7671]",
  "In Review": "bg-[#FEF3C7] text-[#92400E]",
  Confirmed: "bg-[#EAF2F0] text-[#2A6558]",
};

const statusIcon: Record<EventStatus, ReactNode> = {
  Draft: <FileText size={12} />,
  "In Review": <AlertCircle size={12} />,
  Confirmed: <CheckCircle2 size={12} />,
};

interface AnalysisReservation {
  createdAt: string;
  eventDate: string;
  eventId: string | null;
  referenceNumber: string;
  reservationStatus: "pending_payment" | "confirmed";
  totalAmount: number;
  venueName: string;
}

interface PanelProps {
  children: ReactNode;
  className?: string;
}

interface SectionHeaderProps {
  title: string;
  description: string;
  eyebrow?: string;
  action?: ReactNode;
}

interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}

function Panel({ children, className = "" }: PanelProps) {
  return (
    <section
      className={`rounded-[28px] border border-[#E0DDD5] bg-white p-5 shadow-sm sm:p-6 ${className}`}
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
}: SectionHeaderProps) {
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

function KpiCard({ icon, label, value, detail }: KpiCardProps) {
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

function StatusBadge({ status }: { status: EventStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statusColor[status]}`}
    >
      {statusIcon[status]}
      <span>{status}</span>
    </span>
  );
}

function parseEventDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatShortDate(value: string) {
  return parseEventDate(value).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDaysUntil(value: string) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = parseEventDate(value);
  return Math.round(
    (target.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export default function CostAnalysisPage() {
  const { user, loading: authLoading } = useAuth();
  const { events, hydrated } = useEventsContext();
  const [reservationsState, setReservationsState] = useState<
    AnalysisReservation[] | null
  >(null);

  useEffect(() => {
    let cancelled = false;

    if (authLoading || !user) return;

    void (async () => {
      const { data, error } = await supabase
        .from("venue_reservations")
        .select(
          "created_at, event_date, event_id, reference_number, reservation_status, total_amount, venues(name)"
        )
        .eq("user_id", user.id)
        .neq("reservation_status", "cancelled");

      if (cancelled) return;

      if (error || !data) {
        setReservationsState([]);
        return;
      }

      const mapped = data.map((row) => {
        const venue =
          Array.isArray(row.venues) ? row.venues[0] ?? null : row.venues ?? null;

        return {
          createdAt: row.created_at as string,
          eventDate: row.event_date as string,
          eventId: row.event_id as string | null,
          referenceNumber: row.reference_number as string,
          reservationStatus: row.reservation_status as
            | "pending_payment"
            | "confirmed",
          totalAmount: Number(row.total_amount ?? 0),
          venueName: venue?.name ?? "Venue",
        } satisfies AnalysisReservation;
      });

      setReservationsState(mapped);
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const reservations = reservationsState ?? [];
  const reservationsLoading = authLoading || (Boolean(user) && reservationsState === null);
  const reservationsByEventId = reservations.reduce<Record<string, AnalysisReservation>>(
    (map, reservation) => {
      if (reservation.eventId) {
        map[reservation.eventId] = reservation;
      }
      return map;
    },
    {}
  );

  const totalMin = events.reduce((sum, event) => sum + totalBudget(event).min, 0);
  const totalMax = events.reduce((sum, event) => sum + totalBudget(event).max, 0);
  const totalMid = events.reduce((sum, event) => sum + midpointBudget(event), 0);
  const totalGuests = events.reduce((sum, event) => sum + event.pax, 0);
  const averagePerGuest = totalGuests > 0 ? Math.round(totalMid / totalGuests) : 0;
  const totalReservedValue = reservations.reduce(
    (sum, reservation) => sum + reservation.totalAmount,
    0
  );
  const reservationCoverage =
    reservationsLoading || totalMid <= 0
      ? null
      : Math.round((totalReservedValue / totalMid) * 100);
  const confirmedReservations = reservations.filter(
    (reservation) => reservation.reservationStatus === "confirmed"
  ).length;
  const pendingReservations = reservations.filter(
    (reservation) => reservation.reservationStatus === "pending_payment"
  ).length;

  const eventRows = [...events].sort(
    (a, b) => midpointBudget(b) - midpointBudget(a)
  );
  const maxMidpoint = Math.max(1, ...eventRows.map((event) => midpointBudget(event)));
  const highestEvent = eventRows[0];
  const futureEvents = events
    .filter((event) => event.eventDate && getDaysUntil(event.eventDate) >= 0)
    .sort(
      (a, b) =>
        parseEventDate(a.eventDate).getTime() - parseEventDate(b.eventDate).getTime()
    );
  const nearestHighBudgetEvent = [...futureEvents].sort(
    (a, b) => midpointBudget(b) - midpointBudget(a)
  )[0];

  const occasionRows = Object.entries(
    events.reduce<Record<string, { count: number; totalMid: number }>>((map, event) => {
      const key = event.occasion || "Other";
      if (!map[key]) {
        map[key] = { count: 0, totalMid: 0 };
      }
      map[key].count += 1;
      map[key].totalMid += midpointBudget(event);
      return map;
    }, {})
  ).sort((a, b) => b[1].totalMid - a[1].totalMid);

  const cityRows = Object.entries(
    events.reduce<Record<string, { count: number; totalMid: number }>>((map, event) => {
      const key = event.city || "Unassigned";
      if (!map[key]) {
        map[key] = { count: 0, totalMid: 0 };
      }
      map[key].count += 1;
      map[key].totalMid += midpointBudget(event);
      return map;
    }, {})
  ).sort((a, b) => b[1].totalMid - a[1].totalMid);
  const maxOccasionTotal = Math.max(1, ...occasionRows.map(([, row]) => row.totalMid));
  const maxCityTotal = Math.max(1, ...cityRows.map(([, row]) => row.totalMid));
  const largestRangeEvent = [...events].sort((a, b) => {
    const aBudget = totalBudget(a);
    const bBudget = totalBudget(b);
    return (bBudget.max - bBudget.min) - (aBudget.max - aBudget.min);
  })[0];
  const budgetPressureRows = [...futureEvents]
    .sort((a, b) => {
      const aHasReservation = Boolean(reservationsByEventId[a.id]);
      const bHasReservation = Boolean(reservationsByEventId[b.id]);

      if (aHasReservation !== bHasReservation) {
        return Number(aHasReservation) - Number(bHasReservation);
      }

      const daysDifference = getDaysUntil(a.eventDate) - getDaysUntil(b.eventDate);
      if (daysDifference !== 0) {
        return daysDifference;
      }

      return midpointBudget(b) - midpointBudget(a);
    })
    .slice(0, 4);

  const eventsWithShortlists = events.filter(
    (event) => event.venueCount > 0 || Boolean(event.topVenueName)
  ).length;
  const urgentBudgetItems = reservationsLoading
    ? null
    : futureEvents.filter((event) => {
        const daysAway = getDaysUntil(event.eventDate);
        return daysAway <= 30 && !reservationsByEventId[event.id];
      }).length;

  const insights = [
    {
      title:
        reservationCoverage === null
          ? "Reservation coverage is loading"
          : reservationCoverage > 0
          ? `${reservationCoverage}% of your midpoint budget already has reservation value behind it`
          : "No reservation value has been committed yet",
      detail:
        reservationCoverage === null
          ? "Active reservation totals are still being calculated."
          : reservationCoverage > 0
          ? `${formatPeso(totalReservedValue)} is currently tied to active bookings.`
          : "You still have full budget flexibility across all saved plans.",
      tone:
        reservationCoverage !== null && reservationCoverage > 0
          ? "bg-[#EAF2F0] border-[#C8E0DA]"
          : "bg-[#FCFBF8] border-[#E0DDD5]",
      icon:
        reservationCoverage !== null && reservationCoverage > 0 ? (
          <CalendarCheck size={16} className="text-[#2A6558]" />
        ) : (
          <Clock size={16} className="text-[#7C7671]" />
        ),
    },
    {
      title: highestEvent
        ? `${highestEvent.eventName} is your biggest planned spend`
        : "Your largest event will appear here",
      detail: highestEvent
        ? `${formatPeso(midpointBudget(highestEvent))} midpoint estimate for ${highestEvent.pax.toLocaleString()} guests.`
        : "Create an event to start cost comparisons.",
      tone: "bg-white border-[#E0DDD5]",
      icon: <TrendingUp size={16} className="text-[#2A6558]" />,
    },
    {
      title:
        urgentBudgetItems === null
          ? "Near-term follow-through is loading"
          : urgentBudgetItems > 0
          ? `${urgentBudgetItems} near-term event${urgentBudgetItems === 1 ? "" : "s"} still need booking follow-through`
          : "Upcoming costs are more evenly under control",
      detail:
        urgentBudgetItems === null
          ? "Reservation-linked urgency will appear after booking data loads."
          : urgentBudgetItems > 0
          ? "Use this page to identify where budget and booking decisions should happen first."
          : "Most immediate event costs already have either a shortlist or reservation progress.",
      tone:
        urgentBudgetItems !== null && urgentBudgetItems > 0
          ? "bg-[#FEF3C7] border-[#F8E3A7]"
          : "bg-white border-[#E0DDD5]",
      icon:
        urgentBudgetItems !== null && urgentBudgetItems > 0 ? (
          <AlertCircle size={16} className="text-[#92400E]" />
        ) : (
          <CheckCircle2 size={16} className="text-[#2A6558]" />
        ),
    },
    {
      title:
        eventsWithShortlists > 0
          ? `${eventsWithShortlists} event${eventsWithShortlists === 1 ? "" : "s"} already have venue options`
          : "No venue shortlist has been generated yet",
      detail:
        eventsWithShortlists > 0
          ? "Shortlisted plans are easier to convert into actual bookings without reworking the full brief."
          : "Recommendations will help turn rough budgets into real venue decisions.",
      tone: "bg-white border-[#E0DDD5]",
      icon: <Sparkles size={16} className="text-[#2A6558]" />,
    },
  ];

  if (!hydrated) {
    return (
      <AppShell>
        <main className="mx-auto flex min-h-[60vh] w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#2A6558] border-t-transparent" />
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 page-fade sm:px-6 sm:py-10">
        <section className="rounded-[30px] border border-[#E0DDD5] bg-gradient-to-br from-[#FCFBF8] via-white to-[#F0F6F4] p-6 sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#C8E0DA] bg-[#EAF2F0] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2A6558]">
                  Cost Analysis
                </span>
                <span className="rounded-full border border-[#E0DDD5] bg-white px-3 py-1 text-xs text-[#7C7671]">
                  Dedicated planning breakdown
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#1A1817] sm:text-4xl">
                A clearer read on planned spend, booking commitments, and budget pressure.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#6B6661] sm:text-base">
                This view translates your saved event data into budget ranges, spend concentration, and reservation-backed costs so you can see where money is committed and where decisions are still open.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={ROUTES.dashboard}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D8D3C9] bg-white px-5 py-3 text-sm font-semibold text-[#1A1817] transition hover:border-[#2A6558] hover:text-[#2A6558]"
              >
                Back to Dashboard
              </Link>
              <Link
                href={ROUTES.createEvent}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2A6558] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#215249]"
              >
                <Plus size={16} />
                New Event
              </Link>
            </div>
          </div>
        </section>

        {events.length === 0 ? (
          <Panel className="mt-6">
            <div className="rounded-[24px] border border-dashed border-[#DAD6CE] bg-[#FCFBF8] p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF2F0] text-[#2A6558]">
                <PieChart size={24} />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-[#1A1817]">
                No event data to analyze yet
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[#7C7671]">
                Create at least one event with guests, budget, and location details to unlock your cost breakdown and reservation-backed financial view.
              </p>
              <Link
                href={ROUTES.createEvent}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[#2A6558] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#215249]"
              >
                <Plus size={16} />
                Create First Event
              </Link>
            </div>
          </Panel>
        ) : (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <KpiCard
                icon={<Wallet size={18} />}
                label="Midpoint Portfolio"
                value={formatPeso(totalMid)}
                detail="Combined midpoint estimate across all events"
              />
              <KpiCard
                icon={<TrendingDown size={18} />}
                label="Minimum Budget"
                value={formatPeso(totalMin)}
                detail="Lower end of the current spending envelope"
              />
              <KpiCard
                icon={<TrendingUp size={18} />}
                label="Maximum Budget"
                value={formatPeso(totalMax)}
                detail="Upper ceiling if every event hits the high end"
              />
              <KpiCard
                icon={<Users size={18} />}
                label="Average Per Guest"
                value={averagePerGuest > 0 ? formatPeso(averagePerGuest) : "-"}
                detail={`Across ${totalGuests.toLocaleString()} planned guests`}
              />
              <KpiCard
                icon={<CalendarCheck size={18} />}
                label="Reserved Value"
                value={reservationsLoading ? "-" : formatPeso(totalReservedValue)}
                detail={reservationsLoading ? "Loading reservation totals" : "Current booking-backed cost value"}
              />
            </section>

            <div className="mt-6 space-y-6">
                <Panel>
                  <SectionHeader
                    eyebrow="Distribution"
                    title="Budget distribution by event"
                    description="The biggest event budgets appear first so you can quickly spot where most of the portfolio spend is concentrated."
                  />

                  <div className="space-y-4">
                    {eventRows.map((event) => {
                      const plannedMid = midpointBudget(event);
                      const width = (plannedMid / maxMidpoint) * 100;
                      const reservation = reservationsByEventId[event.id];

                      return (
                        <div
                          key={event.id}
                          className="rounded-[24px] border border-[#E0DDD5] bg-[#FCFBF8] p-4"
                        >
                          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-base font-bold text-[#1A1817]">
                                  {event.eventName}
                                </p>
                                <StatusBadge status={event.status} />
                              </div>
                              <p className="mt-1 text-sm text-[#7C7671]">
                                {event.occasion} - {event.city}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7C7671]">
                                Midpoint estimate
                              </p>
                              <p className="mt-1 text-lg font-bold text-[#1A1817]">
                                {formatPeso(plannedMid)}
                              </p>
                            </div>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-[#E7E3DB]">
                            <div
                              className="step-bar h-2 rounded-full bg-[#2A6558]"
                              style={{ width: `${width}%` }}
                            />
                          </div>

                          <div className="mt-3 grid gap-3 text-xs text-[#7C7671] sm:grid-cols-2 xl:grid-cols-4">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7C7671]">
                                Budget range
                              </p>
                              <p className="mt-1 text-sm font-semibold text-[#1A1817]">
                                {formatBudgetRange(event)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7C7671]">
                                Budget input
                              </p>
                              <p className="mt-1 text-sm font-semibold text-[#1A1817]">
                                {formatBudgetInput(event)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7C7671]">
                                Guests
                              </p>
                              <p className="mt-1 text-sm font-semibold text-[#1A1817]">
                                {event.pax.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7C7671]">
                                Reservation
                              </p>
                              <p className="mt-1 text-sm font-semibold text-[#1A1817]">
                                {reservationsLoading
                                  ? "Loading reservation data"
                                  : reservation
                                    ? `${formatPeso(reservation.totalAmount)} at ${reservation.venueName}`
                                    : "No active reservation"}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Panel>

                <Panel>
                  <SectionHeader
                    eyebrow="Commitment"
                    title="Booked vs planned"
                    description="How much of your current estimated spend already has real booking value attached to it."
                  />

                  {reservationsLoading ? (
                    <div className="flex h-44 items-center justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A6558] border-t-transparent" />
                    </div>
                  ) : (
                    <>
                      <div className="rounded-[24px] bg-[#1A1817] p-5 text-white">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7BC4B8]">
                          Reservation coverage
                        </p>
                        <div className="mt-3 flex items-end justify-between gap-4">
                          <div>
                            <p className="text-3xl font-extrabold">
                              {reservationCoverage === null ? "-" : `${reservationCoverage}%`}
                            </p>
                            {reservationCoverage === null ? (
                              <p className="text-sm text-white/65">
                                Active reservation totals are still loading
                              </p>
                            ) : (
                              <p className="text-sm text-white/65">
                                of midpoint planned spend is currently represented by active
                                reservations
                              </p>
                            )}
                          </div>
                          <CalendarCheck size={22} className="text-[#7BC4B8]" />
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-[#E0DDD5] bg-[#FCFBF8] p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7C7671]">
                            Confirmed
                          </p>
                          <p className="mt-2 text-2xl font-extrabold text-[#1A1817]">
                            {confirmedReservations}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-[#E0DDD5] bg-[#FCFBF8] p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7C7671]">
                            Pending
                          </p>
                          <p className="mt-2 text-2xl font-extrabold text-[#1A1817]">
                            {pendingReservations}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </Panel>

                <Panel>
                  <SectionHeader
                    eyebrow="Signals"
                    title="Actionable insights"
                    description="The most useful cost and booking signals, kept in one readable summary."
                    action={
                      <Link
                        href={ROUTES.support}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-[#2A6558] transition hover:text-[#215249]"
                      >
                        Ask AI support
                        <ArrowRight size={14} />
                      </Link>
                    }
                  />

                  <div className="space-y-3">
                    {insights.map((item) => (
                      <div
                        key={item.title}
                        className={`rounded-[24px] border p-4 ${item.tone}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 shrink-0">{item.icon}</span>
                          <div>
                            <p className="text-sm font-semibold text-[#1A1817]">
                              {item.title}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-[#7C7671]">
                              {item.detail}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
            </div>
          </>
        )}
      </main>
    </AppShell>
  );
}

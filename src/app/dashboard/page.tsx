"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/AuthContext";
import {
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
  Plus,
  CalendarDays,
  MapPin,
  Users,
  TrendingUp,
  ArrowRight,
  Sparkles,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  CalendarCheck,
  Wallet,
  Target,
  Lightbulb,
} from "lucide-react";

const statusColor: Record<SavedEvent["status"], string> = {
  Draft: "bg-[#F0EDEA] text-[#7C7671]",
  "In Review": "bg-[#FEF3C7] text-[#92400E]",
  Confirmed: "bg-[#EAF2F0] text-[#2A6558]",
};

const statusIcon: Record<SavedEvent["status"], ReactNode> = {
  Draft: <FileText size={12} />,
  "In Review": <AlertCircle size={12} />,
  Confirmed: <CheckCircle2 size={12} />,
};

interface DashboardReservation {
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

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "soft" | "success";
}

interface SectionHeaderProps {
  title: string;
  description: string;
  eyebrow?: string;
  action?: ReactNode;
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

function StatusBadge({ status }: { status: SavedEvent["status"] }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statusColor[status]}`}
    >
      {statusIcon[status]}
      <span>{status}</span>
    </span>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
  tone = "default",
}: StatCardProps) {
  const tones = {
    default: {
      card: "bg-white",
      iconWrap: "bg-[#F5F2EC]",
    },
    soft: {
      card: "bg-[#FCFBF8]",
      iconWrap: "bg-[#EAF2F0]",
    },
    success: {
      card: "bg-[#EAF2F0]",
      iconWrap: "bg-white",
    },
  } as const;

  return (
    <div
      className={`rounded-[24px] border border-[#E0DDD5] p-5 shadow-sm ${tones[tone].card}`}
    >
      <div
        className={`mb-4 flex h-10 w-10 items-center justify-center rounded-2xl text-[#2A6558] ${tones[tone].iconWrap}`}
      >
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

function parseEventDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatFullDate(value: string) {
  return parseEventDate(value).toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(value: string) {
  return parseEventDate(value).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeLabel(value: string) {
  if (!value) return "Time TBD";

  const [hourPart, minutePart] = value.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart ?? "0");

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return value;
  }

  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
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

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function resolveFirstName(user: ReturnType<typeof useAuth>["user"]) {
  const metadata = user?.user_metadata as Record<string, unknown> | undefined;
  const metadataName =
    typeof metadata?.full_name === "string"
      ? metadata.full_name
      : typeof metadata?.name === "string"
        ? metadata.name
        : typeof metadata?.user_name === "string"
          ? metadata.user_name
          : "";

  if (metadataName.trim()) {
    return metadataName.trim().split(" ")[0];
  }

  if (user?.email) {
    return user.email.split("@")[0];
  }

  return "Planner";
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { events, hydrated } = useEventsContext();
  const [reservationsState, setReservationsState] = useState<
    DashboardReservation[] | null
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
        } satisfies DashboardReservation;
      });

      mapped.sort(
        (a, b) =>
          parseEventDate(a.eventDate).getTime() - parseEventDate(b.eventDate).getTime()
      );

      setReservationsState(mapped);
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const reservations = reservationsState ?? [];
  const reservationsLoading = authLoading || (Boolean(user) && reservationsState === null);

  const firstName = resolveFirstName(user);
  const todayLabel = new Date().toLocaleDateString("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const totalPax = events.reduce((sum, event) => sum + event.pax, 0);
  const totalEstimatedSpend = events.reduce(
    (sum, event) => sum + midpointBudget(event),
    0
  );
  const totalBudgetMin = events.reduce(
    (sum, event) => sum + totalBudget(event).min,
    0
  );
  const totalBudgetMax = events.reduce(
    (sum, event) => sum + totalBudget(event).max,
    0
  );
  const averageBudgetPerGuest =
    totalPax > 0 ? Math.round(totalEstimatedSpend / totalPax) : 0;
  const shortlistReadyCount = events.filter(
    (event) => event.venueCount > 0 || Boolean(event.topVenueName)
  ).length;
  const confirmedCount = events.filter((event) => event.status === "Confirmed").length;

  const futureEvents = events
    .filter((event) => event.eventDate && getDaysUntil(event.eventDate) >= 0)
    .sort(
      (a, b) =>
        parseEventDate(a.eventDate).getTime() - parseEventDate(b.eventDate).getTime()
    );
  const recentEvents = [...events]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 4);
  const focusEvent = futureEvents[0] ?? recentEvents[0] ?? null;
  const focusDaysAway = focusEvent?.eventDate ? getDaysUntil(focusEvent.eventDate) : null;
  const upcomingThisMonth = futureEvents.filter((event) => {
    const date = parseEventDate(event.eventDate);
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  }).length;

  const reservationsByEventId = reservations.reduce<
    Record<string, DashboardReservation>
  >((map, reservation) => {
    if (reservation.eventId) {
      map[reservation.eventId] = reservation;
    }
    return map;
  }, {});

  const confirmedReservations = reservations.filter(
    (reservation) => reservation.reservationStatus === "confirmed"
  ).length;
  const pendingReservations = reservations.filter(
    (reservation) => reservation.reservationStatus === "pending_payment"
  ).length;
  const totalReservedValue = reservations.reduce(
    (sum, reservation) => sum + reservation.totalAmount,
    0
  );

  const focusReservation = focusEvent
    ? reservationsByEventId[focusEvent.id]
    : undefined;
  const exploreVenuesHref = focusEvent
    ? `${ROUTES.recommendations}?event=${encodeURIComponent(focusEvent.id)}`
    : ROUTES.recommendations;

  const statusCounts: Record<SavedEvent["status"], number> = {
    Draft: events.filter((event) => event.status === "Draft").length,
    "In Review": events.filter((event) => event.status === "In Review").length,
    Confirmed: confirmedCount,
  };

  const planningReadyCount = events.filter((event) => {
    const reservation = reservationsByEventId[event.id];
    return (
      event.status === "Confirmed" ||
      reservation?.reservationStatus === "confirmed"
    );
  }).length;
  const planningReadyRate = events.length
    ? Math.round((planningReadyCount / events.length) * 100)
    : 0;

  const cityCounts = events.reduce<Record<string, number>>((map, event) => {
    if (!event.city) return map;
    map[event.city] = (map[event.city] ?? 0) + 1;
    return map;
  }, {});
  const occasionCounts = events.reduce<Record<string, number>>((map, event) => {
    if (!event.occasion) return map;
    map[event.occasion] = (map[event.occasion] ?? 0) + 1;
    return map;
  }, {});
  const topCityEntry = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0];
  const topOccasionEntry = Object.entries(occasionCounts).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const urgentVenueSearchCount = futureEvents.filter((event) => {
    const hasShortlist = event.venueCount > 0 || Boolean(event.topVenueName);
    const hasReservation = Boolean(reservationsByEventId[event.id]);
    return getDaysUntil(event.eventDate) <= 30 && !hasShortlist && !hasReservation;
  }).length;

  const budgetRows = [...events]
    .sort((a, b) => midpointBudget(b) - midpointBudget(a))
    .slice(0, 4);
  const maxBudgetMidpoint = Math.max(
    1,
    ...budgetRows.map((event) => midpointBudget(event))
  );
  const highestBudgetEvent = [...events].sort(
    (a, b) => midpointBudget(b) - midpointBudget(a)
  )[0];
  const lowestBudgetEvent = [...events].sort(
    (a, b) => midpointBudget(a) - midpointBudget(b)
  )[0];

  const focusChecklist = focusEvent
    ? [
        {
          label: "Event brief is complete",
          detail: `${focusEvent.occasion} for ${focusEvent.pax.toLocaleString()} guests`,
          state: "complete" as const,
        },
        {
          label: "Schedule is locked",
          detail: focusEvent.eventDate
            ? `${formatFullDate(focusEvent.eventDate)} at ${formatTimeLabel(
                focusEvent.startTime
              )}`
            : "Add the event date and time",
          state: focusEvent.eventDate ? ("complete" as const) : ("pending" as const),
        },
        {
          label: "Venue options are ready",
          detail:
            focusEvent.venueCount > 0 || focusEvent.topVenueName
              ? focusEvent.topVenueName
                ? `Top match: ${focusEvent.topVenueName}`
                : `${focusEvent.venueCount} venue matches saved`
              : "Generate recommendations for this event",
          state:
            focusEvent.venueCount > 0 || focusEvent.topVenueName
              ? ("complete" as const)
              : ("pending" as const),
        },
        {
          label: "Reservation status",
          detail: focusReservation
            ? focusReservation.reservationStatus === "confirmed"
              ? `Confirmed at ${focusReservation.venueName}`
              : `Pending payment for ${focusReservation.venueName}`
            : "No reservation secured yet",
          state: focusReservation
            ? focusReservation.reservationStatus === "confirmed"
              ? ("complete" as const)
              : ("warning" as const)
            : ("pending" as const),
        },
      ]
    : [];

  const focusProgress = focusChecklist.length
    ? Math.round(
        (focusChecklist.filter((item) => item.state === "complete").length /
          focusChecklist.length) *
          100
      )
    : 0;

  const insights = hydrated
    ? [
        {
          title:
            urgentVenueSearchCount > 0
              ? "Nearest events need venue action"
              : "Venue coverage looks healthy",
          detail:
            urgentVenueSearchCount > 0
              ? `${urgentVenueSearchCount} upcoming event${
                  urgentVenueSearchCount === 1 ? "" : "s"
                } within 30 days still need a shortlist.`
              : `${shortlistReadyCount} of ${events.length} event${
                  events.length === 1 ? "" : "s"
                } already have venue options saved.`,
          icon:
            urgentVenueSearchCount > 0 ? (
              <AlertCircle size={16} className="text-[#92400E]" />
            ) : (
              <Sparkles size={16} className="text-[#2A6558]" />
            ),
          tone:
            urgentVenueSearchCount > 0
              ? "border-[#F8E3A7] bg-[#FEF3C7]"
              : "border-[#C8E0DA] bg-[#EAF2F0]",
        },
        {
          title: topCityEntry
            ? `${topCityEntry[0]} is your busiest city`
            : "Set your first location cluster",
          detail: topCityEntry
            ? `${topCityEntry[1]} event${topCityEntry[1] === 1 ? "" : "s"} are centered there right now.`
            : "Create an event to start surfacing city-based planning insights.",
          icon: <MapPin size={16} className="text-[#2A6558]" />,
          tone: "border-[#E0DDD5] bg-[#FCFBF8]",
        },
        {
          title: topOccasionEntry
            ? `${topOccasionEntry[0]} is your strongest category`
            : "Occasion trends will appear here",
          detail: topOccasionEntry
            ? `${topOccasionEntry[1]} saved event${
                topOccasionEntry[1] === 1 ? "" : "s"
              } fall into this occasion.`
            : "Your portfolio mix updates automatically as you add more events.",
          icon: <Target size={16} className="text-[#2A6558]" />,
          tone: "border-[#E0DDD5] bg-white",
        },
        {
          title:
            averageBudgetPerGuest > 0
              ? `Average planned spend is ${formatPeso(averageBudgetPerGuest)} per guest`
              : "Budget signals will appear here",
          detail:
            averageBudgetPerGuest > 0
              ? `Midpoint estimate across ${totalPax.toLocaleString()} planned guests.`
              : "Set budget ranges on your events to unlock cost guidance.",
          icon: <Wallet size={16} className="text-[#2A6558]" />,
          tone: "border-[#E0DDD5] bg-white",
        },
      ]
    : [];

  const activityItems = [
    ...events.map((event) => ({
      id: `event-${event.id}`,
      occurredAt: event.createdAt,
      title: `${event.eventName} was created`,
      detail: `${event.occasion} in ${event.city}`,
      icon: <FileText size={14} className="text-[#2A6558]" />,
    })),
    ...reservations.map((reservation) => ({
      id: `reservation-${reservation.referenceNumber}`,
      occurredAt: reservation.createdAt,
      title:
        reservation.reservationStatus === "confirmed"
          ? `${reservation.venueName} was confirmed`
          : `${reservation.venueName} reservation is pending`,
      detail: `Ref ${reservation.referenceNumber}`,
      icon:
        reservation.reservationStatus === "confirmed" ? (
          <CalendarCheck size={14} className="text-[#2A6558]" />
        ) : (
          <AlertCircle size={14} className="text-[#92400E]" />
        ),
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    )
    .slice(0, 5);

  const heroSummary = !hydrated
    ? "Syncing your events, shortlists, and reservation activity."
    : events.length === 0
      ? "Create your first event to unlock venue recommendations, planning insights, and reservation tracking."
      : `You are managing ${events.length} event${
          events.length === 1 ? "" : "s"
        }, ${futureEvents.length} upcoming date${
          futureEvents.length === 1 ? "" : "s"
        }, and ${confirmedReservations} confirmed reservation${
          confirmedReservations === 1 ? "" : "s"
        }.`;

  const primaryFocusHref = focusEvent
    ? focusReservation
      ? ROUTES.reservations
      : `${ROUTES.recommendations}?event=${encodeURIComponent(focusEvent.id)}`
    : ROUTES.createEvent;
  const primaryFocusLabel = focusEvent
    ? focusReservation
      ? focusReservation.reservationStatus === "confirmed"
        ? "View Reservation"
        : "Finish Reservation"
      : focusEvent.venueCount > 0
        ? "Review Matches"
        : "Find Venues"
    : "Create First Event";

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 page-fade sm:px-6 sm:py-10">
        <section className="relative overflow-hidden rounded-[30px] border border-[var(--vn-border)] bg-gradient-to-br from-[var(--vn-card)] via-[var(--vn-surface)] to-[var(--vn-surface-soft)] p-6 sm:p-8">
          <div className="absolute -left-16 top-8 h-36 w-36 rounded-full bg-[#2A6558]/10 blur-3xl" />
          <div className="absolute -right-12 top-0 h-44 w-44 rounded-full bg-[#7BC4B8]/12 blur-3xl" />
          <div className="relative space-y-6">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[var(--vn-border)] bg-[var(--vn-surface-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2A6558]">
                  Planning HQ
                </span>
                <span className="rounded-full border border-[var(--vn-border)] bg-[var(--vn-surface)] px-3 py-1 text-xs text-[var(--vn-text-muted)]">
                  {todayLabel}
                </span>
              </div>

              <p className="text-sm font-medium text-[#2A6558]">
                {getGreeting()}, {firstName}
              </p>
              <h1 className="mt-2 max-w-3xl text-3xl font-extrabold tracking-tight text-[var(--vn-text)] sm:text-4xl">
                Dashboard built around what needs attention next.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--vn-text-muted)] sm:text-base">
                {heroSummary}
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href={ROUTES.createEvent}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2A6558] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#215249]"
                >
                  <Plus size={16} />
                  New Event
                </Link>
                <Link
                  href={exploreVenuesHref}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--vn-border)] bg-[var(--vn-surface)] px-6 py-3 text-sm font-semibold text-[var(--vn-text)] transition hover:border-[#2A6558] hover:text-[#2A6558]"
                >
                  <Sparkles size={16} className="text-[#2A6558]" />
                  Explore Venues
                </Link>
                <Link
                  href={ROUTES.support}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-transparent px-2 py-3 text-sm font-semibold text-[#2A6558] transition hover:text-[#215249]"
                >
                  AI Support
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
              <div className="rounded-[24px] border border-[var(--vn-border)] bg-[var(--vn-surface)] p-5 shadow-sm backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--vn-text-muted)]">
                  Next focus
                </p>
                {focusEvent ? (
                  <>
                    <p className="mt-3 text-lg font-bold text-[var(--vn-text)]">
                      {focusEvent.eventName}
                    </p>
                    <p className="mt-1 text-sm text-[var(--vn-text-muted)]">
                      {focusEvent.eventDate
                        ? `${formatShortDate(focusEvent.eventDate)} in ${focusEvent.city}`
                        : `${focusEvent.occasion} in ${focusEvent.city}`}
                    </p>
                    <div className="mt-4 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-3xl font-extrabold tracking-tight text-[#2A6558]">
                          {focusDaysAway === 0
                            ? "Today"
                            : focusDaysAway === 1
                              ? "1 day"
                              : `${focusDaysAway} days`}
                        </p>
                        <p className="text-xs text-[var(--vn-text-muted)]">
                          until the next scheduled event
                        </p>
                      </div>
                      <StatusBadge status={focusEvent.status} />
                    </div>
                  </>
                ) : (
                  <div className="mt-3">
                    <p className="text-lg font-bold text-[var(--vn-text)]">
                      No event on deck yet
                    </p>
                    <p className="mt-1 text-sm text-[var(--vn-text-muted)]">
                      Start one plan and the dashboard will organize the rest.
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-[#E0DDD5] bg-[#1A1817] p-5 text-white shadow-sm">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-[#7BC4B8]" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7BC4B8]">
                    Live snapshot
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-2xl font-extrabold text-white">
                      {hydrated ? shortlistReadyCount : "-"}
                    </p>
                    <p className="mt-1 text-xs text-white/60">events with shortlists</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-2xl font-extrabold text-white">
                      {reservationsLoading ? "-" : reservations.length}
                    </p>
                    <p className="mt-1 text-xs text-white/60">active reservations</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-2xl font-extrabold text-white">
                      {hydrated ? upcomingThisMonth : "-"}
                    </p>
                    <p className="mt-1 text-xs text-white/60">events this month</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-2xl font-extrabold text-white">
                      {reservationsLoading ? "-" : confirmedReservations.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-white/60">confirmed bookings</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            icon={<FileText size={18} />}
            label="Event Portfolio"
            value={hydrated ? String(events.length) : "-"}
            detail={hydrated ? "Total saved event plans" : "Loading your plans"}
            tone="default"
          />
          <StatCard
            icon={<Users size={18} />}
            label="Guests Planned"
            value={hydrated ? totalPax.toLocaleString() : "-"}
            detail="Combined guest count across all events"
            tone="soft"
          />
          <StatCard
            icon={<Wallet size={18} />}
            label="Midpoint Spend"
            value={hydrated ? formatPeso(totalEstimatedSpend) : "-"}
            detail="Estimated total based on budget ranges"
            tone="default"
          />
          <StatCard
            icon={<Sparkles size={18} />}
            label="Shortlists Ready"
            value={hydrated ? String(shortlistReadyCount) : "-"}
            detail="Events already linked to venue options"
            tone="soft"
          />
          <StatCard
            icon={<CalendarCheck size={18} />}
            label="Booked Venues"
            value={reservationsLoading ? "-" : String(confirmedReservations)}
            detail="Reservations already confirmed"
            tone="success"
          />
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
          <div className="space-y-6">
            <Panel>
              <SectionHeader
                eyebrow="Priority"
                title={focusEvent ? "Focus event" : "Start your planning flow"}
                description={
                  focusEvent
                    ? "The dashboard keeps the most immediate event in view so key actions are easier to take."
                    : "Once you create an event, this area will surface the right next steps, timelines, and venue actions."
                }
              />

              {focusEvent ? (
                <div className="space-y-5">
                  <div className="rounded-[28px] bg-[#1A1817] p-5 text-white sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7BC4B8]">
                          Current priority
                        </p>
                        <h3 className="mt-2 text-2xl font-extrabold tracking-tight">
                          {focusEvent.eventName}
                        </h3>
                        <p className="mt-1 text-sm text-white/65">
                          {focusEvent.occasion} for {focusEvent.pax.toLocaleString()} guests
                        </p>
                      </div>
                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                        {focusEvent.status}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-2 text-[#7BC4B8]">
                          <CalendarDays size={14} />
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                            Schedule
                          </p>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-white">
                          {focusEvent.eventDate
                            ? formatFullDate(focusEvent.eventDate)
                            : "Date not set"}
                        </p>
                        <p className="mt-1 text-xs text-white/60">
                          {focusEvent.startTime
                            ? `${formatTimeLabel(focusEvent.startTime)} for ${
                                focusEvent.durationHours
                              } hour${focusEvent.durationHours === 1 ? "" : "s"}`
                            : "Time details are still open"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-2 text-[#7BC4B8]">
                          <MapPin size={14} />
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                            Location
                          </p>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-white">
                          {focusEvent.city}
                          {focusEvent.area ? `, ${focusEvent.area}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-white/60">
                          Search radius set to {focusEvent.radiusKm} km
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-2 text-[#7BC4B8]">
                          <BarChart3 size={14} />
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                            Budget
                          </p>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-white">
                          {formatBudgetRange(focusEvent)}
                        </p>
                        <p className="mt-1 text-xs text-white/60">
                          {focusEvent.budgetType === "per-head"
                            ? "Budget entered per guest"
                            : "Budget entered as total spend"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-2 text-[#7BC4B8]">
                          <Sparkles size={14} />
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                            Venue status
                          </p>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-white">
                          {focusReservation
                            ? focusReservation.reservationStatus === "confirmed"
                              ? `Booked at ${focusReservation.venueName}`
                              : `Pending at ${focusReservation.venueName}`
                            : focusEvent.topVenueName
                              ? `Top match: ${focusEvent.topVenueName}`
                              : focusEvent.venueCount > 0
                                ? `${focusEvent.venueCount} venue matches ready`
                                : "No venue shortlist yet"}
                        </p>
                        <p className="mt-1 text-xs text-white/60">
                          {focusReservation
                            ? `Reservation ref ${focusReservation.referenceNumber}`
                            : focusEvent.venueCount > 0
                              ? "Review your saved recommendations"
                              : "Run recommendations to get venue options"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <Link
                        href={primaryFocusHref}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2A6558] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#215249]"
                      >
                        {primaryFocusLabel}
                        <ArrowRight size={15} />
                      </Link>
                      <Link
                        href={`${ROUTES.events}/${focusEvent.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                      >
                        View Event Details
                      </Link>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-[#E0DDD5] bg-[#FCFBF8] p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7C7671]">
                          Progress tracker
                        </p>
                        <h3 className="mt-2 text-lg font-bold text-[#1A1817]">
                          {focusProgress}% ready
                        </h3>
                        <p className="mt-1 text-sm text-[#7C7671]">
                          A quick read on what is complete and what still needs action.
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[#EAF2F0] px-3 py-2 text-right">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-[#7C7671]">
                          Next date
                        </p>
                        <p className="text-sm font-bold text-[#2A6558]">
                          {focusDaysAway === null
                            ? "TBD"
                            : focusDaysAway === 0
                              ? "Today"
                              : `${focusDaysAway}d`}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#E7E3DB]">
                      <div
                        className="step-bar h-2 rounded-full bg-[#2A6558]"
                        style={{ width: `${focusProgress}%` }}
                      />
                    </div>

                    <div className="mt-5 space-y-3">
                      {focusChecklist.map((item) => {
                        const toneClass =
                          item.state === "complete"
                            ? "border-[#C8E0DA] bg-[#EAF2F0]"
                            : item.state === "warning"
                              ? "border-[#F8E3A7] bg-[#FEF3C7]"
                              : "border-[#E0DDD5] bg-white";

                        const icon =
                          item.state === "complete" ? (
                            <CheckCircle2 size={16} className="text-[#2A6558]" />
                          ) : item.state === "warning" ? (
                            <AlertCircle size={16} className="text-[#92400E]" />
                          ) : (
                            <Clock size={16} className="text-[#7C7671]" />
                          );

                        return (
                          <div
                            key={item.label}
                            className={`rounded-2xl border p-4 ${toneClass}`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="mt-0.5 shrink-0">{icon}</span>
                              <div>
                                <p className="text-sm font-semibold text-[#1A1817]">
                                  {item.label}
                                </p>
                                <p className="mt-1 text-xs leading-relaxed text-[#7C7671]">
                                  {item.detail}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[28px] border border-dashed border-[#DAD6CE] bg-[#FCFBF8] p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF2F0] text-[#2A6558]">
                    <CalendarDays size={24} />
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-[#1A1817]">
                    No event plans yet
                  </h3>
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[#7C7671]">
                    Start with one event brief and VenYOU will turn this dashboard into a
                    living planning board with upcoming dates, venue shortlists, and
                    reservation progress.
                  </p>
                  <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                    <Link
                      href={ROUTES.createEvent}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2A6558] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#215249]"
                    >
                      <Plus size={16} />
                      Create Your First Event
                    </Link>
                    <Link
                      href={ROUTES.support}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-[#E0DDD5] bg-white px-6 py-3 text-sm font-semibold text-[#1A1817] transition hover:border-[#2A6558] hover:text-[#2A6558]"
                    >
                      Ask AI Support
                    </Link>
                  </div>
                </div>
              )}
            </Panel>

            <Panel>
              <SectionHeader
                eyebrow="Calendar"
                title="Upcoming timeline"
                description="The next scheduled events are surfaced here so deadlines are easier to spot."
                action={
                  events.length > 0 ? (
                    <Link
                      href={ROUTES.events}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-[#2A6558] transition hover:text-[#215249]"
                    >
                      All events
                      <ArrowRight size={14} />
                    </Link>
                  ) : null
                }
              />

              {!hydrated ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A6558] border-t-transparent" />
                </div>
              ) : futureEvents.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#DAD6CE] bg-[#FCFBF8] p-6 text-sm text-[#7C7671]">
                  No upcoming event dates yet. Once you schedule an event, the timeline
                  will show countdowns, booking status, and priority actions.
                </div>
              ) : (
                <div className="space-y-3">
                  {futureEvents.slice(0, 5).map((event) => {
                    const daysAway = getDaysUntil(event.eventDate);
                    const reservation = reservationsByEventId[event.id];

                    return (
                      <Link
                        key={event.id}
                        href={`${ROUTES.events}/${event.id}`}
                        className="block rounded-[24px] border border-[#E0DDD5] bg-[#FCFBF8] p-4 transition hover:border-[#2A6558] hover:shadow-sm"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-center gap-4">
                            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#EAF2F0]">
                              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#2A6558]">
                                {parseEventDate(event.eventDate).toLocaleString("en-PH", {
                                  month: "short",
                                })}
                              </span>
                              <span className="text-lg font-extrabold leading-none text-[#2A6558]">
                                {parseEventDate(event.eventDate).getDate()}
                              </span>
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-base font-bold text-[#1A1817]">
                                  {event.eventName}
                                </h3>
                                <StatusBadge status={event.status} />
                              </div>
                              <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#7C7671]">
                                <span className="inline-flex items-center gap-1">
                                  <Clock size={12} />
                                  {daysAway === 0
                                    ? "Today"
                                    : daysAway === 1
                                      ? "Tomorrow"
                                      : `${daysAway} days away`}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Users size={12} />
                                  {event.pax.toLocaleString()} guests
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <MapPin size={12} />
                                  {event.city}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {reservation ? (
                              <div
                                className={`rounded-2xl px-3 py-2 text-right ${
                                  reservation.reservationStatus === "confirmed"
                                    ? "bg-[#EAF2F0] text-[#2A6558]"
                                    : "bg-[#FEF3C7] text-[#92400E]"
                                }`}
                              >
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                                  Reservation
                                </p>
                                <p className="mt-1 text-sm font-bold">
                                  {reservation.reservationStatus === "confirmed"
                                    ? reservation.venueName
                                    : "Pending payment"}
                                </p>
                              </div>
                            ) : (
                              <div className="rounded-2xl bg-white px-3 py-2 text-right">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7C7671]">
                                  Next step
                                </p>
                                <p className="mt-1 text-sm font-bold text-[#1A1817]">
                                  {event.venueCount > 0 ? "Review venues" : "Start shortlist"}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Panel>

            <Panel>
              <SectionHeader
                eyebrow="Portfolio"
                title="Recent events"
                description="A quick view of the most recently touched plans and where each one stands."
                action={
                  recentEvents.length > 0 ? (
                    <Link
                      href={ROUTES.events}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-[#2A6558] transition hover:text-[#215249]"
                    >
                      Manage events
                      <ArrowRight size={14} />
                    </Link>
                  ) : null
                }
              />

              {!hydrated ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A6558] border-t-transparent" />
                </div>
              ) : recentEvents.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#DAD6CE] bg-[#FCFBF8] p-6 text-sm text-[#7C7671]">
                  Your saved events will appear here once you start planning.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {recentEvents.map((event) => {
                    const reservation = reservationsByEventId[event.id];

                    return (
                      <Link
                        key={event.id}
                        href={`${ROUTES.events}/${event.id}`}
                        className="block rounded-[24px] border border-[#E0DDD5] bg-[#FCFBF8] p-5 transition hover:border-[#2A6558] hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-bold text-[#1A1817]">
                              {event.eventName}
                            </h3>
                            <p className="mt-1 text-sm text-[#7C7671]">
                              {event.occasion}
                            </p>
                          </div>
                          <StatusBadge status={event.status} />
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3 text-xs text-[#7C7671]">
                          {event.eventDate && (
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays size={12} />
                              {formatShortDate(event.eventDate)}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <Users size={12} />
                            {event.pax.toLocaleString()} guests
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={12} />
                            {event.city}
                          </span>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-[#E7E3DB] pt-4">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7C7671]">
                              Venue progress
                            </p>
                            <p className="mt-1 text-sm font-semibold text-[#1A1817]">
                              {reservation
                                ? reservation.reservationStatus === "confirmed"
                                  ? `Booked at ${reservation.venueName}`
                                  : `Pending at ${reservation.venueName}`
                                : event.topVenueName
                                  ? event.topVenueName
                                  : event.venueCount > 0
                                    ? `${event.venueCount} matches saved`
                                    : "No shortlist yet"}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-[#2A6558]">
                            Open
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Panel>

            <Panel>
              <SectionHeader
                eyebrow="Budget"
                title="Budget outlook"
                description="Where your planned spend is concentrated, and which events carry the biggest financial weight."
                action={
                  events.length > 0 ? (
                    <Link
                      href={ROUTES.analysis}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-[#2A6558] transition hover:text-[#215249]"
                    >
                      Detailed analysis
                      <ArrowRight size={14} />
                    </Link>
                  ) : null
                }
              />

              {!hydrated ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A6558] border-t-transparent" />
                </div>
              ) : events.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#DAD6CE] bg-[#FCFBF8] p-6 text-sm text-[#7C7671]">
                  Budget comparisons will show here after you save at least one event.
                </div>
              ) : (
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
                  <div className="rounded-[28px] border border-[#E0DDD5] bg-[#FCFBF8] p-5 sm:p-6">
                    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7C7671]">
                          Spend concentration
                        </p>
                        <p className="mt-2 text-2xl font-extrabold text-[#1A1817]">
                          {formatPeso(totalEstimatedSpend)}
                        </p>
                        <p className="mt-1 text-sm text-[#7C7671]">
                          Midpoint estimate across all saved event budgets
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7C7671]">
                          Total range
                        </p>
                        <p className="mt-1 text-sm font-bold text-[#1A1817]">
                          {formatPeso(totalBudgetMin)} - {formatPeso(totalBudgetMax)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {budgetRows.map((event) => {
                        const eventBudget = midpointBudget(event);
                        const width = (eventBudget / maxBudgetMidpoint) * 100;

                        return (
                          <div key={event.id}>
                            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-[#1A1817]">
                                  {event.eventName}
                                </p>
                                <p className="text-xs text-[#7C7671]">
                                  {event.occasion} - {event.pax.toLocaleString()} guests
                                </p>
                              </div>
                              <span className="shrink-0 font-semibold text-[#1A1817]">
                                {formatPeso(eventBudget)}
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-[#E7E3DB]">
                              <div
                                className="step-bar h-2 rounded-full bg-[#2A6558]"
                                style={{ width: `${width}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[28px] bg-[#1A1817] p-5 text-white sm:p-6">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7BC4B8]">
                        Cost efficiency
                      </p>
                      <p className="mt-3 text-3xl font-extrabold">
                        {averageBudgetPerGuest > 0 ? formatPeso(averageBudgetPerGuest) : "-"}
                      </p>
                      <p className="mt-1 text-sm text-white/60">
                        Average planned spend per guest
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                      <div className="rounded-[24px] border border-[#E0DDD5] bg-[#FCFBF8] p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7C7671]">
                          Highest planned spend
                        </p>
                        <p className="mt-2 text-lg font-bold text-[#1A1817]">
                          {highestBudgetEvent?.eventName ?? "No data yet"}
                        </p>
                        <p className="mt-1 text-sm text-[#7C7671]">
                          {highestBudgetEvent
                            ? formatPeso(midpointBudget(highestBudgetEvent))
                            : "Add an event budget to compare"}
                        </p>
                      </div>

                      <div className="rounded-[24px] border border-[#E0DDD5] bg-[#FCFBF8] p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7C7671]">
                          Lowest planned spend
                        </p>
                        <p className="mt-2 text-lg font-bold text-[#1A1817]">
                          {lowestBudgetEvent?.eventName ?? "No data yet"}
                        </p>
                        <p className="mt-1 text-sm text-[#7C7671]">
                          {lowestBudgetEvent
                            ? formatPeso(midpointBudget(lowestBudgetEvent))
                            : "Add an event budget to compare"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Panel>
          </div>
          <div className="space-y-6">
            <Panel>
              <SectionHeader
                eyebrow="Pipeline"
                title="Planning pipeline"
                description="Status distribution across your events, with a read on how much of the portfolio is already locked in."
              />

              {!hydrated ? (
                <div className="flex h-28 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A6558] border-t-transparent" />
                </div>
              ) : events.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#DAD6CE] bg-[#FCFBF8] p-5 text-sm text-[#7C7671]">
                  Event progress appears here once you have a planning pipeline.
                </div>
              ) : (
                <>
                  <div className="rounded-[24px] bg-[#1A1817] p-5 text-white">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7BC4B8]">
                      Planning readiness
                    </p>
                    <div className="mt-3 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-3xl font-extrabold">{planningReadyRate}%</p>
                        <p className="text-sm text-white/65">
                          {planningReadyCount} of {events.length} events are confirmed or
                          already reserved
                        </p>
                      </div>
                      <TrendingUp size={22} className="text-[#7BC4B8]" />
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    {(Object.keys(statusCounts) as SavedEvent["status"][]).map((status) => {
                      const count = statusCounts[status];
                      const width = events.length
                        ? Math.max((count / events.length) * 100, count > 0 ? 12 : 0)
                        : 0;

                      return (
                        <div key={status}>
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <StatusBadge status={status} />
                            </div>
                            <span className="font-semibold text-[#1A1817]">
                              {count}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[#ECE8E1]">
                            <div
                              className={`step-bar h-2 rounded-full ${
                                status === "Confirmed"
                                  ? "bg-[#2A6558]"
                                  : status === "In Review"
                                    ? "bg-[#C89C33]"
                                    : "bg-[#B6AEA7]"
                              }`}
                              style={{ width: `${width}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </Panel>

            <Panel>
              <SectionHeader
                eyebrow="Insights"
                title="Smart planner notes"
                description="Signals generated from your current event mix, upcoming dates, budgets, and reservations."
              />

              {!hydrated ? (
                <div className="flex h-28 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A6558] border-t-transparent" />
                </div>
              ) : insights.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#DAD6CE] bg-[#FCFBF8] p-5 text-sm text-[#7C7671]">
                  Add your first event to start seeing portfolio insights.
                </div>
              ) : (
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
              )}
            </Panel>

            <Panel>
              <SectionHeader
                eyebrow="Reservations"
                title="Booking snapshot"
                description="A compact read on active venue reservations and what still needs payment or follow-through."
                action={
                  reservations.length > 0 ? (
                    <Link
                      href={ROUTES.reservations}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-[#2A6558] transition hover:text-[#215249]"
                    >
                      View reservations
                      <ArrowRight size={14} />
                    </Link>
                  ) : null
                }
              />

              {reservationsLoading ? (
                <div className="flex h-28 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A6558] border-t-transparent" />
                </div>
              ) : reservations.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#DAD6CE] bg-[#FCFBF8] p-5">
                  <p className="text-sm font-semibold text-[#1A1817]">
                    No active reservations yet
                  </p>
                  <p className="mt-1 text-sm text-[#7C7671]">
                    Once you reserve a venue, this panel will track confirmation status,
                    payment follow-up, and total reserved value.
                  </p>
                  <Link
                    href={exploreVenuesHref}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#2A6558] transition hover:text-[#215249]"
                  >
                    Browse venues
                    <ArrowRight size={14} />
                  </Link>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-[#FCFBF8] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7C7671]">
                        Confirmed
                      </p>
                      <p className="mt-2 text-2xl font-extrabold text-[#1A1817]">
                        {confirmedReservations}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#FCFBF8] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7C7671]">
                        Pending
                      </p>
                      <p className="mt-2 text-2xl font-extrabold text-[#1A1817]">
                        {pendingReservations}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[24px] bg-[#1A1817] p-5 text-white">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7BC4B8]">
                      Reserved value
                    </p>
                    <p className="mt-3 text-3xl font-extrabold">
                      {formatPeso(totalReservedValue)}
                    </p>
                    <p className="mt-1 text-sm text-white/60">
                      Combined amount across active reservations
                    </p>
                  </div>

                  <div className="mt-4 space-y-3">
                    {reservations.slice(0, 3).map((reservation) => (
                      <div
                        key={reservation.referenceNumber}
                        className="rounded-[24px] border border-[#E0DDD5] bg-[#FCFBF8] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#1A1817]">
                              {reservation.venueName}
                            </p>
                            <p className="mt-1 text-xs text-[#7C7671]">
                              {formatShortDate(reservation.eventDate)} - Ref{" "}
                              {reservation.referenceNumber}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              reservation.reservationStatus === "confirmed"
                                ? "bg-[#EAF2F0] text-[#2A6558]"
                                : "bg-[#FEF3C7] text-[#92400E]"
                            }`}
                          >
                            {reservation.reservationStatus === "confirmed"
                              ? "Confirmed"
                              : "Pending"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Panel>

            <Panel>
              <SectionHeader
                eyebrow="Actions"
                title="Quick actions"
                description="The most common next steps, kept close to the rest of your planning data."
              />

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {[
                  {
                    href: ROUTES.createEvent,
                    icon: <Plus size={16} className="text-[#2A6558]" />,
                    title: "Plan a new event",
                    detail: "Start a fresh brief with budget, location, and date.",
                  },
                  {
                    href: exploreVenuesHref,
                    icon: <Sparkles size={16} className="text-[#2A6558]" />,
                    title: "Open venue matches",
                    detail: "Jump into recommendations for your next event.",
                  },
                  {
                    href: ROUTES.reservations,
                    icon: <CalendarCheck size={16} className="text-[#2A6558]" />,
                    title: "Review reservations",
                    detail: "Check booking progress and confirmation status.",
                  },
                  {
                    href: ROUTES.analysis,
                    icon: <BarChart3 size={16} className="text-[#2A6558]" />,
                    title: "Open cost analysis",
                    detail: "Review budgets, spend patterns, and reservation value.",
                  },
                  {
                    href: ROUTES.support,
                    icon: <Lightbulb size={16} className="text-[#2A6558]" />,
                    title: "Ask AI support",
                    detail: "Get help with planning, budgeting, or venue decisions.",
                  },
                ].map((action) => (
                  <Link
                    key={action.title}
                    href={action.href}
                    className="block rounded-[24px] border border-[#E0DDD5] bg-[#FCFBF8] p-4 transition hover:border-[#2A6558] hover:shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EAF2F0]">
                        {action.icon}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#1A1817]">
                          {action.title}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-[#7C7671]">
                          {action.detail}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Panel>

            <Panel>
              <SectionHeader
                eyebrow="Recent activity"
                title="Latest movement"
                description="A simple activity feed for newly created events and reservation changes."
              />

              {activityItems.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#DAD6CE] bg-[#FCFBF8] p-5 text-sm text-[#7C7671]">
                  Recent activity appears here after you create events or reserve venues.
                </div>
              ) : (
                <div className="space-y-4">
                  {activityItems.map((item) => (
                    <div key={item.id} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#EAF2F0]">
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1A1817]">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs text-[#7C7671]">
                          {new Date(item.occurredAt).toLocaleDateString("en-PH", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}{" "}
                          - {item.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>

      </main>
    </AppShell>
  );
}

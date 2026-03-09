"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import AppShell from "@/components/AppShell";
import Modal from "@/components/Modal";
import { useAuth } from "@/lib/AuthContext";
import {
  formatBudgetInput,
  formatBudgetRange,
  formatPeso,
  midpointBudget,
} from "@/lib/budget";
import { useEventsContext } from "@/lib/EventsContext";
import { ROUTES } from "@/lib/routes";
import { useToast } from "@/lib/ToastContext";
import { supabase } from "@/lib/supabase/client";
import type { SavedEvent } from "@/lib/types";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  FileText,
  Filter,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";

type EventStatus = SavedEvent["status"];

const statusColor: Record<EventStatus, string> = {
  Draft: "bg-[#F0EDEA] text-[#7C7671]",
  "In Review": "bg-[#FEF3C7] text-[#92400E]",
  Confirmed: "bg-[#EAF2F0] text-[#2A6558]",
};

const statusIcon: Record<EventStatus, ReactNode> = {
  Draft: <FileText size={11} />,
  "In Review": <AlertCircle size={11} />,
  Confirmed: <CheckCircle2 size={11} />,
};

interface EventReservation {
  referenceNumber: string;
  status: "pending_payment" | "confirmed";
  venueName: string;
}

function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
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

function StatCard({
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

function formatShortDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDaysUntil(value: string) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(`${value}T00:00:00`);
  return Math.round(
    (target.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export default function EventsPage() {
  const { user, loading: authLoading } = useAuth();
  const { events, hydrated, deleteEvent } = useEventsContext();
  const { success, error } = useToast();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"All" | EventStatus>("All");
  const [eventToDelete, setEventToDelete] = useState<SavedEvent | null>(null);
  const [eventReservations, setEventReservations] = useState<
    Record<string, EventReservation>
  >({});

  useEffect(() => {
    if (!hydrated || authLoading || !user || events.length === 0) return;

    const ids = events.map((event) => event.id).filter(Boolean);
    if (ids.length === 0) return;

    void (async () => {
      const { data } = await supabase
        .from("venue_reservations")
        .select("event_id, reference_number, reservation_status, venues(name)")
        .eq("user_id", user.id)
        .in("event_id", ids)
        .neq("reservation_status", "cancelled");

      if (!data) return;

      const map: Record<string, EventReservation> = {};
      for (const row of data as {
        event_id: string | null;
        reference_number: string;
        reservation_status: string;
        venues: { name: string } | { name: string }[] | null;
      }[]) {
        if (!row.event_id) continue;
        const venueObj = Array.isArray(row.venues) ? row.venues[0] : row.venues;
        map[row.event_id] = {
          referenceNumber: row.reference_number,
          status: row.reservation_status as "pending_payment" | "confirmed",
          venueName: venueObj?.name ?? "Venue",
        };
      }

      setEventReservations(map);
    })();
  }, [authLoading, events, hydrated, user]);

  const visibleEventReservations = user ? eventReservations : {};
  const upcomingEvents = useMemo(
    () =>
      events
        .filter((event) => event.eventDate && getDaysUntil(event.eventDate) >= 0)
        .sort(
          (a, b) =>
            new Date(`${a.eventDate}T00:00:00`).getTime() -
            new Date(`${b.eventDate}T00:00:00`).getTime()
        ),
    [events]
  );
  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const query = search.trim().toLowerCase();
        const matchSearch =
          !query ||
          event.eventName.toLowerCase().includes(query) ||
          event.occasion.toLowerCase().includes(query) ||
          event.city.toLowerCase().includes(query);
        const matchStatus =
          filterStatus === "All" || event.status === filterStatus;
        return matchSearch && matchStatus;
      }),
    [events, filterStatus, search]
  );
  const totalMidpointSpend = events.reduce(
    (sum, event) => sum + midpointBudget(event),
    0
  );
  const venueReadyCount = events.filter(
    (event) => event.venueCount > 0 || Boolean(event.topVenueName)
  ).length;
  const reservedCount = Object.keys(visibleEventReservations).length;


  const confirmDelete = async () => {
    if (!eventToDelete) return;

    try {
      await deleteEvent(eventToDelete.id);
      success("Event deleted", `"${eventToDelete.eventName}" was removed.`);
      setEventToDelete(null);
    } catch {
      error("Unable to delete event", "Please try again.");
    }
  };

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 page-fade sm:px-6 sm:py-10">
        <section className="rounded-[30px] border border-[#E0DDD5] bg-gradient-to-br from-[#FCFBF8] via-white to-[#F0F6F4] p-6 sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#C8E0DA] bg-[#EAF2F0] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2A6558]">
                  Event Portfolio
                </span>
                <span className="rounded-full border border-[#E0DDD5] bg-white px-3 py-1 text-xs text-[#7C7671]">
                  Planning overview
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#1A1817] sm:text-4xl">
                Keep every event brief, budget, and next step in one readable view.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#6B6661] sm:text-base">
                {!hydrated
                  ? "Loading your saved event portfolio."
                  : events.length === 0
                    ? "Create your first event to unlock venue matches, booking tracking, and budget visibility."
                    : `${events.length} saved event${events.length === 1 ? "" : "s"}, ${upcomingEvents.length} upcoming date${
                        upcomingEvents.length === 1 ? "" : "s"
                      }, and ${reservedCount} event${reservedCount === 1 ? "" : "s"} already tied to reservations.`}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={ROUTES.analysis}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D8D3C9] bg-white px-5 py-3 text-sm font-semibold text-[#1A1817] transition hover:border-[#2A6558] hover:text-[#2A6558]"
              >
                <BarChart3 size={16} className="text-[#2A6558]" />
                Cost Analysis
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

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<CalendarDays size={18} />}
            label="Saved Events"
            value={hydrated ? String(events.length) : "-"}
            detail="Active briefs in your planning portfolio"
          />
          <StatCard
            icon={<Sparkles size={18} />}
            label="Venue Ready"
            value={hydrated ? String(venueReadyCount) : "-"}
            detail="Events with matches or a pinned top venue"
          />
          <StatCard
            icon={<CalendarCheck size={18} />}
            label="Reserved"
            value={hydrated ? String(reservedCount) : "-"}
            detail="Events already tied to an active reservation"
          />
          <StatCard
            icon={<BarChart3 size={18} />}
            label="Midpoint Spend"
            value={hydrated && events.length > 0 ? formatPeso(totalMidpointSpend) : "-"}
            detail="Combined midpoint estimate across all events"
          />
        </section>

        <Panel className="mt-6">
          <SectionHeader
            eyebrow="Browse"
            title="Search and filter your event stack"
            description="Jump between briefs quickly, or narrow the list by event stage when you are reviewing progress."
          />

          <div className="flex flex-col gap-4">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C7671]"
              />
              <input
                type="text"
                placeholder="Search by name, occasion, or city"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-xl border border-[#E0DDD5] bg-white py-2.5 pl-10 pr-4 text-sm text-[#1A1817] outline-none placeholder:text-[#C4BDBA] transition focus:border-[#2A6558] focus:ring-2 focus:ring-[#2A6558]/20"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Filter size={14} className="text-[#7C7671]" />
              {(["All", "Draft", "In Review", "Confirmed"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilterStatus(status)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                    filterStatus === status
                      ? "bg-[#2A6558] text-white"
                      : "border border-[#E0DDD5] bg-white text-[#7C7671] hover:border-[#2A6558] hover:text-[#2A6558]"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </Panel>

        {!hydrated ? (
          <div className="mt-6 flex min-h-[220px] items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#2A6558] border-t-transparent" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <Panel className="mt-6">
            <div className="rounded-[24px] border border-dashed border-[#DAD6CE] bg-[#FCFBF8] p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF2F0] text-[#2A6558]">
                <CalendarDays size={24} />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-[#1A1817]">
                {events.length === 0 ? "No events yet" : "No matching events"}
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[#7C7671]">
                {events.length === 0
                  ? "Create your first event and the rest of your planning views will build around it."
                  : "Try a different search or switch your event-stage filters."}
              </p>
            </div>
          </Panel>
        ) : (
          <Panel className="mt-6">
            <SectionHeader
              eyebrow="Saved briefs"
              title="Your current event lineup"
              description="Each card keeps the schedule, budget, venue status, and next action together."
            />

              <div className="space-y-4">
                {filteredEvents.map((event) => {
                  const reservation = visibleEventReservations[event.id];
                  const daysAway = event.eventDate ? getDaysUntil(event.eventDate) : null;

                  return (
                    <div
                      key={event.id}
                      className="rounded-[24px] border border-[#E0DDD5] bg-[#FCFBF8] p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-lg font-bold text-[#1A1817]">
                              {event.eventName}
                            </h3>
                            <StatusBadge status={event.status} />
                          </div>
                          <p className="mt-1 text-sm text-[#7C7671]">
                            {event.occasion} in {event.city}
                            {event.area ? `, ${event.area}` : ""}
                          </p>
                        </div>

                        <div className="rounded-[20px] border border-[#C8E0DA] bg-[#EAF2F0] px-4 py-3 lg:min-w-[180px] lg:text-right">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7C7671]">
                            Midpoint estimate
                          </p>
                          <p className="mt-1 text-lg font-extrabold text-[#2A6558]">
                            {formatPeso(midpointBudget(event))}
                          </p>
                          <p className="mt-1 text-xs text-[#7C7671]">
                            {formatBudgetRange(event)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#E0DDD5] pt-3 text-xs text-[#7C7671]">
                        <span>
                          {event.eventDate
                            ? `${formatShortDate(event.eventDate)}${daysAway !== null ? ` · ${daysAway === 0 ? "Today" : `${daysAway}d`}` : ""}`
                            : "No date set"}
                        </span>
                        <span>{event.pax.toLocaleString()} guests · {formatBudgetInput(event)}</span>
                        {reservation ? (
                          <span className="font-medium text-[#2A6558]">
                            {reservation.venueName} · {reservation.status === "confirmed" ? "Confirmed" : "Pending payment"}
                          </span>
                        ) : (
                          <span>
                            {event.topVenueName
                              ? event.topVenueName
                              : event.venueCount > 0
                                ? `${event.venueCount} venue matches`
                                : "No shortlist yet"}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex flex-col gap-3 border-t border-[#E0DDD5] pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-[11px] text-[#7C7671]">
                          Created{" "}
                          {new Date(event.createdAt).toLocaleDateString("en-PH", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEventToDelete(event)}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-[#7C7671] transition hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 size={13} />
                            Delete
                          </button>
                          <Link
                            href={
                              reservation
                                ? ROUTES.reservations
                                : `${ROUTES.recommendations}?event=${encodeURIComponent(event.id)}`
                            }
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                              reservation
                                ? "bg-[#EAF2F0] text-[#2A6558] hover:bg-[#DDEDEA]"
                                : "bg-[#2A6558] text-white hover:bg-[#215249]"
                            }`}
                          >
                            {reservation ? (
                              <>
                                <CalendarCheck size={12} />
                                View Reservation
                              </>
                            ) : (
                              <>
                                <Sparkles size={12} />
                                Review Matches
                              </>
                            )}
                          </Link>
                          <Link
                            href={`${ROUTES.events}/${event.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A1817] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#2A6558]"
                          >
                            View Details
                            <ArrowRight size={12} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
          </Panel>

        )}
      </main>

      <Modal
        open={Boolean(eventToDelete)}
        onClose={() => setEventToDelete(null)}
        title="Delete event?"
        description={
          eventToDelete
            ? `You are about to delete "${eventToDelete.eventName}".`
            : undefined
        }
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEventToDelete(null)}
              className="rounded-xl border border-[#E0DDD5] px-4 py-2 text-sm font-medium text-[#7C7671] transition hover:border-[#1A1817] hover:text-[#1A1817]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmDelete()}
              className="rounded-xl bg-[#C0392B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#A93226]"
            >
              Delete Event
            </button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-[#7C7671]">
          This action cannot be undone. The event will be removed from your saved list.
        </p>
      </Modal>
    </AppShell>
  );
}

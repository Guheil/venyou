"use client";

import Link from "next/link";
import AppShell from "@/components/AppShell";
import Modal from "@/components/Modal";
import { useAuth } from "@/lib/AuthContext";
import { useEventsContext } from "@/lib/EventsContext";
import { useToast } from "@/lib/ToastContext";
import { supabase } from "@/lib/supabase/client";
import type { SavedEvent } from "@/lib/types";
import {
  Plus,
  CalendarDays,
  Users,
  MapPin,
  BarChart3,
  TrendingDown,
  TrendingUp,
  Minus,
  Trash2,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  PieChart,
  Filter,
  Search,
  CalendarCheck,
} from "lucide-react";
import { useState, useEffect } from "react";

// ─── Helpers ──────────────────────────────────────────────
const statusColor: Record<string, string> = {
  Draft: "bg-[#F0EDEA] text-[#7C7671]",
  "In Review": "bg-[#FEF3C7] text-[#92400E]",
  Confirmed: "bg-[#EAF2F0] text-[#2A6558]",
};

const statusIcon: Record<string, React.ReactNode> = {
  Draft: <FileText size={11} />,
  "In Review": <AlertCircle size={11} />,
  Confirmed: <CheckCircle2 size={11} />,
};

function totalBudget(ev: SavedEvent): { min: number; max: number } {
  if (ev.budgetType === "per-head") {
    return { min: ev.budgetMin * ev.pax, max: ev.budgetMax * ev.pax };
  }
  return { min: ev.budgetMin, max: ev.budgetMax };
}

function budgetLabel(ev: SavedEvent) {
  const t = totalBudget(ev);
  if (ev.budgetType === "per-head") {
    return `₱${ev.budgetMin.toLocaleString()}–₱${ev.budgetMax.toLocaleString()}/head`;
  }
  return `₱${t.min.toLocaleString()}–₱${t.max.toLocaleString()} total`;
}

// ─── Cost Analysis Component ──────────────────────────────
function CostAnalysis({ events }: { events: SavedEvent[] }) {
  if (events.length === 0) return null;

  const totals = events.map((e) => totalBudget(e));
  const totalMinAll = totals.reduce((s, t) => s + t.min, 0);
  const totalMaxAll = totals.reduce((s, t) => s + t.max, 0);
  const totalMidAll = totals.reduce((s, t) => s + Math.round((t.min + t.max) / 2), 0);
  const totalPax = events.reduce((s, e) => s + e.pax, 0);
  const avgBudgetPerHead = totalPax > 0 ? Math.round(totalMidAll / totalPax) : 0;

  // Occasions breakdown
  const byOccasion: Record<string, { count: number; totalMid: number }> = {};
  events.forEach((e) => {
    const key = e.occasion || "Other";
    const mid = Math.round((totalBudget(e).min + totalBudget(e).max) / 2);
    if (!byOccasion[key]) byOccasion[key] = { count: 0, totalMid: 0 };
    byOccasion[key].count++;
    byOccasion[key].totalMid += mid;
  });

  const occasionRows = Object.entries(byOccasion).sort(
    (a, b) => b[1].totalMid - a[1].totalMid
  );

  const highestEvent = events.reduce((a, b) =>
    Math.round((totalBudget(a).min + totalBudget(a).max) / 2) >
    Math.round((totalBudget(b).min + totalBudget(b).max) / 2)
      ? a
      : b
  );

  return (
    <section id="analysis" className="mt-10 scroll-mt-6">
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EAF2F0]">
          <PieChart size={16} className="text-[#2A6558]" />
        </div>
        <h2 className="text-xl font-extrabold text-[#1A1817]">Cost Analysis</h2>
      </div>

      {/* Top metrics */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: <TrendingDown size={16} className="text-[#27AE60]" />,
            label: "Total Min Budget",
            value: `₱${totalMinAll.toLocaleString()}`,
            sub: "across all events",
            bg: "var(--vn-surface-success)",
          },
          {
            icon: <Minus size={16} className="text-[#2A6558]" />,
            label: "Total Mid Estimate",
            value: `₱${totalMidAll.toLocaleString()}`,
            sub: "midpoint estimate",
            bg: "var(--vn-surface-soft)",
          },
          {
            icon: <TrendingUp size={16} className="text-[#C0392B]" />,
            label: "Total Max Budget",
            value: `₱${totalMaxAll.toLocaleString()}`,
            sub: "upper ceiling",
            bg: "var(--vn-surface-danger)",
          },
          {
            icon: <Users size={16} className="text-[#2A6558]" />,
            label: "Avg. Cost / Head",
            value: `₱${avgBudgetPerHead.toLocaleString()}`,
            sub: `across ${totalPax.toLocaleString()} total guests`,
            bg: "var(--vn-surface-soft)",
          },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-2xl border border-[#E0DDD5] p-5"
            style={{ backgroundColor: m.bg }}
          >
            <div
              className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ backgroundColor: "var(--vn-surface)" }}
            >
              {m.icon}
            </div>
            <p className="text-xl font-extrabold text-[#1A1817]">{m.value}</p>
            <p className="text-xs font-medium text-[#1A1817]">{m.label}</p>
            <p className="text-[10px] text-[#7C7671]">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Budget bar per event */}
        <div className="rounded-2xl border border-[#E0DDD5] bg-white p-6">
          <h3 className="mb-4 font-semibold text-[#1A1817]">Budget per Event</h3>
          <div className="flex flex-col gap-4">
            {events.map((ev) => {
              const t = totalBudget(ev);
              const mid = Math.round((t.min + t.max) / 2);
              const pct = totalMidAll > 0 ? (mid / totalMidAll) * 100 : 0;
              return (
                <div key={ev.id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-[#1A1817] truncate max-w-[60%]">
                      {ev.eventName}
                    </span>
                    <span className="text-[#7C7671] ml-2">
                      ₱{mid.toLocaleString()} est.
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#F0EDEA] overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-[#2A6558] step-bar"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-[10px] text-[#7C7671]">
                    {pct.toFixed(1)}% of total spend · {ev.pax} guests
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* By occasion */}
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-[#E0DDD5] bg-white p-6">
            <h3 className="mb-4 font-semibold text-[#1A1817]">Spend by Occasion</h3>
            <div className="flex flex-col gap-3">
              {occasionRows.map(([occasion, data]) => (
                <div key={occasion} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-2.5 w-2.5 shrink-0 rounded-sm bg-[#2A6558]" />
                    <span className="truncate text-xs text-[#1A1817]">{occasion}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-xs">
                    <span className="text-[#7C7671]">{data.count} event{data.count > 1 ? "s" : ""}</span>
                    <span className="font-semibold text-[#1A1817]">
                      ₱{data.totalMid.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Highest budget event */}
          <div className="rounded-2xl bg-[#1A1817] p-5">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles size={13} className="text-[#7BC4B8]" />
              <span className="text-xs font-semibold uppercase tracking-widest text-[#7BC4B8]">
                Biggest Event
              </span>
            </div>
            <p className="mb-0.5 font-bold text-white">{highestEvent.eventName}</p>
            <p className="text-xs text-white/60 mb-3">
              {highestEvent.occasion} · {highestEvent.pax} guests
            </p>
            <p className="text-2xl font-extrabold text-[#7BC4B8]">
              ₱
              {Math.round(
                (totalBudget(highestEvent).min + totalBudget(highestEvent).max) / 2
              ).toLocaleString()}
            </p>
            <p className="text-xs text-white/50">midpoint estimate</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────
// Shape of what we look up per event
interface EventReservation {
  referenceNumber: string;
  status: "pending_payment" | "confirmed";
  venueName: string;
}

export default function EventsPage() {
  const { user, loading: authLoading } = useAuth();
  const { events, hydrated, deleteEvent } = useEventsContext();
  const { success, error } = useToast();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [eventToDelete, setEventToDelete] = useState<SavedEvent | null>(null);
  const [eventReservations, setEventReservations] = useState<Record<string, EventReservation>>({});

  // Load active reservation for each event
  useEffect(() => {
    if (!hydrated || authLoading) return;
    if (!user || events.length === 0) return;

    const ids = events.map((e) => e.id).filter(Boolean);
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
  }, [authLoading, hydrated, events, user]);

  const visibleEventReservations = user ? eventReservations : {};

  const filtered = events.filter((e) => {
    const matchSearch =
      e.eventName.toLowerCase().includes(search.toLowerCase()) ||
      e.occasion.toLowerCase().includes(search.toLowerCase()) ||
      e.city.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || e.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const requestDelete = (event: SavedEvent) => setEventToDelete(event);

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
      <main className="mx-auto w-full max-w-5xl px-6 py-10 page-fade">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#1A1817]">
              My Events
            </h1>
            <p className="mt-1 text-sm text-[#7C7671]">
              {hydrated
                ? `${events.length} event${events.length !== 1 ? "s" : ""} saved`
                : "Loading…"}
            </p>
          </div>
          <Link
            href="/create-event"
            className="flex items-center gap-2 rounded-full bg-[#2A6558] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#215249] shadow-sm whitespace-nowrap"
          >
            <Plus size={16} /> New Event
          </Link>
        </div>

        {/* Search + filter */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C7671]"
            />
            <input
              type="text"
              placeholder="Search events…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-[#E0DDD5] bg-white py-2.5 pl-10 pr-4 text-sm text-[#1A1817] outline-none placeholder:text-[#C4BDBA] transition focus:border-[#2A6558] focus:ring-2 focus:ring-[#2A6558]/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-[#7C7671]" />
            {["All", "Draft", "In Review", "Confirmed"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  filterStatus === s
                    ? "bg-[#2A6558] text-white"
                    : "border border-[#E0DDD5] bg-white text-[#7C7671] hover:border-[#2A6558] hover:text-[#2A6558]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Events list */}
        {!hydrated ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A6558] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-[#E0DDD5] bg-white py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF2F0]">
              <CalendarDays size={26} className="text-[#2A6558]" />
            </div>
            <div>
              <p className="font-semibold text-[#1A1817]">
                {events.length === 0 ? "No events yet" : "No matching events"}
              </p>
              <p className="mt-1 text-sm text-[#7C7671]">
                {events.length === 0
                  ? "Create your first event and let AI find perfect venues."
                  : "Try a different search or filter."}
              </p>
            </div>
            {events.length === 0 && (
              <Link
                href="/create-event"
                className="flex items-center gap-2 rounded-full bg-[#2A6558] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#215249]"
              >
                <Plus size={15} /> Create Event
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((ev) => {
              const t = totalBudget(ev);
              return (
                <div
                  key={ev.id}
                  className="rounded-2xl border border-[#E0DDD5] bg-white p-5 transition-shadow hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-[#1A1817] leading-snug">
                          {ev.eventName}
                        </h3>
                        <span
                          className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor[ev.status]}`}
                        >
                          {statusIcon[ev.status]}
                          {ev.status}
                        </span>
                      </div>
                      <p className="mb-3 text-xs text-[#7C7671]">{ev.occasion}</p>

                      <div className="flex flex-wrap gap-4 text-xs text-[#7C7671]">
                        {ev.eventDate && (
                          <span className="flex items-center gap-1">
                            <CalendarDays size={12} />
                            {new Date(ev.eventDate).toLocaleDateString("en-PH", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users size={12} /> {ev.pax} guests
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={12} /> {ev.city}
                          {ev.area ? `, ${ev.area}` : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <BarChart3 size={12} />
                          {budgetLabel(ev)}
                        </span>
                      </div>
                    </div>

                    {/* Right: total budget chip */}
                    <div className="flex flex-col items-end gap-3 shrink-0">
                      <div className="rounded-xl bg-[#EAF2F0] px-3 py-2 text-right">
                        <p className="text-[10px] text-[#7C7671]">Est. Total</p>
                        <p className="text-sm font-bold text-[#2A6558]">
                          ₱{t.min.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-[#7C7671]">
                          –₱{t.max.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Reservation status banner */}
                  {visibleEventReservations[ev.id] && (
                    <div className={`mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
                      visibleEventReservations[ev.id].status === "confirmed"
                        ? "border-[#C8E0DA] bg-[#EAF2F0] text-[#2A6558]"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}>
                      <CalendarCheck size={13} />
                      {visibleEventReservations[ev.id].status === "confirmed"
                        ? <>Venue reserved &amp; confirmed — <span className="font-bold">{visibleEventReservations[ev.id].venueName}</span> &nbsp;·&nbsp; Ref: <span className="tracking-wider">{visibleEventReservations[ev.id].referenceNumber}</span></>
                        : <>Venue reserved (pending cash payment) — <span className="font-bold">{visibleEventReservations[ev.id].venueName}</span> &nbsp;·&nbsp; Ref: <span className="tracking-wider">{visibleEventReservations[ev.id].referenceNumber}</span></>}
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-[#F0EDEA] pt-3">
                    <p className="text-[10px] text-[#7C7671]">
                      Created{" "}
                      {new Date(ev.createdAt).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => requestDelete(ev)}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-[#7C7671] transition hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                      {visibleEventReservations[ev.id] ? (
                        <Link
                          href="/reservations"
                          className="flex items-center gap-1.5 rounded-lg bg-[#2A6558] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#215249]"
                        >
                          <CalendarCheck size={12} /> My Reservations
                        </Link>
                      ) : (
                        <Link
                          href={`/recommendations?event=${ev.id}`}
                          className="flex items-center gap-1.5 rounded-lg bg-[#EAF2F0] px-3 py-1.5 text-xs font-semibold text-[#2A6558] transition hover:bg-[#2A6558] hover:text-white"
                        >
                          <Sparkles size={12} /> View Venues
                        </Link>
                      )}
                      <Link
                        href={`/events/${ev.id}`}
                        className="flex items-center gap-1.5 rounded-lg bg-[#1A1817] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#2A6558]"
                      >
                        Details <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cost Analysis section */}
        {hydrated && events.length > 0 && <CostAnalysis events={events} />}
      </main>

      <Modal
        open={Boolean(eventToDelete)}
        onClose={() => setEventToDelete(null)}
        title="Delete Event?"
        description={eventToDelete ? `You are about to delete "${eventToDelete.eventName}".` : undefined}
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
              onClick={confirmDelete}
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

"use client";

import { useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import {
  AdminDeniedState,
  AdminLoadingState,
  AdminMetricCard,
  AdminPanel,
  AdminSectionHeader,
} from "@/components/admin/AdminUI";
import {
  type AdminEventStatus,
  formatAdminCompactNumber,
  formatAdminDate,
  formatAdminDateTime,
  formatAdminEventBudget,
  formatAdminTime,
} from "@/lib/adminData";
import { supabase } from "@/lib/supabase/client";
import { useAdminData } from "@/lib/useAdminData";
import { useToast } from "@/lib/ToastContext";
import {
  CalendarCheck,
  CalendarDays,
  Clock,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";

const eventStatuses: AdminEventStatus[] = ["Draft", "In Review", "Confirmed"];

const OCCASIONS = [
  "Wedding Reception",
  "Corporate Conference",
  "Birthday Celebration",
  "Product Launch",
  "Team Building",
  "Gala Dinner",
  "Graduation Party",
  "Networking Mixer",
  "Baptism / Christening",
  "Debut",
  "Seminar / Workshop",
  "Other",
];

const DURATION_OPTIONS = [
  "1", "2", "3", "4", "5", "6", "7", "8", "10", "12",
];

interface EventEditDraft {
  status: AdminEventStatus;
  occasion: string;
  eventDate: string;
  startTime: string;
  durationHours: string;
  pax: string;
}

const eventFilters: { key: "all" | AdminEventStatus; label: string }[] = [
  { key: "all", label: "All" },
  ...eventStatuses.map((status) => ({ key: status, label: status })),
];

export default function AdminEventsPage() {
  const { accessState, loadingData, refreshData, events } = useAdminData();
  const { success, error: showError } = useToast();
  const [filter, setFilter] = useState<"all" | AdminEventStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [savingEventId, setSavingEventId] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventDrafts, setEventDrafts] = useState<Record<string, EventEditDraft>>({});

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );

  const getEventDraft = (eventId: string): EventEditDraft => {
    if (eventDrafts[eventId]) return eventDrafts[eventId];
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return { status: "Draft", occasion: "", eventDate: "", startTime: "", durationHours: "4", pax: "" };
    return {
      status: ev.status,
      occasion: ev.occasion,
      eventDate: ev.eventDate ?? "",
      startTime: ev.startTime ?? "",
      durationHours: String(ev.durationHours ?? 4),
      pax: String(ev.pax),
    };
  };

  const patchDraft = (eventId: string, patch: Partial<EventEditDraft>) => {
    setEventDrafts((prev) => ({
      ...prev,
      [eventId]: { ...getEventDraft(eventId), ...patch },
    }));
  };

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return events.filter((event) => {
      const matchesFilter = filter === "all" || event.status === filter;
      const matchesSearch =
        !q ||
        event.eventName.toLowerCase().includes(q) ||
        (event.creatorFullName ?? "").toLowerCase().includes(q) ||
        event.occasion.toLowerCase().includes(q) ||
        event.city.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [events, filter, searchQuery]);

  const counts = {
    all: events.length,
    Draft: events.filter((event) => event.status === "Draft").length,
    "In Review": events.filter((event) => event.status === "In Review").length,
    Confirmed: events.filter((event) => event.status === "Confirmed").length,
  };

  const totalGuests = events.reduce((sum, event) => sum + event.pax, 0);
  const withRecommendations = events.filter(
    (event) => event.venueCount > 0 || event.topVenueName
  ).length;

  const handleUpdateEventStatus = async (
    eventId: string,
    eventName: string,
    nextStatus: AdminEventStatus
  ) => {
    const currentEvent = events.find((event) => event.id === eventId);
    if (currentEvent?.status === nextStatus) return;

    setSavingEventId(eventId);

    const { error } = await supabase
      .from("events")
      .update({ status: nextStatus })
      .eq("id", eventId);

    setSavingEventId(null);

    if (error) {
      showError("Could not update event", "Please check your admin access.");
      return;
    }

    success("Event updated", `${eventName} is now ${nextStatus}.`);
    refreshData();
  };

  const handleSaveEventDetails = async (eventId: string, eventName: string) => {
    const draft = getEventDraft(eventId);
    const pax = Number(draft.pax);
    const duration = Number(draft.durationHours);

    if (!Number.isFinite(pax) || pax < 1) {
      showError("Invalid guest count", "Guest count must be at least 1.");
      return;
    }

    setSavingEventId(eventId);

    const { error } = await supabase
      .from("events")
      .update({
        status: draft.status,
        occasion: draft.occasion || undefined,
        event_date: draft.eventDate || undefined,
        start_time: draft.startTime || undefined,
        duration_hours: Number.isFinite(duration) && duration > 0 ? duration : undefined,
        pax: Math.round(pax),
      })
      .eq("id", eventId);

    setSavingEventId(null);

    if (error) {
      showError("Could not save changes", "Please check your admin access.");
      return;
    }

    setEventDrafts((prev) => { const next = { ...prev }; delete next[eventId]; return next; });
    success("Event saved", `Changes to "${eventName}" were saved.`);
    refreshData();
  };

  const handleDeleteEvent = async (eventId: string, eventName: string) => {
    if (!window.confirm(`Delete "${eventName}"? This cannot be undone.`)) return;

    setDeletingEventId(eventId);

    const { error } = await supabase.from("events").delete().eq("id", eventId);

    setDeletingEventId(null);

    if (error) {
      showError("Could not delete event", "Please check your admin access.");
      return;
    }

    success("Event deleted", `${eventName} was removed from the event list.`);
    refreshData();
  };

  if (accessState === "loading") {
    return (
      <AdminShell>
        <AdminLoadingState label="Loading event briefs" />
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
                <CalendarDays size={13} />
                Event Briefs
              </span>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#1A1817] sm:text-4xl">
                All customer event briefs with every submitted planning detail.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#6B6661] sm:text-base">
                Review customer demand, schedule details, budget ranges, location
                requirements, amenities, and current shortlist status.
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
            icon={<CalendarCheck size={18} />}
            label="Event Briefs"
            value={String(events.length)}
            detail="All saved events across users"
            tone="accent"
          />
          <AdminMetricCard
            icon={<Users size={18} />}
            label="Total Guests"
            value={formatAdminCompactNumber(totalGuests)}
            detail="Combined expected attendance"
          />
          <AdminMetricCard
            icon={<Sparkles size={18} />}
            label="With Venue Matches"
            value={String(withRecommendations)}
            detail="Events with shortlist or top venue data"
          />
          <AdminMetricCard
            icon={<Clock size={18} />}
            label="In Review"
            value={String(counts["In Review"])}
            detail="Events currently moving through planning"
            tone="dark"
          />
        </section>

        <AdminPanel className="mt-6">
          <AdminSectionHeader
            eyebrow="Filters"
            title="Event status"
            description="Use status filters while retaining full event detail below."
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
                placeholder="Search by event name, organizer, occasion or city…"
                className="h-10 w-full rounded-xl border border-[#E0DDD5] bg-[#FCFBF8] pl-9 pr-4 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558]"
              />
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {eventFilters.map((item) => (
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

        {/* Compact event cards */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => setSelectedEventId(event.id)}
              className="group rounded-[24px] border border-[#E0DDD5] bg-white p-5 text-left shadow-sm transition hover:border-[#2A6558] hover:shadow-md"
            >
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    event.status === "Confirmed"
                      ? "border border-[#C8E0DA] bg-[#EAF2F0] text-[#2A6558]"
                      : event.status === "In Review"
                      ? "border border-[#FDE8BB] bg-[#FEF6E4] text-[#92600A]"
                      : "border border-[#E0DDD5] bg-[#FCFBF8] text-[#7C7671]"
                  }`}
                >
                  {event.status}
                </span>
                <span className="rounded-full border border-[#E0DDD5] bg-[#FCFBF8] px-2.5 py-0.5 text-[11px] font-semibold text-[#7C7671]">
                  {event.occasion}
                </span>
              </div>
              <p className="truncate text-base font-extrabold text-[#1A1817] group-hover:text-[#2A6558]">
                {event.eventName}
              </p>
              <p className="mt-0.5 truncate text-xs text-[#7C7671]">
                {event.creatorFullName ?? "Unknown user"} &middot; {formatAdminDate(event.eventDate)}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="rounded-xl bg-[#1A1817] px-3 py-1.5 text-xs font-bold text-white">
                  {formatAdminEventBudget(event)}
                </span>
                <span className="flex items-center gap-1 text-xs text-[#7C7671]">
                  <Users size={12} />
                  {formatAdminCompactNumber(event.pax)}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Event detail + edit modal */}
        {selectedEvent && (() => {
          const draft = getEventDraft(selectedEvent.id);
          const isBusy = savingEventId === selectedEvent.id || deletingEventId === selectedEvent.id;
          return (
            <div
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
              onClick={(e) => { if (e.target === e.currentTarget) setSelectedEventId(null); }}
            >
              <div className="relative flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-[#E0DDD5] bg-[#FCFBF8] px-6 py-5">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          selectedEvent.status === "Confirmed"
                            ? "border border-[#C8E0DA] bg-[#EAF2F0] text-[#2A6558]"
                            : selectedEvent.status === "In Review"
                            ? "border border-[#FDE8BB] bg-[#FEF6E4] text-[#92600A]"
                            : "border border-[#E0DDD5] bg-white text-[#7C7671]"
                        }`}
                      >
                        {selectedEvent.status}
                      </span>
                      <span className="rounded-full border border-[#E0DDD5] bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#7C7671]">
                        {selectedEvent.occasion}
                      </span>
                    </div>
                    <h2 className="text-xl font-extrabold text-[#1A1817]">{selectedEvent.eventName}</h2>
                    <p className="mt-0.5 text-xs text-[#7C7671]">
                      {selectedEvent.creatorFullName ?? "Unknown user"} &middot; Created {formatAdminDateTime(selectedEvent.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedEventId(null)}
                    className="shrink-0 rounded-xl border border-[#E0DDD5] bg-white p-2 text-[#7C7671] transition hover:border-[#1A1817] hover:text-[#1A1817]"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="overflow-y-auto p-6">
                  {/* Read-only detail */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <DetailBlock title="Brief">
                      <DetailRow label="Description" value={selectedEvent.description || "None"} />
                      <DetailRow label="Tone" value={selectedEvent.toneKeywords || "None"} />
                      <DetailRow label="Notes" value={selectedEvent.extraNotes || "None"} />
                      <DetailRow label="Amenities" value={selectedEvent.amenities.length ? selectedEvent.amenities.join(", ") : "None"} />
                      <DetailRow label="Catering" value={selectedEvent.catering} />
                    </DetailBlock>
                    <DetailBlock title="Location & schedule">
                      <DetailRow label="Location" value={`${selectedEvent.city}${selectedEvent.area ? `, ${selectedEvent.area}` : ""}`} />
                      <DetailRow label="Radius" value={`${selectedEvent.radiusKm} km`} />
                      <DetailRow label="Setting" value={selectedEvent.setting} />
                      <DetailRow label="Date" value={formatAdminDate(selectedEvent.eventDate)} />
                      <DetailRow label="Start" value={formatAdminTime(selectedEvent.startTime)} />
                      <DetailRow label="Duration" value={`${selectedEvent.durationHours} hours`} />
                    </DetailBlock>
                    <DetailBlock title="Recommendation state">
                      <DetailRow label="Matched venues" value={String(selectedEvent.venueCount)} />
                      <DetailRow label="Top match" value={selectedEvent.topVenueName ?? "None yet"} />
                      <DetailRow label="Updated" value={formatAdminDateTime(selectedEvent.updatedAt)} />
                    </DetailBlock>
                  </div>

                  {/* Editable fields */}
                  <div className="mt-5 rounded-[24px] border border-[#C8E0DA] bg-[#F8FBFA] p-5">
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2A6558]">Edit details</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label>
                        <span className="mb-1.5 block text-xs font-semibold text-[#1A1817]">Status</span>
                        <select
                          value={draft.status}
                          disabled={isBusy}
                          onChange={(e) => patchDraft(selectedEvent.id, { status: e.target.value as AdminEventStatus })}
                          className="h-10 w-full rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm font-semibold text-[#1A1817] outline-none transition focus:border-[#2A6558] disabled:opacity-60"
                        >
                          {eventStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </label>

                      <label>
                        <span className="mb-1.5 block text-xs font-semibold text-[#1A1817]">Occasion</span>
                        <select
                          value={draft.occasion}
                          disabled={isBusy}
                          onChange={(e) => patchDraft(selectedEvent.id, { occasion: e.target.value })}
                          className="h-10 w-full rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm font-semibold text-[#1A1817] outline-none transition focus:border-[#2A6558] disabled:opacity-60"
                        >
                          {OCCASIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </label>

                      <label>
                        <span className="mb-1.5 block text-xs font-semibold text-[#1A1817]">Event date</span>
                        <input
                          type="date"
                          value={draft.eventDate}
                          disabled={isBusy}
                          onChange={(e) => patchDraft(selectedEvent.id, { eventDate: e.target.value })}
                          className="h-10 w-full rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558] disabled:opacity-60"
                        />
                      </label>

                      <label>
                        <span className="mb-1.5 block text-xs font-semibold text-[#1A1817]">Start time</span>
                        <input
                          type="time"
                          value={draft.startTime}
                          disabled={isBusy}
                          onChange={(e) => patchDraft(selectedEvent.id, { startTime: e.target.value })}
                          className="h-10 w-full rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558] disabled:opacity-60"
                        />
                      </label>

                      <label>
                        <span className="mb-1.5 block text-xs font-semibold text-[#1A1817]">Duration (hours)</span>
                        <select
                          value={draft.durationHours}
                          disabled={isBusy}
                          onChange={(e) => patchDraft(selectedEvent.id, { durationHours: e.target.value })}
                          className="h-10 w-full rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm font-semibold text-[#1A1817] outline-none transition focus:border-[#2A6558] disabled:opacity-60"
                        >
                          {DURATION_OPTIONS.map((d) => <option key={d} value={d}>{d} {d === "1" ? "hour" : "hours"}</option>)}
                        </select>
                      </label>

                      <label>
                        <span className="mb-1.5 block text-xs font-semibold text-[#1A1817]">Guest count (pax)</span>
                        <input
                          type="number"
                          min={1}
                          value={draft.pax}
                          disabled={isBusy}
                          onChange={(e) => patchDraft(selectedEvent.id, { pax: e.target.value })}
                          className="h-10 w-full rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558] disabled:opacity-60"
                        />
                      </label>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSaveEventDetails(selectedEvent.id, selectedEvent.eventName)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#2A6558] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#215249] disabled:opacity-60"
                      >
                        {savingEventId === selectedEvent.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Save changes
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteEvent(selectedEvent.id, selectedEvent.eventName)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-2 rounded-xl border border-[#F2C6BE] bg-[#FDECEA] px-4 py-2 text-sm font-semibold text-[#B42318] transition hover:border-[#B42318] disabled:opacity-60"
                      >
                        {deletingEventId === selectedEvent.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        Delete event
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
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

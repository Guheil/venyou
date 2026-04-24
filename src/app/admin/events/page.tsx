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
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";

const eventStatuses: AdminEventStatus[] = ["Draft", "In Review", "Confirmed"];

const eventFilters: { key: "all" | AdminEventStatus; label: string }[] = [
  { key: "all", label: "All" },
  ...eventStatuses.map((status) => ({ key: status, label: status })),
];

export default function AdminEventsPage() {
  const { accessState, loadingData, refreshData, events } = useAdminData();
  const { success, error: showError } = useToast();
  const [filter, setFilter] = useState<"all" | AdminEventStatus>("all");
  const [savingEventId, setSavingEventId] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  const filtered = useMemo(
    () => events.filter((event) => filter === "all" || event.status === filter),
    [events, filter]
  );

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

        <div className="mt-6 grid gap-5">
          {filtered.map((event) => (
            <article
              key={event.id}
              className="rounded-[28px] border border-[#E0DDD5] bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#C8E0DA] bg-[#EAF2F0] px-2.5 py-1 text-xs font-semibold text-[#2A6558]">
                      {event.status}
                    </span>
                    <span className="rounded-full border border-[#E0DDD5] bg-[#FCFBF8] px-2.5 py-1 text-xs font-semibold text-[#7C7671]">
                      {event.occasion}
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-[#1A1817]">
                    {event.eventName}
                  </h2>
                  <p className="mt-1 text-sm text-[#7C7671]">
                    Created {formatAdminDateTime(event.createdAt)} - {event.creatorFullName ?? event.userId}
                  </p>
                </div>
                <div className="grid gap-3 xl:w-[320px]">
                  <div className="rounded-2xl bg-[#1A1817] px-5 py-4 text-white xl:text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7BC4B8]">
                      Budget
                    </p>
                    <p className="mt-1 text-lg font-extrabold">
                      {formatAdminEventBudget(event)}
                    </p>
                    <p className="text-xs text-white/60">
                      {event.pax.toLocaleString()} guests
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#E0DDD5] bg-[#FCFBF8] p-4">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2A6558]">
                      Manage event
                    </p>
                    <label>
                      <span className="mb-1.5 block text-xs font-semibold text-[#7C7671]">
                        Status
                      </span>
                      <select
                        value={event.status}
                        disabled={
                          savingEventId === event.id || deletingEventId === event.id
                        }
                        onChange={(changeEvent) =>
                          void handleUpdateEventStatus(
                            event.id,
                            event.eventName,
                            changeEvent.target.value as AdminEventStatus
                          )
                        }
                        className="h-10 w-full rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm font-semibold text-[#1A1817] outline-none transition focus:border-[#2A6558] disabled:opacity-60"
                      >
                        {eventStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => void handleDeleteEvent(event.id, event.eventName)}
                      disabled={
                        savingEventId === event.id || deletingEventId === event.id
                      }
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#F2C6BE] bg-[#FDECEA] px-4 py-2 text-xs font-semibold text-[#B42318] transition hover:border-[#B42318] disabled:opacity-60"
                    >
                      {deletingEventId === event.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      Delete event
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-3">
                <DetailBlock title="Brief">
                  <DetailRow label="Description" value={event.description || "None"} />
                  <DetailRow label="Tone" value={event.toneKeywords || "None"} />
                  <DetailRow label="Notes" value={event.extraNotes || "None"} />
                  <DetailRow
                    label="Amenities"
                    value={event.amenities.length ? event.amenities.join(", ") : "None"}
                  />
                  <DetailRow label="Catering" value={event.catering} />
                </DetailBlock>

                <DetailBlock title="Location & schedule">
                  <DetailRow
                    label="Location"
                    value={`${event.city}${event.area ? `, ${event.area}` : ""}`}
                  />
                  <DetailRow label="Radius" value={`${event.radiusKm} km`} />
                  <DetailRow label="Setting" value={event.setting} />
                  <DetailRow label="Date" value={formatAdminDate(event.eventDate)} />
                  <DetailRow label="Start" value={formatAdminTime(event.startTime)} />
                  <DetailRow label="Duration" value={`${event.durationHours} hours`} />
                </DetailBlock>

                <DetailBlock title="Recommendation state">
                  <DetailRow label="Venue count" value={String(event.venueCount)} />
                  <DetailRow label="Top venue" value={event.topVenueName ?? "None"} />
                  <DetailRow label="Top venue ID" value={event.topVenueId ?? "None"} mono />
                  <DetailRow label="Event ID" value={event.id} mono />
                  <DetailRow label="Updated" value={formatAdminDateTime(event.updatedAt)} />
                </DetailBlock>
              </div>
            </article>
          ))}
        </div>
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

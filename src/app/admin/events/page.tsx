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
  type AdminReservation,
  formatAdminCompactNumber,
  formatAdminDate,
  formatAdminDateTime,
  formatAdminTime,
} from "@/lib/adminData";
import { formatPeso } from "@/lib/budget";
import { useAdminData } from "@/lib/useAdminData";
import {
  Banknote,
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  List,
  MapPin,
  RefreshCw,
  Search,
  Smartphone,
  Users,
} from "lucide-react";

type ViewMode = "list" | "calendar";
type EventFilter = "all" | "upcoming" | "past";

const filters: { key: EventFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });
}

function EventCard({ event }: { event: AdminReservation }) {
  return (
    <article className="overflow-hidden rounded-[24px] border border-[#E0DDD5] bg-white shadow-sm">
      <div
        className="h-1.5 w-full"
        style={{
          background:
            event.venueImageColor ??
            "linear-gradient(135deg, #BDD7D2 0%, #D6E8E4 100%)",
        }}
      />
      <div className="p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-[#C8E0DA] bg-[#EAF2F0] px-2.5 py-1 text-[11px] font-semibold text-[#2A6558]">
            <CalendarCheck size={12} />
            Confirmed
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-[#E0DDD5] bg-[#FCFBF8] px-2.5 py-1 text-[11px] font-semibold text-[#7C7671]">
            {event.paymentMethod === "gcash" ? <Smartphone size={11} /> : <Banknote size={11} />}
            {event.paymentMethod === "gcash" ? "GCash" : "Cash"}
          </span>
        </div>

        <h2 className="text-lg font-extrabold leading-tight text-[#1A1817]">
          {event.eventName}
        </h2>
        <p className="mt-1 text-sm text-[#7C7671]">
          {event.contactName} - {event.eventOccasion}
        </p>

        <div className="mt-4 grid gap-2 text-xs text-[#44504C] sm:grid-cols-2">
          <Detail icon={<CalendarDays size={13} />} text={formatAdminDate(event.eventDate)} />
          <Detail
            icon={<Clock size={13} />}
            text={`${formatAdminTime(event.startTime)} - ${event.durationHours}h`}
          />
          <Detail icon={<Users size={13} />} text={`${formatAdminCompactNumber(event.guestCount)} guests`} />
          <Detail icon={<MapPin size={13} />} text={event.venueName} />
        </div>

        <div className="mt-4 grid gap-2 border-t border-[#F0EEEA] pt-4 text-xs text-[#7C7671] sm:grid-cols-2">
          <div>
            <span className="block font-semibold text-[#1A1817]">Venue</span>
            {event.venueAddress || `${event.venueCity}${event.venueArea ? `, ${event.venueArea}` : ""}`}
          </div>
          <div>
            <span className="block font-semibold text-[#1A1817]">Payment</span>
            {formatPeso(event.totalAmount)} - {event.paymentReference ?? event.referenceNumber}
          </div>
        </div>

        <p className="mt-4 text-[11px] text-[#7C7671]">
          Confirmed {event.paymentConfirmedAt ? formatAdminDateTime(event.paymentConfirmedAt) : "by admin"}.
        </p>
      </div>
    </article>
  );
}

function Detail({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="shrink-0 text-[#2A6558]">{icon}</span>
      <span className="truncate">{text}</span>
    </div>
  );
}

export default function AdminEventsPage() {
  const { accessState, loadingData, refreshData, reservations, summary } = useAdminData();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [filter, setFilter] = useState<EventFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const today = dateKey(new Date());

  const confirmedEvents = useMemo(
    () =>
      reservations
        .filter((reservation) => reservation.reservationStatus === "confirmed")
        .sort((left, right) => left.eventDate.localeCompare(right.eventDate)),
    [reservations]
  );

  const searchedEvents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return confirmedEvents.filter((event) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "upcoming" && event.eventDate >= today) ||
        (filter === "past" && event.eventDate < today);

      const matchesSearch =
        !q ||
        event.eventName.toLowerCase().includes(q) ||
        event.contactName.toLowerCase().includes(q) ||
        event.venueName.toLowerCase().includes(q) ||
        event.referenceNumber.toLowerCase().includes(q) ||
        event.eventOccasion.toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [confirmedEvents, filter, searchQuery, today]);

  const eventsByDate = useMemo(
    () =>
      confirmedEvents.reduce<Record<string, AdminReservation[]>>((map, event) => {
        map[event.eventDate] = [...(map[event.eventDate] ?? []), event];
        return map;
      }, {}),
    [confirmedEvents]
  );

  const calendarCells = useMemo(() => {
    const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - firstDay.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [calendarMonth]);

  const upcomingCount = confirmedEvents.filter((event) => event.eventDate >= today).length;
  const pastCount = confirmedEvents.length - upcomingCount;
  const thisMonthKey = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}`;
  const monthCount = confirmedEvents.filter((event) => event.eventDate.startsWith(thisMonthKey)).length;
  const totalGuests = confirmedEvents.reduce((sum, event) => sum + event.guestCount, 0);

  if (accessState === "loading") {
    return (
      <AdminShell>
        <AdminLoadingState label="Loading confirmed events" />
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
                Event Schedule
              </span>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#1A1817] sm:text-4xl">
                Confirmed reservations become the event list.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#6B6661] sm:text-base">
                Once payment is confirmed from Requests, the reservation appears here as an event with its venue, customer, date, and payment reference.
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
            label="Confirmed Events"
            value={String(confirmedEvents.length)}
            detail="Approved reservation requests"
            tone="accent"
          />
          <AdminMetricCard
            icon={<Clock size={18} />}
            label="Upcoming"
            value={String(upcomingCount)}
            detail="Confirmed events from today onward"
          />
          <AdminMetricCard
            icon={<CalendarDays size={18} />}
            label="This Month"
            value={String(monthCount)}
            detail={monthLabel(calendarMonth)}
          />
          <AdminMetricCard
            icon={<Users size={18} />}
            label="Guests"
            value={formatAdminCompactNumber(totalGuests)}
            detail={`${summary.confirmed_reservations} confirmed reservations`}
            tone="dark"
          />
        </section>

        <AdminPanel className="mt-6">
          <AdminSectionHeader
            eyebrow="View"
            title="List and calendar"
            description="Use one confirmed event source, then switch the presentation for operations or scheduling."
            action={
              <div className="inline-flex rounded-full border border-[#E0DDD5] bg-[#FCFBF8] p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    viewMode === "list" ? "bg-[#2A6558] text-white" : "text-[#7C7671]"
                  }`}
                >
                  <List size={13} />
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("calendar")}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    viewMode === "calendar" ? "bg-[#2A6558] text-white" : "text-[#7C7671]"
                  }`}
                >
                  <CalendarDays size={13} />
                  Calendar
                </button>
              </div>
            }
          />

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C7671]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by event, requestor, venue, occasion, or reference..."
                className="h-10 w-full rounded-xl border border-[#E0DDD5] bg-[#FCFBF8] pl-9 pr-4 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558]"
              />
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
                  <span className="ml-1 opacity-75">
                    {item.key === "all" ? confirmedEvents.length : item.key === "upcoming" ? upcomingCount : pastCount}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </AdminPanel>

        {viewMode === "list" ? (
          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            {searchedEvents.length === 0 ? (
              <div className="col-span-full rounded-[24px] border border-dashed border-[#DAD6CE] bg-[#FCFBF8] p-10 text-center">
                <CalendarDays size={32} className="mx-auto mb-3 text-[#C8C2BB]" />
                <h2 className="text-lg font-extrabold text-[#1A1817]">No confirmed events found</h2>
                <p className="mt-1 text-sm text-[#7C7671]">
                  Confirm a payment request to move it into this event schedule.
                </p>
              </div>
            ) : (
              searchedEvents.map((event) => <EventCard key={event.id} event={event} />)
            )}
          </section>
        ) : (
          <AdminPanel className="mt-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2A6558]">
                  Calendar
                </p>
                <h2 className="text-xl font-extrabold text-[#1A1817]">{monthLabel(calendarMonth)}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCalendarMonth(
                      (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
                    )
                  }
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E0DDD5] bg-white text-[#7C7671] transition hover:border-[#2A6558] hover:text-[#2A6558]"
                  title="Previous month"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                  }}
                  className="h-9 rounded-xl border border-[#E0DDD5] bg-white px-3 text-xs font-semibold text-[#7C7671] transition hover:border-[#2A6558] hover:text-[#2A6558]"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCalendarMonth(
                      (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
                    )
                  }
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E0DDD5] bg-white text-[#7C7671] transition hover:border-[#2A6558] hover:text-[#2A6558]"
                  title="Next month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[780px]">
                <div className="grid grid-cols-7 gap-2 pb-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7C7671]">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day}>{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {calendarCells.map((day) => {
                    const key = dateKey(day);
                    const dayEvents = (eventsByDate[key] ?? []).filter((event) =>
                      searchedEvents.some((searched) => searched.id === event.id)
                    );
                    const inMonth = day.getMonth() === calendarMonth.getMonth();
                    const isToday = key === today;

                    return (
                      <div
                        key={key}
                        className={`min-h-32 rounded-xl border p-2 ${
                          isToday
                            ? "border-[#2A6558] bg-[#EAF2F0]"
                            : inMonth
                              ? "border-[#E0DDD5] bg-white"
                              : "border-[#F0EEEA] bg-[#FCFBF8] text-[#B0ABA5]"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-bold">{day.getDate()}</span>
                          {dayEvents.length > 0 && (
                            <span className="rounded-full bg-[#2A6558] px-1.5 py-0.5 text-[10px] font-bold text-white">
                              {dayEvents.length}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map((event) => (
                            <div
                              key={event.id}
                              className="rounded-lg border border-[#C8E0DA] bg-[#F8FBFA] px-2 py-1"
                            >
                              <p className="truncate text-[11px] font-bold text-[#1A1817]">
                                {event.eventName}
                              </p>
                              <p className="truncate text-[10px] text-[#7C7671]">
                                {formatAdminTime(event.startTime)} - {event.venueName}
                              </p>
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <p className="text-[10px] font-semibold text-[#2A6558]">
                              +{dayEvents.length - 3} more
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </AdminPanel>
        )}
      </main>
    </AdminShell>
  );
}

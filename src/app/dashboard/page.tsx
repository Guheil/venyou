"use client";

import Link from "next/link";
import AppShell from "@/components/AppShell";
import { useEventsContext } from "@/lib/EventsContext";
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
} from "lucide-react";

const statusColor: Record<string, string> = {
  Draft: "bg-[#F0EDEA] text-[#7C7671]",
  "In Review": "bg-[#FEF3C7] text-[#92400E]",
  Confirmed: "bg-[#EAF2F0] text-[#2A6558]",
};

const statusIcon: Record<string, React.ReactNode> = {
  Draft: <FileText size={12} />,
  "In Review": <AlertCircle size={12} />,
  Confirmed: <CheckCircle2 size={12} />,
};

export default function DashboardPage() {
  const { events, hydrated } = useEventsContext();

  const totalPax = events.reduce((s, e) => s + e.pax, 0);
  const confirmedCount = events.filter((e) => e.status === "Confirmed").length;
  const avgMatchScore = 92; // static until backend

  const upcomingEvents = events
    .filter((e) => e.eventDate && new Date(e.eventDate) >= new Date())
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
    .slice(0, 3);

  const recentEvents = events.slice(0, 4);

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl px-6 py-10 page-fade">
        {/* Header */}
        <div className="mb-10 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-[#7C7671] mb-1">
              {new Date().toLocaleDateString("en-PH", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#1A1817]">
              Dashboard
            </h1>
          </div>
          <Link
            href="/create-event"
            className="flex items-center gap-2 rounded-full bg-[#2A6558] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#215249] shadow-sm whitespace-nowrap"
          >
            <Plus size={16} /> New Event
          </Link>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: <FileText size={18} className="text-[#2A6558]" />,
              label: "Total Events",
              value: hydrated ? String(events.length) : "-",
            },
            {
              icon: <Users size={18} className="text-[#2A6558]" />,
              label: "Total Guests Planned",
              value: hydrated ? totalPax.toLocaleString() : "-",
            },
            {
              icon: <CheckCircle2 size={18} className="text-[#2A6558]" />,
              label: "Confirmed Events",
              value: hydrated ? String(confirmedCount) : "-",
            },
            {
              icon: <TrendingUp size={18} className="text-[#2A6558]" />,
              label: "Avg. AI Match Score",
              value: events.length ? `${avgMatchScore}%` : "-",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-[#E0DDD5] bg-white p-5"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF2F0]">
                {s.icon}
              </div>
              <p className="text-2xl font-extrabold text-[#1A1817]">{s.value}</p>
              <p className="mt-0.5 text-xs text-[#7C7671]">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Events */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-[#1A1817]">Recent Events</h2>
              <Link
                href="/events"
                className="flex items-center gap-1 text-xs font-medium text-[#2A6558] hover:underline"
              >
                View All <ArrowRight size={13} />
              </Link>
            </div>

            {!hydrated ? (
              <div className="flex h-32 items-center justify-center rounded-2xl border border-[#E0DDD5] bg-white">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2A6558] border-t-transparent" />
              </div>
            ) : recentEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[#E0DDD5] bg-white py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF2F0]">
                  <CalendarDays size={22} className="text-[#2A6558]" />
                </div>
                <div>
                  <p className="font-semibold text-[#1A1817]">No events yet</p>
                  <p className="text-sm text-[#7C7671]">
                    Create your first event and let AI find your perfect venue.
                  </p>
                </div>
                <Link
                  href="/create-event"
                  className="flex items-center gap-2 rounded-full bg-[#2A6558] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#215249]"
                >
                  <Plus size={15} /> Create Event
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {recentEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-2xl border border-[#E0DDD5] bg-white p-5 transition-shadow hover:shadow-sm"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold leading-snug text-[#1A1817]">
                          {ev.eventName}
                        </h3>
                        <p className="text-xs text-[#7C7671]">{ev.occasion}</p>
                      </div>
                      <span
                        className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor[ev.status]}`}
                      >
                        {statusIcon[ev.status]}
                        {ev.status}
                      </span>
                    </div>
                    <div className="mb-3 flex flex-wrap gap-4 text-xs text-[#7C7671]">
                      {ev.eventDate && (
                        <span className="flex items-center gap-1">
                          <CalendarDays size={12} />
                          {new Date(ev.eventDate).toLocaleDateString("en-PH", {
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
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-[#7C7671]">
                        <BarChart3 size={12} className="text-[#2A6558]" />
                        Budget: â‚±{ev.budgetMin.toLocaleString()} â€“{" "}
                        â‚±{ev.budgetMax.toLocaleString()}
                        {ev.budgetType === "per-head" ? " / head" : " total"}
                      </div>
                      <Link
                        href={`/events/${ev.id}`}
                        className="flex items-center gap-1 text-xs font-semibold text-[#2A6558] hover:underline"
                      >
                        View <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar widgets */}
          <div className="flex flex-col gap-5">
            {/* Upcoming */}
            <div className="rounded-2xl border border-[#E0DDD5] bg-white p-5">
              <h2 className="mb-4 font-semibold text-[#1A1817]">Upcoming</h2>
              {upcomingEvents.length === 0 ? (
                <p className="text-xs text-[#7C7671]">No upcoming events.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {upcomingEvents.map((ev) => {
                    const d = new Date(ev.eventDate);
                    return (
                      <Link key={ev.id} href={`/events/${ev.id}`} className="flex items-center gap-3 hover:opacity-80 transition">
                        <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-[#EAF2F0]">
                          <span className="text-[9px] font-bold uppercase text-[#2A6558]">
                            {d.toLocaleString("default", { month: "short" })}
                          </span>
                          <span className="text-sm font-extrabold leading-none text-[#2A6558]">
                            {d.getDate()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#1A1817]">
                            {ev.eventName}
                          </p>
                          <p className="text-xs text-[#7C7671]">
                            {ev.pax} guests Â· {ev.city}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl border border-[#E0DDD5] bg-white p-5">
              <h2 className="mb-4 font-semibold text-[#1A1817]">Quick Actions</h2>
              <div className="flex flex-col gap-2">
                {[
                  { label: "Plan New Event", href: "/create-event", icon: <Plus size={15} /> },
                  { label: "View All Events", href: "/events", icon: <CalendarDays size={15} /> },
                  { label: "Cost Analysis", href: "/events#analysis", icon: <BarChart3 size={15} /> },
                  { label: "Explore Venues", href: "/recommendations", icon: <MapPin size={15} /> },
                ].map((a) => (
                  <Link
                    key={a.label}
                    href={a.href}
                    className="flex items-center gap-3 rounded-xl border border-[#E0DDD5] px-4 py-2.5 text-sm font-medium text-[#1A1817] transition hover:border-[#2A6558] hover:text-[#2A6558] hover:bg-[#F8F6F1]"
                  >
                    <span className="text-[#2A6558]">{a.icon}</span>
                    {a.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* AI Tip */}
            <div className="rounded-2xl bg-[#1A1817] p-5">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles size={14} className="text-[#7BC4B8]" />
                <span className="text-xs font-semibold uppercase tracking-widest text-[#7BC4B8]">
                  AI Tip
                </span>
              </div>
              <p className="text-sm leading-relaxed text-white/80 mb-4">
                Book 3+ months ahead for weddings - popular garden venues in BGC
                fill up fast on weekends.
              </p>
              <Link
                href="/create-event"
                className="flex items-center gap-1 text-xs font-semibold text-[#7BC4B8] hover:underline"
              >
                Plan now <ArrowRight size={13} />
              </Link>
            </div>

            {/* Activity feed */}
            {events.length > 0 && (
              <div className="rounded-2xl border border-[#E0DDD5] bg-white p-5">
                <h2 className="mb-4 font-semibold text-[#1A1817]">Activity</h2>
                <div className="flex flex-col gap-3">
                  {events.slice(0, 4).map((ev) => (
                    <div key={ev.id} className="flex items-start gap-2.5">
                      <Clock size={13} className="mt-0.5 shrink-0 text-[#7C7671]" />
                      <div>
                        <p className="text-xs text-[#1A1817]">
                          <span className="font-medium">{ev.eventName}</span> created
                        </p>
                        <p className="text-[10px] text-[#7C7671]">
                          {new Date(ev.createdAt).toLocaleDateString("en-PH", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}

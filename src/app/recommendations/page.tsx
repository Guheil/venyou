"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import VenueCard, { type Venue } from "@/components/VenueCard";
import RecommendationsMap from "@/components/RecommendationsMap";
import { useAuth } from "@/lib/AuthContext";
import { formatPeso } from "@/lib/budget";
import { useEventsContext } from "@/lib/EventsContext";
import { useToast } from "@/lib/ToastContext";
import { supabase } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import type { SavedEvent } from "@/lib/types";
import {
  Sparkles,
  SlidersHorizontal,
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  Minus,
  Maximize2,
  Target,
  Users,
  Wallet,
  X,
} from "lucide-react";

interface RecommendedVenueRow {
  id: string;
  name: string;
  type: string;
  address: string;
  city: string;
  area: string;
  capacity: number;
  rating: number;
  review_count: number;
  price_per_head: number;
  tags: string[] | null;
  image_color: string | null;
  image_url: string | null;
  distance_km: number | null;
  total_estimate: number | null;
  match_score: number | null;
  ai_note: string | null;
}

interface AiInsightsRequestPayload {
  event: {
    id: string;
    eventName: string;
    occasion: string;
    description: string;
    pax: number;
    budgetMin: number;
    budgetMax: number;
    budgetType: SavedEvent["budgetType"];
    city: string;
    area: string;
    setting: SavedEvent["setting"];
    catering: SavedEvent["catering"];
    toneKeywords: string;
    amenities: string[];
  };
  venues: Array<{
    id: string;
    name: string;
    type: string;
    address: string;
    city: string;
    area: string;
    capacity: number;
    pricePerHead: number;
    distanceKm: number;
    match: number;
    tags: string[];
  }>;
}

interface AiInsightsResponsePayload {
  summary: string;
  insights: Array<{ id: string; insight: string }>;
}

function buildAiInsightsPayload(
  event: SavedEvent,
  rows: RecommendedVenueRow[]
): AiInsightsRequestPayload {
  return {
    event: {
      id: event.id,
      eventName: event.eventName,
      occasion: event.occasion,
      description: event.description,
      pax: event.pax,
      budgetMin: event.budgetMin,
      budgetMax: event.budgetMax,
      budgetType: event.budgetType,
      city: event.city,
      area: event.area,
      setting: event.setting,
      catering: event.catering,
      toneKeywords: event.toneKeywords,
      amenities: event.amenities,
    },
    venues: rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      address: row.address,
      city: row.city,
      area: row.area,
      capacity: row.capacity,
      pricePerHead: row.price_per_head,
      distanceKm: Number(row.distance_km ?? 0),
      match: Math.max(0, Math.min(100, Math.round(Number(row.match_score ?? 0)))),
      tags: row.tags ?? [],
    })),
  };
}

function isAiInsightsResponsePayload(
  value: unknown
): value is AiInsightsResponsePayload {
  if (!value || typeof value !== "object") return false;
  const maybe = value as { summary?: unknown; insights?: unknown };
  if (typeof maybe.summary !== "string" || !Array.isArray(maybe.insights)) {
    return false;
  }

  return maybe.insights.every((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const candidate = entry as { id?: unknown; insight?: unknown };
    return typeof candidate.id === "string" && typeof candidate.insight === "string";
  });
}

function mapRecommendedVenue(row: RecommendedVenueRow): Venue {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    address: row.address,
    city: row.city,
    distance: Number(row.distance_km ?? 0),
    capacity: row.capacity,
    rating: Number(row.rating ?? 0),
    reviewCount: row.review_count,
    pricePerHead: row.price_per_head,
    totalEstimate: row.total_estimate ?? row.price_per_head * 100,
    imageColor:
      row.image_color?.trim() ||
      "linear-gradient(135deg, #BDD7D2 0%, #D6E8E4 100%)",
    imageUrl: row.image_url?.trim() || undefined,
    tags: row.tags ?? [],
    aiNote: row.ai_note ?? "Venue fit based on your event profile.",
    match: Math.max(0, Math.min(100, Math.round(Number(row.match_score ?? 0)))),
  };
}

function Panel({
  children,
  className = "",
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "dark";
}) {
  const toneClass =
    tone === "dark"
      ? "border-[#1A1817] bg-[#1A1817] text-white"
      : "border-[#E0DDD5] bg-white";

  return (
    <section
      className={`rounded-[28px] border p-5 shadow-sm sm:p-6 ${toneClass} ${className}`}
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

function KpiCard({
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

function RecommendationsPageFallback() {
  return (
    <AppShell>
      <main className="flex min-h-[60vh] items-center justify-center px-6 py-10">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A6558] border-t-transparent" />
      </main>
    </AppShell>
  );
}

function RecommendationsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { error: showError } = useToast();
  const { events, hydrated, getEvent, updateEvent } = useEventsContext();

  const [venues, setVenues] = useState<Venue[]>([]);
  const [rawRows, setRawRows] = useState<RecommendedVenueRow[]>([]);
  const [aiInsightStates, setAiInsightStates] = useState<Record<string, "idle" | "loading" | "loaded" | "error">>({});
  const [reservedVenueState, setReservedVenueState] = useState<{
    eventId: string | null;
    venueIds: Record<string, true>;
  }>({ eventId: null, venueIds: {} });
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const eventIdFromQuery = searchParams.get("event");
  const fallbackEventId = events[0]?.id ?? null;
  const selectedEventId = eventIdFromQuery ?? fallbackEventId;
  const selectedEvent = selectedEventId ? getEvent(selectedEventId) : undefined;
  const selectedEventStatus = selectedEvent?.status ?? null;
  const selectedEventVenueCount = selectedEvent?.venueCount ?? null;
  const selectedEventTopVenueId = selectedEvent?.topVenueId ?? null;
  const selectedEventTopVenueName = selectedEvent?.topVenueName ?? null;

  useEffect(() => {
    if (!hydrated || !selectedEventId || !selectedEvent) return;

    let active = true;

    void (async () => {
      setLoading(true);
      setLoadError(null);
      setAiSummary(null);
      setAiInsightStates({});

      const { data, error } = await supabase.rpc("recommend_venues_for_event", {
        p_event_id: selectedEventId,
        p_limit: 12,
      });

      if (!active) return;

      if (error) {
        const message = "Unable to generate recommendations right now.";
        setVenues([]);
        setLoadError(message);
        showError("Recommendation error", "Please try again in a moment.");
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as RecommendedVenueRow[];
      const mapped = rows.map((row) => mapRecommendedVenue(row));
      setVenues(mapped);
      setRawRows(rows);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [hydrated, selectedEvent, selectedEventId, showError]);

  useEffect(() => {
    if (!hydrated || authLoading || !selectedEventId || !user) return;

    let active = true;

    void (async () => {
      const { data, error } = await supabase
        .from("venue_reservations")
        .select("venue_id")
        .eq("user_id", user.id)
        .eq("event_id", selectedEventId)
        .neq("reservation_status", "cancelled");

      if (!active) return;

      if (error) {
        setReservedVenueState({
          eventId: selectedEventId,
          venueIds: {},
        });
        return;
      }

      const nextReserved: Record<string, true> = {};
      for (const row of (data ?? []) as { venue_id: string }[]) {
        nextReserved[row.venue_id] = true;
      }

      setReservedVenueState({
        eventId: selectedEventId,
        venueIds: nextReserved,
      });
    })();

    return () => {
      active = false;
    };
  }, [authLoading, hydrated, selectedEventId, user]);

  const reservedVenueIds =
    user && selectedEventId === reservedVenueState.eventId
      ? reservedVenueState.venueIds
      : {};

  useEffect(() => {
    if (!selectedEventId || !selectedEventStatus || venues.length === 0) return;

    const topVenue = venues[0];
    const nextStatus =
      selectedEventStatus === "Draft" ? "In Review" : selectedEventStatus;

    const hasChanges =
      selectedEventVenueCount !== venues.length ||
      selectedEventTopVenueId !== topVenue.id ||
      selectedEventTopVenueName !== topVenue.name ||
      selectedEventStatus !== nextStatus;

    if (!hasChanges) return;

    void updateEvent(selectedEventId, {
      venueCount: venues.length,
      topVenueId: topVenue.id,
      topVenueName: topVenue.name,
      status: nextStatus,
    }).catch(() => {
      // Recommendation rendering should not fail if metadata sync fails.
    });
  }, [
    selectedEventId,
    selectedEventStatus,
    selectedEventTopVenueId,
    selectedEventTopVenueName,
    selectedEventVenueCount,
    updateEvent,
    venues,
  ]);

  const handleRequestAiInsight = async (venueId: string) => {
    if (!selectedEvent) return;
    const row = rawRows.find((r) => r.id === venueId);
    if (!row) return;

    setAiInsightStates((prev) => ({ ...prev, [venueId]: "loading" }));

    try {
      const payload = buildAiInsightsPayload(selectedEvent, [row]);
      const response = await fetch("/api/recommendations/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let detail = `HTTP ${response.status}`;
        try {
          const errorBody = (await response.json()) as { error?: unknown };
          if (typeof errorBody.error === "string") detail = errorBody.error;
        } catch { /* keep default */ }
        throw new Error(detail);
      }

      const data = (await response.json()) as unknown;
      if (!isAiInsightsResponsePayload(data)) {
        throw new Error("Invalid response format");
      }

      const insight = data.insights.find((i) => i.id === venueId);
      if (insight) {
        setVenues((current) =>
          current.map((v) =>
            v.id === venueId ? { ...v, aiNote: insight.insight } : v
          )
        );
      }
      if (data.summary && !aiSummary) {
        setAiSummary(data.summary);
      }
      setAiInsightStates((prev) => ({ ...prev, [venueId]: "loaded" }));
    } catch (err) {
      console.error("[AI Insight] Error for venue", venueId, err);
      setAiInsightStates((prev) => ({ ...prev, [venueId]: "error" }));
      setVenues((current) =>
        current.map((v) =>
          v.id === venueId
            ? { ...v, aiNote: "AI insight unavailable. Please try again." }
            : v
        )
      );
    }
  };

  const costSummary = useMemo(() => {
    if (venues.length === 0) return null;

    return {
      lowestPerHead: Math.min(...venues.map((venue) => venue.pricePerHead)),
      highestPerHead: Math.max(...venues.map((venue) => venue.pricePerHead)),
      avgPerHead: Math.round(
        venues.reduce((sum, venue) => sum + venue.pricePerHead, 0) / venues.length
      ),
      lowestTotal: Math.min(...venues.map((venue) => venue.totalEstimate)),
      highestTotal: Math.max(...venues.map((venue) => venue.totalEstimate)),
    };
  }, [venues]);

  const quickFilterTags = useMemo(() => {
    const tagCounts = new Map<string, number>();
    venues.forEach((venue) => {
      venue.tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      });
    });

    const topTags = [...tagCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6)
      .map(([tag]) => tag);

    if (costSummary) {
      topTags.push(`Under ${formatPeso(costSummary.avgPerHead)}/head`);
    }

    return topTags;
  }, [costSummary, venues]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMapModalOpen(false);
      }
    };

    if (mapModalOpen) {
      window.addEventListener("keydown", onKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mapModalOpen]);

  if (!hydrated) {
    return (
      <AppShell>
        <main className="flex min-h-[60vh] items-center justify-center px-6 py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A6558] border-t-transparent" />
        </main>
      </AppShell>
    );
  }

  if (events.length === 0) {
    return (
      <AppShell>
        <main className="mx-auto w-full max-w-3xl px-6 py-10 text-center">
          <div className="rounded-2xl border border-dashed border-[#E0DDD5] bg-white px-8 py-16">
            <h1 className="mb-2 text-2xl font-extrabold text-[#1A1817]">
              No events yet
            </h1>
            <p className="mb-6 text-sm text-[#7C7671]">
              Create an event first so AI can rank venues from your details.
            </p>
            <Link
              href={ROUTES.createEvent}
              className="inline-flex items-center gap-2 rounded-full bg-[#2A6558] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#215249]"
            >
              Create Event
            </Link>
          </div>
        </main>
      </AppShell>
    );
  }

  if (!selectedEvent) {
    return (
      <AppShell>
        <main className="mx-auto w-full max-w-3xl px-6 py-10 text-center">
          <div className="rounded-2xl border border-[#E0DDD5] bg-white px-8 py-16">
            <h1 className="mb-2 text-2xl font-extrabold text-[#1A1817]">
              Event not available
            </h1>
            <p className="mb-6 text-sm text-[#7C7671]">
              The selected event was not found in your account.
            </p>
            <Link
              href={ROUTES.events}
              className="inline-flex items-center gap-2 rounded-full bg-[#2A6558] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#215249]"
            >
              Back to My Events
            </Link>
          </div>
        </main>
      </AppShell>
    );
  }

  const backToEventHref = `${ROUTES.events}/${selectedEvent.id}`;
  const eventSummary = `${selectedEvent.occasion} - ${selectedEvent.city} - ${selectedEvent.pax} guests`;
  const mapVenues = venues.map((venue) => ({
    id: venue.id,
    name: venue.name,
    address: venue.address,
    city: venue.city ?? selectedEvent.city,
  }));
  const averageMatch =
    venues.length > 0
      ? Math.round(venues.reduce((sum, venue) => sum + venue.match, 0) / venues.length)
      : 0;
  const budgetFitCount = venues.filter((venue) =>
    selectedEvent.budgetType === "per-head"
      ? venue.pricePerHead <= selectedEvent.budgetMax
      : venue.totalEstimate <= selectedEvent.budgetMax
  ).length;
  const averageTotalEstimate =
    venues.length > 0
      ? Math.round(
          venues.reduce((sum, venue) => sum + venue.totalEstimate, 0) / venues.length
        )
      : 0;
  const selectedEventDateLabel = selectedEvent.eventDate
    ? new Date(`${selectedEvent.eventDate}T00:00:00`).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Date not set";

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 page-fade sm:px-6 sm:py-10">
        <section className="rounded-[30px] border border-[#E0DDD5] bg-gradient-to-br from-[#FCFBF8] via-white to-[#F0F6F4] p-6 sm:p-8">
          <Link
            href={backToEventHref}
            className="mb-5 inline-flex items-center gap-2 text-sm text-[#7C7671] transition hover:text-[#2A6558]"
          >
            <ArrowLeft size={15} /> Back to Event Details
          </Link>

          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#C8E0DA] bg-[#EAF2F0] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2A6558]">
                  AI Recommendations
                </span>
                <span className="rounded-full border border-[#E0DDD5] bg-white px-3 py-1 text-xs text-[#7C7671]">
                  {selectedEventDateLabel}
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#1A1817] sm:text-4xl">
                {loading ? "Generating venue matches..." : `${venues.length} venue matches built around this brief.`}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#6B6661] sm:text-base">
                {eventSummary}. Review the best-fit shortlist, compare the spend range,
                and move straight into reservation once one venue stands out.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
              <label className="sr-only" htmlFor="event-picker">
                Select event
              </label>
              <select
                id="event-picker"
                value={selectedEvent.id}
                onChange={(event) =>
                  router.replace(
                    `${ROUTES.recommendations}?event=${encodeURIComponent(
                      event.target.value
                    )}`
                  )
                }
                className="min-w-0 rounded-full border border-[#E0DDD5] bg-white px-4 py-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558] focus:ring-2 focus:ring-[#2A6558]/20"
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.eventName}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D8D3C9] bg-white px-5 py-3 text-sm font-semibold text-[#1A1817] transition hover:border-[#2A6558] hover:text-[#2A6558]"
              >
                <SlidersHorizontal size={15} />
                Filter & Sort
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={<Sparkles size={18} />}
            label="Match Count"
            value={loading ? "-" : String(venues.length)}
            detail="Active venues in the current recommendation set"
          />
          <KpiCard
            icon={<Target size={18} />}
            label="Average Match"
            value={loading || venues.length === 0 ? "-" : `${averageMatch}%`}
            detail="Average fit score across the visible shortlist"
          />
          <KpiCard
            icon={<Wallet size={18} />}
            label="Budget Fit"
            value={loading ? "-" : `${budgetFitCount}/${venues.length || 0}`}
            detail="Venues currently under your planning ceiling"
          />
          <KpiCard
            icon={<Users size={18} />}
            label="Avg Total Estimate"
            value={loading || venues.length === 0 ? "-" : formatPeso(averageTotalEstimate)}
            detail={`For ${selectedEvent.pax.toLocaleString()} guests in ${selectedEvent.city}`}
          />
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_320px]">
          <div className="order-2 lg:order-1">
            <Panel>
              <SectionHeader
                eyebrow="Venue grid"
                title="Recommended venues"
                description="Sorted by fit and proximity so the strongest options stay at the top."
                action={
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-[#D8D3C9] bg-white px-4 py-2 text-sm font-semibold text-[#1A1817] transition hover:border-[#2A6558] hover:text-[#2A6558]"
                  >
                    <SlidersHorizontal size={15} />
                    Filter & Sort
                  </button>
                }
              />

              {loading ? (
                <div className="flex min-h-[320px] items-center justify-center rounded-[24px] border border-[#E0DDD5] bg-[#FCFBF8]">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A6558] border-t-transparent" />
                </div>
              ) : loadError ? (
                <div className="rounded-[24px] border border-[#F2C5BE] bg-[#FDECEA] p-6">
                  <p className="text-sm font-semibold text-[#C0392B]">{loadError}</p>
                  <p className="mt-1 text-xs text-[#7C7671]">
                    Confirm the latest `supabase/schema.sql` has been applied, then try again.
                  </p>
                </div>
              ) : venues.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#E0DDD5] bg-[#FCFBF8] p-10 text-center">
                  <p className="text-sm font-semibold text-[#1A1817]">
                    No venue matches yet
                  </p>
                  <p className="mt-1 text-xs text-[#7C7671]">
                    Add more venue rows to `public.venues` or broaden the event constraints.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-6 sm:grid-cols-2">
                    {venues.map((venue, index) => (
                      <VenueCard
                        key={venue.id}
                        venue={venue}
                        rank={index + 1}
                        eventId={selectedEvent.id}
                        prefillDate={selectedEvent.eventDate || undefined}
                        prefillStartTime={selectedEvent.startTime || undefined}
                        prefillDurationHours={selectedEvent.durationHours}
                        prefillGuestCount={selectedEvent.pax}
                        isReservedForDate={Boolean(reservedVenueIds[venue.id])}
                        onRequestAiInsight={() => handleRequestAiInsight(venue.id)}
                        aiInsightLoading={aiInsightStates[venue.id] === "loading"}
                        aiInsightLoaded={
                          aiInsightStates[venue.id] === "loaded" ||
                          aiInsightStates[venue.id] === "error"
                        }
                      />
                    ))}
                  </div>

                  {venues.length >= 12 && (
                    <div className="mt-8 flex justify-center">
                      <button
                        type="button"
                        className="rounded-full border border-[#E0DDD5] bg-white px-8 py-3 text-sm font-medium text-[#7C7671] transition hover:border-[#2A6558] hover:text-[#2A6558]"
                      >
                        Showing Top 12 Matches
                      </button>
                    </div>
                  )}
                </>
              )}
            </Panel>
          </div>

          <aside className="order-1 flex flex-col gap-6 lg:order-2">
            <Panel>
              <SectionHeader
                eyebrow="Event brief"
                title={selectedEvent.eventName}
                description="This recommendation set updates as you switch event context."
              />
              <div className="mt-2 space-y-1.5 text-sm">
                <p className="font-semibold text-[#1A1817]">{selectedEventDateLabel} · {selectedEvent.pax.toLocaleString()} guests</p>
                <p className="text-[#7C7671]">{selectedEvent.city}{selectedEvent.area ? `, ${selectedEvent.area}` : ""}</p>
                <p className="text-[#7C7671]">{selectedEvent.budgetType === "per-head" ? `Up to ${formatPeso(selectedEvent.budgetMax)}/head` : `Up to ${formatPeso(selectedEvent.budgetMax)} total`}</p>
              </div>
            </Panel>

            <Panel>
              <SectionHeader
                eyebrow="Cost"
                title="Recommendation cost snapshot"
                description="Compare the visible pricing band before drilling into each venue."
              />
              {costSummary ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-[#7C7671]">
                      <TrendingDown size={12} className="text-[#27AE60]" />
                      Lowest / head
                    </span>
                    <span className="font-semibold text-[#1A1817]">
                      {formatPeso(costSummary.lowestPerHead)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-[#7C7671]">
                      <Minus size={12} className="text-[#2A6558]" />
                      Average / head
                    </span>
                    <span className="font-semibold text-[#1A1817]">
                      {formatPeso(costSummary.avgPerHead)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-[#7C7671]">
                      <TrendingUp size={12} className="text-[#C0392B]" />
                      Highest / head
                    </span>
                    <span className="font-semibold text-[#1A1817]">
                      {formatPeso(costSummary.highestPerHead)}
                    </span>
                  </div>
                  <div className="rounded-2xl bg-[#1A1817] p-4 text-white">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7BC4B8]">
                      Total range
                    </p>
                    <p className="mt-2 text-xl font-extrabold">
                      {formatPeso(costSummary.lowestTotal)} - {formatPeso(costSummary.highestTotal)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#7C7671]">
                  Cost insights will appear after recommendations load.
                </p>
              )}
            </Panel>

            <Panel tone="dark">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7BC4B8]">
                AI summary
              </p>
              <h2 className="text-xl font-extrabold tracking-tight text-white">
                Planner note
              </h2>
              <p className="mt-1 text-sm text-white/65">
                Generated explanation for the current shortlist.
              </p>
              <p className="text-sm leading-relaxed text-white/80">
                {aiSummary ? (
                  aiSummary
                ) : (
                  <>
                    Click <strong className="text-[#7BC4B8]">View AI Insight</strong> on any
                    venue card to generate a personalized analysis.
                  </>
                )}
              </p>
            </Panel>

          </aside>
        </div>
      </main>

      {mapModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4 py-6">
          <div className="w-full max-w-6xl overflow-hidden rounded-2xl border border-[#E0DDD5] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#C8E0DA] bg-gradient-to-r from-[#EAF2F0] via-[#F5FAF8] to-[#EEF6F4] px-5 py-3.5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#2A6558]">
                  Expanded Map
                </p>
                <h3 className="text-sm font-semibold text-[#1A1817]">
                  {selectedEvent.city}
                  {selectedEvent.area ? `, ${selectedEvent.area}` : ""}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMapModalOpen(false)}
                className="inline-flex items-center justify-center rounded-lg border border-[#E0DDD5] p-2 text-[#7C7671] transition hover:border-[#2A6558] hover:text-[#2A6558]"
                aria-label="Close map"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4">
              <RecommendationsMap
                eventCity={selectedEvent.city}
                eventArea={selectedEvent.area}
                venues={mapVenues}
                maxVenues={12}
                mapStyle="mapbox://styles/mapbox/outdoors-v12"
                heightClassName="h-[70vh]"
                statusClassName="mt-2 text-xs text-[#7C7671]"
              />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function RecommendationsPage() {
  return (
    <Suspense fallback={<RecommendationsPageFallback />}>
      <RecommendationsPageContent />
    </Suspense>
  );
}

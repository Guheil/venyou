"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import VenueCard, { type Venue } from "@/components/VenueCard";
import RecommendationsMap from "@/components/RecommendationsMap";
import { useEventsContext } from "@/lib/EventsContext";
import { useToast } from "@/lib/ToastContext";
import { supabase } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import type { SavedEvent } from "@/lib/types";
import {
  Sparkles,
  SlidersHorizontal,
  MapPin,
  BarChart3,
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  Minus,
  Maximize2,
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
    tags: row.tags ?? [],
    aiNote: "Generating AI insight...",
    match: Math.max(0, Math.min(100, Math.round(Number(row.match_score ?? 0)))),
  };
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
  const { error: showError } = useToast();
  const { events, hydrated, getEvent, updateEvent } = useEventsContext();

  const [venues, setVenues] = useState<Venue[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [generatingAiInsights, setGeneratingAiInsights] = useState(false);
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
      setGeneratingAiInsights(false);

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
      setLoading(false);

      if (rows.length === 0) return;

      setGeneratingAiInsights(true);

      try {
        const payload = buildAiInsightsPayload(selectedEvent, rows);
        const insightResponse = await fetch("/api/recommendations/insights", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!active) return;

        if (!insightResponse.ok) {
          let detail = `Failed to generate Groq insights (${insightResponse.status}).`;
          try {
            const errorBody = (await insightResponse.json()) as { error?: unknown };
            if (typeof errorBody.error === "string" && errorBody.error.trim()) {
              detail = errorBody.error.trim();
            }
          } catch {
            // Keep default detail.
          }
          throw new Error(detail);
        }

        const insightData = (await insightResponse.json()) as unknown;
        if (!active) return;
        if (!isAiInsightsResponsePayload(insightData)) {
          throw new Error("Groq response format was invalid.");
        }

        const nextSummary = insightData.summary.trim();
        if (nextSummary) {
          setAiSummary(nextSummary);
        }

        const notesById = new Map(
          insightData.insights.map((entry) => [entry.id, entry.insight.trim()])
        );

        setVenues((current) =>
          current.map((venue) => {
            const nextNote = notesById.get(venue.id);
            return nextNote ? { ...venue, aiNote: nextNote } : venue;
          })
        );
        setGeneratingAiInsights(false);
      } catch (error) {
        if (!active) return;
        const detail =
          error instanceof Error && error.message.trim()
            ? error.message.trim()
            : "Groq insight generation failed.";
        console.error("[Recommendations] Groq insights error:", detail);
        setGeneratingAiInsights(false);
        setAiSummary(detail);
        setVenues((current) =>
          current.map((venue) => ({
            ...venue,
            aiNote: "Groq insight is unavailable right now. Please retry.",
          }))
        );
      }
    })();

    return () => {
      active = false;
    };
  }, [hydrated, selectedEvent, selectedEventId, showError]);

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
      topTags.push(`Under PHP ${costSummary.avgPerHead.toLocaleString()}/head`);
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

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl px-6 py-10 page-fade">
        <div className="mb-8">
          <Link
            href={backToEventHref}
            className="mb-4 inline-flex items-center gap-2 text-sm text-[#7C7671] hover:text-[#2A6558]"
          >
            <ArrowLeft size={15} /> Back to Event Details
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Sparkles size={18} className="text-[#2A6558]" />
                <span className="text-xs font-semibold uppercase tracking-widest text-[#2A6558]">
                  AI Recommendations
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#1A1817]">
                {loading ? "Generating matches..." : `${venues.length} Venues Found`}
              </h1>
              <p className="mt-1 text-sm text-[#7C7671]">
                Sorted by best fit and proximity - {eventSummary}
              </p>
            </div>

            <div className="flex items-center gap-2">
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
                className="rounded-xl border border-[#E0DDD5] bg-white px-3 py-2.5 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558] focus:ring-2 focus:ring-[#2A6558]/20"
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.eventName}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-[#E0DDD5] bg-white px-4 py-2.5 text-sm font-medium text-[#1A1817] transition hover:border-[#2A6558]"
              >
                <SlidersHorizontal size={15} /> Filter & Sort
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <aside className="flex flex-col gap-5 lg:col-span-1">
            <div className="rounded-2xl border border-[#E0DDD5] bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 size={15} className="text-[#2A6558]" />
                <h3 className="text-sm font-semibold text-[#1A1817]">
                  Cost Analysis
                </h3>
              </div>

              {costSummary ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-[#7C7671]">
                      <TrendingDown size={12} className="text-[#27AE60]" /> Lowest
                      / head
                    </span>
                    <span className="font-semibold text-[#1A1817]">
                      PHP {costSummary.lowestPerHead.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-[#7C7671]">
                      <Minus size={12} className="text-[#2A6558]" /> Average /
                      head
                    </span>
                    <span className="font-semibold text-[#1A1817]">
                      PHP {costSummary.avgPerHead.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-[#7C7671]">
                      <TrendingUp size={12} className="text-[#C0392B]" /> Highest
                      / head
                    </span>
                    <span className="font-semibold text-[#1A1817]">
                      PHP {costSummary.highestPerHead.toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t border-[#E0DDD5] pt-3">
                    <p className="mb-2 text-xs text-[#7C7671]">Total cost range</p>
                    <p className="text-sm font-bold text-[#1A1817]">
                      PHP {costSummary.lowestTotal.toLocaleString()} - PHP{" "}
                      {costSummary.highestTotal.toLocaleString()}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#7C7671]">
                  Cost insights will appear after recommendations load.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-[#E0DDD5] bg-white p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MapPin size={15} className="text-[#2A6558]" />
                  <h3 className="text-sm font-semibold text-[#1A1817]">Map View</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setMapModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E0DDD5] px-2.5 py-1 text-[11px] font-medium text-[#2A6558] transition hover:border-[#2A6558]"
                >
                  <Maximize2 size={12} />
                  View Map
                </button>
              </div>
              <p className="text-xs text-[#7C7671]">
                Open the full map to explore event location and nearby recommended venues.
              </p>
            </div>

            <div className="rounded-2xl bg-[#1A1817] p-5">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles size={14} className="text-[#7BC4B8]" />
                <span className="text-xs font-semibold uppercase tracking-widest text-[#7BC4B8]">
                  AI Summary
                </span>
              </div>
              <p className="text-sm leading-relaxed text-white/80">
                {generatingAiInsights ? (
                  "Generating Groq summary..."
                ) : aiSummary ? (
                  <>{aiSummary}</>
                ) : (
                  "Groq summary is unavailable right now."
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E0DDD5] bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold text-[#1A1817]">
                Quick Filters
              </h3>
              <div className="flex flex-wrap gap-2">
                {quickFilterTags.length > 0 ? (
                  quickFilterTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className="rounded-full border border-[#E0DDD5] px-3 py-1 text-xs font-medium text-[#7C7671] transition hover:border-[#2A6558] hover:text-[#2A6558]"
                    >
                      {tag}
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-[#7C7671]">
                    Filters will appear once matches are available.
                  </p>
                )}
              </div>
            </div>
          </aside>

          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-[#E0DDD5] bg-white">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A6558] border-t-transparent" />
              </div>
            ) : loadError ? (
              <div className="rounded-2xl border border-[#F2C5BE] bg-[#FDECEA] p-6">
                <p className="text-sm font-semibold text-[#C0392B]">{loadError}</p>
                <p className="mt-1 text-xs text-[#7C7671]">
                  Confirm the latest `supabase/schema.sql` has been applied, then
                  try again.
                </p>
              </div>
            ) : venues.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#E0DDD5] bg-white p-10 text-center">
                <p className="text-sm font-semibold text-[#1A1817]">
                  No venue matches yet
                </p>
                <p className="mt-1 text-xs text-[#7C7671]">
                  Add more venue rows to `public.venues` or broaden event
                  constraints.
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
          </div>
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

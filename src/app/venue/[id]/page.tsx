"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import {
  ArrowLeft,
  MapPin,
  Star,
  Users,
  DollarSign,
  Tag,
  CalendarCheck,
} from "lucide-react";

interface VenueDetailsRow {
  id: string;
  name: string;
  type: string;
  address: string;
  city: string;
  area: string;
  capacity: number;
  price_per_head: number;
  rating: number;
  review_count: number;
  setting: "indoor" | "outdoor" | "both";
  tags: string[] | null;
  description: string;
  image_color: string | null;
  base_distance_km: number;
}

export default function VenueDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();

  const rawId = params.id;
  const venueId =
    typeof rawId === "string"
      ? rawId
      : Array.isArray(rawId)
        ? rawId[0]
        : "";
  const eventId = searchParams.get("event");
  const backHref = eventId
    ? `${ROUTES.recommendations}?event=${encodeURIComponent(eventId)}`
    : ROUTES.recommendations;
  const hasVenueId = venueId.length > 0;

  const [loading, setLoading] = useState(hasVenueId);
  const [venue, setVenue] = useState<VenueDetailsRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isReservedByMe, setIsReservedByMe] = useState(false);
  const [isUnavailableForDate, setIsUnavailableForDate] = useState(false);
  const [reservationStateKey, setReservationStateKey] = useState<string | null>(null);
  const [reservedRef, setReservedRef] = useState<string | null>(null);

  // Pre-fill values loaded from the linked event
  const [prefillDate, setPrefillDate] = useState<string | undefined>();
  const [prefillStartTime, setPrefillStartTime] = useState<string | undefined>();
  const [prefillDurationHours, setPrefillDurationHours] = useState<number | undefined>();
  const [prefillGuestCount, setPrefillGuestCount] = useState<number | undefined>();

  useEffect(() => {
    if (!venueId) return;

    let active = true;

    void (async () => {
      setLoading(true);
      setLoadError(null);
      setPrefillDate(undefined);
      setPrefillStartTime(undefined);
      setPrefillDurationHours(undefined);
      setPrefillGuestCount(undefined);

      // Load venue details
      const { data, error } = await supabase
        .from("venues")
        .select(
          "id,name,type,address,city,area,capacity,price_per_head,rating,review_count,setting,tags,description,image_color,base_distance_km"
        )
        .eq("id", venueId)
        .eq("is_active", true)
        .maybeSingle();

      if (!active) return;

      if (error) {
        setVenue(null);
        setLoadError("Unable to load venue details right now.");
        setLoading(false);
        return;
      }

      if (!data) {
        setVenue(null);
        setLoadError("Venue not found.");
        setLoading(false);
        return;
      }

      setVenue(data as VenueDetailsRow);

      // If we have an event id, load its details for pre-fill.
      if (eventId && active) {
        const { data: eventData } = await supabase
          .from("events")
          .select("event_date,start_time,duration_hours,pax")
          .eq("id", eventId)
          .maybeSingle();

        if (!active) return;

        if (eventData) {
          setPrefillDate((eventData as { event_date: string }).event_date || undefined);
          setPrefillStartTime((eventData as { start_time: string }).start_time || undefined);
          setPrefillDurationHours((eventData as { duration_hours: number }).duration_hours);
          setPrefillGuestCount((eventData as { pax: number }).pax);
        }
      }

      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [venueId, eventId]);

  useEffect(() => {
    if (!venueId || !prefillDate || authLoading) return;

    let active = true;
    const nextReservationStateKey = eventId
      ? `${venueId}:${eventId}`
      : `${venueId}:${prefillDate}`;

    void (async () => {
      if (user) {
        let ownReservationQuery = supabase
          .from("venue_reservations")
          .select("reference_number")
          .eq("venue_id", venueId)
          .eq("user_id", user.id)
          .neq("reservation_status", "cancelled");

        ownReservationQuery = eventId
          ? ownReservationQuery.eq("event_id", eventId)
          : ownReservationQuery.eq("event_date", prefillDate);

        const { data: ownReservation } = await ownReservationQuery.maybeSingle();

        if (!active) return;

        if (ownReservation) {
          setReservationStateKey(nextReservationStateKey);
          setIsReservedByMe(true);
          setIsUnavailableForDate(false);
          setReservedRef(
            (ownReservation as { reference_number: string }).reference_number
          );
          return;
        }
      }

      const { data: existingReservation } = await supabase
        .from("venue_reservations")
        .select("id")
        .eq("venue_id", venueId)
        .eq("event_date", prefillDate)
        .neq("reservation_status", "cancelled")
        .maybeSingle();

      if (!active) return;

      setReservationStateKey(nextReservationStateKey);
      setIsReservedByMe(false);
      setIsUnavailableForDate(Boolean(existingReservation));
      setReservedRef(null);
    })();

    return () => {
      active = false;
    };
  }, [authLoading, eventId, prefillDate, user, venueId]);

  const reservationLookupKey = eventId
    ? `${venueId}:${eventId}`
    : prefillDate
      ? `${venueId}:${prefillDate}`
      : null;
  const showReservedState =
    reservationLookupKey != null &&
    reservationStateKey === reservationLookupKey &&
    isReservedByMe;
  const showUnavailableState =
    reservationLookupKey != null &&
    reservationStateKey === reservationLookupKey &&
    !showReservedState &&
    isUnavailableForDate;

  if (!hasVenueId) {
    return (
      <AppShell>
        <main className="mx-auto w-full max-w-3xl px-6 py-10">
          <Link
            href={backHref}
            className="mb-5 inline-flex items-center gap-2 text-sm text-[#7C7671] hover:text-[#2A6558]"
          >
            <ArrowLeft size={15} /> Back to Recommendations
          </Link>
          <div className="rounded-2xl border border-[#E0DDD5] bg-white p-8 text-center">
            <h1 className="mb-2 text-2xl font-extrabold text-[#1A1817]">
              Venue unavailable
            </h1>
            <p className="text-sm text-[#7C7671]">Invalid venue id.</p>
          </div>
        </main>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell>
        <main className="flex min-h-[60vh] items-center justify-center px-6 py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A6558] border-t-transparent" />
        </main>
      </AppShell>
    );
  }

  if (!venue) {
    return (
      <AppShell>
        <main className="mx-auto w-full max-w-3xl px-6 py-10">
          <Link
            href={backHref}
            className="mb-5 inline-flex items-center gap-2 text-sm text-[#7C7671] hover:text-[#2A6558]"
          >
            <ArrowLeft size={15} /> Back to Recommendations
          </Link>
          <div className="rounded-2xl border border-[#E0DDD5] bg-white p-8 text-center">
            <h1 className="mb-2 text-2xl font-extrabold text-[#1A1817]">
              Venue unavailable
            </h1>
            <p className="text-sm text-[#7C7671]">
              {loadError ?? "This venue could not be found."}
            </p>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-4xl px-6 py-10 page-fade">
        <Link
          href={backHref}
          className="mb-6 inline-flex items-center gap-2 text-sm text-[#7C7671] hover:text-[#2A6558]"
        >
          <ArrowLeft size={15} /> Back to Recommendations
        </Link>

        <div className="overflow-hidden rounded-2xl border border-[#E0DDD5] bg-white">
          <div
            className="h-52"
            style={{
              background:
                venue.image_color ||
                "linear-gradient(135deg, #BDD7D2 0%, #D6E8E4 100%)",
            }}
          />

          <div className="p-6 md:p-7">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-[#1A1817]">
                  {venue.name}
                </h1>
                <p className="mt-1 text-sm text-[#7C7671]">{venue.type}</p>
              </div>

              <div className="flex items-center gap-1 rounded-full bg-[#F8F6F1] px-3 py-1.5 text-sm font-medium text-[#1A1817]">
                <Star size={14} className="fill-amber-400 text-amber-400" />
                {venue.rating.toFixed(1)}
                <span className="text-xs text-[#7C7671]">
                  ({venue.review_count} reviews)
                </span>
              </div>
            </div>

            <div className="mb-5 grid gap-3 text-sm text-[#1A1817] md:grid-cols-2">
              <div className="flex items-center gap-2 rounded-xl border border-[#E0DDD5] bg-[#F8F6F1] px-3 py-2.5">
                <MapPin size={14} className="text-[#2A6558]" />
                <span>
                  {venue.address}
                  {venue.area ? ` (${venue.area})` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-[#E0DDD5] bg-[#F8F6F1] px-3 py-2.5">
                <Users size={14} className="text-[#2A6558]" />
                <span>Capacity: {venue.capacity.toLocaleString()} guests</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-[#E0DDD5] bg-[#F8F6F1] px-3 py-2.5">
                <DollarSign size={14} className="text-[#2A6558]" />
                <span>{`\u20B1${venue.price_per_head.toLocaleString()} per head`}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-[#E0DDD5] bg-[#F8F6F1] px-3 py-2.5">
                <Tag size={14} className="text-[#2A6558]" />
                <span>
                  Setting:{" "}
                  {venue.setting.charAt(0).toUpperCase() + venue.setting.slice(1)}
                </span>
              </div>
            </div>

            {venue.description && (
              <div className="mb-5 rounded-xl border border-[#E0DDD5] bg-[#FCFBF8] p-4">
                <p className="text-sm leading-relaxed text-[#44504C]">
                  {venue.description}
                </p>
              </div>
            )}

            {venue.tags && venue.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {venue.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[#E0DDD5] bg-white px-3 py-1 text-xs font-medium text-[#7C7671]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* ── Reserve CTA ── */}
            <div className="mt-6 border-t border-[#E0DDD5] pt-6">
              {showReservedState ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl bg-[#EAF2F0] border border-[#C8E0DA] p-5 text-center">
                  <CalendarCheck size={28} className="text-[#2A6558]" />
                  <p className="font-extrabold text-[#1A1817]">
                    This venue is already RESERVED
                  </p>
                  <p className="text-sm text-[#7C7671]">
                    Booking reference:{" "}
                    <span className="font-bold tracking-wider text-[#2A6558]">
                      {reservedRef}
                    </span>
                  </p>
                  <Link
                    href={ROUTES.reservations}
                    className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-[#2A6558] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#215249] transition-colors"
                  >
                    View My Reservations
                  </Link>
                </div>
              ) : showUnavailableState ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
                  <CalendarCheck size={28} className="text-amber-700" />
                  <p className="font-extrabold text-[#1A1817]">
                    This venue is unavailable for your selected date
                  </p>
                  <p className="text-sm text-[#7C7671]">
                    Another reservation already holds this slot. Choose a different
                    venue or adjust your event date.
                  </p>
                  <Link
                    href={backHref}
                    className="mt-1 inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-5 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                  >
                    Back to Recommendations
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-[#1A1817]">
                      Ready to book this venue?
                    </p>
                    <p className="mt-0.5 text-sm text-[#7C7671]">
                      Reserve it now — your slot is held for 30 minutes while you pay.
                    </p>
                  </div>
                  <Link
                    href={`/reserve/${venue.id}${(() => {
                      const p = new URLSearchParams();
                      if (eventId) p.set("event", eventId);
                      if (prefillDate) p.set("date", prefillDate);
                      if (prefillStartTime) p.set("time", prefillStartTime);
                      if (prefillDurationHours) p.set("duration", String(prefillDurationHours));
                      if (prefillGuestCount) p.set("guests", String(prefillGuestCount));
                      const qs = p.toString();
                      return qs ? `?${qs}` : "";
                    })()}`}
                    className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2A6558] px-6 py-3 text-sm font-semibold text-white shadow hover:bg-[#215249] transition-colors"
                  >
                    <CalendarCheck size={16} />
                    Reserve This Venue
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}

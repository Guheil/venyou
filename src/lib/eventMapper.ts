import type { SavedEvent } from "@/lib/types";

export interface EventRow {
  id: string;
  created_at: string;
  event_name: string;
  occasion: string;
  description: string;
  pax: number;
  budget_min: number;
  budget_max: number;
  budget_type: "per-head" | "total";
  city: string;
  area: string;
  radius_km: number;
  setting: "indoor" | "outdoor" | "both";
  event_date: string;
  start_time: string;
  duration_hours: number;
  amenities: string[];
  catering: "included" | "external" | "none";
  tone_keywords: string;
  extra_notes: string;
  status: "Draft" | "In Review" | "Confirmed";
  venue_count: number;
  top_venue_id: string | null;
  top_venue_name: string | null;
  user_id: string;
}

export function mapRowToSavedEvent(row: EventRow): SavedEvent {
  return {
    id: row.id,
    createdAt: row.created_at,
    eventName: row.event_name,
    occasion: row.occasion,
    description: row.description,
    pax: row.pax,
    budgetMin: row.budget_min,
    budgetMax: row.budget_max,
    budgetType: row.budget_type,
    city: row.city,
    area: row.area,
    radiusKm: row.radius_km,
    setting: row.setting,
    eventDate: row.event_date,
    startTime: row.start_time,
    durationHours: row.duration_hours,
    amenities: row.amenities ?? [],
    catering: row.catering,
    toneKeywords: row.tone_keywords,
    extraNotes: row.extra_notes,
    status: row.status,
    venueCount: row.venue_count,
    topVenueId: row.top_venue_id ?? undefined,
    topVenueName: row.top_venue_name ?? undefined,
  };
}

export function mapSavedEventToInsertRow(event: SavedEvent, userId: string): EventRow {
  return {
    id: event.id,
    created_at: event.createdAt,
    event_name: event.eventName,
    occasion: event.occasion,
    description: event.description,
    pax: event.pax,
    budget_min: event.budgetMin,
    budget_max: event.budgetMax,
    budget_type: event.budgetType,
    city: event.city,
    area: event.area,
    radius_km: event.radiusKm,
    setting: event.setting,
    event_date: event.eventDate,
    start_time: event.startTime,
    duration_hours: event.durationHours,
    amenities: event.amenities,
    catering: event.catering,
    tone_keywords: event.toneKeywords,
    extra_notes: event.extraNotes,
    status: event.status,
    venue_count: event.venueCount,
    top_venue_id: event.topVenueId ?? null,
    top_venue_name: event.topVenueName ?? null,
    user_id: userId,
  };
}

export function mapSavedEventPatchToRowPatch(
  patch: Partial<SavedEvent>
): Partial<EventRow> {
  const out: Partial<EventRow> = {};

  if (patch.eventName !== undefined) out.event_name = patch.eventName;
  if (patch.occasion !== undefined) out.occasion = patch.occasion;
  if (patch.description !== undefined) out.description = patch.description;
  if (patch.pax !== undefined) out.pax = patch.pax;
  if (patch.budgetMin !== undefined) out.budget_min = patch.budgetMin;
  if (patch.budgetMax !== undefined) out.budget_max = patch.budgetMax;
  if (patch.budgetType !== undefined) out.budget_type = patch.budgetType;
  if (patch.city !== undefined) out.city = patch.city;
  if (patch.area !== undefined) out.area = patch.area;
  if (patch.radiusKm !== undefined) out.radius_km = patch.radiusKm;
  if (patch.setting !== undefined) out.setting = patch.setting;
  if (patch.eventDate !== undefined) out.event_date = patch.eventDate;
  if (patch.startTime !== undefined) out.start_time = patch.startTime;
  if (patch.durationHours !== undefined) out.duration_hours = patch.durationHours;
  if (patch.amenities !== undefined) out.amenities = patch.amenities;
  if (patch.catering !== undefined) out.catering = patch.catering;
  if (patch.toneKeywords !== undefined) out.tone_keywords = patch.toneKeywords;
  if (patch.extraNotes !== undefined) out.extra_notes = patch.extraNotes;
  if (patch.status !== undefined) out.status = patch.status;
  if (patch.venueCount !== undefined) out.venue_count = patch.venueCount;
  if (patch.topVenueId !== undefined) out.top_venue_id = patch.topVenueId ?? null;
  if (patch.topVenueName !== undefined) out.top_venue_name = patch.topVenueName ?? null;

  return out;
}

// ─── Shared Types ──────────────────────────────────────────

export type BudgetType = "per-head" | "total";
export type VenueSetting = "indoor" | "outdoor" | "both";
export type CateringOption = "included" | "external" | "none";
export type EventStatus = "Draft" | "In Review" | "Confirmed";

export interface SavedEvent {
  id: string;
  createdAt: string; // ISO string

  // Step 1 – Basics
  eventName: string;
  occasion: string;
  description: string;

  // Step 2 – Guests & Budget
  pax: number;
  budgetMin: number;
  budgetMax: number;
  budgetType: BudgetType;

  // Step 3 – Location
  city: string;
  area: string;
  radiusKm: number;
  setting: VenueSetting;

  // Step 4 – Schedule
  eventDate: string;
  startTime: string;
  durationHours: number;

  // Step 5 – Details
  amenities: string[];
  catering: CateringOption;
  toneKeywords: string;
  extraNotes: string;

  // Meta
  status: EventStatus;
  venueCount: number;
  topVenueId?: string;
  topVenueName?: string;
}

export interface VenueResult {
  id: string;
  name: string;
  type: string;
  address: string;
  distance: number;
  capacity: number;
  rating: number;
  reviewCount: number;
  pricePerHead: number;
  totalEstimate: number;
  imageGradient: string;
  tags: string[];
  aiNote: string;
  match: number;
}

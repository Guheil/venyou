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
  imageUrl?: string;
  tags: string[];
  aiNote: string;
  match: number;
}

// ─── Venue Reservations ────────────────────────────────────

export type PaymentMethod = "cash" | "gcash";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type ReservationStatus = "pending_payment" | "confirmed" | "cancelled";

export interface VenueReservation {
  id: string;
  createdAt: string;
  updatedAt: string;

  userId: string;
  venueId: string;
  eventId: string | null;

  // When the event is happening
  eventDate: string; // ISO date string "YYYY-MM-DD"
  startTime: string;
  durationHours: number;

  // Guest & cost
  guestCount: number;
  pricePerHead: number;
  totalAmount: number;

  // Contact
  contactName: string;
  contactPhone: string;
  specialRequests: string;

  // Payment
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  gcashNumber: string | null;
  paymentReference: string | null;
  paymentProofUrl: string | null;
  adminPaymentType: "online" | "face_to_face" | null;

  // Status
  reservationStatus: ReservationStatus;
  referenceNumber: string;
  expiresAt: string | null;

  // Joined venue info (populated by queries)
  venueName?: string;
  venueAddress?: string;
  venueImageColor?: string;
  venueType?: string;
  venueGcashNumber?: string;
}

/** Shape returned by the Supabase SELECT with venue join */
export interface VenueReservationRow {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  venue_id: string;
  event_id: string | null;
  event_date: string;
  start_time: string;
  duration_hours: number;
  guest_count: number;
  price_per_head: number;
  total_amount: number;
  contact_name: string;
  contact_phone: string;
  special_requests: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  gcash_number: string | null;
  payment_reference: string | null;
  payment_proof_url: string | null;
  admin_payment_type: "online" | "face_to_face" | null;
  reservation_status: ReservationStatus;
  reference_number: string;
  expires_at: string | null;
  venues: {
    name: string;
    address: string;
    image_color: string | null;
    type: string;
    gcash_number?: string | null;
  } | {
    name: string;
    address: string;
    image_color: string | null;
    type: string;
    gcash_number?: string | null;
  }[] | null;
}

export function mapReservationRow(row: VenueReservationRow): VenueReservation {
  // Supabase may return the joined venue as an array (inferred) or as a single object
  const venueData = Array.isArray(row.venues) ? row.venues[0] ?? null : row.venues;
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
    venueId: row.venue_id,
    eventId: row.event_id,
    eventDate: row.event_date,
    startTime: row.start_time,
    durationHours: row.duration_hours,
    guestCount: row.guest_count,
    pricePerHead: row.price_per_head,
    totalAmount: row.total_amount,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    specialRequests: row.special_requests,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    gcashNumber: row.gcash_number,
    paymentReference: row.payment_reference,
    paymentProofUrl: row.payment_proof_url,
    adminPaymentType: row.admin_payment_type,
    reservationStatus: row.reservation_status,
    referenceNumber: row.reference_number,
    expiresAt: row.expires_at,
    venueName: venueData?.name,
    venueAddress: venueData?.address,
    venueImageColor: venueData?.image_color ?? undefined,
    venueType: venueData?.type,
    venueGcashNumber: venueData?.gcash_number ?? "",
  };
}

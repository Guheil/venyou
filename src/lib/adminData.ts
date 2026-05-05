import { formatPeso } from "@/lib/budget";

export type PaymentMethod = "cash" | "gcash";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type ReservationStatus = "pending_payment" | "confirmed" | "cancelled";
export type VenueSetting = "indoor" | "outdoor" | "both";
export type AdminEventStatus = "Draft" | "In Review" | "Confirmed";

export interface AdminProfile {
  user_id: string;
  role: "owner" | "manager" | "finance";
  display_name: string;
  is_active: boolean;
}

export interface AdminSummary {
  pending_requests: number;
  confirmed_reservations: number;
  cancelled_reservations: number;
  total_reserved_value: number;
  pending_value: number;
  active_venues: number;
  inactive_venues: number;
  upcoming_reservations: number;
  cash_pending: number;
  gcash_pending: number;
  total_events: number;
}

export const emptyAdminSummary: AdminSummary = {
  pending_requests: 0,
  confirmed_reservations: 0,
  cancelled_reservations: 0,
  total_reserved_value: 0,
  pending_value: 0,
  active_venues: 0,
  inactive_venues: 0,
  upcoming_reservations: 0,
  cash_pending: 0,
  gcash_pending: 0,
  total_events: 0,
};

export const RESERVATION_SELECT = `
  id, created_at, updated_at, user_id, venue_id, event_id,
  event_date, start_time, duration_hours,
  guest_count, price_per_head, total_amount,
  contact_name, contact_phone, special_requests,
  payment_method, payment_status, gcash_number,
  payment_reference, reservation_status, reference_number,
  expires_at, payment_confirmed_at, admin_note,
  payment_proof_url, admin_payment_type,
  venues ( name, type, address, city, area, image_color ),
  events ( event_name, occasion, city )
`;

export const VENUE_SELECT = `
  id, created_at, updated_at, name, type, address, city, area,
  capacity, price_per_head, rating, review_count, setting,
  tags, description, image_color, image_url, base_distance_km, is_active
`;

export const EVENT_SELECT = `
  id, created_at, updated_at, user_id, event_name, occasion, description,
  pax, budget_min, budget_max, budget_type, city, area, radius_km,
  setting, event_date, start_time, duration_hours, amenities, catering,
  tone_keywords, extra_notes, status, venue_count, top_venue_id, top_venue_name
`;

interface ReservationVenueJoin {
  name: string;
  type: string;
  address: string;
  city: string;
  area: string;
  image_color: string | null;
}

interface ReservationEventJoin {
  event_name: string | null;
  occasion: string | null;
  city: string | null;
}

export interface AdminReservationRow {
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
  reservation_status: ReservationStatus;
  reference_number: string;
  expires_at: string | null;
  payment_confirmed_at: string | null;
  admin_note: string | null;
  payment_proof_url: string | null;
  admin_payment_type: "online" | "face_to_face" | null;
  venues: ReservationVenueJoin | ReservationVenueJoin[] | null;
  events: ReservationEventJoin | ReservationEventJoin[] | null;
}

export interface AdminReservation {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  venueId: string;
  eventId: string | null;
  eventDate: string;
  startTime: string;
  durationHours: number;
  guestCount: number;
  pricePerHead: number;
  totalAmount: number;
  contactName: string;
  contactPhone: string;
  specialRequests: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  gcashNumber: string | null;
  paymentReference: string | null;
  reservationStatus: ReservationStatus;
  referenceNumber: string;
  expiresAt: string | null;
  paymentConfirmedAt: string | null;
  adminNote: string;
  paymentProofUrl: string | null;
  adminPaymentType: "online" | "face_to_face" | null;
  venueName: string;
  venueType: string;
  venueAddress: string;
  venueCity: string;
  venueArea: string;
  venueImageColor?: string;
  eventName: string;
  eventOccasion: string;
  eventCity: string;
}

export interface AdminVenueRow {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  type: string;
  address: string;
  city: string;
  area: string;
  capacity: number;
  price_per_head: number;
  rating: number;
  review_count: number;
  setting: VenueSetting;
  tags: string[];
  description: string;
  image_color: string;
  image_url: string;
  base_distance_km: number;
  is_active: boolean;
}

export interface AdminVenue {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  type: string;
  address: string;
  city: string;
  area: string;
  capacity: number;
  pricePerHead: number;
  rating: number;
  reviewCount: number;
  setting: VenueSetting;
  tags: string[];
  description: string;
  imageColor: string;
  imageUrl: string;
  baseDistanceKm: number;
  isActive: boolean;
}

export interface AdminEventRow {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  creator_full_name?: string | null;
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
  setting: VenueSetting;
  event_date: string;
  start_time: string;
  duration_hours: number;
  amenities: string[];
  catering: "included" | "external" | "none";
  tone_keywords: string;
  extra_notes: string;
  status: AdminEventStatus;
  venue_count: number;
  top_venue_id: string | null;
  top_venue_name: string | null;
}

export interface AdminEvent {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  creatorFullName?: string | null;
  eventName: string;
  occasion: string;
  description: string;
  pax: number;
  budgetMin: number;
  budgetMax: number;
  budgetType: "per-head" | "total";
  city: string;
  area: string;
  radiusKm: number;
  setting: VenueSetting;
  eventDate: string;
  startTime: string;
  durationHours: number;
  amenities: string[];
  catering: "included" | "external" | "none";
  toneKeywords: string;
  extraNotes: string;
  status: AdminEventStatus;
  venueCount: number;
  topVenueId: string | null;
  topVenueName: string | null;
}

function takeFirst<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function mapReservationRow(row: AdminReservationRow): AdminReservation {
  const venue = takeFirst(row.venues);
  const event = takeFirst(row.events);

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
    reservationStatus: row.reservation_status,
    referenceNumber: row.reference_number,
    expiresAt: row.expires_at,
    paymentConfirmedAt: row.payment_confirmed_at,
    adminNote: row.admin_note ?? "",
    paymentProofUrl: row.payment_proof_url,
    adminPaymentType: row.admin_payment_type,
    venueName: venue?.name ?? "Venue",
    venueType: venue?.type ?? "Venue",
    venueAddress: venue?.address ?? "",
    venueCity: venue?.city ?? "",
    venueArea: venue?.area ?? "",
    venueImageColor: venue?.image_color ?? undefined,
    eventName: event?.event_name ?? "Untitled event",
    eventOccasion: event?.occasion ?? "Event",
    eventCity: event?.city ?? "",
  };
}

export function mapVenueRow(row: AdminVenueRow): AdminVenue {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    name: row.name,
    type: row.type,
    address: row.address,
    city: row.city,
    area: row.area,
    capacity: row.capacity,
    pricePerHead: row.price_per_head,
    rating: Number(row.rating),
    reviewCount: row.review_count,
    setting: row.setting,
    tags: row.tags ?? [],
    description: row.description,
    imageColor: row.image_color,
    imageUrl: row.image_url,
    baseDistanceKm: Number(row.base_distance_km),
    isActive: row.is_active,
  };
}

export function mapEventRow(row: AdminEventRow): AdminEvent {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
    creatorFullName: row.creator_full_name ?? null,
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
    topVenueId: row.top_venue_id,
    topVenueName: row.top_venue_name,
  };
}

export function formatAdminDate(value: string) {
  if (!value) return "Not set";

  return new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatAdminDateTime(value: string) {
  if (!value) return "Not set";

  return new Date(value).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatAdminTime(value: string) {
  if (!value) return "Not set";

  const [hourPart, minutePart] = value.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart ?? "0");
  if (Number.isNaN(hour) || Number.isNaN(minute)) return value;

  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatAdminEventBudget(event: AdminEvent) {
  if (event.budgetType === "per-head") {
    return `${formatPeso(event.budgetMin)} - ${formatPeso(event.budgetMax)} per head`;
  }

  return `${formatPeso(event.budgetMin)} - ${formatPeso(event.budgetMax)} total`;
}

export function formatAdminCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
  }).format(value);
}

export function reservationStatusLabel(status: ReservationStatus) {
  if (status === "pending_payment") return "Pending";
  if (status === "confirmed") return "Confirmed";
  return "Cancelled";
}

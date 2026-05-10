"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import type { PaymentMethod } from "@/lib/types";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Users,
  Star,
  Calendar,
  Clock,
  Phone,
  User,
  MessageSquare,
  Banknote,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
  CalendarCheck,
  Upload,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface VenueRow {
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
  setting: string;
  tags: string[] | null;
  description: string;
  image_color: string | null;
  image_url: string | null;
  gcash_number: string;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const TIME_OPTIONS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00",
].map((t) => {
  const hour = parseInt(t.split(":")[0], 10);
  const label =
    hour === 0 ? "12:00 AM"
    : hour < 12 ? `${hour}:00 AM`
    : hour === 12 ? "12:00 PM"
    : `${hour - 12}:00 PM`;
  return { value: t, label };
});

const DURATION_OPTIONS = [2, 3, 4, 5, 6, 8, 10, 12].map((h) => ({
  value: h,
  label: `${h} hour${h > 1 ? "s" : ""}`,
}));

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function today(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
}

function formatPeso(n: number): string {
  return `₱${n.toLocaleString("en-PH")}`;
}

function timeLabel(t: string): string {
  return TIME_OPTIONS.find((o) => o.value === t)?.label ?? t;
}

function digitsOnly(value: string, maxLength = 11): string {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function isPhilippineMobile(value: string): boolean {
  return /^09\d{9}$/.test(value);
}

function formatMobile(value: string): string {
  const digits = digitsOnly(value);
  if (digits.length !== 11) return value;
  return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
}

// ─────────────────────────────────────────────────────────────
// Step indicator
// ─────────────────────────────────────────────────────────────
const STEPS = ["Your Details", "Payment", "Admin Review"];

function StepBar({ current }: { current: number }) {
  return (
    <div className="mb-8 flex items-center">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all ${
                  done
                    ? "bg-[#2A6558] text-white"
                    : active
                    ? "bg-[#1A1817] text-white shadow-lg"
                    : "bg-[#F0EEEA] text-[#B0ABA5] border border-[#E0DDD5]"
                }`}
              >
                {done ? <Check size={15} /> : n}
              </div>
              <span
                className={`text-xs font-semibold whitespace-nowrap ${
                  active ? "text-[#1A1817]" : done ? "text-[#2A6558]" : "text-[#B0ABA5]"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mb-5 mx-2 h-px flex-1 transition-all ${
                  done ? "bg-[#2A6558]" : "bg-[#E0DDD5]"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Small reusable pieces
// ─────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#E0DDD5] bg-white p-6">
      <h2 className="mb-5 text-base font-extrabold text-[#1A1817]">{title}</h2>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  icon,
  hint,
  required,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-sm font-semibold text-[#1A1817]">
        {icon && <span className="text-[#2A6558]">{icon}</span>}
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-[#7C7671]">{hint}</p>}
    </div>
  );
}

function Input({
  type = "text",
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      {...rest}
      className={`w-full rounded-xl border border-[#E0DDD5] bg-[#F8F6F1] px-4 py-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558] focus:bg-white focus:ring-2 focus:ring-[#2A6558]/10 placeholder:text-[#B0ABA5] ${rest.className ?? ""}`}
    />
  );
}

function Select({
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={`w-full rounded-xl border border-[#E0DDD5] bg-[#F8F6F1] px-4 py-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558] focus:bg-white focus:ring-2 focus:ring-[#2A6558]/10 ${rest.className ?? ""}`}
    >
      {children}
    </select>
  );
}

function SummaryRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-[#F0EEEA] last:border-0">
      <span className="text-sm text-[#7C7671] shrink-0">{label}</span>
      <span className={`text-sm text-right ${bold ? "font-extrabold text-[#2A6558] text-base" : "font-semibold text-[#1A1817]"}`}>
        {value}
      </span>
    </div>
  );
}

function PayMethodCard({
  selected,
  onClick,
  icon,
  title,
  desc,
  badge,
  disabled = false,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col gap-3 rounded-2xl border-2 p-5 text-left transition-all ${
        disabled
          ? "cursor-not-allowed border-[#E0DDD5] bg-[#F8F6F1] opacity-70"
          : selected
          ? "border-[#2A6558] bg-[#EAF2F0] shadow-md"
          : "border-[#E0DDD5] bg-white hover:border-[#2A6558]/50 hover:shadow-sm"
      }`}
    >
      {badge && (
        <span className="absolute right-4 top-4 rounded-full bg-[#2A6558]/10 px-2 py-0.5 text-[10px] font-bold text-[#2A6558]">
          {badge}
        </span>
      )}
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm border border-[#E0DDD5]">
          {icon}
        </div>
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
            selected ? "border-[#2A6558] bg-[#2A6558]" : "border-[#D0CCC7]"
          }`}
        >
          {selected && <Check size={11} className="text-white" />}
        </div>
      </div>
      <div>
        <p className="font-bold text-[#1A1817]">{title}</p>
        <p className="mt-0.5 text-xs text-[#7C7671] leading-relaxed">{desc}</p>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
export default function ReserveVenuePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawId = params.venueId;
  const venueId = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";

  // Query params for pre-fill
  const eventId = searchParams.get("event");
  const qDate = searchParams.get("date") ?? "";
  const qTime = searchParams.get("time") ?? "10:00";
  const qDuration = parseInt(searchParams.get("duration") ?? "4", 10);
  const qGuests = searchParams.get("guests") ?? "";

  // Back links
  const backToVenueHref = eventId
    ? `/venue/${venueId}?event=${encodeURIComponent(eventId)}`
    : `/venue/${venueId}`;
  const backToRecsHref = eventId
    ? `${ROUTES.recommendations}?event=${encodeURIComponent(eventId)}`
    : ROUTES.recommendations;

  // Venue loading
  const [venue, setVenue] = useState<VenueRow | null>(null);
  const [venueLoading, setVenueLoading] = useState(true);
  const [venueError, setVenueError] = useState<string | null>(null);

  // ── Step 1 state ──
  const [eventDate, setEventDate] = useState(qDate);
  const [startTime, setStartTime] = useState(qTime || "10:00");
  const [durationHours, setDurationHours] = useState(isNaN(qDuration) ? 4 : qDuration);
  const [guestCount, setGuestCount] = useState(qGuests);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  // ── Step 2 state ──
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [gcashNumber, setGcashNumber] = useState("");

  // ── Time-slot availability (blocks only if times overlap) ──
  const [timeConflict, setTimeConflict] = useState(false);
  const [checkingDate, setCheckingDate] = useState(false);

  // ── Active reservation check (one reservation per event) ──
  const [hasActiveReservation, setHasActiveReservation] = useState(false);
  const [activeReservationVenue, setActiveReservationVenue] = useState<string | null>(null);

  // ── GCash proof of payment ──
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [proofFileName, setProofFileName] = useState<string | null>(null);

  // ── Flow state ──
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  // ── Success state ──
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedGcash, setCopiedGcash] = useState(false);

  const guestsNum = parseInt(guestCount, 10);
  const totalAmount = venue && !isNaN(guestsNum) && guestsNum > 0
    ? guestsNum * venue.price_per_head
    : 0;
  const venueGcashNumber = venue?.gcash_number ?? "";
  const canPayWithGcash = isPhilippineMobile(venueGcashNumber);

  // Load venue
  useEffect(() => {
    if (!venueId) { setVenueError("Invalid venue."); setVenueLoading(false); return; }
    let active = true;
    void (async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("id,name,type,address,city,area,capacity,price_per_head,rating,review_count,setting,tags,description,image_color,image_url,gcash_number")
        .eq("id", venueId)
        .eq("is_active", true)
        .maybeSingle();
      if (!active) return;
      if (error || !data) { setVenueError("Venue not found."); setVenueLoading(false); return; }
      setVenue(data as VenueRow);
      setVenueLoading(false);
    })();
    return () => { active = false; };
  }, [venueId]);

  // Check time-slot availability (venue + date + time overlap across all users)
  useEffect(() => {
    if (!venueId || !eventDate) { setTimeConflict(false); return; }
    let active = true;
    setCheckingDate(true);
    void (async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("venue_reservations")
        .select("start_time, duration_hours")
        .eq("venue_id", venueId)
        .eq("event_date", eventDate)
        .neq("reservation_status", "cancelled")
        .or(`expires_at.is.null,expires_at.gt.${now}`);
      if (!active) return;
      if (!data || data.length === 0) {
        setTimeConflict(false);
        setCheckingDate(false);
        return;
      }
      // Convert selected time to minutes-from-midnight for arithmetic
      const [sh, sm] = startTime.split(":").map(Number);
      const newStart = sh * 60 + (sm || 0);
      const newEnd = newStart + durationHours * 60;
      const hasOverlap = data.some((r) => {
        const [eh, em] = (r.start_time as string).split(":").map(Number);
        const existStart = eh * 60 + (em || 0);
        const existEnd = existStart + (r.duration_hours as number) * 60;
        // Overlap: new starts before existing ends AND new ends after existing starts
        return newStart < existEnd && newEnd > existStart;
      });
      setTimeConflict(hasOverlap);
      setCheckingDate(false);
    })();
    return () => { active = false; };
  }, [venueId, eventDate, startTime, durationHours]);

  // Check if user already has an active reservation for this event
  useEffect(() => {
    if (!eventId) { setHasActiveReservation(false); return; }
    let active = true;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      const { data } = await supabase
        .from("venue_reservations")
        .select("id, venue_id, venues(name)")
        .eq("user_id", user.id)
        .eq("event_id", eventId)
        .neq("reservation_status", "cancelled")
        .limit(1);
      if (!active) return;
      if (data && data.length > 0) {
        setHasActiveReservation(true);
        const venueJoin = (data[0] as Record<string, unknown>).venues;
        const vName = Array.isArray(venueJoin)
          ? (venueJoin[0] as Record<string, unknown>)?.name
          : (venueJoin as Record<string, unknown>)?.name;
        setActiveReservationVenue((vName as string) || "another venue");
      } else {
        setHasActiveReservation(false);
        setActiveReservationVenue(null);
      }
    })();
    return () => { active = false; };
  }, [eventId]);

  // ── Step 1 submit → create reservation ──
  const handleStep1 = async () => {
    setFieldError(null);

    if (!eventDate) { setFieldError("Please pick the date of your event."); return; }
    if (eventDate < today()) { setFieldError("The event date can't be in the past. Please choose a future date."); return; }
    if (timeConflict) { setFieldError("This time slot overlaps with an existing reservation. Please choose a different start time or duration."); return; }
    if (hasActiveReservation) { setFieldError(`You already have an active reservation for this event at ${activeReservationVenue}. Please cancel it first before making a new reservation.`); return; }
    if (!guestCount || isNaN(guestsNum) || guestsNum < 1) {
      setFieldError("Please enter how many guests will be attending."); return;
    }
    if (venue && guestsNum > venue.capacity) {
      setFieldError(`This venue can only accommodate up to ${venue.capacity.toLocaleString()} guests. Please lower your guest count or choose a bigger venue.`);
      return;
    }
    if (!contactName.trim()) { setFieldError("Please enter the full name of the reservation holder."); return; }
    if (!contactPhone.trim()) { setFieldError("Please enter a Philippine mobile number (e.g. 0917-123-4567)."); return; }
    const digits = digitsOnly(contactPhone);
    if (!isPhilippineMobile(digits)) {
      setFieldError("That doesn't look like a valid number. Philippine mobile numbers are 11 digits (e.g. 0917-123-4567).");
      return;
    }
    if (paymentMethod === "gcash" && !canPayWithGcash) {
      setFieldError("This venue does not have a GCash receiving number yet. Please choose cash or contact the admin.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId,
          eventId: eventId ?? null,
          eventDate,
          startTime,
          durationHours,
          guestCount: guestsNum,
          pricePerHead: venue!.price_per_head,
          totalAmount,
          contactName: contactName.trim(),
          contactPhone: digits,
          specialRequests: specialRequests.trim(),
          paymentMethod,
        }),
      });

      const json = (await res.json()) as {
        reservationId?: string;
        referenceNumber?: string;
        conflict?: boolean;
        error?: string;
      };

      if (!res.ok) {
        setFieldError(json.error ?? "Something went wrong. Please try again.");
        return;
      }

      setReservationId(json.reservationId ?? null);
      setReferenceNumber(json.referenceNumber ?? "");
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setFieldError("Network error. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  // ── Step 2 submit → confirm payment ──
  const handlePayment = async () => {
    setFieldError(null);
    let normalizedGcashNumber = "";

    if (paymentMethod === "gcash") {
      if (!canPayWithGcash) {
        setFieldError("This venue does not have a GCash receiving number yet. Please choose cash or contact the admin.");
        return;
      }
      const d = digitsOnly(gcashNumber);
      if (!isPhilippineMobile(d)) {
        setFieldError("Please enter the mobile number linked to your GCash account (e.g. 0917-123-4567).");
        return;
      }
      normalizedGcashNumber = d;
      if (!proofImage) {
        setFieldError("Please upload a screenshot of your GCash payment receipt before confirming your booking.");
        return;
      }
    }
    if (!reservationId) { setFieldError("Missing reservation ID. Please go back and try again."); return; }

    setBusy(true);
    try {
      const res = await fetch(`/api/reservations/${reservationId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod,
          gcashNumber: normalizedGcashNumber,
          proofImageBase64: proofImage ?? undefined,
        }),
      });

      const json = (await res.json()) as {
        success?: boolean;
        paymentReference?: string;
        error?: string;
      };

      if (!res.ok) { setFieldError(json.error ?? "Payment failed. Please try again."); return; }

      setPaymentRef(json.paymentReference ?? "");
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setFieldError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleCopyRef = () => {
    void navigator.clipboard.writeText(referenceNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleCopyGcashNumber = () => {
    if (!venueGcashNumber) return;
    void navigator.clipboard.writeText(venueGcashNumber).then(() => {
      setCopiedGcash(true);
      setTimeout(() => setCopiedGcash(false), 2500);
    });
  };

  const handleGoBack = () => {
    setFieldError(null);
    setStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Loading / error screens ──
  if (venueLoading) {
    return (
      <AppShell>
        <main className="flex min-h-[60vh] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A6558] border-t-transparent" />
        </main>
      </AppShell>
    );
  }

  if (!venue || venueError) {
    return (
      <AppShell>
        <main className="mx-auto w-full max-w-2xl px-6 py-12 text-center">
          <div className="rounded-2xl border border-[#E0DDD5] bg-white p-10">
            <p className="text-lg font-extrabold text-[#1A1817]">Venue not found</p>
            <p className="mt-1 text-sm text-[#7C7671]">{venueError}</p>
            <Link href={backToRecsHref} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#2A6558] px-5 py-2.5 text-sm font-semibold text-white">
              Back to Recommendations
            </Link>
          </div>
        </main>
      </AppShell>
    );
  }

  const bannerBg = venue.image_color || "linear-gradient(135deg, #BDD7D2 0%, #D6E8E4 100%)";

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <AppShell>
      <main className="mx-auto w-full max-w-2xl px-4 py-10 page-fade">

        {/* Back link */}
        <Link
          href={backToVenueHref}
          className="mb-6 inline-flex items-center gap-2 text-sm text-[#7C7671] hover:text-[#2A6558] transition-colors"
        >
          <ArrowLeft size={15} /> Back to Venue
        </Link>

        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1A1817]">
            {step === 3
              ? "Payment Submitted for Review"
              : "Reserve a Venue"}
          </h1>
          <p className="mt-1 text-sm text-[#7C7671]">
            {step === 3
              ? "An admin will verify your payment details before the venue is marked as reserved."
              : "Fill in your details below and complete payment to lock in your spot."}
          </p>
        </div>

        {/* Step bar */}
        <StepBar current={step} />

        <div className="space-y-5">

          {/* ────────────────── Venue preview card (steps 1 & 2) ────────────────── */}
          {step < 3 && (
            <div className="overflow-hidden rounded-2xl border border-[#E0DDD5] bg-white">
              <div className="relative h-24 overflow-hidden" style={{ background: bannerBg }}>
                {venue.image_url && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={venue.image_url}
                      alt={venue.name}
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
                  </>
                )}
              </div>
              <div className="flex items-start justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <h2 className="truncate font-extrabold text-[#1A1817]">{venue.name}</h2>
                  <p className="mt-0.5 text-xs text-[#7C7671]">{venue.type}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#7C7671]">
                    <span className="flex items-center gap-1">
                      <MapPin size={11} className="text-[#2A6558]" /> {venue.address}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={11} /> Up to {venue.capacity.toLocaleString()} guests
                    </span>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-1 rounded-full bg-[#F8F6F1] px-3 py-1.5 text-sm font-semibold text-[#1A1817]">
                  <Star size={13} className="fill-amber-400 text-amber-400" />
                  {venue.rating.toFixed(1)}
                </div>
              </div>
              <div className="border-t border-[#F0EEEA] px-5 py-3 flex items-center justify-between">
                <span className="text-xs text-[#7C7671]">Price per head</span>
                <span className="text-sm font-bold text-[#2A6558]">{formatPeso(venue.price_per_head)}</span>
              </div>
            </div>
          )}

          {/* ══════════════════ STEP 1 — Your Details ══════════════════ */}
          {step === 1 && (
            <>
              {/* Active reservation blocker */}
              {hasActiveReservation && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      You already have an active reservation
                    </p>
                    <p className="mt-1 text-xs text-amber-700 leading-relaxed">
                      You&apos;ve already reserved <strong>{activeReservationVenue}</strong> for this event. To book a different venue, please cancel your existing reservation first.
                    </p>
                    <Link
                      href={ROUTES.reservations}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 underline hover:text-amber-900"
                    >
                      Go to My Reservations
                    </Link>
                  </div>
                </div>
              )}

              {/* Live cost preview */}
              {totalAmount > 0 && (
                <div className="rounded-2xl border border-[#C8E0DA] bg-[#EAF2F0] px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#2A6558] font-semibold">Estimated Total</p>
                    <p className="text-2xl font-extrabold text-[#1A1817]">{formatPeso(totalAmount)}</p>
                  </div>
                  <div className="text-right text-xs text-[#7C7671]">
                    <p>{formatPeso(venue.price_per_head)} × {guestsNum} guests</p>
                    <p className="mt-0.5 text-[#2A6558] font-semibold">Updates as you type</p>
                  </div>
                </div>
              )}

              <Section title="When is your event?">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Event Date" icon={<Calendar size={15} />} required>
                    <Input
                      type="date"
                      min={today()}
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                    />
                  </Field>
                  <Field label="Start Time" icon={<Clock size={15} />} required>
                    <Select value={startTime} onChange={(e) => setStartTime(e.target.value)}>
                      {TIME_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </Select>
                    {checkingDate && eventDate && (
                      <p className="text-xs text-[#7C7671] flex items-center gap-1 mt-1">
                        <Loader2 size={11} className="animate-spin" /> Checking availability…
                      </p>
                    )}
                    {timeConflict && !checkingDate && (
                      <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                        <AlertTriangle size={11} /> This time slot is already booked. Try a different time or duration.
                      </p>
                    )}
                  </Field>
                </div>
                <Field
                  label="How long will the event run?"
                  icon={<Clock size={15} />}
                  hint="Choose the total number of hours you'll need the venue."
                  required
                >
                  <div className="grid grid-cols-4 gap-2">
                    {DURATION_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setDurationHours(o.value)}
                        className={`rounded-xl border py-2.5 text-sm font-semibold transition-all ${
                          durationHours === o.value
                            ? "border-[#2A6558] bg-[#2A6558] text-white"
                            : "border-[#E0DDD5] bg-white text-[#44504C] hover:border-[#2A6558]/50"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </Field>
              </Section>

              <Section title="How many guests?">
                <Field
                  label="Number of Guests"
                  icon={<Users size={15} />}
                  hint={`Maximum capacity for this venue is ${venue.capacity.toLocaleString()} guests.`}
                  required
                >
                  <Input
                    type="number"
                    min={1}
                    max={venue.capacity}
                    placeholder={`e.g. 100 (max ${venue.capacity.toLocaleString()})`}
                    value={guestCount}
                    onChange={(e) => setGuestCount(e.target.value)}
                  />
                </Field>
                {/* Capacity bar */}
                {!isNaN(guestsNum) && guestsNum > 0 && (
                  <div>
                    <div className="h-2 w-full rounded-full bg-[#F0EEEA] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          guestsNum > venue.capacity ? "bg-red-400" : "bg-[#2A6558]"
                        }`}
                        style={{ width: `${Math.min(100, (guestsNum / venue.capacity) * 100)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-[#7C7671]">
                      {guestsNum > venue.capacity
                        ? `⚠️ Exceeds capacity by ${(guestsNum - venue.capacity).toLocaleString()} guests`
                        : `${guestsNum.toLocaleString()} of ${venue.capacity.toLocaleString()} seats used (${Math.round((guestsNum / venue.capacity) * 100)}%)`}
                    </p>
                  </div>
                )}
              </Section>

              <Section title="Contact Information">
                <p className="text-sm text-[#7C7671] -mt-2">
                  We&apos;ll use these details to confirm your reservation.
                </p>
                <Field
                  label="Full Name"
                  icon={<User size={15} />}
                  hint="Enter your complete name as the reservation holder."
                  required
                >
                  <Input
                    placeholder="e.g. Juan dela Cruz"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                  />
                </Field>
                <Field
                  label="Mobile Number"
                  icon={<Phone size={15} />}
                  hint="Philippine mobile number, e.g. 0917-123-4567"
                  required
                >
                  <Input
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="09XX-XXX-XXXX"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(digitsOnly(e.target.value))}
                  />
                </Field>
              </Section>

              <Section title="Special Requests">
                <Field
                  label="Anything the venue should know?"
                  icon={<MessageSquare size={15} />}
                  hint="Optional — e.g. dietary needs, setup requirements, accessibility needs."
                >
                  <textarea
                    rows={4}
                    placeholder="e.g. Need a vegetarian menu option and a projector screen set up facing the main entrance."
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    className="w-full rounded-xl border border-[#E0DDD5] bg-[#F8F6F1] px-4 py-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558] focus:bg-white focus:ring-2 focus:ring-[#2A6558]/10 placeholder:text-[#B0ABA5] resize-none"
                  />
                </Field>
              </Section>
            </>
          )}

          {/* ══════════════════ STEP 2 — Payment ══════════════════ */}
          {step === 2 && (
            <>
              {/* Booking summary */}
              <Section title="Booking Summary">
                <SummaryRow label="Venue" value={venue.name} />
                <SummaryRow label="Date" value={formatDate(eventDate)} />
                <SummaryRow label="Start Time" value={timeLabel(startTime)} />
                <SummaryRow label="Duration" value={`${durationHours} hour${durationHours > 1 ? "s" : ""}`} />
                <SummaryRow label="Guests" value={`${guestsNum.toLocaleString()} people`} />
                <SummaryRow label="Contact" value={contactName} />
                <SummaryRow label="Phone" value={contactPhone} />
                {specialRequests && <SummaryRow label="Requests" value={specialRequests} />}
                <SummaryRow label="Total Amount" value={formatPeso(totalAmount)} bold />
              </Section>

              {/* Payment method */}
              <Section title="How would you like to pay?">
                <p className="text-sm text-[#7C7671] -mt-2">
                  Submit your payment details now. Your request goes to the admin desk first, then becomes a reserved event after payment is confirmed.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <PayMethodCard
                    selected={paymentMethod === "cash"}
                    onClick={() => setPaymentMethod("cash")}
                    icon={<Banknote size={22} className="text-[#2A6558]" />}
                    title="Pay with Cash"
                    desc="Use a cash reference for admin verification after payment is received."
                    badge="Manual check"
                  />
                  <PayMethodCard
                    selected={paymentMethod === "gcash"}
                    onClick={() => {
                      if (!canPayWithGcash) {
                        setFieldError("This venue does not have a GCash receiving number yet. Please choose cash or contact the admin.");
                        return;
                      }
                      setFieldError(null);
                      setPaymentMethod("gcash");
                    }}
                    disabled={!canPayWithGcash}
                    icon={<Smartphone size={22} className="text-blue-500" />}
                    title="Pay via GCash"
                    desc={
                      canPayWithGcash
                        ? "Send payment to this venue's GCash number, then upload your receipt."
                        : "GCash is unavailable until this venue has a receiving number."
                    }
                    badge={canPayWithGcash ? "Proof required" : "Not configured"}
                  />
                </div>

                {paymentMethod === "gcash" && (
                  <>
                    <Field
                      label="Your GCash Number"
                      icon={<Smartphone size={15} />}
                      hint="Enter the mobile number registered to your GCash account."
                      required
                    >
                      <Input
                        type="tel"
                        inputMode="numeric"
                        maxLength={11}
                        placeholder="09XX-XXX-XXXX"
                        value={gcashNumber}
                        onChange={(e) => setGcashNumber(digitsOnly(e.target.value))}
                      />
                    </Field>

                    {/* GCash Payment Instructions & Proof Upload */}
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-blue-800 mb-1">
                          How to complete your GCash payment
                        </p>
                        <div className="mb-3 rounded-xl border border-blue-200 bg-white p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-600">
                            Send payment to
                          </p>
                          <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-extrabold text-[#1A1817]">{venue.name}</p>
                              <p className="font-mono text-lg font-extrabold tracking-wide text-blue-700">
                                {formatMobile(venueGcashNumber)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleCopyGcashNumber}
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:border-blue-400"
                            >
                              {copiedGcash ? <Check size={13} /> : <Copy size={13} />}
                              {copiedGcash ? "Copied" : "Copy number"}
                            </button>
                          </div>
                        </div>
                        <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside leading-relaxed">
                          <li>Open your <strong>GCash app</strong> and send <strong>{formatPeso(totalAmount)}</strong> to <strong>{formatMobile(venueGcashNumber)}</strong></li>
                          <li>After paying, <strong>take a screenshot</strong> of the GCash payment confirmation/receipt</li>
                          <li>Upload the screenshot below to submit your payment for admin review</li>
                        </ol>
                      </div>

                      <div className="pt-1">
                        <label className="text-sm font-semibold text-[#1A1817] flex items-center gap-1.5 mb-1.5">
                          <Upload size={15} className="text-blue-500" />
                          Payment Receipt Screenshot
                          <span className="text-red-400 ml-0.5">*</span>
                        </label>

                        {!proofImage ? (
                          <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-300 bg-white p-6 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                            <Upload size={24} className="text-blue-400" />
                            <span className="text-sm font-medium text-blue-600">
                              Click to upload receipt screenshot
                            </span>
                            <span className="text-xs text-[#7C7671]">JPG, PNG &mdash; Max 5 MB</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (!file.type.startsWith("image/")) {
                                  setFieldError("Please upload an image file (JPG, PNG).");
                                  return;
                                }
                                if (file.size > 5 * 1024 * 1024) {
                                  setFieldError("Image must be under 5 MB.");
                                  return;
                                }
                                setFieldError(null);
                                setProofFileName(file.name);
                                const reader = new FileReader();
                                reader.onload = () => setProofImage(reader.result as string);
                                reader.readAsDataURL(file);
                              }}
                            />
                          </label>
                        ) : (
                          <div className="rounded-xl border border-blue-200 bg-white p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-[#2A6558] flex items-center gap-1">
                                <CheckCircle2 size={12} /> Receipt uploaded
                              </span>
                              <button
                                type="button"
                                onClick={() => { setProofImage(null); setProofFileName(null); }}
                                className="text-xs text-red-500 hover:text-red-700 font-medium"
                              >
                                Remove
                              </button>
                            </div>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={proofImage}
                              alt="GCash receipt"
                              className="w-full max-h-48 object-contain rounded-lg border border-[#E0DDD5]"
                            />
                            {proofFileName && (
                              <p className="mt-1 text-xs text-[#7C7671] truncate">{proofFileName}</p>
                            )}
                          </div>
                        )}

                        <p className="mt-1.5 text-[11px] text-blue-600 leading-relaxed">
                          Admin will review this screenshot before marking the venue as reserved.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {paymentMethod === "cash" && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 leading-relaxed">
                    <strong>Important:</strong> The system will create a cash payment reference for admin verification.
                    The venue becomes reserved only after an admin confirms that the cash payment matches your reference number.
                  </div>
                )}
              </Section>
            </>
          )}

          {/* ══════════════════ STEP 3 — Confirmed ══════════════════ */}
          {step === 3 && (
            <>
              <div className={`rounded-2xl border p-8 text-center ${
                paymentMethod === "gcash"
                  ? "border-[#C8E0DA] bg-[#EAF2F0]"
                  : "border-amber-200 bg-amber-50"
              }`}>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow">
                  <CheckCircle2 size={34} className={paymentMethod === "gcash" ? "text-[#2A6558]" : "text-amber-500"} />
                </div>
                <h2 className="text-xl font-extrabold text-[#1A1817]">
                  Payment request submitted
                </h2>
                <p className="mt-2 text-sm text-[#7C7671]">
                  <strong className="text-[#1A1817]">{venue.name}</strong>{" "}
                  {paymentMethod === "gcash"
                    ? <>will be reserved for <strong className="text-[#1A1817]">{formatDate(eventDate)}</strong> after admin verifies your GCash receipt.</>
                    : <>will be reserved for <strong className="text-[#1A1817]">{formatDate(eventDate)}</strong> after admin verifies your cash reference.</>}
                </p>
              </div>

              {/* Reference number */}
              <div className="rounded-2xl border border-[#E0DDD5] bg-white p-6 text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#7C7671]">Your Booking Reference</p>
                <div className="mt-3 flex items-center justify-center gap-3">
                  <span className="text-3xl font-extrabold tracking-[0.15em] text-[#2A6558]">
                    {referenceNumber}
                  </span>
                  <button
                    onClick={handleCopyRef}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E0DDD5] bg-[#F8F6F1] text-[#7C7671] hover:bg-[#EAF2F0] hover:text-[#2A6558] transition-colors"
                    title="Copy reference number"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                <p className="mt-2 text-xs text-[#7C7671]">Screenshot or copy this number for your records.</p>
              </div>

              {/* Full booking recap */}
              <Section title="Booking Recap">
                <SummaryRow label="Venue" value={venue.name} />
                <SummaryRow label="Date" value={formatDate(eventDate)} />
                <SummaryRow label="Time" value={`${timeLabel(startTime)} · ${durationHours}h`} />
                <SummaryRow label="Guests" value={`${guestsNum.toLocaleString()} people`} />
                <SummaryRow
                  label="Payment Reference"
                  value={`${paymentMethod === "gcash" ? "GCash" : "Cash"} - ${paymentRef}`}
                />
                {paymentMethod === "gcash" && (
                  <SummaryRow label="Paid to GCash" value={formatMobile(venueGcashNumber)} />
                )}
                <SummaryRow label="Total Amount" value={formatPeso(totalAmount)} bold />
              </Section>

              {/* What's next */}
              <div className="rounded-2xl border border-[#E0DDD5] bg-white p-6">
                <h3 className="mb-4 font-extrabold text-[#1A1817]">What happens next?</h3>
                <ol className="space-y-3 text-sm text-[#44504C]">
                  {paymentMethod === "cash" ? (
                    <>
                      <li className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">1</span>
                        A cash payment reference was created: <strong>{paymentRef}</strong>.
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">2</span>
                        Admin will double-check that the paid cash amount matches booking reference <strong>{referenceNumber}</strong>.
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">3</span>
                        Once approved, the venue is reserved and the booking appears in the admin event calendar.
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EAF2F0] text-xs font-bold text-[#2A6558]">1</span>
                        GCash payment of <strong>{formatPeso(totalAmount)}</strong> to <strong>{formatMobile(venueGcashNumber)}</strong> was submitted with payment reference <strong>{paymentRef}</strong>.
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EAF2F0] text-xs font-bold text-[#2A6558]">2</span>
                        Admin will review the uploaded receipt screenshot and payment details.
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EAF2F0] text-xs font-bold text-[#2A6558]">3</span>
                        Once approved, the venue is reserved and the booking appears in the admin event calendar.
                      </li>
                    </>
                  )}
                </ol>
              </div>

              {/* CTA */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href={ROUTES.reservations}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2A6558] py-3.5 text-sm font-semibold text-white hover:bg-[#215249] transition-colors"
                >
                  <CalendarCheck size={15} /> View My Reservations
                </Link>
                <Link
                  href={backToRecsHref}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#E0DDD5] bg-white py-3.5 text-sm font-semibold text-[#1A1817] hover:bg-[#F8F6F1] transition-colors"
                >
                  Back to Recommendations
                  <ArrowRight size={15} />
                </Link>
              </div>
            </>
          )}

          {/* Error banner */}
          {fieldError && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-500" />
              <p className="text-sm text-red-700 leading-relaxed">{fieldError}</p>
            </div>
          )}

          {/* Footer nav */}
          {step === 1 && (
            <div className="flex gap-3">
              <Link
                href={backToVenueHref}
                className="flex items-center gap-2 rounded-xl border border-[#E0DDD5] bg-white px-5 py-3.5 text-sm font-semibold text-[#7C7671] hover:bg-[#F8F6F1] transition-colors"
              >
                <ArrowLeft size={15} /> Cancel
              </Link>
              <button
                type="button"
                onClick={handleStep1}
                disabled={busy || timeConflict || hasActiveReservation}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2A6558] py-3.5 text-sm font-semibold text-white hover:bg-[#215249] disabled:opacity-60 transition-colors"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : null}
                {busy ? "Checking availability…" : "Continue to Payment"}
                {!busy && <ArrowRight size={15} />}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleGoBack}
                disabled={busy}
                className="flex items-center gap-2 rounded-xl border border-[#E0DDD5] bg-white px-5 py-3.5 text-sm font-semibold text-[#7C7671] hover:bg-[#F8F6F1] disabled:opacity-60 transition-colors"
              >
                <ArrowLeft size={15} /> Back
              </button>
              <button
                type="button"
                onClick={handlePayment}
                disabled={busy || (paymentMethod === "gcash" && (!canPayWithGcash || !proofImage))}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2A6558] py-3.5 text-sm font-semibold text-white hover:bg-[#215249] disabled:opacity-60 transition-colors"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : null}
                {busy
                  ? "Processing…"
                  : paymentMethod === "gcash"
                  ? !canPayWithGcash
                    ? "GCash unavailable for this venue"
                    : proofImage
                      ? "Submit GCash for Review"
                      : "Upload receipt to continue"
                  : "Submit Cash for Review"}
                {!busy && <ArrowRight size={15} />}
              </button>
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}

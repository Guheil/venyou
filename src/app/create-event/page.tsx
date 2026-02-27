"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StepIndicator from "@/components/StepIndicator";
import AppShell from "@/components/AppShell";
import MapboxLocationPicker from "@/components/MapboxLocationPicker";
import { useEventsContext } from "@/lib/EventsContext";
import { useToast } from "@/lib/ToastContext";
import type { MapboxLocation } from "@/lib/mapbox";
import type { SavedEvent } from "@/lib/types";
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CalendarDays,
  Users,
  MapPin,
  Clock,
  Star,
  ChevronDown,
  CheckCircle2,
  Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────
interface EventForm {
  // Step 1
  eventName: string;
  occasion: string;
  customOccasion: string;
  description: string;
  // Step 2
  pax: string;
  budgetMin: string;
  budgetMax: string;
  budgetType: "per-head" | "total";
  // Step 3
  city: string;
  area: string;
  radiusKm: string;
  setting: "indoor" | "outdoor" | "both";
  // Step 4
  eventDate: string;
  startTime: string;
  durationHours: string;
  // Step 5
  amenities: string[];
  catering: "included" | "external" | "none";
  toneKeywords: string;
  extraNotes: string;
}

const OCCASIONS = [
  "Wedding Reception",
  "Corporate Conference",
  "Birthday Celebration",
  "Product Launch",
  "Team Building",
  "Gala Dinner",
  "Graduation Party",
  "Networking Mixer",
  "Baptism / Christening",
  "Debut",
  "Seminar / Workshop",
  "Other",
];

const AMENITIES = [
  "Parking",
  "AV / Projector",
  "WiFi",
  "Stage",
  "Dance Floor",
  "Photo Booth Space",
  "Accommodation",
  "Swimming Pool",
  "Garden",
  "Private Dining",
  "Bar",
  "Security",
];

const CITIES = [
  "Manila",
  "Makati",
  "Taguig (BGC)",
  "Quezon City",
  "Pasig",
  "Mandaluyong",
  "Pasay",
  "Paranaque",
  "Cebu City",
  "Davao City",
];

function normalizeCityForForm(candidateCity: string): string {
  const normalized = candidateCity.trim().toLowerCase();
  if (!normalized) return "";

  const direct = CITIES.find((city) => city.toLowerCase() === normalized);
  if (direct) return direct;

  if (normalized.includes("taguig")) return "Taguig (BGC)";
  if (normalized.includes("quezon")) return "Quezon City";
  if (normalized.includes("parañaque") || normalized.includes("paranaque")) {
    return "Paranaque";
  }

  const fuzzy = CITIES.find((city) => {
    const cityToken = city.toLowerCase().replace(" (bgc)", "");
    return normalized.includes(cityToken) || cityToken.includes(normalized);
  });

  return fuzzy ?? candidateCity.trim();
}

const WIZARD_STEPS = [
  { id: 1, label: "Basics" },
  { id: 2, label: "Guests" },
  { id: 3, label: "Location" },
  { id: 4, label: "Schedule" },
  { id: 5, label: "Details" },
];

// ─── Helper ───────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-sm font-medium text-[#1A1817]">{children}</label>;
}

function FieldInput({ error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return (
    <>
      <input
        {...props}
        className={`w-full rounded-xl border bg-white py-3 px-4 text-sm text-[#1A1817] outline-none placeholder:text-[#C4BDBA] transition focus:border-[#2A6558] focus:ring-2 focus:ring-[#2A6558]/20 ${error ? "border-[#C0392B]" : "border-[#E0DDD5]"} ${props.className ?? ""}`}
      />
      {error && <p className="mt-1 text-xs text-[#C0392B]">{error}</p>}
    </>
  );
}

function SelectInput({ error, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: string }) {
  return (
    <>
      <div className="relative">
        <select
          {...props}
          className={`w-full appearance-none rounded-xl border bg-white py-3 px-4 pr-10 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558] focus:ring-2 focus:ring-[#2A6558]/20 ${error ? "border-[#C0392B]" : "border-[#E0DDD5]"}`}
        >
          {children}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7C7671]" />
      </div>
      {error && <p className="mt-1 text-xs text-[#C0392B]">{error}</p>}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────
export default function CreateEventPage() {
  const router = useRouter();
  const { addEvent } = useEventsContext();
  const { error: showError } = useToast();
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof EventForm | string, string>>>({});

  const [form, setForm] = useState<EventForm>({
    eventName: "",
    occasion: "",
    customOccasion: "",
    description: "",
    pax: "",
    budgetMin: "",
    budgetMax: "",
    budgetType: "per-head",
    city: "",
    area: "",
    radiusKm: "10",
    setting: "both",
    eventDate: "",
    startTime: "",
    durationHours: "4",
    amenities: [],
    catering: "included",
    toneKeywords: "",
    extraNotes: "",
  });

  const set = (key: keyof EventForm, value: EventForm[keyof EventForm]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const cityInPresetList = CITIES.includes(form.city);

  const handleMapPick = (location: MapboxLocation) => {
    const mappedCity = normalizeCityForForm(location.city);
    if (mappedCity) {
      set("city", mappedCity);
    }

    const bestArea = location.address || location.area;
    if (bestArea) {
      set("area", bestArea);
    }
  };

  const toggleAmenity = (a: string) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(a)
        ? prev.amenities.filter((x) => x !== a)
        : [...prev.amenities, a],
    }));
  };

  // ─── Per-step validation ──────────────────────────────
  const validate = (): boolean => {
    const e: Partial<Record<string, string>> = {};
    if (step === 1) {
      if (!form.eventName.trim()) e.eventName = "Event name is required.";
      if (!form.occasion) e.occasion = "Please select an occasion.";
      if (form.occasion === "Other" && !form.customOccasion.trim())
        e.customOccasion = "Please describe the occasion.";
    }
    if (step === 2) {
      if (!form.pax || isNaN(Number(form.pax)) || Number(form.pax) < 1)
        e.pax = "Enter a valid guest count.";
      if (!form.budgetMin) e.budgetMin = "Enter minimum budget.";
      if (!form.budgetMax) e.budgetMax = "Enter maximum budget.";
      if (form.budgetMin && form.budgetMax && Number(form.budgetMin) > Number(form.budgetMax))
        e.budgetMax = "Max budget must be greater than min.";
    }
    if (step === 3) {
      if (!form.city) e.city = "Select a city.";
    }
    if (step === 4) {
      if (!form.eventDate) e.eventDate = "Select an event date.";
      if (!form.startTime) e.startTime = "Select a start time.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validate()) return;
    if (step < 5) setStep((s) => s + 1);
    else void handleSubmit();
  };

  const back = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = async () => {
    setProcessing(true);
    // Build the SavedEvent from form values
    const newEvent: SavedEvent = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      eventName: form.eventName,
      occasion: form.occasion === "Other" ? form.customOccasion : form.occasion,
      description: form.description,
      pax: Number(form.pax),
      budgetMin: Number(form.budgetMin),
      budgetMax: Number(form.budgetMax),
      budgetType: form.budgetType,
      city: form.city,
      area: form.area,
      radiusKm: Number(form.radiusKm),
      setting: form.setting,
      eventDate: form.eventDate,
      startTime: form.startTime,
      durationHours: Number(form.durationHours),
      amenities: form.amenities,
      catering: form.catering,
      toneKeywords: form.toneKeywords,
      extraNotes: form.extraNotes,
      status: "Draft",
      venueCount: 0,
    };

    try {
      const savedEvent = await addEvent(newEvent);
      // Simulate AI processing, then go to recommendations with the event id
      setTimeout(() => router.push(`/recommendations?event=${savedEvent.id}`), 3000);
    } catch {
      setProcessing(false);
      showError("Unable to save event", "Please try again.");
    }
  };

  // ─── Processing Overlay ───────────────────────────────
  if (processing) {
    return (
      <AppShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-[#F8F6F1] px-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#EAF2F0]">
            <Loader2 size={36} className="animate-spin text-[#2A6558]" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-[#1A1817] mb-2">AI is Working Its Magic</h2>
            <p className="text-[#7C7671] max-w-xs">
              Analysing your event details and scanning thousands of venues
              to find your perfect match…
            </p>
          </div>
          <div className="flex flex-col gap-2 items-center text-sm text-[#7C7671]">
            <div className="flex items-center gap-2"><Sparkles size={14} className="text-[#2A6558]" /> Processing NLP event context…</div>
            <div className="flex items-center gap-2"><MapPin size={14} className="text-[#2A6558]" /> Filtering by location &amp; proximity…</div>
            <div className="flex items-center gap-2"><Star size={14} className="text-[#2A6558]" /> Scoring &amp; ranking venues…</div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-2xl px-6 py-10 page-fade">
        {/* Page header */}
        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#7C7671] mb-1">
            Step {step} of 5
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1A1817]">Plan Your Event</h1>
        </div>
        {/* Step indicator */}
        <div className="mb-10">
          <StepIndicator steps={WIZARD_STEPS} currentStep={step} />
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#E0DDD5] bg-white p-8 md:p-10">
          {/* ── STEP 1: BASICS ── */}
          {step === 1 && (
            <div className="page-fade">
              <div className="mb-7">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#2A6558]">Step 1</span>
                <h2 className="mt-1 text-2xl font-extrabold text-[#1A1817]">Event Basics</h2>
                <p className="mt-1 text-sm text-[#7C7671]">Give your event a name and tell us what it&apos;s for.</p>
              </div>
              <div className="flex flex-col gap-5">
                <div>
                  <FieldLabel>Event Name</FieldLabel>
                  <FieldInput
                    placeholder="e.g., Garcia-Cruz Wedding Reception"
                    value={form.eventName}
                    onChange={(e) => set("eventName", e.target.value)}
                    error={errors.eventName}
                  />
                </div>
                <div>
                  <FieldLabel>Occasion / Type</FieldLabel>
                  <SelectInput value={form.occasion} onChange={(e) => set("occasion", e.target.value)} error={errors.occasion}>
                    <option value="">Select an occasion…</option>
                    {OCCASIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </SelectInput>
                </div>
                {form.occasion === "Other" && (
                  <div className="page-fade">
                    <FieldLabel>Describe the Occasion</FieldLabel>
                    <FieldInput
                      placeholder="e.g., Alumni Homecoming Dinner"
                      value={form.customOccasion}
                      onChange={(e) => set("customOccasion", e.target.value)}
                      error={errors.customOccasion}
                    />
                  </div>
                )}
                <div>
                  <FieldLabel>Brief Description <span className="text-[#7C7671] font-normal">(optional)</span></FieldLabel>
                  <textarea
                    placeholder="Describe the vibe, theme, or special requirements… The more detail, the better our AI match!"
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-[#E0DDD5] bg-white py-3 px-4 text-sm text-[#1A1817] outline-none placeholder:text-[#C4BDBA] transition focus:border-[#2A6558] focus:ring-2 focus:ring-[#2A6558]/20 resize-none"
                  />
                  <p className="mt-1 text-xs text-[#7C7671]">This helps our AI understand your event&apos;s tone and requirements.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: GUESTS & BUDGET ── */}
          {step === 2 && (
            <div className="page-fade">
              <div className="mb-7">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#2A6558]">Step 2</span>
                <h2 className="mt-1 text-2xl font-extrabold text-[#1A1817]">Guests &amp; Budget</h2>
                <p className="mt-1 text-sm text-[#7C7671]">Help us filter venues by size and cost range.</p>
              </div>
              <div className="flex flex-col gap-5">
                <div>
                  <FieldLabel>Number of Guests (Pax)</FieldLabel>
                  <div className="relative">
                    <Users size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C7671]" />
                    <FieldInput
                      type="number"
                      min="1"
                      placeholder="e.g., 150"
                      value={form.pax}
                      onChange={(e) => set("pax", e.target.value)}
                      error={errors.pax}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel>Budget Type</FieldLabel>
                  <div className="grid grid-cols-2 gap-3">
                    {(["per-head", "total"] as const).map((bt) => (
                      <button
                        key={bt}
                        type="button"
                        onClick={() => set("budgetType", bt)}
                        className={`rounded-xl border py-3 text-sm font-medium transition ${
                          form.budgetType === bt
                            ? "border-[#2A6558] bg-[#EAF2F0] text-[#2A6558]"
                            : "border-[#E0DDD5] text-[#7C7671] hover:border-[#2A6558]"
                        }`}
                      >
                        {bt === "per-head" ? "Per Head (₱/pax)" : "Total Budget (₱)"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Min Budget (₱)</FieldLabel>
                    <FieldInput
                      type="number"
                      min="0"
                      placeholder="e.g., 500"
                      value={form.budgetMin}
                      onChange={(e) => set("budgetMin", e.target.value)}
                      error={errors.budgetMin}
                    />
                  </div>
                  <div>
                    <FieldLabel>Max Budget (₱)</FieldLabel>
                    <FieldInput
                      type="number"
                      min="0"
                      placeholder="e.g., 1500"
                      value={form.budgetMax}
                      onChange={(e) => set("budgetMax", e.target.value)}
                      error={errors.budgetMax}
                    />
                  </div>
                </div>
                {form.pax && form.budgetMin && form.budgetMax && (
                  <div className="rounded-xl bg-[#EAF2F0] border border-[#C8E0DA] px-4 py-3 text-sm text-[#215249]">
                    <span className="font-semibold">Estimate: </span>
                    Total event cost between{" "}
                    <strong>₱{(Number(form.budgetMin) * (form.budgetType === "per-head" ? Number(form.pax) : 1)).toLocaleString()}</strong> and{" "}
                    <strong>₱{(Number(form.budgetMax) * (form.budgetType === "per-head" ? Number(form.pax) : 1)).toLocaleString()}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 3: LOCATION ── */}
          {step === 3 && (
            <div className="page-fade">
              <div className="mb-7">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#2A6558]">Step 3</span>
                <h2 className="mt-1 text-2xl font-extrabold text-[#1A1817]">Location Preference</h2>
                <p className="mt-1 text-sm text-[#7C7671]">We&apos;ll rank venues from nearest to farthest within your area.</p>
              </div>
              <div className="flex flex-col gap-5">
                <div>
                  <FieldLabel>City</FieldLabel>
                  <SelectInput value={form.city} onChange={(e) => set("city", e.target.value)} error={errors.city}>
                    <option value="">Select a city…</option>
                    {!cityInPresetList && form.city && (
                      <option value={form.city}>{form.city}</option>
                    )}
                    {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </SelectInput>
                </div>
                <div>
                  <FieldLabel>Specific Area / Barangay <span className="text-[#7C7671] font-normal">(optional)</span></FieldLabel>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C7671]" />
                    <FieldInput
                      placeholder="e.g., Bonifacio High Street"
                      value={form.area}
                      onChange={(e) => set("area", e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel>Pin Exact Location</FieldLabel>
                  <MapboxLocationPicker
                    city={form.city}
                    area={form.area}
                    onPick={handleMapPick}
                  />
                  <p className="mt-1 text-xs text-[#7C7671]">
                    Click the map to drop a pin and auto-fill your location details.
                  </p>
                </div>
                <div>
                  <FieldLabel>Search Radius: <strong>{form.radiusKm} km</strong></FieldLabel>
                  <input
                    type="range"
                    min="2"
                    max="50"
                    step="2"
                    value={form.radiusKm}
                    onChange={(e) => set("radiusKm", e.target.value)}
                    className="w-full accent-[#2A6558]"
                  />
                  <div className="flex justify-between text-xs text-[#7C7671] mt-1">
                    <span>2 km</span><span>50 km</span>
                  </div>
                </div>
                <div>
                  <FieldLabel>Venue Setting</FieldLabel>
                  <div className="grid grid-cols-3 gap-3">
                    {(["indoor", "outdoor", "both"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => set("setting", s)}
                        className={`rounded-xl border py-3 text-sm font-medium capitalize transition ${
                          form.setting === s
                            ? "border-[#2A6558] bg-[#EAF2F0] text-[#2A6558]"
                            : "border-[#E0DDD5] text-[#7C7671] hover:border-[#2A6558]"
                        }`}
                      >
                        {s === "both" ? "Both" : s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: SCHEDULE ── */}
          {step === 4 && (
            <div className="page-fade">
              <div className="mb-7">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#2A6558]">Step 4</span>
                <h2 className="mt-1 text-2xl font-extrabold text-[#1A1817]">Date &amp; Schedule</h2>
                <p className="mt-1 text-sm text-[#7C7671]">We&apos;ll check venue availability for your chosen date.</p>
              </div>
              <div className="flex flex-col gap-5">
                <div>
                  <FieldLabel>Event Date</FieldLabel>
                  <div className="relative">
                    <CalendarDays size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C7671]" />
                    <FieldInput
                      type="date"
                      value={form.eventDate}
                      onChange={(e) => set("eventDate", e.target.value)}
                      error={errors.eventDate}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Start Time</FieldLabel>
                    <div className="relative">
                      <Clock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C7671]" />
                      <FieldInput
                        type="time"
                        value={form.startTime}
                        onChange={(e) => set("startTime", e.target.value)}
                        error={errors.startTime}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Duration: <strong>{form.durationHours}h</strong></FieldLabel>
                    <input
                      type="range"
                      min="2"
                      max="12"
                      step="1"
                      value={form.durationHours}
                      onChange={(e) => set("durationHours", e.target.value)}
                      className="mt-3 w-full accent-[#2A6558]"
                    />
                    <div className="flex justify-between text-xs text-[#7C7671] mt-1">
                      <span>2h</span><span>12h</span>
                    </div>
                  </div>
                </div>
                {form.eventDate && (
                  <div className="rounded-xl bg-[#EAF2F0] border border-[#C8E0DA] px-4 py-3 text-sm text-[#215249]">
                    <CalendarDays size={14} className="inline mr-1.5" />
                    <strong>{new Date(form.eventDate).toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</strong>
                    {form.startTime && ` · Starts at ${form.startTime}`}
                    {` · ${form.durationHours} hours`}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 5: DETAILS ── */}
          {step === 5 && (
            <div className="page-fade">
              <div className="mb-7">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#2A6558]">Step 5</span>
                <h2 className="mt-1 text-2xl font-extrabold text-[#1A1817]">Additional Details</h2>
                <p className="mt-1 text-sm text-[#7C7671]">These preferences sharpen your AI recommendations.</p>
              </div>
              <div className="flex flex-col gap-6">
                <div>
                  <FieldLabel>Required Amenities</FieldLabel>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {AMENITIES.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => toggleAmenity(a)}
                        className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                          form.amenities.includes(a)
                            ? "border-[#2A6558] bg-[#EAF2F0] text-[#2A6558]"
                            : "border-[#E0DDD5] text-[#7C7671] hover:border-[#2A6558]"
                        }`}
                      >
                        {form.amenities.includes(a) && <CheckCircle2 size={11} className="inline mr-1" />}
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <FieldLabel>Catering Preference</FieldLabel>
                  <div className="grid grid-cols-3 gap-3">
                    {(["included", "external", "none"] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => set("catering", c)}
                        className={`rounded-xl border py-3 text-sm font-medium capitalize transition ${
                          form.catering === c
                            ? "border-[#2A6558] bg-[#EAF2F0] text-[#2A6558]"
                            : "border-[#E0DDD5] text-[#7C7671] hover:border-[#2A6558]"
                        }`}
                      >
                        {c === "included" ? "Venue Catering" : c === "external" ? "External Caterer" : "No Catering"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <FieldLabel>Tone / keywords <span className="text-[#7C7671] font-normal">(optional)</span></FieldLabel>
                  <FieldInput
                    placeholder="e.g., elegant, rustic, garden, minimalist, lively…"
                    value={form.toneKeywords}
                    onChange={(e) => set("toneKeywords", e.target.value)}
                  />
                  <p className="mt-1 text-xs text-[#7C7671]">These keywords guide the AI&apos;s tone matching.</p>
                </div>
                <div>
                  <FieldLabel>Extra Notes <span className="text-[#7C7671] font-normal">(optional)</span></FieldLabel>
                  <textarea
                    placeholder="Any special requirements, accessibility needs, or notes for the AI…"
                    value={form.extraNotes}
                    onChange={(e) => set("extraNotes", e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-[#E0DDD5] bg-white py-3 px-4 text-sm text-[#1A1817] outline-none placeholder:text-[#C4BDBA] transition focus:border-[#2A6558] focus:ring-2 focus:ring-[#2A6558]/20 resize-none"
                  />
                </div>

                {/* Summary snapshot */}
                <div className="rounded-xl border border-[#E0DDD5] bg-[#F8F6F1] p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#1A1817]">Event Summary</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-[#7C7671]">
                    <span><strong className="text-[#1A1817]">{form.eventName || "—"}</strong></span>
                    <span>{form.occasion || "—"}</span>
                    <span>{form.pax ? `${form.pax} guests` : "—"}</span>
                    <span>{form.city || "—"}</span>
                    <span>{form.eventDate || "—"}</span>
                    <span>₱{form.budgetMin || "—"} – ₱{form.budgetMax || "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Nav buttons */}
          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={back}
              className={`flex items-center gap-2 rounded-xl border border-[#E0DDD5] px-5 py-2.5 text-sm font-medium text-[#7C7671] transition hover:border-[#1A1817] hover:text-[#1A1817] ${step === 1 ? "invisible" : ""}`}
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              type="button"
              onClick={next}
              className="flex items-center gap-2 rounded-xl bg-[#2A6558] px-7 py-2.5 text-sm font-semibold text-white transition hover:bg-[#215249]"
            >
              {step === 5 ? (
                <><Sparkles size={15} /> Find My Venues</>
              ) : (
                <>Continue <ArrowRight size={16} /></>
              )}
            </button>
          </div>
        </div>
      </main>
    </AppShell>
  );
}


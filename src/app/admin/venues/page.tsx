"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import {
  AdminDeniedState,
  AdminLoadingState,
  AdminMetricCard,
} from "@/components/admin/AdminUI";
import { formatAdminDateTime, type VenueSetting } from "@/lib/adminData";
import { formatPeso } from "@/lib/budget";
import { ROUTES } from "@/lib/routes";
import { supabase } from "@/lib/supabase/client";
import { useAdminData } from "@/lib/useAdminData";
import { useToast } from "@/lib/ToastContext";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  Star,
  Store,
  Trash2,
  UploadCloud,
  Users,
  X,
  XCircle,
} from "lucide-react";

const VENUE_TYPES = [
  "Hotel / Resort",
  "Banquet Hall",
  "Event Hall",
  "Garden Venue",
  "Beach Resort",
  "Restaurant / Café",
  "Rooftop",
  "Clubhouse / Country Club",
  "Convention Center",
  "Function Room",
  "Villa / Private Estate",
  "Museum / Gallery",
  "Other",
];

const VENUE_CITIES = [
  "Manila", "Quezon City", "Makati", "Taguig", "Pasig",
  "Mandaluyong", "Marikina", "Caloocan", "Las Piñas", "Muntinlupa",
  "Parañaque", "Pasay", "San Juan", "Malabon", "Navotas", "Valenzuela",
  "Pateros", "Antipolo", "Cainta", "Taytay", "Bacoor", "Dasmariñas",
  "General Trias", "Tagaytay", "Batangas City", "Biñan", "Calamba",
  "Santa Rosa", "San Pedro", "Malolos", "Meycauayan",
  "Cebu City", "Lapu-Lapu", "Mandaue", "Bacolod", "Iloilo City",
  "Davao City", "Cagayan de Oro", "Zamboanga City",
];

interface VenueDraft {
  name: string;
  type: string;
  address: string;
  city: string;
  area: string;
  setting: VenueSetting;
  tags: string;
  description: string;
  capacity: string;
  pricePerHead: string;
  rating: string;
  reviewCount: string;
  baseDistanceKm: string;
  isActive: boolean;
}

export default function AdminVenuesPage() {
  const { accessState, loadingData, refreshData, venues, summary } = useAdminData();
  const { success, error: showError } = useToast();
  const [drafts, setDrafts] = useState<Record<string, VenueDraft>>({});
  const [savingVenueId, setSavingVenueId] = useState<string | null>(null);
  const [deletingVenueId, setDeletingVenueId] = useState<string | null>(null);
  const [confirmDeleteVenueId, setConfirmDeleteVenueId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [settingFilter, setSettingFilter] = useState<"all" | VenueSetting>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreviewUrl, setEditImagePreviewUrl] = useState("");
  const [editImageInputKey, setEditImageInputKey] = useState(0);

  const resetEditImage = () => {
    setEditImageFile(null);
    setEditImagePreviewUrl((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return "";
    });
    setEditImageInputKey((k) => k + 1);
  };

  const openVenueModal = (venueId: string) => {
    resetEditImage();
    setSelectedVenueId(venueId);
  };

  const closeVenueModal = () => {
    resetEditImage();
    setSelectedVenueId(null);
  };

  const selectedVenue = useMemo(
    () => venues.find((v) => v.id === selectedVenueId) ?? null,
    [venues, selectedVenueId]
  );

  const confirmDeleteVenue = useMemo(
    () => venues.find((v) => v.id === confirmDeleteVenueId) ?? null,
    [confirmDeleteVenueId, venues]
  );

  const filteredVenues = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return venues.filter((venue) => {
      const matchesSearch =
        !q ||
        venue.name.toLowerCase().includes(q) ||
        venue.city.toLowerCase().includes(q) ||
        venue.type.toLowerCase().includes(q) ||
        (venue.area ?? "").toLowerCase().includes(q);
      const matchesSetting = settingFilter === "all" || venue.setting === settingFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && venue.isActive) ||
        (statusFilter === "inactive" && !venue.isActive);
      return matchesSearch && matchesSetting && matchesStatus;
    });
  }, [venues, searchQuery, settingFilter, statusFilter]);

  const getDefaultDraft = (venue: (typeof venues)[number]): VenueDraft => ({
    name: venue.name,
    type: venue.type,
    address: venue.address,
    city: venue.city,
    area: venue.area,
    setting: venue.setting,
    tags: venue.tags.join(", "),
    description: venue.description,
    capacity: String(venue.capacity),
    pricePerHead: String(venue.pricePerHead),
    rating: String(venue.rating),
    reviewCount: String(venue.reviewCount),
    baseDistanceKm: String(venue.baseDistanceKm),
    isActive: venue.isActive,
  });

  const updateDraft = (venueId: string, patch: Partial<VenueDraft>) => {
    const venue = venues.find((v) => v.id === venueId)!;
    setDrafts((prev) => ({
      ...prev,
      [venueId]: { ...(prev[venueId] ?? getDefaultDraft(venue)), ...patch },
    }));
  };

  const getDraft = (venue: (typeof venues)[number]): VenueDraft =>
    drafts[venue.id] ?? getDefaultDraft(venue);

  const uploadEditImage = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `venues/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("venue-images")
      .upload(path, file, { cacheControl: "3600", contentType: file.type, upsert: false });
    if (error) throw error;
    return supabase.storage.from("venue-images").getPublicUrl(path).data.publicUrl;
  };

  const handleSaveVenue = async (venueId: string, venueName: string) => {
    const venue = venues.find((v) => v.id === venueId);
    if (!venue) return;
    const draft = drafts[venueId] ?? getDefaultDraft(venue);

    if (!draft.name.trim() || !draft.type.trim() || !draft.address.trim() || !draft.city.trim()) {
      showError("Missing required fields", "Name, type, address, and city are required.");
      return;
    }

    const capacity = Number(draft.capacity);
    const pricePerHead = Number(draft.pricePerHead);
    const rating = Number(draft.rating);
    const reviewCount = Number(draft.reviewCount);
    const baseDistanceKm = Number(draft.baseDistanceKm);

    if (
      !Number.isFinite(capacity) ||
      !Number.isFinite(pricePerHead) ||
      !Number.isFinite(rating) ||
      !Number.isFinite(reviewCount) ||
      !Number.isFinite(baseDistanceKm) ||
      capacity < 1 ||
      pricePerHead < 0 ||
      rating < 0 ||
      rating > 5 ||
      reviewCount < 0 ||
      baseDistanceKm < 0
    ) {
      showError("Check venue values", "Capacity, price, rating, reviews, and distance must be valid.");
      return;
    }

    setSavingVenueId(venueId);

    let uploadedImageUrl: string | undefined;
    if (editImageFile) {
      try {
        uploadedImageUrl = await uploadEditImage(editImageFile);
      } catch {
        setSavingVenueId(null);
        showError("Could not upload image", "Check your storage access and try again.");
        return;
      }
    }

    const { error } = await supabase
      .from("venues")
      .update({
        capacity: Math.round(capacity),
        price_per_head: Math.round(pricePerHead),
        rating,
        review_count: Math.round(reviewCount),
        base_distance_km: baseDistanceKm,
        is_active: draft.isActive,
        name: draft.name.trim(),
        type: draft.type.trim(),
        address: draft.address.trim(),
        city: draft.city.trim(),
        area: draft.area.trim(),
        setting: draft.setting,
        tags: draft.tags.split(",").map((t) => t.trim()).filter(Boolean),
        description: draft.description.trim(),
        ...(uploadedImageUrl ? { image_url: uploadedImageUrl } : {}),
      })
      .eq("id", venueId);

    setSavingVenueId(null);

    if (error) {
      showError("Could not update venue", "Please check your admin access.");
      return;
    }

    success("Venue updated", `${venueName} is up to date.`);
    refreshData();
  };

  const handleDeleteVenue = async (venueId: string, venueName: string) => {
    setDeletingVenueId(venueId);

    const { error } = await supabase.from("venues").delete().eq("id", venueId);

    setDeletingVenueId(null);

    if (error) {
      showError("Could not delete venue", error.message || "Please check your admin access.");
      return;
    }

    success("Venue deleted", `${venueName} was removed from the catalog.`);
    setConfirmDeleteVenueId(null);
    closeVenueModal();
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[venueId];
      return next;
    });
    refreshData();
  };

  if (accessState === "loading") {
    return (
      <AdminShell>
        <AdminLoadingState label="Loading venue catalog" />
      </AdminShell>
    );
  }

  if (accessState === "denied") {
    return (
      <AdminShell>
        <AdminDeniedState />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 page-fade sm:px-6 sm:py-10">
        <section className="rounded-[30px] border border-[#E0DDD5] bg-gradient-to-br from-[#FCFBF8] via-white to-[#F0F6F4] p-6 sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#C8E0DA] bg-[#EAF2F0] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2A6558]">
                <Building2 size={13} />
                Venue Catalog
              </span>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#1A1817] sm:text-4xl">
                All venues with full catalog details and quick operational edits.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#6B6661] sm:text-base">
                Review venue identity, location, capacity, price, rating, tags,
                descriptions, images, availability, and update common live fields.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:w-[360px]">
              <Link
                href={ROUTES.adminVenueNew}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2A6558] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#215249]"
              >
                <Plus size={15} />
                Add venue
              </Link>
              <button
                type="button"
                onClick={refreshData}
                disabled={loadingData}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D8D3C9] bg-white px-5 py-3 text-sm font-semibold text-[#1A1817] transition hover:border-[#2A6558] hover:text-[#2A6558] disabled:opacity-60"
              >
                <RefreshCw size={15} className={loadingData ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            icon={<Store size={18} />}
            label="Total Venues"
            value={String(venues.length)}
            detail="Every venue record in catalog"
            tone="accent"
          />
          <AdminMetricCard
            icon={<CheckCircle2 size={18} />}
            label="Active"
            value={String(summary.active_venues)}
            detail="Visible in recommendations"
          />
          <AdminMetricCard
            icon={<XCircle size={18} />}
            label="Inactive"
            value={String(summary.inactive_venues)}
            detail="Hidden from customer search"
          />
          <AdminMetricCard
            icon={<Users size={18} />}
            label="Capacity"
            value={venues.reduce((sum, venue) => sum + venue.capacity, 0).toLocaleString()}
            detail="Combined venue capacity"
            tone="dark"
          />
        </section>

        <div className="mt-6 rounded-[24px] border border-[#E0DDD5] bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="relative flex-1">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C7671]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, city, type or area…"
                className="h-10 w-full rounded-xl border border-[#E0DDD5] bg-[#FCFBF8] pl-9 pr-4 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558]"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "active", "inactive"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    statusFilter === key
                      ? "border-[#2A6558] bg-[#2A6558] text-white"
                      : "border-[#E0DDD5] bg-white text-[#7C7671] hover:border-[#2A6558]"
                  }`}
                >
                  {key === "all" ? "All" : key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              ))}
              {(["all", "indoor", "outdoor", "both"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSettingFilter(key)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    settingFilter === key
                      ? "border-[#1A1817] bg-[#1A1817] text-white"
                      : "border-[#E0DDD5] bg-white text-[#7C7671] hover:border-[#1A1817]"
                  }`}
                >
                  {{ all: "Any setting", indoor: "Indoor", outdoor: "Outdoor", both: "Both" }[key]}
                </button>
              ))}
            </div>
            <span className="shrink-0 rounded-full border border-[#E0DDD5] bg-[#FCFBF8] px-3 py-1.5 text-xs font-semibold text-[#7C7671]">
              {filteredVenues.length} of {venues.length}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredVenues.map((venue) => {
            const draft = getDraft(venue);
            return (
              <button
                key={venue.id}
                type="button"
                onClick={() => openVenueModal(venue.id)}
                className="group overflow-hidden rounded-[24px] border border-[#E0DDD5] bg-white text-left shadow-sm transition hover:border-[#2A6558] hover:shadow-md"
              >
                <div className="relative h-36 overflow-hidden rounded-t-[24px]">
                  {venue.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={venue.imageUrl}
                      alt={venue.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center"
                      style={{ background: venue.imageColor ?? "linear-gradient(135deg,#BDD7D2,#D6E8E4)" }}
                    >
                      <Building2 size={32} className="opacity-25 text-[#2A6558]" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        draft.isActive
                          ? "border-[#C8E0DA] bg-[#EAF2F0] text-[#2A6558]"
                          : "border-[#E0DDD5] bg-[#F8F6F1] text-[#7C7671]"
                      }`}
                    >
                      {draft.isActive ? "Active" : "Inactive"}
                    </span>
                    <span className="rounded-full border border-[#E0DDD5] bg-[#FCFBF8] px-2 py-0.5 text-[11px] font-semibold text-[#7C7671]">
                      {venue.setting}
                    </span>
                  </div>
                  <p className="text-base font-extrabold text-[#1A1817] group-hover:text-[#2A6558]">
                    {venue.name}
                  </p>
                  <p className="mt-0.5 text-xs text-[#7C7671]">{venue.type}</p>
                  <div className="mt-2 flex items-center gap-1 text-xs text-[#7C7671]">
                    <MapPin size={11} />
                    {venue.city}{venue.area ? `, ${venue.area}` : ""}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#F0EDE8] pt-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#7C7671]">Capacity</p>
                      <p className="mt-0.5 text-sm font-bold text-[#1A1817]">{venue.capacity.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#7C7671]">Per head</p>
                      <p className="mt-0.5 text-sm font-bold text-[#1A1817]">{formatPeso(venue.pricePerHead)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#7C7671]">Rating</p>
                      <p className="mt-0.5 flex items-center gap-1 text-sm font-bold text-[#1A1817]">
                        <Star size={11} className="fill-amber-400 text-amber-400" />
                        {venue.rating}
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {/* Venue detail modal */}
      {selectedVenue && (() => {
        const draft = getDraft(selectedVenue);
        return (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 py-8"
            onClick={closeVenueModal}
          >
            <div
              className="w-full max-w-3xl rounded-[28px] bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-48 sm:h-56 overflow-hidden rounded-t-[28px]">
                {selectedVenue.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedVenue.imageUrl}
                    alt={selectedVenue.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center"
                    style={{ background: selectedVenue.imageColor ?? "linear-gradient(135deg,#BDD7D2,#D6E8E4)" }}
                  >
                    <Building2 size={56} className="opacity-20 text-[#2A6558]" />
                  </div>
                )}
              </div>
              <div className="p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          draft.isActive
                            ? "border-[#C8E0DA] bg-[#EAF2F0] text-[#2A6558]"
                            : "border-[#E0DDD5] bg-[#F8F6F1] text-[#7C7671]"
                        }`}
                      >
                        {draft.isActive ? "Active" : "Inactive"}
                      </span>
                      <span className="rounded-full border border-[#E0DDD5] bg-[#FCFBF8] px-2.5 py-1 text-xs font-semibold text-[#7C7671]">
                        {selectedVenue.setting}
                      </span>
                    </div>
                    <h2 className="text-2xl font-extrabold text-[#1A1817]">{selectedVenue.name}</h2>
                    <p className="mt-1 text-sm text-[#7C7671]">
                      {selectedVenue.type} — Updated {formatAdminDateTime(selectedVenue.updatedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeVenueModal}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E0DDD5] text-[#7C7671] hover:border-[#1A1817] hover:text-[#1A1817]"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="mt-6 rounded-[24px] border border-[#E0DDD5] bg-[#FCFBF8] p-5">
                  <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2A6558]">Edit venue details</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ModalField label="Name">
                      <input value={draft.name} onChange={(e) => updateDraft(selectedVenue.id, { name: e.target.value })} className="h-10 w-full rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558]" />
                    </ModalField>
                    <ModalField label="Type">
                      <select value={draft.type} onChange={(e) => updateDraft(selectedVenue.id, { type: e.target.value })} className="h-10 w-full rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm font-medium text-[#1A1817] outline-none transition focus:border-[#2A6558]">
                        {VENUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </ModalField>
                    <ModalField label="Address" className="sm:col-span-2">
                      <input value={draft.address} onChange={(e) => updateDraft(selectedVenue.id, { address: e.target.value })} className="h-10 w-full rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558]" />
                    </ModalField>
                    <ModalField label="City">
                      <select value={draft.city} onChange={(e) => updateDraft(selectedVenue.id, { city: e.target.value })} className="h-10 w-full rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm font-medium text-[#1A1817] outline-none transition focus:border-[#2A6558]">
                        {VENUE_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </ModalField>
                    <ModalField label="Area / Barangay">
                      <input value={draft.area} placeholder="e.g. BGC, Eastwood" onChange={(e) => updateDraft(selectedVenue.id, { area: e.target.value })} className="h-10 w-full rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558]" />
                    </ModalField>
                    <ModalField label="Setting">
                      <select value={draft.setting} onChange={(e) => updateDraft(selectedVenue.id, { setting: e.target.value as VenueSetting })} className="h-10 w-full rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm font-medium text-[#1A1817] outline-none transition focus:border-[#2A6558]">
                        <option value="indoor">Indoor</option>
                        <option value="outdoor">Outdoor</option>
                        <option value="both">Both</option>
                      </select>
                    </ModalField>
                    <ModalField label="Capacity">
                      <input type="number" min={1} value={draft.capacity} onChange={(e) => updateDraft(selectedVenue.id, { capacity: e.target.value })} className="h-10 w-full rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558]" />
                    </ModalField>
                    <ModalField label="Price per head (₱)">
                      <input type="number" min={0} value={draft.pricePerHead} onChange={(e) => updateDraft(selectedVenue.id, { pricePerHead: e.target.value })} className="h-10 w-full rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558]" />
                    </ModalField>
                    <ModalField label="Rating (0–5)">
                      <select value={draft.rating} onChange={(e) => updateDraft(selectedVenue.id, { rating: e.target.value })} className="h-10 w-full rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm font-medium text-[#1A1817] outline-none transition focus:border-[#2A6558]">
                        {Array.from({ length: 9 }, (_, i) => String(((i + 1) * 0.5 + 0.5).toFixed(1))).map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </ModalField>
                    <ModalField label="Review count">
                      <input type="number" min={0} value={draft.reviewCount} onChange={(e) => updateDraft(selectedVenue.id, { reviewCount: e.target.value })} className="h-10 w-full rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558]" />
                    </ModalField>
                    <ModalField label="Base distance (km)">
                      <input type="number" min={0} step={0.1} value={draft.baseDistanceKm} onChange={(e) => updateDraft(selectedVenue.id, { baseDistanceKm: e.target.value })} className="h-10 w-full rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558]" />
                    </ModalField>
                    <ModalField label="Tags (comma-separated)" className="sm:col-span-2">
                      <input value={draft.tags} placeholder="Wedding, Ballroom, Corporate" onChange={(e) => updateDraft(selectedVenue.id, { tags: e.target.value })} className="h-10 w-full rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558]" />
                    </ModalField>
                    <ModalField label="Description" className="sm:col-span-2">
                      <textarea rows={3} value={draft.description} onChange={(e) => updateDraft(selectedVenue.id, { description: e.target.value })} className="w-full resize-none rounded-xl border border-[#E0DDD5] bg-white px-3 py-2.5 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558]" />
                    </ModalField>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateDraft(selectedVenue.id, { isActive: !draft.isActive })}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        draft.isActive
                          ? "border-[#C8E0DA] bg-[#EAF2F0] text-[#2A6558]"
                          : "border-[#E0DDD5] bg-white text-[#7C7671]"
                      }`}
                    >
                      {draft.isActive ? "Active — click to deactivate" : "Inactive — click to activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveVenue(selectedVenue.id, selectedVenue.name)}
                      disabled={savingVenueId === selectedVenue.id}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#1A1817] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2A6558] disabled:opacity-60"
                    >
                      {savingVenueId === selectedVenue.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <PencilLine size={14} />
                      )}
                      Save changes
                    </button>
                  </div>
                </div>

                {/* Update venue photo */}
                <div className="mt-4 rounded-[24px] border border-dashed border-[#C8E0DA] bg-[#F8FBFA] p-4">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2A6558]">Update photo</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <label
                      htmlFor="edit-venue-image"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#2A6558] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#215249]"
                    >
                      <UploadCloud size={15} />
                      Choose new photo
                    </label>
                    {editImageFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditImageFile(null);
                          setEditImagePreviewUrl((prev) => { if (prev.startsWith("blob:")) URL.revokeObjectURL(prev); return ""; });
                          setEditImageInputKey((k) => k + 1);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#E0DDD5] bg-white px-3 py-2 text-xs font-semibold text-[#7C7671] hover:border-[#B42318] hover:text-[#B42318] transition"
                      >
                        <X size={13} /> Remove
                      </button>
                    )}
                    <input
                      key={editImageInputKey}
                      id="edit-venue-image"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        if (!file) return;
                        if (!["image/jpeg","image/png","image/webp","image/gif"].includes(file.type)) {
                          showError("Unsupported image", "Use JPG, PNG, WebP, or GIF.");
                          setEditImageInputKey((k) => k + 1);
                          return;
                        }
                        if (file.size > 5 * 1024 * 1024) {
                          showError("Image too large", "Max 5 MB.");
                          setEditImageInputKey((k) => k + 1);
                          return;
                        }
                        setEditImagePreviewUrl((prev) => { if (prev.startsWith("blob:")) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
                        setEditImageFile(file);
                      }}
                    />
                    <span className="text-xs text-[#7C7671]">
                      {editImageFile ? `${editImageFile.name} — ${Math.ceil(editImageFile.size / 1024).toLocaleString()} KB` : "JPG, PNG, WebP or GIF, max 5 MB"}
                    </span>
                  </div>
                {editImagePreviewUrl && (
                  <div className="mt-3 h-28 overflow-hidden rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={editImagePreviewUrl} alt="New photo preview" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>

                <div className="mt-4 rounded-[24px] border border-[#F2C5BE] bg-[#FDECEA] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-extrabold text-[#B42318]">Delete venue</p>
                      <p className="mt-1 text-xs leading-relaxed text-[#8A3A32]">
                        Permanently remove this venue from the catalog. Use inactive status instead when you only need to hide it from recommendations.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteVenueId(selectedVenue.id)}
                      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#B42318] bg-white px-4 text-sm font-semibold text-[#B42318] transition hover:bg-[#B42318] hover:text-white"
                    >
                      <Trash2 size={15} />
                      Delete venue
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {confirmDeleteVenue && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setConfirmDeleteVenueId(null)}
        >
          <div
            className="w-full max-w-md rounded-[24px] border border-[#F2C5BE] bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FDECEA] text-[#B42318]">
                <AlertTriangle size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B42318]">
                  Confirm deletion
                </p>
                <h2 className="mt-2 text-xl font-extrabold tracking-tight text-[#1A1817]">
                  Delete {confirmDeleteVenue.name}?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#6B6661]">
                  This permanently removes the venue from the catalog. If this venue has linked reservation records, the database relationship may also remove those linked records.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[#F2C5BE] bg-[#FDECEA] p-3 text-xs leading-relaxed text-[#8A3A32]">
              Deactivate the venue instead if you only want to hide it from customer recommendations.
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteVenueId(null)}
                disabled={deletingVenueId === confirmDeleteVenue.id}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[#E0DDD5] bg-white px-4 text-sm font-semibold text-[#1A1817] transition hover:border-[#2A6558] disabled:opacity-60"
              >
                Keep venue
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteVenue(confirmDeleteVenue.id, confirmDeleteVenue.name)}
                disabled={deletingVenueId === confirmDeleteVenue.id}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#B42318] px-4 text-sm font-semibold text-white transition hover:bg-[#8F1C13] disabled:opacity-60"
              >
                {deletingVenueId === confirmDeleteVenue.id ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function ModalField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-xs font-semibold text-[#1A1817]">{label}</span>
      {children}
    </label>
  );
}


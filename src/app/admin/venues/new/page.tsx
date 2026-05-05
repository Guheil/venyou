"use client";

import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import {
  AdminDeniedState,
  AdminLoadingState,
  AdminPanel,
  AdminSectionHeader,
} from "@/components/admin/AdminUI";
import { type VenueSetting } from "@/lib/adminData";
import { ROUTES } from "@/lib/routes";
import { supabase } from "@/lib/supabase/client";
import { useAdminData } from "@/lib/useAdminData";
import { useToast } from "@/lib/ToastContext";
import {
  ArrowLeft,
  Building2,
  ImageIcon,
  Loader2,
  Plus,
  Smartphone,
  UploadCloud,
  X,
} from "lucide-react";
import Link from "next/link";

interface NewVenueForm {
  name: string;
  type: string;
  address: string;
  city: string;
  area: string;
  capacity: string;
  pricePerHead: string;
  rating: string;
  reviewCount: string;
  setting: VenueSetting;
  tags: string;
  description: string;
  gcashNumber: string;
  imageUrl: string;
  baseDistanceKm: string;
}

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
  // Metro Manila
  "Manila",
  "Quezon City",
  "Makati",
  "Taguig",
  "Pasig",
  "Mandaluyong",
  "Marikina",
  "Caloocan",
  "Las Piñas",
  "Muntinlupa",
  "Parañaque",
  "Pasay",
  "San Juan",
  "Malabon",
  "Navotas",
  "Valenzuela",
  "Pateros",
  // Nearby / Provincial
  "Antipolo",
  "Cainta",
  "Taytay",
  "Bacoor",
  "Dasmariñas",
  "General Trias",
  "Tagaytay",
  "Batangas City",
  "Biñan",
  "Calamba",
  "Santa Rosa",
  "San Pedro",
  "Malolos",
  "Meycauayan",
  // Visayas / Mindanao
  "Cebu City",
  "Lapu-Lapu",
  "Mandaue",
  "Bacolod",
  "Iloilo City",
  "Davao City",
  "Cagayan de Oro",
  "Zamboanga City",
];

const RATING_OPTIONS = Array.from({ length: 9 }, (_, i) =>
  String(((i + 1) * 0.5 + 0.5).toFixed(1))
);

const emptyForm: NewVenueForm = {
  name: "",
  type: "",
  address: "",
  city: "",
  area: "",
  capacity: "",
  pricePerHead: "",
  rating: "4.5",
  reviewCount: "0",
  setting: "indoor",
  tags: "",
  description: "",
  gcashNumber: "",
  imageUrl: "",
  baseDistanceKm: "3",
};

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const maxImageSize = 5 * 1024 * 1024;

function digitsOnly(value: string, maxLength = 11) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function isPhilippineMobile(value: string) {
  return /^09\d{9}$/.test(value);
}

export default function AdminNewVenuePage() {
  const router = useRouter();
  const { accessState } = useAdminData();
  const { success, error: showError } = useToast();
  const [form, setForm] = useState<NewVenueForm>(emptyForm);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [imageInputKey, setImageInputKey] = useState(0);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const updateForm = (patch: Partial<NewVenueForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    if (!allowedImageTypes.includes(file.type)) {
      showError("Unsupported image", "Upload a JPG, PNG, WebP, or GIF image.");
      setImageInputKey((value) => value + 1);
      return;
    }

    if (file.size > maxImageSize) {
      showError("Image is too large", "Venue images must be 5 MB or smaller.");
      setImageInputKey((value) => value + 1);
      return;
    }

    setSelectedImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    updateForm({ imageUrl: "" });
  };

  const clearSelectedImage = () => {
    setSelectedImageFile(null);
    setImagePreviewUrl("");
    setImageInputKey((value) => value + 1);
  };

  const uploadVenueImage = async () => {
    if (!selectedImageFile) return form.imageUrl.trim();

    const extension =
      selectedImageFile.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
      "jpg";
    const path = `venues/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage
      .from("venue-images")
      .upload(path, selectedImageFile, {
        cacheControl: "3600",
        contentType: selectedImageFile.type,
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage.from("venue-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleCreateVenue = async () => {
    const capacity = Number(form.capacity);
    const pricePerHead = Number(form.pricePerHead);
    const rating = Number(form.rating);
    const reviewCount = Number(form.reviewCount);
    const baseDistanceKm = Number(form.baseDistanceKm);
    const venueGcashNumber = digitsOnly(form.gcashNumber);

    if (
      !form.name.trim() ||
      !form.type.trim() ||
      !form.address.trim() ||
      !form.city.trim() ||
      !isPhilippineMobile(venueGcashNumber) ||
      !Number.isFinite(capacity) ||
      !Number.isFinite(pricePerHead) ||
      !Number.isFinite(rating) ||
      capacity < 1 ||
      pricePerHead < 0 ||
      rating < 0 ||
      rating > 5
    ) {
      showError(
        "Venue details incomplete",
        "Name, type, address, city, venue GCash number, capacity, price, and rating are required."
      );
      return;
    }

    const tags = form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    setCreating(true);

    let imageUrl = form.imageUrl.trim();

    try {
      imageUrl = await uploadVenueImage();
    } catch (uploadErr) {
      console.error("[add-venue] image upload failed (continuing without image):", uploadErr);
      // Non-blocking — venue is still created, just without a photo.
      imageUrl = "";
    }

    const { error } = await supabase.from("venues").insert({
      name: form.name.trim(),
      type: form.type.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      area: form.area.trim(),
      capacity: Math.round(capacity),
      price_per_head: Math.round(pricePerHead),
      rating,
      review_count: Number.isFinite(reviewCount) ? Math.max(0, Math.round(reviewCount)) : 0,
      setting: form.setting,
      tags,
      description: form.description.trim(),
      gcash_number: venueGcashNumber,
      image_color: "linear-gradient(135deg, #BDD7D2 0%, #D6E8E4 100%)",
      image_url: imageUrl,
      base_distance_km: Number.isFinite(baseDistanceKm) ? Math.max(0, baseDistanceKm) : 3,
      is_active: true,
    });

    setCreating(false);

    if (error) {
      setCreating(false);
      console.error("[add-venue] DB insert failed:", error);
      showError(
        "Could not create venue",
        error.message || "A venue with the same name/address may already exist."
      );
      return;
    }

    success("Venue added", `${form.name.trim()} was added to the catalog.`);
    router.replace(ROUTES.adminVenues);
  };

  const previewUrl = imagePreviewUrl || form.imageUrl.trim();

  if (accessState === "loading") {
    return (
      <AdminShell>
        <AdminLoadingState label="Preparing venue form" />
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
      <main className="mx-auto w-full max-w-5xl px-4 py-6 page-fade sm:px-6 sm:py-10">
        <section className="rounded-[30px] border border-[#E0DDD5] bg-gradient-to-br from-[#FCFBF8] via-white to-[#F0F6F4] p-6 sm:p-8">
          <Link
            href={ROUTES.adminVenues}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#2A6558] hover:text-[#215249]"
          >
            <ArrowLeft size={15} />
            Back to venues
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#C8E0DA] bg-[#EAF2F0] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2A6558]">
            <Building2 size={13} />
            Add Venue
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#1A1817] sm:text-4xl">
            Create a full venue record for recommendations and bookings.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#6B6661] sm:text-base">
            Fill in the operational details customers and recommendations depend on:
            identity, location, capacity, pricing, rating, setting, tags, image, and description.
          </p>
        </section>

        <AdminPanel className="mt-6">
          <AdminSectionHeader
            eyebrow="Venue record"
            title="Catalog details"
            description="Every field here maps to the backend venue catalog."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Name" value={form.name} onChange={(value) => updateForm({ name: value })} />
            <SelectField
              label="Type"
              value={form.type}
              onChange={(value) => updateForm({ type: value })}
              options={VENUE_TYPES}
              placeholder="Select venue type…"
            />
            <TextField
              label="Address"
              value={form.address}
              onChange={(value) => updateForm({ address: value })}
              className="sm:col-span-2"
            />
            <SelectField
              label="City"
              value={form.city}
              onChange={(value) => updateForm({ city: value })}
              options={VENUE_CITIES}
              placeholder="Select city…"
            />
            <TextField label="Area / Barangay" value={form.area} onChange={(value) => updateForm({ area: value })} placeholder="e.g. BGC, Eastwood, Poblacion" />
            <TextField
              label="Venue GCash receiving number"
              value={form.gcashNumber}
              onChange={(value) => updateForm({ gcashNumber: digitsOnly(value) })}
              placeholder="09XX-XXX-XXXX"
              type="tel"
              inputMode="numeric"
              maxLength={11}
              icon={<Smartphone size={14} />}
            />
            <TextField label="Capacity" value={form.capacity} onChange={(value) => updateForm({ capacity: value })} placeholder="e.g. 200" />
            <TextField
              label="Price per head (₱)"
              value={form.pricePerHead}
              onChange={(value) => updateForm({ pricePerHead: value })}
              placeholder="e.g. 1500"
            />
            <SelectField
              label="Rating"
              value={form.rating}
              onChange={(value) => updateForm({ rating: value })}
              options={RATING_OPTIONS}
            />
            <TextField
              label="Review count"
              value={form.reviewCount}
              onChange={(value) => updateForm({ reviewCount: value })}
              placeholder="e.g. 0"
            />
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-[#1A1817]">
                Setting
              </span>
              <select
                value={form.setting}
                onChange={(event) => updateForm({ setting: event.target.value as VenueSetting })}
                className="h-11 w-full rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm font-semibold text-[#1A1817] outline-none transition focus:border-[#2A6558]"
              >
                <option value="indoor">Indoor</option>
                <option value="outdoor">Outdoor</option>
                <option value="both">Both</option>
              </select>
            </label>
            <TextField
              label="Base distance km"
              value={form.baseDistanceKm}
              onChange={(value) => updateForm({ baseDistanceKm: value })}
              placeholder="e.g. 3"
            />
            <TextField
              label="Tags"
              value={form.tags}
              onChange={(value) => updateForm({ tags: value })}
              placeholder="Wedding, Ballroom, Corporate"
              className="sm:col-span-2"
            />
            <div className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-[#1A1817]">
                Venue image
              </span>
              <div className="grid gap-4 rounded-2xl border border-dashed border-[#C8E0DA] bg-[#F8FBFA] p-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="flex min-h-[150px] items-center justify-center overflow-hidden rounded-2xl border border-[#E0DDD5] bg-white">
                  {previewUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt="Venue preview"
                        className="h-full min-h-[150px] w-full object-cover"
                      />
                    </>
                  ) : (
                    <div className="flex h-full min-h-[150px] w-full flex-col items-center justify-center gap-2 bg-[#EAF2F0] text-[#2A6558]">
                      <ImageIcon size={30} className="opacity-40" />
                      <p className="text-xs font-semibold opacity-50">No image yet</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-center gap-3">
                  <p className="text-sm leading-relaxed text-[#6B6661]">
                    Upload a venue photo to the public venue image bucket. You can
                    also paste an external image URL below when needed.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <label
                      htmlFor="venue-image-upload"
                      className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#2A6558] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#215249]"
                    >
                      <UploadCloud size={16} />
                      Choose image
                    </label>
                    {selectedImageFile && (
                      <button
                        type="button"
                        onClick={clearSelectedImage}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E0DDD5] bg-white px-4 py-2 text-sm font-semibold text-[#1A1817] transition hover:border-[#B42318] hover:text-[#B42318]"
                      >
                        <X size={15} />
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    key={imageInputKey}
                    id="venue-image-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageFileChange}
                    className="sr-only"
                  />
                  <div className="text-xs font-medium text-[#7C7671]">
                    {selectedImageFile
                      ? `${selectedImageFile.name} - ${Math.ceil(
                          selectedImageFile.size / 1024
                        ).toLocaleString()} KB`
                      : "JPG, PNG, WebP, or GIF. Maximum 5 MB."}
                  </div>
                </div>
              </div>
            </div>
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-[#1A1817]">
                Description
              </span>
              <textarea
                value={form.description}
                onChange={(event) => updateForm({ description: event.target.value })}
                rows={5}
                className="w-full resize-none rounded-xl border border-[#E0DDD5] bg-white px-3 py-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558]"
              />
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => void handleCreateVenue()}
              disabled={creating}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2A6558] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#215249] disabled:opacity-60"
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Add venue
            </button>
          </div>
        </AdminPanel>
      </main>
    </AdminShell>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  className = "",
  type = "text",
  inputMode,
  maxLength,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  type?: string;
  inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
  maxLength?: number;
  icon?: ReactNode;
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-[#1A1817]">
        {icon && <span className="text-[#2A6558]">{icon}</span>}
        {label}
      </span>
      <input
        type={type}
        inputMode={inputMode}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558]"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-sm font-semibold text-[#1A1817]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm font-semibold text-[#1A1817] outline-none transition focus:border-[#2A6558]"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

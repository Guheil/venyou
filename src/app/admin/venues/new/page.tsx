"use client";

import { useEffect, useState, type ChangeEvent } from "react";
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
  imageUrl: string;
  imageColor: string;
  baseDistanceKm: string;
}

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
  imageUrl: "",
  imageColor: "linear-gradient(135deg, #BDD7D2 0%, #D6E8E4 100%)",
  baseDistanceKm: "3",
};

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const maxImageSize = 5 * 1024 * 1024;

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

    if (
      !form.name.trim() ||
      !form.type.trim() ||
      !form.address.trim() ||
      !form.city.trim() ||
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
        "Name, type, address, city, capacity, price, and rating are required."
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
    } catch {
      setCreating(false);
      showError(
        "Could not upload venue image",
        "Check that the venue image storage migration has been applied."
      );
      return;
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
      image_color: form.imageColor.trim() || emptyForm.imageColor,
      image_url: imageUrl,
      base_distance_km: Number.isFinite(baseDistanceKm) ? Math.max(0, baseDistanceKm) : 3,
      is_active: true,
    });

    setCreating(false);

    if (error) {
      showError("Could not create venue", "A venue with the same name/address may already exist.");
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
            <TextField label="Type" value={form.type} onChange={(value) => updateForm({ type: value })} />
            <TextField
              label="Address"
              value={form.address}
              onChange={(value) => updateForm({ address: value })}
              className="sm:col-span-2"
            />
            <TextField label="City" value={form.city} onChange={(value) => updateForm({ city: value })} />
            <TextField label="Area" value={form.area} onChange={(value) => updateForm({ area: value })} />
            <TextField label="Capacity" value={form.capacity} onChange={(value) => updateForm({ capacity: value })} />
            <TextField
              label="Price per head"
              value={form.pricePerHead}
              onChange={(value) => updateForm({ pricePerHead: value })}
            />
            <TextField label="Rating" value={form.rating} onChange={(value) => updateForm({ rating: value })} />
            <TextField
              label="Review count"
              value={form.reviewCount}
              onChange={(value) => updateForm({ reviewCount: value })}
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
                    <div
                      className="flex h-full min-h-[150px] w-full items-center justify-center text-[#2A6558]"
                      style={{ background: form.imageColor }}
                    >
                      <ImageIcon size={30} />
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
            <TextField
              label="Image URL"
              value={form.imageUrl}
              onChange={(value) => updateForm({ imageUrl: value })}
              placeholder="Optional when uploading a file"
              className="sm:col-span-2"
            />
            <TextField
              label="Image color"
              value={form.imageColor}
              onChange={(value) => updateForm({ imageColor: value })}
              className="sm:col-span-2"
            />
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-sm font-semibold text-[#1A1817]">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558]"
      />
    </label>
  );
}

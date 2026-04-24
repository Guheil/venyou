"use client";

import Link from "next/link";
import { useState } from "react";
import AdminShell from "@/components/AdminShell";
import {
  AdminDeniedState,
  AdminLoadingState,
  AdminMetricCard,
} from "@/components/admin/AdminUI";
import { formatAdminDateTime } from "@/lib/adminData";
import { formatPeso } from "@/lib/budget";
import { ROUTES } from "@/lib/routes";
import { supabase } from "@/lib/supabase/client";
import { useAdminData } from "@/lib/useAdminData";
import { useToast } from "@/lib/ToastContext";
import {
  Building2,
  CheckCircle2,
  PencilLine,
  Plus,
  RefreshCw,
  Star,
  Store,
  Users,
  XCircle,
  Loader2,
} from "lucide-react";

interface VenueDraft {
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

  const updateDraft = (venueId: string, patch: Partial<VenueDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [venueId]: {
        ...(prev[venueId] ?? {
          capacity: "",
          pricePerHead: "",
          rating: "",
          reviewCount: "",
          baseDistanceKm: "",
          isActive: true,
        }),
        ...patch,
      },
    }));
  };

  const getDraft = (venue: (typeof venues)[number]): VenueDraft =>
    drafts[venue.id] ?? {
      capacity: String(venue.capacity),
      pricePerHead: String(venue.pricePerHead),
      rating: String(venue.rating),
      reviewCount: String(venue.reviewCount),
      baseDistanceKm: String(venue.baseDistanceKm),
      isActive: venue.isActive,
    };

  const handleSaveVenue = async (venueId: string, venueName: string) => {
    const draft = drafts[venueId];
    if (!draft) return;

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

    const { error } = await supabase
      .from("venues")
      .update({
        capacity: Math.round(capacity),
        price_per_head: Math.round(pricePerHead),
        rating,
        review_count: Math.round(reviewCount),
        base_distance_km: baseDistanceKm,
        is_active: draft.isActive,
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

        <div className="mt-6 grid gap-5">
          {venues.map((venue) => {
            const draft = getDraft(venue);

            return (
              <article
                key={venue.id}
                className="overflow-hidden rounded-[28px] border border-[#E0DDD5] bg-white shadow-sm"
              >
                <div className="h-2" style={{ background: venue.imageColor }} />
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
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
                          {venue.setting}
                        </span>
                      </div>
                      <h2 className="text-xl font-extrabold text-[#1A1817]">
                        {venue.name}
                      </h2>
                      <p className="mt-1 text-sm text-[#7C7671]">
                        {venue.type} - Updated {formatAdminDateTime(venue.updatedAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateDraft(venue.id, {
                          isActive: !draft.isActive,
                        })
                      }
                      className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        draft.isActive
                          ? "border-[#C8E0DA] bg-[#EAF2F0] text-[#2A6558]"
                          : "border-[#E0DDD5] bg-white text-[#7C7671]"
                      }`}
                    >
                      {draft.isActive ? "Active" : "Inactive"}
                    </button>
                  </div>

                  <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr_1.2fr]">
                    <DetailBlock title="Identity">
                      <DetailRow label="Venue ID" value={venue.id} mono />
                      <DetailRow label="Name" value={venue.name} />
                      <DetailRow label="Type" value={venue.type} />
                      <DetailRow label="Description" value={venue.description || "None"} />
                      <DetailRow
                        label="Tags"
                        value={venue.tags.length ? venue.tags.join(", ") : "None"}
                      />
                    </DetailBlock>

                    <DetailBlock title="Location">
                      <DetailRow label="Address" value={venue.address} />
                      <DetailRow label="City" value={venue.city} />
                      <DetailRow label="Area" value={venue.area || "None"} />
                      <DetailRow
                        label="Base distance"
                        value={`${venue.baseDistanceKm.toLocaleString()} km`}
                      />
                      <DetailRow label="Image URL" value={venue.imageUrl || "None"} />
                    </DetailBlock>

                    <DetailBlock title="Live fields">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <LabeledInput
                          label="Capacity"
                          value={draft.capacity}
                          onChange={(value) => updateDraft(venue.id, { capacity: value })}
                        />
                        <LabeledInput
                          label="Price/head"
                          value={draft.pricePerHead}
                          onChange={(value) =>
                            updateDraft(venue.id, { pricePerHead: value })
                          }
                        />
                        <LabeledInput
                          label="Rating"
                          value={draft.rating}
                          onChange={(value) => updateDraft(venue.id, { rating: value })}
                        />
                        <LabeledInput
                          label="Reviews"
                          value={draft.reviewCount}
                          onChange={(value) =>
                            updateDraft(venue.id, { reviewCount: value })
                          }
                        />
                        <LabeledInput
                          label="Distance km"
                          value={draft.baseDistanceKm}
                          onChange={(value) =>
                            updateDraft(venue.id, { baseDistanceKm: value })
                          }
                        />
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#1A1817]">
                          <Star size={14} className="fill-amber-400 text-amber-400" />
                          {venue.rating.toLocaleString()} rating -{" "}
                          {formatPeso(venue.pricePerHead)} per head
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleSaveVenue(venue.id, venue.name)}
                          disabled={savingVenueId === venue.id}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1A1817] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2A6558] disabled:opacity-60"
                        >
                          {savingVenueId === venue.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <PencilLine size={14} />
                          )}
                          Save changes
                        </button>
                      </div>
                    </DetailBlock>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </AdminShell>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[24px] border border-[#E0DDD5] bg-[#FCFBF8] p-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2A6558]">
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid gap-1 text-sm sm:grid-cols-[120px_minmax(0,1fr)]">
      <span className="text-xs font-semibold text-[#7C7671]">{label}</span>
      <span
        className={`min-w-0 break-words font-medium text-[#1A1817] ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7C7671]">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="decimal"
        className="h-10 w-full rounded-xl border border-[#E0DDD5] bg-white px-3 text-sm font-semibold text-[#1A1817] outline-none transition focus:border-[#2A6558]"
      />
    </label>
  );
}

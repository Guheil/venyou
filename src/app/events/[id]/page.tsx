"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Modal from "@/components/Modal";
import { useEventsContext } from "@/lib/EventsContext";
import { useToast } from "@/lib/ToastContext";
import {
  ArrowLeft,
  CalendarDays,
  Users,
  MapPin,
  Utensils,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Trash2,
  ExternalLink,
  Building2,
  Tag,
  TrendingDown,
  TrendingUp,
  Minus,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import type { EventStatus, SavedEvent } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────
function totalBudget(ev: SavedEvent) {
  if (ev.budgetType === "per-head") {
    return { min: ev.budgetMin * ev.pax, max: ev.budgetMax * ev.pax };
  }
  return { min: ev.budgetMin, max: ev.budgetMax };
}

const statusFlow: EventStatus[] = ["Draft", "In Review", "Confirmed"];

const statusStyle: Record<EventStatus, string> = {
  Draft: "bg-[#F0EDEA] text-[#7C7671]",
  "In Review": "bg-[#FEF3C7] text-[#92400E]",
  Confirmed: "bg-[#EAF2F0] text-[#2A6558]",
};

const statusIcon: Record<EventStatus, React.ReactNode> = {
  Draft: <FileText size={12} />,
  "In Review": <AlertCircle size={12} />,
  Confirmed: <CheckCircle2 size={12} />,
};

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="mb-0.5 text-xs text-[#7C7671]">{label}</p>
      <p className="text-sm font-medium text-[#1A1817]">{value}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────
export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";
  const { getEvent, deleteEvent, updateEvent } = useEventsContext();
  const { info, success, error } = useToast();

  const ev = getEvent(id);
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  if (!ev) {
    return (
      <AppShell>
        <main className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-4 px-6 py-20 text-center page-fade">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EAF2F0]">
            <CalendarDays size={30} className="text-[#2A6558]" />
          </div>
          <h2 className="text-xl font-bold text-[#1A1817]">Event not found</h2>
          <p className="text-sm text-[#7C7671]">
            This event may have been deleted or does not exist.
          </p>
          <Link
            href="/events"
            className="flex items-center gap-2 rounded-full bg-[#2A6558] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#215249]"
          >
            <ArrowLeft size={15} /> Back to Events
          </Link>
        </main>
      </AppShell>
    );
  }

  const t = totalBudget(ev);
  const midEstimate = Math.round((t.min + t.max) / 2);
  const perHeadTotal = ev.pax > 0 ? Math.round(midEstimate / ev.pax) : 0;
  const rangeLabel =
    ev.budgetType === "per-head"
      ? `₱${ev.budgetMin.toLocaleString()}–₱${ev.budgetMax.toLocaleString()} / head`
      : `₱${t.min.toLocaleString()}–₱${t.max.toLocaleString()} total`;

  const handleDelete = async () => {
    try {
      await deleteEvent(ev.id);
      success("Event deleted", `"${ev.eventName}" was removed.`);
      setDeleteModalOpen(false);
      router.push("/events");
    } catch {
      error("Unable to delete event", "Please try again.");
    }
  };

  const handleStatusChange = async (s: EventStatus) => {
    if (s === ev.status) {
      setStatusOpen(false);
      return;
    }
    try {
      await updateEvent(ev.id, { status: s });
      info("Status updated", `${ev.eventName} is now ${s}.`);
      setStatusOpen(false);
    } catch {
      error("Unable to update status", "Please try again.");
    }
  };

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-4xl px-6 py-10 page-fade">

        {/* Back */}
        <Link
          href="/events"
          className="mb-6 flex w-fit items-center gap-1.5 text-sm text-[#7C7671] transition hover:text-[#2A6558]"
        >
          <ArrowLeft size={14} /> Back to Events
        </Link>

        {/* Header row */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1A1817]">
              {ev.eventName}
            </h1>
            <p className="mt-1 text-sm text-[#7C7671]">{ev.occasion}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Status dropdown */}
            <div className="relative">
              <button
                onClick={() => setStatusOpen((v) => !v)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${statusStyle[ev.status]}`}
              >
                {statusIcon[ev.status]}
                {ev.status}
                <ChevronDown size={11} />
              </button>
              {statusOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-[#E0DDD5] bg-white shadow-xl">
                  {statusFlow.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium transition hover:bg-[#F8F6F1] ${
                        ev.status === s ? "text-[#2A6558]" : "text-[#1A1817]"
                      }`}
                    >
                      {statusIcon[s]}
                      {s}
                      {ev.status === s && (
                        <CheckCircle2 size={11} className="ml-auto text-[#2A6558]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setDeleteModalOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-[#E0DDD5] bg-white px-3.5 py-1.5 text-xs font-medium text-[#7C7671] transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 size={13} /> Delete
            </button>

            <Link
              href={`/recommendations?event=${ev.id}`}
              className="flex items-center gap-1.5 rounded-full bg-[#2A6558] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#215249]"
            >
              <Sparkles size={13} /> View Venues
            </Link>
          </div>
        </div>

        {/* Grid: details + budget */}
        <div className="mb-6 grid gap-5 lg:grid-cols-3">

          {/* Event Details – takes 2 cols */}
          <div className="flex flex-col gap-5 lg:col-span-2">

            {/* Basic info */}
            <div className="rounded-2xl border border-[#E0DDD5] bg-white p-6">
              <h2 className="mb-4 font-semibold text-[#1A1817]">Event Details</h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EAF2F0]">
                    <Tag size={13} className="text-[#2A6558]" />
                  </div>
                  <Field label="Occasion" value={ev.occasion} />
                </div>
                {ev.eventDate && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EAF2F0]">
                      <CalendarDays size={13} className="text-[#2A6558]" />
                    </div>
                    <Field
                      label="Date"
                      value={new Date(ev.eventDate).toLocaleDateString("en-PH", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    />
                  </div>
                )}
                {ev.startTime && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EAF2F0]">
                      <Clock size={13} className="text-[#2A6558]" />
                    </div>
                    <Field
                      label="Time"
                      value={`${ev.startTime}${ev.durationHours ? ` (${ev.durationHours}h)` : ""}`}
                    />
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EAF2F0]">
                    <Users size={13} className="text-[#2A6558]" />
                  </div>
                  <Field label="Guest Count" value={`${ev.pax} guests`} />
                </div>
              </div>
            </div>

            {/* Venue preferences */}
            <div className="rounded-2xl border border-[#E0DDD5] bg-white p-6">
              <h2 className="mb-4 font-semibold text-[#1A1817]">Venue Preferences</h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EAF2F0]">
                    <MapPin size={13} className="text-[#2A6558]" />
                  </div>
                  <Field
                    label="Location"
                    value={[ev.city, ev.area].filter(Boolean).join(", ")}
                  />
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EAF2F0]">
                    <Building2 size={13} className="text-[#2A6558]" />
                  </div>
                  <Field label="Setting" value={ev.setting} />
                </div>
                {ev.catering && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EAF2F0]">
                      <Utensils size={13} className="text-[#2A6558]" />
                    </div>
                    <Field label="Catering" value={ev.catering} />
                  </div>
                )}
                {ev.venueCount && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EAF2F0]">
                      <ExternalLink size={13} className="text-[#2A6558]" />
                    </div>
                    <Field label="Venues to Compare" value={`${ev.venueCount} venues`} />
                  </div>
                )}
              </div>

              {/* Tone / ambiance keywords */}
              {ev.toneKeywords && (
                <div className="mt-4 border-t border-[#F0EDEA] pt-4">
                  <p className="mb-2 text-xs text-[#7C7671]">Tone &amp; Ambiance</p>
                  <div className="flex flex-wrap gap-2">
                    {ev.toneKeywords.split(",").map((k) => k.trim()).filter(Boolean).map((k) => (
                      <span
                        key={k}
                        className="rounded-full bg-[#EAF2F0] px-3 py-1 text-xs font-medium text-[#2A6558]"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Extra notes */}
              {ev.extraNotes && (
                <div className="mt-4 border-t border-[#F0EDEA] pt-4">
                  <p className="mb-1 text-xs text-[#7C7671]">Extra Notes</p>
                  <p className="text-sm text-[#1A1817]">{ev.extraNotes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Budget card – 1 col */}
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-[#E0DDD5] bg-white p-6">
              <h2 className="mb-4 font-semibold text-[#1A1817]">Budget Breakdown</h2>

              <div className="mb-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-[#7C7671]">
                    <TrendingDown size={13} className="text-[#27AE60]" /> Min
                  </span>
                  <span className="text-sm font-semibold text-[#1A1817]">
                    ₱{t.min.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-[#7C7671]">
                    <Minus size={13} className="text-[#2A6558]" /> Mid Est.
                  </span>
                  <span className="text-sm font-bold text-[#2A6558]">
                    ₱{midEstimate.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-[#7C7671]">
                    <TrendingUp size={13} className="text-red-400" /> Max
                  </span>
                  <span className="text-sm font-semibold text-[#1A1817]">
                    ₱{t.max.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Range bar */}
              <div className="mb-4">
                <div className="h-2 w-full rounded-full bg-[#F0EDEA] overflow-hidden">
                  <div className="h-2 w-[60%] rounded-full bg-gradient-to-r from-[#27AE60] via-[#2A6558] to-red-400" />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-[#7C7671]">
                  <span>Min</span>
                  <span>Max</span>
                </div>
              </div>

              <div className="space-y-2 border-t border-[#F0EDEA] pt-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#7C7671]">Budget type</span>
                  <span className="font-medium text-[#1A1817] capitalize">
                    {ev.budgetType === "per-head" ? "Per head" : "Overall total"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7C7671]">Input range</span>
                  <span className="font-medium text-[#1A1817]">{rangeLabel}</span>
                </div>
                {ev.budgetType === "per-head" && (
                  <div className="flex justify-between">
                    <span className="text-[#7C7671]">Total (est.)</span>
                    <span className="font-medium text-[#1A1817]">
                      ₱{midEstimate.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#7C7671]">Avg per head</span>
                  <span className="font-medium text-[#1A1817]">
                    ₱{perHeadTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* AI tip */}
            <div className="rounded-2xl bg-[#1A1817] p-5">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles size={13} className="text-[#7BC4B8]" />
                <span className="text-xs font-semibold uppercase tracking-widest text-[#7BC4B8]">
                  AI Insight
                </span>
              </div>
              <p className="text-xs leading-relaxed text-white/70">
                Based on your budget and guest count, you have{" "}
                <span className="text-white font-semibold">
                  ₱{perHeadTotal.toLocaleString()} per head
                </span>{" "}
                to work with. This is{" "}
                {perHeadTotal >= 1500
                  ? "a solid mid-tier budget — expect good venue options."
                  : "tight — consider adjusting catering or location."}
              </p>
              <Link
                href={`/recommendations?event=${ev.id}`}
                className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-[#7BC4B8] transition hover:text-white"
              >
                Get Recommendations <ExternalLink size={11} />
              </Link>
            </div>

            {/* Metadata */}
            <div className="rounded-2xl border border-[#E0DDD5] bg-white px-5 py-4">
              <p className="mb-2 text-xs font-semibold text-[#7C7671] uppercase tracking-widest">
                Metadata
              </p>
              <div className="flex flex-col gap-1.5 text-xs text-[#7C7671]">
                <span>
                  Created:{" "}
                  <span className="text-[#1A1817]">
                    {new Date(ev.createdAt).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </span>
                <span>
                  ID: <span className="font-mono text-[10px] text-[#1A1817]">{ev.id}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA bar */}
        <div className="flex items-center justify-between rounded-2xl bg-[#EAF2F0] px-6 py-4">
          <div>
            <p className="font-semibold text-[#1A1817]">Ready to find your venue?</p>
            <p className="text-xs text-[#7C7671]">
              AI will match {ev.pax} guests in {ev.city} to the best options.
            </p>
          </div>
          <Link
            href={`/recommendations?event=${ev.id}`}
            className="flex items-center gap-2 rounded-full bg-[#2A6558] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#215249] shadow-sm"
          >
            <Sparkles size={15} /> View Recommendations
          </Link>
        </div>

        <Modal
          open={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Event?"
          description={`You are about to delete "${ev.eventName}".`}
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="rounded-xl border border-[#E0DDD5] px-4 py-2 text-sm font-medium text-[#7C7671] transition hover:border-[#1A1817] hover:text-[#1A1817]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-xl bg-[#C0392B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#A93226]"
              >
                Delete Event
              </button>
            </div>
          }
        >
          <p className="text-sm leading-relaxed text-[#7C7671]">
            This action cannot be undone. Your saved event details and related recommendations will be removed.
          </p>
        </Modal>
      </main>
    </AppShell>
  );
}

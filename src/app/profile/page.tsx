"use client";

import { useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { SavedEvent } from "@/lib/types";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/AuthContext";
import { useEventsContext } from "@/lib/EventsContext";
import { useToast } from "@/lib/ToastContext";
import { supabase } from "@/lib/supabase/client";
import {
  Building2,
  CalendarDays,
  FileText,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  Users,
  UserRound,
} from "lucide-react";

const planningForOptions = [
  "My own event",
  "A client",
  "My company",
  "Family or friend",
];

const eventTypeOptions = [
  "Wedding",
  "Birthday",
  "Corporate",
  "Debut",
  "Workshop",
  "Other",
];

const timelineOptions = [
  "Within 1 month",
  "1-3 months",
  "3-6 months",
  "6+ months",
];

interface ProfileForm {
  fullName: string;
  phone: string;
  company: string;
  bio: string;
  planningFor: string;
  eventType: string;
  eventTimeline: string;
}

function readString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value : "";
}

function readFullName(metadata: Record<string, unknown>) {
  const options = [
    metadata.full_name,
    metadata.name,
    metadata.user_name,
    metadata.preferred_username,
  ];
  const value = options.find(
    (item): item is string => typeof item === "string" && item.trim().length > 0
  );
  return value?.trim() ?? "";
}

function buildProfileForm(metadata: Record<string, unknown>): ProfileForm {
  return {
    fullName: readFullName(metadata),
    phone: readString(metadata, "contact_number") || readString(metadata, "phone"),
    company: readString(metadata, "company"),
    bio: readString(metadata, "bio"),
    planningFor: readString(metadata, "planning_for"),
    eventType: readString(metadata, "event_type"),
    eventTimeline: readString(metadata, "event_timeline"),
  };
}

function displayProvider(provider: unknown) {
  if (typeof provider !== "string" || provider.length === 0) {
    return "Email";
  }
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

interface ProfileEditorProps {
  user: User;
  events: SavedEvent[];
  initialForm: ProfileForm;
}

function ProfileEditor({ user, events, initialForm }: ProfileEditorProps) {
  const { success, error: showError } = useToast();
  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [savedForm, setSavedForm] = useState<ProfileForm>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const hasChanges = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedForm),
    [form, savedForm]
  );

  const eventCount = events.length;
  const confirmedCount = events.filter((event) => event.status === "Confirmed").length;
  const totalGuests = events.reduce((sum, event) => sum + event.pax, 0);

  const initials = useMemo(() => {
    const source = form.fullName.trim() || user.email || "User";
    const parts = source.split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }, [form.fullName, user.email]);

  const providerLabel = displayProvider(user.app_metadata?.provider);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.fullName.trim()) {
      nextErrors.fullName = "Full name is required.";
    } else if (form.fullName.trim().length < 2) {
      nextErrors.fullName = "Full name must be at least 2 characters.";
    }

    if (form.phone.trim() && !/^\d{7,15}$/.test(form.phone.trim())) {
      nextErrors.phone = "Contact number must contain digits only (7–15 digits).";
    }

    if (form.bio.trim().length > 280) {
      nextErrors.bio = "Bio must be 280 characters or less.";
    }

    return nextErrors;
  };

  const handleSave = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const normalized: ProfileForm = {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      company: form.company.trim(),
      bio: form.bio.trim(),
      planningFor: form.planningFor,
      eventType: form.eventType,
      eventTimeline: form.eventTimeline,
    };

    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    setSaving(true);

    const { error } = await supabase.auth.updateUser({
      data: {
        ...metadata,
        full_name: normalized.fullName,
        phone: normalized.phone,
        contact_number: normalized.phone,
        company: normalized.company,
        bio: normalized.bio,
        planning_for: normalized.planningFor,
        event_type: normalized.eventType,
        event_timeline: normalized.eventTimeline,
      },
    });

    if (error) {
      showError("Unable to update profile", "Please try again.");
      setSaving(false);
      return;
    }

    await supabase.auth.refreshSession();

    setForm(normalized);
    setSavedForm(normalized);
    setSaving(false);
    success("Profile updated", "Your profile details are now up to date.");
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 page-fade">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1A1817]">
            Profile
          </h1>
          <p className="mt-1 text-sm text-[#7C7671]">
            Manage your account details and planning preferences.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!hasChanges || saving}
          className="flex items-center gap-2 rounded-full bg-[#2A6558] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#215249] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Save size={16} />
          )}
          Save Profile
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-6">
          <div className="rounded-2xl border border-[#E0DDD5] bg-white p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF2F0] text-lg font-bold text-[#2A6558]">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-[#1A1817]">
                  {form.fullName || "Your Name"}
                </p>
                <p className="truncate text-xs text-[#7C7671]">{user.email}</p>
              </div>
            </div>

            <div className="space-y-3 border-t border-[#F0EDEA] pt-4 text-xs text-[#7C7671]">
              <p className="flex items-center gap-2">
                <Mail size={13} className="text-[#2A6558]" />
                {user.email}
              </p>
              <p className="flex items-center gap-2">
                <ShieldCheck size={13} className="text-[#2A6558]" />
                Provider: {providerLabel}
              </p>
              <p className="flex items-center gap-2">
                <CalendarDays size={13} className="text-[#2A6558]" />
                Member since{" "}
                {new Date(user.created_at).toLocaleDateString("en-PH", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {[
              {
                label: "Saved Events",
                value: String(eventCount),
                icon: <FileText size={16} className="text-[#2A6558]" />,
              },
              {
                label: "Confirmed",
                value: String(confirmedCount),
                icon: <Sparkles size={16} className="text-[#2A6558]" />,
              },
              {
                label: "Total Guests",
                value: totalGuests.toLocaleString(),
                icon: <Users size={16} className="text-[#2A6558]" />,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-[#E0DDD5] bg-white p-4"
              >
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-[#EAF2F0]">
                  {item.icon}
                </div>
                <p className="text-xl font-extrabold text-[#1A1817]">{item.value}</p>
                <p className="text-xs text-[#7C7671]">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#E0DDD5] bg-white p-6 lg:col-span-2">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#1A1817]">Personal Information</h2>
            <p className="mt-1 text-sm text-[#7C7671]">
              Keep your details updated for better recommendations.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-[#1A1817]">
                Full Name
              </label>
              <div className="relative">
                <UserRound
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C7671]"
                />
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, fullName: event.target.value }))
                  }
                  className={`w-full rounded-xl border bg-white py-3 pl-10 pr-4 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558] focus:ring-2 focus:ring-[#2A6558]/20 ${
                    errors.fullName ? "border-[#C0392B]" : "border-[#E0DDD5]"
                  }`}
                  placeholder="Juan dela Cruz"
                />
              </div>
              {errors.fullName && (
                <p className="mt-1 text-xs text-[#C0392B]">{errors.fullName}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#1A1817]">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C7671]"
                />
                <input
                  type="email"
                  value={user.email ?? ""}
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-[#E0DDD5] bg-[#F8F6F1] py-3 pl-10 pr-4 text-sm text-[#7C7671]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#1A1817]">
                Contact Number
              </label>
              <div className="relative">
                <Phone
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C7671]"
                />
                <input
                  type="tel"
                  inputMode="numeric"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      phone: event.target.value.replace(/\D/g, "").slice(0, 15),
                    }))
                  }
                  className={`w-full rounded-xl border bg-white py-3 pl-10 pr-4 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558] focus:ring-2 focus:ring-[#2A6558]/20 ${
                    errors.phone ? "border-[#C0392B]" : "border-[#E0DDD5]"
                  }`}
                  placeholder="09171234567"
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-xs text-[#C0392B]">{errors.phone}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-[#1A1817]">
                Company or Team
              </label>
              <div className="relative">
                <Building2
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C7671]"
                />
                <input
                  type="text"
                  value={form.company}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, company: event.target.value }))
                  }
                  className="w-full rounded-xl border border-[#E0DDD5] bg-white py-3 pl-10 pr-4 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558] focus:ring-2 focus:ring-[#2A6558]/20"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#1A1817]">
                Planning For
              </label>
              <select
                value={form.planningFor}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, planningFor: event.target.value }))
                }
                className="w-full rounded-xl border border-[#E0DDD5] bg-white px-4 py-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558] focus:ring-2 focus:ring-[#2A6558]/20"
              >
                <option value="">Select</option>
                {planningForOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#1A1817]">
                Event Type
              </label>
              <select
                value={form.eventType}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, eventType: event.target.value }))
                }
                className="w-full rounded-xl border border-[#E0DDD5] bg-white px-4 py-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558] focus:ring-2 focus:ring-[#2A6558]/20"
              >
                <option value="">Select</option>
                {eventTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-[#1A1817]">
                Event Timeline
              </label>
              <select
                value={form.eventTimeline}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, eventTimeline: event.target.value }))
                }
                className="w-full rounded-xl border border-[#E0DDD5] bg-white px-4 py-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558] focus:ring-2 focus:ring-[#2A6558]/20"
              >
                <option value="">Select</option>
                {timelineOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-[#1A1817]">
                Short Bio
              </label>
              <textarea
                value={form.bio}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, bio: event.target.value }))
                }
                rows={4}
                placeholder="Tell us about your role or the kind of events you usually plan."
                className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558] focus:ring-2 focus:ring-[#2A6558]/20 ${
                  errors.bio ? "border-[#C0392B]" : "border-[#E0DDD5]"
                }`}
              />
              <div className="mt-1 flex items-center justify-between">
                {errors.bio ? (
                  <p className="text-xs text-[#C0392B]">{errors.bio}</p>
                ) : (
                  <span className="text-xs text-[#7C7671]">
                    This helps tailor your AI suggestions.
                  </span>
                )}
                <span className="text-xs text-[#7C7671]">{form.bio.length}/280</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { events } = useEventsContext();

  if (!user) {
    return (
      <AppShell>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A6558] border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const initialForm = buildProfileForm(metadata);
  const formStateKey = `${user.id}:${user.updated_at ?? ""}`;

  return (
    <AppShell>
      <ProfileEditor
        key={formStateKey}
        user={user}
        events={events}
        initialForm={initialForm}
      />
    </AppShell>
  );
}

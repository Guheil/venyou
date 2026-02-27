"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/AuthContext";
import { useTheme, type ThemeMode } from "@/lib/ThemeContext";
import { useToast } from "@/lib/ToastContext";
import { supabase } from "@/lib/supabase/client";
import {
  Bell,
  Check,
  ChevronRight,
  KeyRound,
  Lock,
  Mail,
  Moon,
  Save,
  ShieldCheck,
  Sparkles,
  Sun,
} from "lucide-react";

interface SettingsForm {
  newsletter: boolean;
  emailUpdates: boolean;
  venueAlerts: boolean;
  weeklySummary: boolean;
}

interface PasswordForm {
  newPassword: string;
  confirmPassword: string;
}

function readBoolean(
  metadata: Record<string, unknown>,
  key: string,
  fallback: boolean
) {
  const value = metadata[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  return fallback;
}

function buildSettingsForm(metadata: Record<string, unknown>): SettingsForm {
  return {
    newsletter: readBoolean(metadata, "newsletter", false),
    emailUpdates: readBoolean(metadata, "email_updates", true),
    venueAlerts: readBoolean(metadata, "venue_alerts", true),
    weeklySummary: readBoolean(metadata, "weekly_summary", true),
  };
}

function displayProvider(provider: unknown) {
  if (typeof provider !== "string" || provider.length === 0) return "Email";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

interface SettingsEditorProps {
  user: User;
  initialSettings: SettingsForm;
}

function SettingsEditor({ user, initialSettings }: SettingsEditorProps) {
  const { success, error: showError } = useToast();
  const { theme, setTheme, savingTheme } = useTheme();
  const [settings, setSettings] = useState<SettingsForm>(initialSettings);
  const [savedSettings, setSavedSettings] = useState<SettingsForm>(initialSettings);
  const [themeSelection, setThemeSelection] = useState<ThemeMode>(theme);
  const [savedTheme, setSavedTheme] = useState<ThemeMode>(theme);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    newPassword: "",
    confirmPassword: "",
  });
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const hasPreferenceChanges = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [settings, savedSettings]
  );
  const hasThemeChanges = themeSelection !== savedTheme;

  const providerLabel = displayProvider(user.app_metadata?.provider);
  const isEmailProvider = user.app_metadata?.provider === "email";

  useEffect(() => {
    setThemeSelection(theme);
    setSavedTheme(theme);
  }, [theme]);

  const handleSavePreferences = async () => {
    setSavingPreferences(true);

    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const { error } = await supabase.auth.updateUser({
      data: {
        ...metadata,
        newsletter: settings.newsletter,
        email_updates: settings.emailUpdates,
        venue_alerts: settings.venueAlerts,
        weekly_summary: settings.weeklySummary,
      },
    });

    if (error) {
      showError("Unable to save settings", "Please try again.");
      setSavingPreferences(false);
      return;
    }

    await supabase.auth.refreshSession();

    setSavedSettings(settings);
    setSavingPreferences(false);
    success("Settings updated", "Your preferences were saved.");
  };

  const handleChangePassword = async () => {
    setPasswordError("");

    const password = passwordForm.newPassword;
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setPasswordError("Password must include at least one uppercase letter.");
      return;
    }
    if (!/\d/.test(password)) {
      setPasswordError("Password must include at least one number.");
      return;
    }
    if (password !== passwordForm.confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setSavingPassword(true);

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setPasswordError("Unable to update password. Please try again.");
      setSavingPassword(false);
      return;
    }

    setSavingPassword(false);
    setPasswordForm({ newPassword: "", confirmPassword: "" });
    success("Password updated", "Your new password is now active.");
  };

  const handleSaveTheme = async () => {
    const saved = await setTheme(themeSelection, { persist: true });
    if (!saved) {
      showError("Unable to save theme", "Please try again.");
      return;
    }

    setSavedTheme(themeSelection);
    success("Theme updated", `Theme set to ${themeSelection}.`);
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 page-fade">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1A1817]">
            Settings
          </h1>
          <p className="mt-1 text-sm text-[#7C7671]">
            Control notifications, account security, and update preferences.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSavePreferences()}
          disabled={!hasPreferenceChanges || savingPreferences}
          className="flex items-center gap-2 rounded-full bg-[#2A6558] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#215249] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingPreferences ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Save size={16} />
          )}
          Save Settings
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-6">
          <div className="rounded-2xl border border-[#E0DDD5] bg-white p-6">
            <h2 className="mb-4 text-base font-bold text-[#1A1817]">Account</h2>
            <div className="space-y-3 text-xs text-[#7C7671]">
              <p className="flex items-center gap-2">
                <Mail size={13} className="text-[#2A6558]" />
                {user.email}
              </p>
              <p className="flex items-center gap-2">
                <ShieldCheck size={13} className="text-[#2A6558]" />
                Provider: {providerLabel}
              </p>
              <p className="flex items-center gap-2">
                <Lock size={13} className="text-[#2A6558]" />
                Last sign in:{" "}
                {user.last_sign_in_at
                  ? new Date(user.last_sign_in_at).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "-"}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-[#1A1817] p-5">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles size={14} className="text-[#7BC4B8]" />
              <span className="text-xs font-semibold uppercase tracking-widest text-[#7BC4B8]">
                Planner Tip
              </span>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-white/80">
              Keep email updates enabled to receive reminders before event dates and
              suggestion refreshes.
            </p>
            <Link
              href="/profile"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#7BC4B8] hover:underline"
            >
              Update profile <ChevronRight size={13} />
            </Link>
          </div>
        </section>

        <section className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-[#E0DDD5] bg-white p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[#1A1817]">Appearance</h2>
                <p className="mt-1 text-sm text-[#7C7671]">
                  Choose your personal theme. This is saved per account.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleSaveTheme()}
                disabled={!hasThemeChanges || savingTheme}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1A1817] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2A6558] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingTheme ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Save size={15} />
                )}
                Save Theme
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  key: "light" as ThemeMode,
                  title: "Light",
                  description: "Clean and bright interface for daytime use.",
                  icon: <Sun size={16} />,
                },
                {
                  key: "dark" as ThemeMode,
                  title: "Dark",
                  description: "Lower glare for night-time planning sessions.",
                  icon: <Moon size={16} />,
                },
              ].map((option) => {
                const selected = themeSelection === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setThemeSelection(option.key);
                      void setTheme(option.key, { persist: false });
                    }}
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      selected
                        ? "border-[#C8E0DA] bg-[#EAF2F0]"
                        : "border-[#E0DDD5] bg-white hover:border-[#2A6558]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p
                          className={`text-sm font-semibold ${
                            selected ? "text-[#215249]" : "text-[#1A1817]"
                          }`}
                        >
                          {option.title}
                        </p>
                        <p className="mt-0.5 text-xs text-[#7C7671]">
                          {option.description}
                        </p>
                      </div>
                      <span
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          selected
                            ? "bg-[#2A6558] text-white"
                            : "bg-[#F0EDEA] text-[#7C7671]"
                        }`}
                      >
                        {option.icon}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E0DDD5] bg-white p-6">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-[#1A1817]">Notifications</h2>
              <p className="mt-1 text-sm text-[#7C7671]">
                Choose which messages you want from VenYOU.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  key: "newsletter",
                  label: "Product newsletter",
                  description: "Monthly product updates and feature releases.",
                },
                {
                  key: "emailUpdates",
                  label: "Account activity emails",
                  description: "Important sign-in and account change alerts.",
                },
                {
                  key: "venueAlerts",
                  label: "Venue recommendation alerts",
                  description: "When new matching venues are available.",
                },
                {
                  key: "weeklySummary",
                  label: "Weekly planning summary",
                  description: "A weekly digest of events and next actions.",
                },
              ].map((option) => {
                const enabled = settings[option.key as keyof SettingsForm];
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        [option.key]: !prev[option.key as keyof SettingsForm],
                      }))
                    }
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      enabled
                        ? "border-[#C8E0DA] bg-[#EAF2F0]"
                        : "border-[#E0DDD5] bg-white hover:border-[#2A6558]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p
                          className={`text-sm font-semibold ${
                            enabled ? "text-[#215249]" : "text-[#1A1817]"
                          }`}
                        >
                          {option.label}
                        </p>
                        <p className="mt-0.5 text-xs text-[#7C7671]">
                          {option.description}
                        </p>
                      </div>
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                          enabled ? "bg-[#2A6558] text-white" : "bg-[#F0EDEA] text-transparent"
                        }`}
                      >
                        <Check size={12} />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E0DDD5] bg-white p-6">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-[#1A1817]">Security</h2>
              <p className="mt-1 text-sm text-[#7C7671]">
                Keep your account secure with a strong password.
              </p>
            </div>

            {isEmailProvider ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#1A1817]">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        newPassword: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-[#E0DDD5] bg-white px-4 py-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558] focus:ring-2 focus:ring-[#2A6558]/20"
                    placeholder="At least 8 characters"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#1A1817]">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        confirmPassword: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-[#E0DDD5] bg-white px-4 py-3 text-sm text-[#1A1817] outline-none transition focus:border-[#2A6558] focus:ring-2 focus:ring-[#2A6558]/20"
                    placeholder="Re-enter password"
                  />
                </div>

                {passwordError && (
                  <p className="sm:col-span-2 rounded-xl border border-[#F2C5BE] bg-[#FDECEA] px-3 py-2 text-xs text-[#C0392B]">
                    {passwordError}
                  </p>
                )}

                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={() => void handleChangePassword()}
                    disabled={savingPassword}
                    className="flex items-center gap-2 rounded-xl bg-[#1A1817] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2A6558] disabled:opacity-60"
                  >
                    {savingPassword ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <KeyRound size={15} />
                    )}
                    Update Password
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[#C8E0DA] bg-[#EAF2F0] px-4 py-3 text-sm text-[#215249]">
                Password is managed by your {providerLabel} account. Security updates
                should be done with your identity provider.
              </div>
            )}

            <div className="mt-4 rounded-xl border border-[#E0DDD5] bg-[#F8F6F1] px-4 py-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-[#1A1817]">
                <Bell size={13} className="text-[#2A6558]" />
                Password policy
              </p>
              <p className="mt-1 text-xs text-[#7C7671]">
                Use at least 8 characters, one uppercase letter, and one number.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();

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
  const initialSettings = buildSettingsForm(metadata);
  const formStateKey = `${user.id}:${user.updated_at ?? ""}`;

  return (
    <AppShell>
      <SettingsEditor
        key={formStateKey}
        user={user}
        initialSettings={initialSettings}
      />
    </AppShell>
  );
}

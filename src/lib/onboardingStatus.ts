import type { User } from "@supabase/supabase-js";

const RETURNING_SIGN_IN_GRACE_MS = 60 * 60 * 1000;

function readProvider(user: User | null): string | null {
  return typeof user?.app_metadata?.provider === "string"
    ? user.app_metadata.provider
    : null;
}

function readUserMetadata(user: User | null): Record<string, unknown> {
  const metadata = user?.user_metadata;
  if (!metadata || typeof metadata !== "object") return {};
  return metadata as Record<string, unknown>;
}

function readTimestamp(value: string | null | undefined): number | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasLegacyOnboardingMetadata(user: User | null): boolean {
  const metadata = readUserMetadata(user);
  const hasPlanningSignals =
    typeof metadata.planning_for === "string" &&
    typeof metadata.event_type === "string" &&
    typeof metadata.event_timeline === "string";
  const hasAgreementSignals =
    typeof metadata.agreed_terms_at === "string" &&
    typeof metadata.agreed_privacy_at === "string";
  return hasPlanningSignals && hasAgreementSignals;
}

function isLikelyReturningSocialUser(user: User | null): boolean {
  const createdAt = readTimestamp(user?.created_at);
  const lastSignInAt = readTimestamp(user?.last_sign_in_at);
  if (createdAt === null || lastSignInAt === null) return false;
  if (lastSignInAt < createdAt) return false;
  return lastSignInAt - createdAt > RETURNING_SIGN_IN_GRACE_MS;
}

export function isSocialProviderUser(user: User | null): boolean {
  const authProvider = readProvider(user);
  return Boolean(authProvider && authProvider !== "email");
}

export function isOnboardingComplete(user: User | null): boolean {
  const metadata = readUserMetadata(user);
  const hasExplicitFlag =
    metadata.onboarding_complete === true ||
    metadata.onboarding_complete === "true";

  if (hasExplicitFlag) return true;
  return hasLegacyOnboardingMetadata(user);
}

export function shouldRequireSocialOnboarding(user: User | null): boolean {
  if (!user) return false;
  if (!isSocialProviderUser(user)) return false;
  if (isOnboardingComplete(user)) return false;
  if (isLikelyReturningSocialUser(user)) return false;
  return true;
}

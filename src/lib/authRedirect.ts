const configuredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "";

function normalizeBaseUrl(rawUrl: string) {
  if (!rawUrl) return "";

  const withProtocol = /^https?:\/\//i.test(rawUrl)
    ? rawUrl
    : `https://${rawUrl}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return "";
  }
}

export function getAuthRedirectBaseUrl() {
  const fromEnv = normalizeBaseUrl(configuredSiteUrl);
  if (fromEnv) return fromEnv;

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://localhost:3000";
}

export function buildAuthRedirectUrl(pathname: string) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${getAuthRedirectBaseUrl()}${normalizedPath}`;
}

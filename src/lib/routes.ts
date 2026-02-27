export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  dashboard: "/dashboard",
  events: "/events",
  createEvent: "/create-event",
  recommendations: "/recommendations",
  support: "/support",
  venue: "/venue",
  profile: "/profile",
  settings: "/settings",
} as const;

export const AUTH_ROUTE_PREFIXES = [ROUTES.login, ROUTES.register] as const;
export const PROTECTED_ROUTE_PREFIXES = [
  ROUTES.dashboard,
  ROUTES.events,
  ROUTES.createEvent,
  ROUTES.recommendations,
  ROUTES.support,
  ROUTES.venue,
  ROUTES.profile,
  ROUTES.settings,
] as const;

export function pathMatchesPrefixes(
  pathname: string,
  prefixes: readonly string[]
) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

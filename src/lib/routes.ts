export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  dashboard: "/dashboard",
  events: "/events",
  createEvent: "/create-event",
  analysis: "/cost-analysis",
  recommendations: "/recommendations",
  support: "/support",
  venue: "/venue",
  reserve: "/reserve",
  profile: "/profile",
  settings: "/settings",
  reservations: "/reservations",
} as const;

export const AUTH_ROUTE_PREFIXES = [ROUTES.login, ROUTES.register] as const;
export const PROTECTED_ROUTE_PREFIXES = [
  ROUTES.dashboard,
  ROUTES.events,
  ROUTES.createEvent,
  ROUTES.analysis,
  ROUTES.recommendations,
  ROUTES.support,
  ROUTES.venue,
  ROUTES.reserve,
  ROUTES.profile,
  ROUTES.settings,
  ROUTES.reservations,
] as const;

export function pathMatchesPrefixes(
  pathname: string,
  prefixes: readonly string[]
) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

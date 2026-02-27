import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { shouldRequireSocialOnboarding } from "@/lib/onboardingStatus";
import {
  AUTH_ROUTE_PREFIXES,
  PROTECTED_ROUTE_PREFIXES,
  ROUTES,
  pathMatchesPrefixes,
} from "@/lib/routes";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function updateSession(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase env vars are missing. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtectedRoute = pathMatchesPrefixes(pathname, PROTECTED_ROUTE_PREFIXES);
  const isAuthRoute = pathMatchesPrefixes(pathname, AUTH_ROUTE_PREFIXES);
  const needsOnboarding = shouldRequireSocialOnboarding(user ?? null);

  if (!user && isProtectedRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = ROUTES.login;
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (needsOnboarding && pathname !== ROUTES.register) {
    const registerUrl = request.nextUrl.clone();
    registerUrl.pathname = ROUTES.register;
    registerUrl.searchParams.delete("next");
    return NextResponse.redirect(registerUrl);
  }

  if (user && !needsOnboarding && isAuthRoute) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = ROUTES.dashboard;
    dashboardUrl.searchParams.delete("next");
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

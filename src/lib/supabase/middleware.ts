import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedRoutes = [
  "/dashboard",
  "/events",
  "/create-event",
  "/recommendations",
  "/profile",
  "/settings",
];
const authRoutes = ["/login", "/register"];
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function routeMatches(pathname: string, routes: string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

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
  const isProtectedRoute = routeMatches(pathname, protectedRoutes);
  const isAuthRoute = routeMatches(pathname, authRoutes);
  const authProvider =
    typeof user?.app_metadata?.provider === "string"
      ? user.app_metadata.provider
      : null;
  const isSocialProvider = Boolean(authProvider && authProvider !== "email");
  const onboardingComplete =
    user?.user_metadata?.onboarding_complete === true ||
    user?.user_metadata?.onboarding_complete === "true";
  const needsOnboarding = Boolean(user && isSocialProvider && !onboardingComplete);

  if (!user && isProtectedRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (needsOnboarding && pathname !== "/register") {
    const registerUrl = request.nextUrl.clone();
    registerUrl.pathname = "/register";
    registerUrl.searchParams.delete("next");
    return NextResponse.redirect(registerUrl);
  }

  if (user && !needsOnboarding && isAuthRoute) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.searchParams.delete("next");
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

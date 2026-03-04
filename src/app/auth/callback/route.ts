import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Handles the redirect from Supabase email confirmation links.
 *
 * When a user clicks "Confirm your email" in the verification email,
 * Supabase redirects them here with a `code` query parameter (PKCE flow).
 * We exchange that code for a valid session, then redirect to the login page.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/login";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Email is now confirmed — send the user to the target page
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  // If there's no code or the exchange failed, redirect to login
  return NextResponse.redirect(new URL("/login", origin));
}

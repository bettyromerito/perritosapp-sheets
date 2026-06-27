import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars are missing at runtime, fail open and log — don't crash with 500
  if (!url || !key) {
    console.error("[proxy] Missing Supabase env vars — skipping auth check");
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { pathname } = request.nextUrl;
    const isPublicPath =
      pathname.startsWith("/login") || pathname.startsWith("/auth");

    if (!user && !isPublicPath) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      const redirectResponse = NextResponse.redirect(loginUrl);
      // Copy refreshed session cookies to the redirect response so they're not lost
      supabaseResponse.cookies.getAll().forEach(({ name, value, ...opts }) =>
        redirectResponse.cookies.set(name, value, opts)
      );
      return redirectResponse;
    }
  } catch (err) {
    console.error("[proxy] Unexpected error — failing open:", err);
    // Return supabaseResponse (not a redirect) so a getUser() network error
    // doesn't produce a 500 or kick authenticated users to login
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

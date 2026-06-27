import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Determine the correct base URL for redirects (handles Vercel's x-forwarded-host)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const redirectBase =
    forwardedHost && process.env.NODE_ENV === "production"
      ? `https://${forwardedHost}`
      : origin;

  if (code) {
    // Capture cookies produced by exchangeCodeForSession so we can set them
    // on the explicit redirect response — cookies() from next/headers does NOT
    // carry over to a NextResponse.redirect() returned from a Route Handler.
    const pendingCookies: { name: string; value: string; options: Record<string, unknown> }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach((c) => pendingCookies.push(c));
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const response = NextResponse.redirect(`${redirectBase}/`);
      // Attach the session cookies to the redirect so the browser stores them
      pendingCookies.forEach(({ name, value, options }) =>
        response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
      );
      return response;
    }

    console.error("[auth/callback] exchangeCodeForSession error:", error.message);
  }

  return NextResponse.redirect(`${redirectBase}/login`);
}

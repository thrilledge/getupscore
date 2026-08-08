import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

/**
 * Supabase middleware for refreshing sessions on every request.
 * Use in middleware.ts at the root:
 *
 *   export { updateSession as middleware } from "@/lib/supabase/middleware";
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    {
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
    }
  );

  // Refresh session — this also sets the cookie if it's expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is not authenticated and not on an auth/public page, redirect to login
  // API routes handle their own auth — don't redirect them
  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup") ||
    request.nextUrl.pathname.startsWith("/auth");

  // Public marketing pages — visible without authentication
  const isPublicPage = request.nextUrl.pathname === "/";

  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");

  if (!user && !isAuthPage && !isPublicPage && !isApiRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If user is authenticated and on an auth page, redirect to dashboard
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

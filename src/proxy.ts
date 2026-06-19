export { updateSession as proxy } from "@/lib/supabase/middleware";

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public/*)
     * - api/webhooks (webhook endpoints that need public access)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api/webhooks).*)",
  ],
};

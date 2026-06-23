export { updateSession as proxy } from "@/lib/supabase/middleware";

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public/*)
     * - api/webhooks
     * - api/jobs/cron (authenticated via Bearer token)
     * - api/extension/* (extension API routes authenticated via Bearer token)
     * - api/notifications/send (authenticated via Bearer token)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api/webhooks|api/jobs/cron|api/extension/|api/notifications/send|api/proposals/generate).*)",
  ],
};

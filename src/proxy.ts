export { updateSession as proxy } from "@/lib/supabase/middleware";

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - Static assets in public/ (served from root, not /public/)
     * - api/webhooks, api/inngest, etc. (authenticated via Bearer token)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*.png|.*.jpg|.*.jpeg|.*.gif|.*.svg|.*.webp|.*.ico|.*.woff|.*.woff2|.*.ttf|.*.eot|.*.otf|api/webhooks|api/inngest|api/jobs/cron|api/extension/|api/notifications/send|api/proposals/generate).*)",
  ],
};

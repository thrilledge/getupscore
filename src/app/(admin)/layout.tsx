"use client";

import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { useAdmin } from "@/hooks/use-admin";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { env } from "@/lib/env";
import { ChevronRight } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/admin": "Overview",
  "/admin/users": "Users",
  "/admin/users-enhanced": "Users",
  "/admin/subscriptions": "Subscriptions",
  "/admin/system": "System",
  "/admin/llm": "LLM Usage",
  "/admin/revenue": "Revenue & Conversion",
  "/admin/proposals-analytics": "Proposals Analytics",
  "/admin/errors": "Error Logs",
  "/admin/bulk-email": "Bulk Email",
  "/admin/feedback": "User Feedback",
  "/admin/ab-tests": "A/B Tests",
  "/admin/coupons": "Coupons",
  "/admin/affiliates": "Affiliates",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, loading } = useAdmin();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push("/dashboard");
    }
  }, [loading, isAdmin, router]);

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0A0A0A]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 size-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00C98B]/15 blur-[120px]"
        />

        <div className="relative z-10 text-center">
          <div className="relative mx-auto grid size-14 place-items-center">
            <span className="absolute inset-0 animate-ping rounded-2xl border border-[#00C98B]/25" />
            <span className="absolute inset-1 animate-spin rounded-xl border-2 border-white/10 border-t-[#00C98B]" />
            <span className="size-2 rounded-full bg-[#00C98B] shadow-[0_0_15px_rgba(0,201,139,0.9)]" />
          </div>

          <p className="mt-5 font-heading text-sm font-semibold text-white">
            Loading admin panel
          </p>
          <p className="mt-1 text-xs text-white/35">
            Verifying admin access...
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const pageTitle =
    Object.entries(pageTitles).find(([path]) =>
      pathname.startsWith(path)
    )?.[1] ?? "Admin";

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16.5rem",
          "--sidebar-width-icon": "4rem",
        } as React.CSSProperties
      }
      className="min-h-screen bg-[#F7F8F8]"
    >
      <AdminSidebar />

      <main
        className="relative h-svh min-w-0 flex-1 overflow-y-auto bg-[#F7F8F8]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,201,139,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,139,0.018) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
        }}
      >
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0A0A0A]/95 text-white shadow-[0_6px_24px_rgba(0,0,0,0.12)] backdrop-blur-xl">
          <div className="relative flex h-16 items-center gap-3 px-4 sm:px-5 lg:px-6">
            <SidebarTrigger className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-white/65 transition-all duration-300 hover:border-[#00C98B]/40 hover:bg-[#00C98B]/10 hover:text-[#00C98B]" />

            <span className="hidden h-5 w-px bg-white/10 sm:block" />

            <div className="flex min-w-0 items-center gap-2">
              <span className="hidden truncate text-xs font-medium text-white/35 sm:inline">
                {env.APP_NAME}
              </span>

              <ChevronRight className="hidden size-3.5 shrink-0 text-white/20 sm:block" />

              <span className="text-xs font-medium text-[#00C98B]/60">
                Admin
              </span>

              <ChevronRight className="hidden size-3.5 shrink-0 text-white/20 sm:block" />

              <div className="flex min-w-0 items-center gap-2">
                <span className="size-1.5 shrink-0 rounded-full bg-[#00C98B] shadow-[0_0_8px_rgba(0,201,139,0.8)]" />

                <h1 className="truncate font-heading text-sm font-semibold text-white">
                  {pageTitle}
                </h1>
              </div>
            </div>

            <div className="flex-1" />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#00C98B]/40 to-transparent" />
          </div>
        </header>

        <div className="relative z-10 mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-5 sm:py-6 lg:px-6">
          <div
            key={pathname}
            className="animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            {children}
          </div>
        </div>
      </main>
    </SidebarProvider>
  );
}

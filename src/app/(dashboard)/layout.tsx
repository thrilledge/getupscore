"use client";

import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ReferralSignupRecorder } from "@/components/referral-signup-recorder";
import { useUser } from "@/hooks/use-user";
import {
  useRouter,
  usePathname,
} from "next/navigation";
import { useEffect } from "react";
import { env } from "@/lib/env";
import { ChevronRight } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/filters": "Job Filters",
  "/jobs": "Jobs",
  "/saved": "Saved Jobs",
  "/channels": "Notification Channels",
  "/rules": "Notification Rules",
  "/notifications": "Notifications",
  "/proposals": "Proposals",
  "/upwork-profile": "Upwork Profile",
  "/market-trends": "Market Trends",
  "/extension": "Extension",
  "/settings": "Settings",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0A0A0A]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 size-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00C98B]/15 blur-[120px]"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,201,139,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,139,0.06) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(circle at center, black, transparent 65%)",
            WebkitMaskImage:
              "radial-gradient(circle at center, black, transparent 65%)",
          }}
        />

        <div className="relative z-10 text-center">
          <div className="relative mx-auto grid size-14 place-items-center">
            <span className="absolute inset-0 animate-ping rounded-2xl border border-[#00C98B]/25" />

            <span className="absolute inset-1 animate-spin rounded-xl border-2 border-white/10 border-t-[#00C98B]" />

            <span className="size-2 rounded-full bg-[#00C98B] shadow-[0_0_15px_rgba(0,201,139,0.9)]" />
          </div>

          <p className="mt-5 font-heading text-sm font-semibold text-white">
            Loading your workspace
          </p>

          <p className="mt-1 text-xs text-white/35">
            Preparing your dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const pageTitle =
    Object.entries(pageTitles).find(([path]) =>
      pathname.startsWith(path)
    )?.[1] ?? "Dashboard";

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
      <AppSidebar />
      <ReferralSignupRecorder />

      <main
        className="relative h-svh min-w-0 flex-1 overflow-y-auto bg-[#F7F8F8]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,201,139,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,139,0.018) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
        }}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0A0A0A]/95 text-white shadow-[0_6px_24px_rgba(0,0,0,0.12)] backdrop-blur-xl">
          <div className="relative flex h-16 items-center gap-3 px-4 sm:px-5 lg:px-6">
            <SidebarTrigger className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-white/65 transition-all duration-300 hover:border-[#00C98B]/40 hover:bg-[#00C98B]/10 hover:text-[#00C98B]" />

            <span className="hidden h-5 w-px bg-white/10 sm:block" />

            <div className="flex min-w-0 items-center gap-2">
              <span className="hidden truncate text-xs font-medium text-white/35 sm:inline">
                {env.APP_NAME}
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

            {/* <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 sm:flex">
              <span className="size-1.5 rounded-full bg-[#00C98B]" />

              <span className="max-w-[180px] truncate text-[11px] font-medium text-white/45">
                {user.email}
              </span>
            </div> */}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#00C98B]/40 to-transparent" />
          </div>
        </header>

        {/* Page content */}
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
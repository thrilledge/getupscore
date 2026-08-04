"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useUser } from "@/hooks/use-user";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { env } from "@/lib/env";

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
  "/contracts": "Contracts",
  "/work-diary": "Work Diary",
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin size-8 border-[3px] border-primary border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const pageTitle = Object.entries(pageTitles).find(([path]) =>
    pathname.startsWith(path)
  )?.[1] ?? "Dashboard";

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 overflow-y-auto bg-background">
        {/* Top bar */}
        <div className="sticky top-0 z-30 flex items-center gap-4 border-b border-border/50 bg-background/80 backdrop-blur-xl px-6 py-3">
          <SidebarTrigger />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground/60">{env.APP_NAME}</span>
            <span className="text-muted-foreground/30">/</span>
            <span className="font-medium text-foreground font-heading">{pageTitle}</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-accent-green animate-pulse" />
            <span className="text-xs text-muted-foreground">All systems normal</span>
          </div>
        </div>
        {/* Page content */}
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </SidebarProvider>
  );
}

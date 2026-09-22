"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { env } from "@/lib/env";
import { appConfig } from "@/config/app";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Filter,
  Briefcase,
  Bell,
  FileText,
  Settings,
  LogOut,
  ChevronRight,
  Heart,
  Activity,
  ExternalLink,
  BarChart3,
  Shield,
  UserCircle,
  BookOpen,
  Radio,
  GitBranch,
  X,
  CreditCard,
  Link2,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { useUser } from "@/hooks/use-user";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Filter,
  Briefcase,
  Bell,
  Activity,
  FileText,
  Heart,
  ExternalLink,
  BarChart3,
  Shield,
  Settings,
  UserCircle,
  BookOpen,
  Radio,
  GitBranch,
  CreditCard,
  Link2,
};

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { isMobile, setOpenMobile } = useSidebar();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function closeMobileSidebar() {
    if (isMobile) {
      setOpenMobile(false);
    }
  }

  const initials =
    user?.user_metadata?.display_name?.charAt(0).toUpperCase() ??
    user?.email?.charAt(0).toUpperCase() ??
    "U";

  return (
    <>
      {/* Mobile sidebar portal styling */}
      <style>
        {`
          [data-sidebar="sidebar"][data-mobile="true"] {
            width: min(84vw, 19rem) !important;
            max-width: 19rem !important;
            height: 100dvh !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: var(--sidebar) !important;
            color: var(--sidebar-foreground) !important;
            border-right: 1px solid var(--sidebar-border) !important;
            box-shadow: 20px 0 60px rgba(0, 0, 0, 0.25) !important;
          }

          .dark [data-sidebar="sidebar"][data-mobile="true"] {
            box-shadow: 20px 0 60px rgba(0, 0, 0, 0.45) !important;
          }

          [data-sidebar="sidebar"][data-mobile="true"]
          [data-slot="sidebar-inner"] {
            background: var(--sidebar) !important;
            color: var(--sidebar-foreground) !important;
          }

          body:has(
            [data-sidebar="sidebar"][data-mobile="true"]
          ) [data-slot="sheet-overlay"] {
            background: rgba(10, 10, 10, 0.58) !important;
            backdrop-filter: blur(4px);
          }

          @media (max-width: 360px) {
            [data-sidebar="sidebar"][data-mobile="true"] {
              width: 88vw !important;
            }
          }
        `}
      </style>

      <Sidebar
        collapsible="icon"
        className="group/sidebar-app overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[8px_0_24px_rgba(0,0,0,0.05)] transition-all duration-300 dark:shadow-[8px_0_35px_rgba(0,0,0,0.3)]"
      >
        {/* Brand */}
        <SidebarHeader className="h-16 border-b border-sidebar-border p-2">
          <SidebarMenu className="h-full">
            <SidebarMenuItem className="relative flex h-full items-center">
              <SidebarMenuButton
                size="lg"
                render={
                  <Link
                    href="/dashboard"
                    onClick={closeMobileSidebar}
                  />
                }
                className="group/brand h-12 w-full rounded-xl px-2.5 pr-11 text-sidebar-foreground transition-all duration-300 hover:bg-[#00C98B]/10 hover:text-sidebar-foreground md:pr-2.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
              >
                <span className="relative grid size-9 shrink-0 place-items-center rounded-xl  shadow-[0_8px_22px_rgba(0,0,0,0.22)] transition-all duration-300 group-hover/brand:-translate-y-0.5 group-hover/brand:shadow-[0_10px_25px_rgba(0,201,139,0.16)]">
                  <img
                    src="/upscore-logo-icon.png"
                    alt={env.APP_NAME}
                    width={36}
                    height={36}
                    className="h-8 w-auto object-contain"
                  />
                </span>

                <div className="min-w-0 flex-1 transition-all duration-300 group-data-[collapsible=icon]:hidden">
                  <span className="block truncate font-heading text-[15px] font-bold tracking-tight text-sidebar-foreground">
                    {env.APP_NAME}
                  </span>

                  <span className="mt-0.5 block truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-[#00C98B]">
                    Opportunity finder
                  </span>
                </div>
              </SidebarMenuButton>

              <button
                type="button"
                aria-label="Close sidebar"
                onClick={() => setOpenMobile(false)}
                className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg border border-sidebar-border bg-sidebar-accent text-sidebar-foreground/50 transition-all duration-200 hover:border-[#00C98B]/40 hover:bg-[#00C98B]/10 hover:text-[#00C98B] md:hidden"
              >
                <X className="size-4" />
              </button>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {/* Navigation */}
        <SidebarContent className="min-h-0 overflow-x-hidden px-2 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="mb-2 h-auto px-3 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-sidebar-foreground/45 group-data-[collapsible=icon]:hidden">
              Main menu
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {appConfig.sidebar.items.map(
                  (item, index) => {
                    const Icon =
                      iconMap[item.icon] || LayoutDashboard;

                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(
                        `${item.href}/`
                      );

                    return (
                      <SidebarMenuItem
                        key={item.href}
                        className="animate-in fade-in slide-in-from-left-2 fill-mode-both"
                        style={{
                          animationDelay: `${index * 45}ms`,
                          animationDuration: "350ms",
                        }}
                      >
                        <SidebarMenuButton
                          render={
                            <Link
                              href={item.href}
                              onClick={closeMobileSidebar}
                            />
                          }
                          isActive={isActive}
                          tooltip={item.title}
                          size="default"
                          className={`group/menu-button relative h-10 overflow-hidden rounded-xl px-3 transition-all duration-200 ease-out md:h-11 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 ${isActive
                            ? "bg-[#00C98B]/14 font-semibold text-sidebar-foreground shadow-[inset_0_0_0_1px_rgba(0,201,139,0.15),0_8px_24px_rgba(0,0,0,0.08)]"
                            : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                            }`}
                        >
                          {isActive && (
                            <>
                              <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-[#00C98B] shadow-[0_0_12px_rgba(0,201,139,0.7)]" />

                              <span className="pointer-events-none absolute -right-10 top-1/2 size-20 -translate-y-1/2 rounded-full bg-[#00C98B]/10 blur-2xl" />
                            </>
                          )}

                          <Icon
                            className={`relative z-10 size-[18px] shrink-0 transition-all duration-200 ${isActive
                              ? "scale-105 text-[#00C98B]"
                              : "text-sidebar-foreground/50 group-hover/menu-button:scale-105 group-hover/menu-button:text-[#00C98B]"
                              }`}
                          />

                          <span className="relative z-10 truncate text-[13px] tracking-wide group-data-[collapsible=icon]:hidden">
                            {item.title}
                          </span>

                          {isActive && (
                            <span className="relative z-10 ml-auto size-1.5 rounded-full bg-[#00C98B] shadow-[0_0_8px_rgba(0,201,139,0.8)] group-data-[collapsible=icon]:hidden" />
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Admin link (only for admin users) */}
          {user?.app_metadata?.is_admin === true && (
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      render={<Link href="/admin" onClick={() => isMobile && setOpenMobile(false)} />}
                      isActive={pathname.startsWith("/admin")}
                      className={`relative h-9 rounded-lg text-[13px] font-medium transition-all duration-200
                        ${pathname.startsWith("/admin")
                          ? "bg-[#FF6B35]/15 text-[#FF6B35] shadow-[inset_0_0_20px_rgba(255,107,53,0.08)]"
                          : "text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground/80"
                        }`}
                    >
                      <Shield className={`size-4 shrink-0 ${pathname.startsWith("/admin") ? "text-[#FF6B35]" : "text-sidebar-foreground/40"}`} />
                      <span className="truncate group-data-[collapsible=icon]:hidden">Admin Panel</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        {/* User section */}
        <div className="mt-auto">
          <SidebarSeparator className="mx-3 w-auto bg-sidebar-border" />

          <SidebarFooter className="px-2 pb-3 pt-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <SidebarMenuButton
                        size="lg"
                        className="group/user h-[54px] rounded-xl border border-transparent px-2.5 transition-all duration-300 hover:border-[#00C98B]/20 hover:bg-[#00C98B]/10 hover:text-sidebar-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                      />
                    }
                  >
                    <Avatar className="size-9 shrink-0 rounded-xl border border-[#00C98B]/30 shadow-[0_7px_20px_rgba(0,0,0,0.12)] transition-all duration-300 group-hover/user:border-[#00C98B]/60">
                      <AvatarFallback className="rounded-xl bg-[#00C98B] font-heading text-sm font-bold text-[#0A0A0A]">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                      <span className="truncate font-heading text-[13px] font-semibold text-sidebar-foreground">
                        {user?.user_metadata?.display_name ? user?.user_metadata?.display_name : user?.email?.split("@")[0] ??
                          "User"}
                      </span>

                      <span className="mt-1 truncate text-[10px] text-sidebar-foreground/50">
                        {user?.email ?? ""}
                      </span>
                    </div>

                    <ChevronRight className="ml-auto size-3.5 shrink-0 text-sidebar-foreground/45 transition-all duration-200 group-data-[collapsible=icon]:hidden ui-open:rotate-90" />
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    className="w-(--anchor-width) min-w-56 rounded-2xl border border-[#0A0A0A]/10 bg-white p-1.5 text-[#0A0A0A] shadow-[0_18px_50px_rgba(0,0,0,0.12)] dark:border-white/10 dark:bg-[#0A0A0A] dark:text-white dark:shadow-[0_18px_50px_rgba(0,0,0,0.3)]"
                    side="top"
                    align="end"
                    sideOffset={6}
                  >
                    <div className="mb-1 border-b border-[#0A0A0A]/10 px-2.5 py-2.5 dark:border-white/10">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-8 rounded-lg border border-[#00C98B]/30">
                          <AvatarFallback className="rounded-lg bg-[#00C98B] text-xs font-bold text-[#0A0A0A]">
                            {initials}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <p className="truncate font-heading text-sm font-semibold text-[#0A0A0A] dark:text-white">
                            {user?.user_metadata?.display_name ? user?.user_metadata?.display_name : user?.email?.split("@")[0] ??
                              "User"}
                          </p>

                          <p className="mt-0.5 truncate text-[10px] text-[#0A0A0A]/50 dark:text-white/40">
                            {user?.email ?? ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer rounded-xl px-2.5 py-2 text-[#0A0A0A]/55 hover:bg-[#00C98B]/10 hover:text-[#00C98B] focus:bg-[#00C98B]/10 focus:text-[#00C98B] data-[highlighted]:bg-[#00C98B]/10 data-[highlighted]:text-[#00C98B] dark:text-white/60"
                    >
                      <LogOut className="mr-2.5 size-4 text-[#00C98B]" />

                      <span className="text-sm font-medium">
                        Sign out
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </div>
      </Sidebar>
    </>
  );
}
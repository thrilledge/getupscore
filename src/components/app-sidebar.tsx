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
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
};

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = user?.email?.charAt(0).toUpperCase() ?? "U";

  return (
    <Sidebar collapsible="icon" className="group/sidebar-app">
      {/* Brand */}
      <SidebarHeader className="animate-in fade-in slide-in-from-left-2 duration-300 px-1 pt-3 pb-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/dashboard" />}
              className="group-data-[collapsible=icon]:!p-0! transition-all duration-300 rounded-xl"
            >
              <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary/95 to-primary/80 text-primary-foreground font-bold shadow-sm ring-1 ring-primary/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-md">
                <span className="text-lg">{env.APP_NAME.charAt(0)}</span>
              </div>
              <div className="flex flex-col gap-0.5 leading-none transition-all duration-300 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:delay-0">
                <span className="font-heading font-semibold tracking-tight text-[15px]">{env.APP_NAME}</span>
                {/* <span className="text-[11px] text-muted-foreground/60 font-medium tracking-wide">
                  {appConfig.description}
                </span> */}
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator className="mx-3 w-auto transition-opacity duration-300" />

      {/* Navigation */}
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="hidden px-2 text-[11px] font-medium text-muted-foreground/40 uppercase tracking-widest">
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {appConfig.sidebar.items.map((item, index) => {
                const Icon = iconMap[item.icon] || LayoutDashboard;
                const isActive = pathname.startsWith(item.href);

                return (
                  <SidebarMenuItem
                    key={item.href}
                    className="animate-in fade-in slide-in-from-left-2 fill-mode-both" 
                    style={{ animationDelay: `${index * 60}ms`, animationDuration: "400ms" }}
                  >
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.title}
                      size="default"
                      className={`
                        relative overflow-hidden rounded-sm px-3 py-5
                        transition-all duration-200 ease-out
                        ${isActive
                          ? "bg-sidebar-accent/70 font-medium text-sidebar-accent-foreground shadow-sm py-5"
                          : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 py-5"
                        }
                      `}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-primary" />
                      )}
                      <Icon className={`size-[18px] shrink-0 transition-all duration-200 ${isActive ? 'scale-110' : 'group-hover/menu-button:scale-110'}`} />
                      <span className="text-sm tracking-wide transition-opacity duration-200">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="mt-auto">
        <SidebarSeparator className="mx-3 w-auto transition-opacity duration-300" />

        {/* User */}
        <SidebarFooter className="animate-in fade-in slide-in-from-bottom-2 duration-300 px-2 pt-2 pb-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<SidebarMenuButton size="lg" className="rounded-xl py-3 px-3" />}
                >
                  <Avatar className="size-8 rounded-lg ring-2 ring-sidebar-ring/15 transition-all duration-300 group-hover:ring-sidebar-ring/30">
                    <AvatarFallback className="rounded-lg bg-gradient-to-br from-sidebar-accent to-sidebar-accent/80 text-sidebar-accent-foreground font-heading font-semibold text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight transition-all duration-300 group-data-[collapsible=icon]:opacity-0">
                    <span className="truncate font-heading font-medium text-[13px]">
                      {user?.email?.split("@")[0] ?? "User"}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground/60">
                      {user?.email ?? ""}
                    </span>
                  </div>
                  <ChevronRight className="size-3.5 ml-auto text-muted-foreground/30 transition-all duration-200 group-data-[collapsible=icon]:opacity-0 ui-open:rotate-90" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-(--anchor-width) min-w-56 rounded-xl p-1.5 shadow-lg border-border/50"
                  side="top"
                  align="end"
                  sideOffset={4}
                >
                  <div className="px-2.5 py-2 border-b border-border/40 mb-1">
                    <p className="text-sm font-heading font-medium truncate">
                      {user?.email?.split("@")[0] ?? "User"}
                    </p>
                    <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                      {user?.email ?? ""}
                    </p>
                  </div>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer rounded-lg transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive data-[highlighted]:bg-destructive/10"
                  >
                    <LogOut className="size-4 mr-2.5 text-muted-foreground/60" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}

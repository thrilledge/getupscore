/**
 * App configuration — centralized config derived from env vars.
 * Change APP_NAME in .env.local to rename the app everywhere.
 */
import { env } from "@/lib/env";

export const appConfig = {
  name: env.APP_NAME,
  description: "AI-powered Upwork opportunity finder",
  url: env.APP_URL,
  slogan: "Find your next gig, faster",

  // Navigation
  sidebar: {
    items: [
      { title: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
      { title: "Job Filters", href: "/filters", icon: "Filter" },
      { title: "Jobs", href: "/jobs", icon: "Briefcase" },
      { title: "Saved Jobs", href: "/saved", icon: "Heart" },
      { title: "Notifications", href: "/notifications", icon: "Bell" },
      { title: "Proposals", href: "/proposals", icon: "FileText" },
      { title: "Upwork Profile", href: "/upwork-profile", icon: "UserCircle" },
      { title: "Contracts", href: "/contracts", icon: "Briefcase" },
      { title: "Work Diary", href: "/work-diary", icon: "BookOpen" },
      { title: "Market Trends", href: "/market-trends", icon: "BarChart3" },
      { title: "Extension", href: "/extension", icon: "ExternalLink" },
      { title: "Settings", href: "/settings", icon: "Settings" },
    ],
  },

  // Scoring thresholds
  scoring: {
    matchScoreMin: 75,
    opportunityScoreMin: 70,
    maxProposals: 20,
  },

  // Default pagination
  pagination: {
    pageSize: 20,
  },
} as const;

export type SidebarItem = (typeof appConfig.sidebar.items)[number];

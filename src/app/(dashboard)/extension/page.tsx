"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Download,
  ExternalLink,
  Key,
  Puzzle,
  Cookie,
  Server,
  Brain,
  Bell,
  FileText,
  Briefcase,
  BookOpen,
  UserCircle,
} from "lucide-react";
import Link from "next/link";

export default function ExtensionPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-heading flex items-center gap-3">
          <Puzzle className="size-7" />
          UpScore Extension
        </h1>
        <p className="text-muted-foreground mt-1">
          The extension captures Upwork cookies so the server can scrape jobs and data 24/7.
        </p>
      </div>

      {/* Download Card */}
      <Card className="border-accent-blue/30 bg-accent-blue/[0.02]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-accent-blue/10 p-3">
              <Download className="size-6 text-accent-blue" />
            </div>
            <div>
              <CardTitle className="text-lg font-heading">Download Extension</CardTitle>
              <CardDescription>
                Load it in Chrome via Developer Mode
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-blue/10 text-xs font-bold text-accent-blue">1</span>
              <div>
                <p className="font-medium">Download the extension folder</p>
                <p className="text-muted-foreground text-xs mt-0.5">Clone the repo or download the <code className="text-xs bg-muted px-1 rounded">extension/</code> directory.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-blue/10 text-xs font-bold text-accent-blue">2</span>
              <div>
                <p className="font-medium">Open Chrome Extensions</p>
                <p className="text-muted-foreground text-xs mt-0.5">Navigate to <code className="text-xs bg-muted px-1 rounded">chrome://extensions</code> and enable <strong>Developer mode</strong>.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-blue/10 text-xs font-bold text-accent-blue">3</span>
              <div>
                <p className="font-medium">Load unpacked</p>
                <p className="text-muted-foreground text-xs mt-0.5">Click <strong>Load unpacked</strong> and select the <code className="text-xs bg-muted px-1 rounded">extension/</code> folder.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-blue/10 text-xs font-bold text-accent-blue">4</span>
              <div>
                <p className="font-medium">Configure API Token</p>
                <p className="text-muted-foreground text-xs mt-0.5">Generate a token in <Link href="/settings" className="text-accent-blue hover:underline">Settings → API Tokens</Link> and paste it in the extension options.</p>
              </div>
            </li>
          </ol>

          <div className="flex items-center gap-3 pt-2">
            <Link href="/settings">
              <Button>
                <Key className="size-4 mr-2" />
                Generate API Token
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {[
          {
            icon: Cookie,
            color: "bg-accent-amber/10 text-accent-amber",
            title: "Cookie Capture",
            desc: "When you visit Upwork, the extension captures your session cookies and sends them to the server for 24/7 scraping.",
            links: [],
          },
          {
            icon: Server,
            color: "bg-accent-blue/10 text-accent-blue",
            title: "Server-Side Scraping",
            desc: "The EC2 server uses your cookies via ScrapingAnt to scrape jobs, profile, contracts, and work diary around the clock.",
            links: [
              { href: "/jobs", label: "Jobs" },
              { href: "/upwork-profile", label: "Profile" },
            ],
          },
          {
            icon: UserCircle,
            color: "bg-accent-blue/10 text-accent-blue",
            title: "Profile Data",
            desc: "Freelancer profile data synced from Upwork including title, bio, skills, rate, earnings, and stats.",
            links: [{ href: "/upwork-profile", label: "View Profile" }],
          },
          {
            icon: Briefcase,
            color: "bg-accent-amber/10 text-accent-amber",
            title: "Contracts",
            desc: "Active and past contracts with rates, hours, and earnings — synced automatically by the server.",
            links: [{ href: "/contracts", label: "View Contracts" }],
          },
          {
            icon: BookOpen,
            color: "bg-accent-purple/10 text-accent-purple",
            title: "Work Diary",
            desc: "Logged hours, activity levels, and notes for hourly contracts — synced automatically by the server.",
            links: [{ href: "/work-diary", label: "View Diary" }],
          },
          {
            icon: FileText,
            color: "bg-accent-green/10 text-accent-green",
            title: "AI Proposals",
            desc: "Generate and submit winning proposals directly from the web app using server-side AI.",
            links: [{ href: "/proposals", label: "View Proposals" }],
          },
          {
            icon: Brain,
            color: "bg-accent-purple/10 text-accent-purple",
            title: "AI Scoring",
            desc: "Jobs are analyzed server-side with AI. The extension sends requests to the server — no local AI configuration needed.",
            links: [],
          },
          {
            icon: Bell,
            color: "bg-accent-green/10 text-accent-green",
            title: "Notifications",
            desc: "High-scoring jobs trigger notifications via email, Telegram, Slack, or Discord — configured in the web app.",
            links: [{ href: "/notifications", label: "View Notifications" }],
          },
        ].map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title}>
              <CardHeader className="pb-3">
                <div className={`rounded-xl p-2 w-fit mb-2 ${feature.color}`}>
                  <Icon className="size-5" />
                </div>
                <CardTitle className="text-sm font-heading">{feature.title}</CardTitle>
                <CardDescription className="text-xs">
                  {feature.desc}
                </CardDescription>
              </CardHeader>
              {feature.links.length > 0 && (
                <CardContent className="pt-0 flex gap-2 flex-wrap">
                  {feature.links.map((link) => (
                    <Link key={link.href} href={link.href}>
                      <Button variant="outline" size="sm" className="text-xs">
                        <ExternalLink className="size-3 mr-1" />
                        {link.label}
                      </Button>
                    </Link>
                  ))}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

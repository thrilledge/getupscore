"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Key, Puzzle, UserCircle } from "lucide-react";
import Link from "next/link";

export default function ExtensionPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-accent-blue/10">
          <Puzzle className="size-7 text-accent-blue" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight font-heading">UpScore Extension</h1>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Install the browser extension so the server can sync your Upwork data automatically.
        </p>
      </div>

      <Card className="border-accent-blue/30 bg-accent-blue/[0.02]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-accent-blue/10 p-3">
              <Download className="size-6 text-accent-blue" />
            </div>
            <div>
              <CardTitle className="text-lg font-heading">Installation Instructions</CardTitle>
              <CardDescription>
                4 simple steps to get started
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {[
            {
              step: 1,
              title: "Download the extension",
              desc: "Clone the repo or download just the extension/ directory.",
            },
            {
              step: 2,
              title: "Open Chrome extensions",
              desc: "Go to chrome://extensions and toggle Developer mode on.",
            },
            {
              step: 3,
              title: "Load unpacked",
              desc: 'Click "Load unpacked" and select the extension/ folder.',
            },
            {
              step: 4,
              title: "Sign in",
              desc: "Open the extension options and sign in with this same dashboard account.",
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex items-start gap-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-blue/10 text-sm font-bold text-accent-blue">
                {step}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="font-medium text-sm">{title}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-center gap-3">
        <Link href="/settings">
          <Button size="lg">
            <Key className="size-4 mr-2" />
            API Token (optional)
          </Button>
        </Link>
        <Link href="/upwork-profile">
          <Button size="lg" variant="outline">
            <UserCircle className="size-4 mr-2" />
            Sync My Profile
          </Button>
        </Link>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Once installed and configured, the extension will sync your jobs and profile automatically.
      </p>
    </div>
  );
}

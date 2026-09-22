"use client";

import { Button } from "@/components/ui/button";
import { SubscriptionGate } from "@/components/subscription-gate";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  Check,
  Download,
  Key,
  Puzzle,
  UserCircle,
} from "lucide-react";
import Link from "next/link";

const installationSteps = [
  {
    step: 1,
    title: "Download the extension",
    desc: "Clone the repository or download only the extension/ directory.",
  },
  {
    step: 2,
    title: "Open Chrome extensions",
    desc: "Visit chrome://extensions and enable Developer mode.",
  },
  {
    step: 3,
    title: "Load unpacked",
    desc: 'Click "Load unpacked" and select the extension/ folder.',
  },
  {
    step: 4,
    title: "Sign in",
    desc: "Open the extension options and sign in using your UpScore account.",
  },
];

export default function ExtensionPage() {
  return (
    <SubscriptionGate feature="Extension">
    <div className="mx-auto max-w-4xl space-y-5 pb-6">
      {/* Header */}
      <section className="animate-in fade-in slide-in-from-bottom-2 relative overflow-hidden rounded-[24px] border border-[#0A0A0A]/10 bg-[#EFF1F3] px-5 py-8 text-[#0A0A0A] shadow-[0_14px_35px_rgba(0,0,0,0.06)] duration-500 sm:px-8 sm:py-10 dark:border-white/10 dark:bg-[#0A0A0A] dark:text-white dark:shadow-[0_18px_48px_rgba(0,0,0,0.15)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,201,139,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,139,0.07) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(circle at center, black, transparent 78%)",
            WebkitMaskImage:
              "radial-gradient(circle at center, black, transparent 78%)",
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[#00C98B]/15 blur-[110px]"
        />

        <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center text-center">
          <div className="relative mb-5">
            <span className="absolute inset-0 scale-150 rounded-full bg-[#00C98B]/15 blur-xl" />

            <span className="relative grid size-16 place-items-center rounded-[20px] border border-[#00C98B]/30 bg-[#00C98B]/10 text-[#00C98B]">
              <Puzzle className="size-7" />
            </span>

            <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-lg border-2 border-[#0A0A0A] bg-[#00C98B] text-[#0A0A0A]">
              <Check className="size-3.5 stroke-[3]" />
            </span>
          </div>

          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#00C98B]/25 bg-[#00C98B]/10 px-3 py-1.5">
            <span className="size-1.5 rounded-full bg-[#00C98B] shadow-[0_0_8px_rgba(0,201,139,0.8)]" />

            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#00C98B]">
              Browser integration
            </span>
          </div>

          <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            UpScore Extension
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-[#0A0A0A]/55 sm:text-base dark:text-white/50">
            Install the browser extension so UpScore can sync
            your Upwork jobs and freelancer profile
            automatically.
          </p>
        </div>
      </section>

      {/* Installation instructions */}
      <Card className="animate-in fade-in slide-in-from-bottom-3 gap-0 overflow-hidden rounded-[22px] border border-[#0A0A0A]/10 bg-white py-0 shadow-[0_8px_28px_rgba(0,0,0,0.045)] duration-500">
        <div className="h-[3px] bg-[#00C98B]" />

        <CardHeader className="border-b border-[#0A0A0A]/7 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[#00C98B]/20 bg-[#00C98B]/10 text-[#00A975]">
              <Download className="size-5" />
            </span>

            <div>
              <CardTitle className="font-heading text-lg font-bold text-[#0A0A0A]">
                Installation Instructions
              </CardTitle>

              <CardDescription className="mt-1 text-sm text-[#0A0A0A]/45">
                Four simple steps to connect the extension
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 py-4 sm:px-5">
          <div className="relative">
            <div className="absolute bottom-7 left-[29px] top-7 w-px bg-[#00C98B]/25" />

            {installationSteps.map(
              ({ step, title, desc }) => (
                <div
                  key={step}
                  className="group relative flex items-start gap-4 rounded-2xl px-2 py-3.5 transition-all duration-300 hover:bg-[#00C98B]/5 sm:items-center"
                >
                  <span className="relative z-10 grid size-11 shrink-0 place-items-center rounded-2xl border border-[#00C98B]/25 bg-white font-heading text-sm font-bold text-[#00A975] shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:border-[#00C98B] group-hover:bg-[#00C98B] group-hover:text-[#0A0A0A]">
                    {step}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading text-sm font-bold text-[#0A0A0A] transition-colors group-hover:text-[#00A975] sm:text-base">
                        {title}
                      </h3>

                      <ArrowRight className="size-3.5 -translate-x-2 text-[#00A975] opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                    </div>

                    <p className="mt-1 text-xs leading-5 text-[#0A0A0A]/45 sm:text-sm">
                      {desc}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <section className="grid gap-3 sm:grid-cols-2">
        <Button
          render={<Link href="/settings" />}
          size="lg"
          className="group h-auto min-h-14 justify-between rounded-2xl bg-[#0A0A0A] px-5 py-3 text-left text-white shadow-[0_10px_28px_rgba(0,0,0,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#0A0A0A]/90"
        >
          <span className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-[#00C98B]/12 text-[#00C98B]">
              <Key className="size-4" />
            </span>

            <span>
              <span className="block text-sm font-bold">
                API Token
              </span>

              <span className="mt-0.5 block text-[10px] font-medium text-white/35">
                Optional configuration
              </span>
            </span>
          </span>

          <ArrowRight className="size-4 text-[#00C98B] transition-transform duration-300 group-hover:translate-x-1" />
        </Button>

        <Button
          render={<Link href="/upwork-profile" />}
          variant="outline"
          size="lg"
          className="group h-auto min-h-14 justify-between rounded-2xl border-[#0A0A0A]/10 bg-white px-5 py-3 text-left text-[#0A0A0A] shadow-[0_7px_24px_rgba(0,0,0,0.035)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C98B]/35 hover:bg-[#00C98B]/5"
        >
          <span className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-[#00C98B]/10 text-[#00A975]">
              <UserCircle className="size-4" />
            </span>

            <span>
              <span className="block text-sm font-bold">
                Sync My Profile
              </span>

              <span className="mt-0.5 block text-[10px] font-medium text-[#0A0A0A]/35">
                Import your Upwork data
              </span>
            </span>
          </span>

          <ArrowRight className="size-4 text-[#00A975] transition-transform duration-300 group-hover:translate-x-1" />
        </Button>
      </section>

      {/* Information note */}
      <div className="flex items-start gap-3 rounded-2xl border border-[#00C98B]/20 bg-[#00C98B]/7 px-4 py-3">
        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#00C98B]/15 text-[#00A975]">
          <Check className="size-3.5 stroke-[3]" />
        </span>

        <p className="text-xs leading-5 text-[#0A0A0A]/50">
          Once installed and configured, the extension will
          sync your jobs and profile automatically.
        </p>
      </div>
    </div>
    </SubscriptionGate>
  );
}
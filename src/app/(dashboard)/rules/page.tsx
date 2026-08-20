"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import type { NotificationRule } from "@/lib/supabase/database-types";
import { RuleFormDialog } from "@/components/rule-form";
import { RuleCard } from "@/components/rule-card";
import { SubscriptionGate } from "@/components/subscription-gate";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Bell,
  Filter,
  Gauge,
  Network,
  Plus,
  RefreshCw,
} from "lucide-react";

interface RuleWithRefs extends NotificationRule {
  channel_name?: string;
  filter_name?: string;
}

async function fetchRules(
  userId: string
): Promise<RuleWithRefs[]> {
  const { data: rules, error } = await supabase
    .from("notification_rules")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false,
    });

  if (error) throw new Error(error.message);

  const channelIds = [
    ...new Set(
      rules.map((rule) => rule.channel_id)
    ),
  ];

  const filterIds = rules
    .map((rule) => rule.job_filter_id)
    .filter(Boolean) as string[];

  const [channelsRes, filtersRes] =
    await Promise.all([
      channelIds.length > 0
        ? supabase
          .from("notification_channels")
          .select("id, name")
          .in("id", channelIds)
        : { data: [] },

      filterIds.length > 0
        ? supabase
          .from("job_filters")
          .select("id, name")
          .in("id", filterIds)
        : { data: [] },
    ]);

  const channelMap = new Map(
    (channelsRes.data ?? []).map((channel) => [
      channel.id,
      channel.name,
    ])
  );

  const filterMap = new Map(
    (filtersRes.data ?? []).map((filter) => [
      filter.id,
      filter.name,
    ])
  );

  return rules.map((rule) => ({
    ...rule,

    channel_name:
      channelMap.get(rule.channel_id) ??
      "Deleted Channel",

    filter_name: rule.job_filter_id
      ? filterMap.get(rule.job_filter_id) ??
      "Deleted Filter"
      : undefined,
  }));
}

export default function RulesPage() {
  const { user } = useUser();

  const {
    data: rules,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: [
      "notification_rules",
      user?.id,
    ],
    queryFn: () => fetchRules(user!.id),
    enabled: !!user?.id,
  });

  const activeRules =
    rules?.filter((rule) => rule.is_active) ??
    [];

  const pausedRules =
    rules?.filter((rule) => !rule.is_active) ??
    [];

  return (
    <SubscriptionGate feature="Rules">
    <div className="mx-auto w-full max-w-[1500px] min-w-0 space-y-4 overflow-x-clip pb-6 sm:space-y-5 lg:space-y-6">
      {/* Header */}
      <section className="animate-in fade-in slide-in-from-bottom-3 relative min-w-0 overflow-hidden rounded-[20px] bg-[#0A0A0A] px-4 py-5 duration-500 min-[480px]:px-5 sm:rounded-[24px] sm:px-6 sm:py-6 lg:rounded-[26px] lg:px-7 lg:py-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[#00C98B]/15 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-1/3 h-px w-1/2 bg-gradient-to-r from-transparent via-[#00C98B]/60 to-transparent"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,201,139,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,139,0.06) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
            maskImage:
              "linear-gradient(to right, transparent, black)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black)",
          }}
        />

        <div className="relative flex min-w-0 flex-col gap-5 xl:flex-row xl:items-center xl:justify-between xl:gap-8">
          {/* Header Information */}
          <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#00C98B]/30 bg-[#00C98B]/10 text-[#00C98B] sm:size-12 sm:rounded-2xl">
              <Network className="size-5 sm:size-6" />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="max-w-full break-words font-heading text-xl font-bold leading-tight tracking-tight text-white min-[420px]:text-2xl sm:text-3xl">
                Notification Rules
              </h1>

              <p className="mt-1.5 max-w-2xl text-xs leading-5 text-white/55 min-[420px]:text-sm min-[420px]:leading-6">
                Connect your job filters with
                notification channels and control which
                opportunities should trigger an alert.
              </p>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex w-full min-w-0 items-center gap-2 xl:w-auto xl:shrink-0">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isRefetching}
              aria-label="Refresh notification rules"
              title="Refresh notification rules"
              className="size-10 shrink-0 rounded-xl border-white/15 bg-white/5 text-white hover:border-[#00C98B]/50 hover:bg-[#00C98B]/10 hover:text-[#00C98B]"
            >
              <RefreshCw
                className={`size-4 ${isRefetching
                    ? "animate-spin"
                    : ""
                  }`}
              />
            </Button>

            <div className="min-w-0 flex-1 xl:flex-none">
              <RuleFormDialog
                trigger={
                  <Button className="h-10 w-full min-w-0 max-w-full overflow-hidden rounded-xl bg-[#00C98B] px-3 text-xs font-semibold text-[#0A0A0A] shadow-[0_8px_24px_rgba(0,201,139,0.2)] hover:bg-[#00C98B]/90 min-[380px]:px-4 min-[380px]:text-sm xl:w-auto">
                    <Plus className="size-4 shrink-0" />

                    <span className="truncate whitespace-nowrap">
                      Create rule
                    </span>
                  </Button>
                }
                onSuccess={() => refetch()}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Loading */}
      {isLoading && (
        <div className="grid min-w-0 gap-3 lg:grid-cols-2 lg:gap-4 2xl:grid-cols-3">
          {Array.from({ length: 3 }).map(
            (_, index) => (
              <Card
                key={index}
                className="min-w-0 gap-0 overflow-hidden rounded-[18px] border-black/10 bg-white py-0 shadow-[0_10px_30px_rgba(0,0,0,0.04)] sm:rounded-2xl"
              >
                <div className="h-[3px] bg-[#00C98B]/25" />

                <CardHeader className="p-4 pb-3 min-[480px]:p-5 min-[480px]:pb-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <Skeleton className="size-10 shrink-0 rounded-xl bg-black/10" />

                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-36 max-w-full bg-black/10" />
                      <Skeleton className="h-3 w-24 max-w-full bg-black/10" />
                    </div>

                    <Skeleton className="size-8 shrink-0 rounded-lg bg-black/10" />
                  </div>
                </CardHeader>

                <CardContent className="px-4 pb-4 min-[480px]:px-5 min-[480px]:pb-5">
                  <Skeleton className="mb-3 h-9 w-full rounded-xl bg-black/10 sm:mb-4" />

                  <div className="grid grid-cols-3 gap-1.5 min-[420px]:gap-2">
                    {Array.from({
                      length: 3,
                    }).map(
                      (_, itemIndex) => (
                        <Skeleton
                          key={itemIndex}
                          className="h-16 rounded-xl bg-black/10 min-[420px]:h-20"
                        />
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>
      )}

      {/* Error */}
      {isError && (
        <Card className="animate-in fade-in slide-in-from-bottom-3 min-w-0 gap-0 overflow-hidden rounded-[18px] border-black/10 bg-white py-0 duration-500 shadow-[0_12px_34px_rgba(0,0,0,0.05)] sm:rounded-2xl">
          <div className="h-[3px] bg-[#0A0A0A]" />

          <CardHeader className="p-4 min-[480px]:p-5 sm:p-6">
            <div className="flex min-w-0 flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center sm:gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#0A0A0A] text-[#00C98B]">
                <AlertCircle className="size-5" />
              </div>

              <div className="min-w-0">
                <CardTitle className="font-heading text-base font-bold text-[#0A0A0A]">
                  Failed to load rules
                </CardTitle>

                <CardDescription className="mt-1 break-words text-xs leading-5 text-black/50">
                  {error?.message ??
                    "An unexpected error occurred."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-4 pb-4 min-[480px]:px-5 min-[480px]:pb-5 sm:px-6 sm:pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => refetch()}
              className="h-9 w-full rounded-lg border-black/15 bg-white px-4 text-xs font-semibold text-[#0A0A0A] hover:border-[#00C98B]/40 hover:bg-[#00C98B]/10 min-[420px]:w-auto"
            >
              <RefreshCw className="size-3.5" />
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading &&
        !isError &&
        rules?.length === 0 && (
          <Card className="animate-in fade-in slide-in-from-bottom-3 relative min-w-0 gap-0 overflow-hidden rounded-[20px] border-[#00C98B]/25 bg-white py-0 duration-500 shadow-[0_16px_45px_rgba(0,0,0,0.05)] sm:rounded-[24px]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-[#00C98B]/10 blur-3xl"
            />

            <CardHeader className="relative p-4 pb-3 min-[480px]:p-5 min-[480px]:pb-4 sm:p-7 sm:pb-5">
              <div className="flex min-w-0 flex-col gap-3 min-[480px]:flex-row min-[480px]:items-center sm:gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#0A0A0A] text-[#00C98B] shadow-lg">
                  <Network className="size-5" />
                </div>

                <div className="min-w-0">
                  <CardTitle className="font-heading text-lg font-bold text-[#0A0A0A]">
                    Create your first rule
                  </CardTitle>

                  <CardDescription className="mt-1 max-w-xl text-xs leading-5 text-black/50 sm:text-sm sm:leading-6">
                    Define which jobs qualify for an
                    alert and where that alert should be
                    delivered.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="relative space-y-5 p-4 pt-2 min-[480px]:p-5 min-[480px]:pt-2 sm:p-7 sm:pt-2">
              <div className="grid min-w-0 gap-3 lg:grid-cols-3">
                {[
                  {
                    icon: Bell,
                    title: "Select a channel",
                    description:
                      "Choose where alerts should be delivered.",
                  },
                  {
                    icon: Filter,
                    title: "Choose a filter",
                    description:
                      "Apply the rule to one filter or all filters.",
                  },
                  {
                    icon: Gauge,
                    title: "Set thresholds",
                    description:
                      "Control the score and proposal limits.",
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className="group min-w-0 rounded-xl border border-black/10 bg-[#F7F8F8] p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C98B]/35 hover:bg-[#00C98B]/5 min-[480px]:p-4"
                    >
                      <div className="mb-3 flex size-8 items-center justify-center rounded-lg bg-[#00C98B]/10 text-[#00C98B] transition-colors group-hover:bg-[#00C98B] group-hover:text-[#0A0A0A]">
                        <Icon className="size-4" />
                      </div>

                      <h3 className="text-xs font-bold text-[#0A0A0A]">
                        {item.title}
                      </h3>

                      <p className="mt-1 text-[11px] leading-5 text-black/45">
                        {item.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="flex min-w-0 flex-col gap-3 border-t border-black/10 pt-4 lg:flex-row lg:items-center lg:justify-between sm:pt-5">
                <p className="min-w-0 text-[11px] leading-5 text-black/40">
                  Rules can be paused, edited or removed
                  at any time.
                </p>

                <div className="w-full min-w-0 lg:w-auto lg:shrink-0">
                  <RuleFormDialog
                    trigger={
                      <Button className="h-10 w-full min-w-0 overflow-hidden rounded-lg bg-[#0A0A0A] px-4 text-xs font-semibold text-white hover:bg-[#00C98B] hover:text-[#0A0A0A] lg:w-auto lg:px-5">
                        <Plus className="size-3.5 shrink-0" />

                        <span className="truncate whitespace-nowrap">
                          Create first rule
                        </span>
                      </Button>
                    }
                    onSuccess={() => refetch()}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Rules */}
      {!isLoading &&
        !isError &&
        rules &&
        rules.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-3 min-w-0 space-y-7 duration-500 sm:space-y-8">
            {/* Active Rules */}
            {activeRules.length > 0 && (
              <section className="min-w-0 space-y-3 sm:space-y-4">
                <div className="flex min-w-0 flex-col gap-3 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#0A0A0A]">
                      <span className="size-2.5 animate-pulse rounded-full bg-[#00C98B] shadow-[0_0_12px_rgba(0,201,139,0.9)]" />
                    </div>

                    <div className="min-w-0">
                      <h2 className="font-heading text-xs font-bold uppercase tracking-[0.12em] text-[#0A0A0A] min-[420px]:tracking-[0.14em]">
                        Active rules
                      </h2>

                      <p className="mt-0.5 text-[10px] leading-4 text-black/40">
                        Monitoring jobs and ready to send
                        alerts
                      </p>
                    </div>
                  </div>

                  <span className="w-fit shrink-0 rounded-full border border-[#00C98B]/25 bg-[#00C98B]/10 px-3 py-1 text-[10px] font-bold text-[#007A56]">
                    {activeRules.length} active
                  </span>
                </div>

                <div className="grid min-w-0 gap-3 lg:grid-cols-2 lg:gap-4 2xl:grid-cols-3">
                  {activeRules.map(
                    (rule, index) => (
                      <div
                        key={rule.id}
                        style={{
                          animationDelay: `${index * 70
                            }ms`,
                        }}
                        className="animate-in fade-in slide-in-from-bottom-3 h-full min-w-0"
                      >
                        <RuleCard
                          rule={rule}
                          channelName={
                            rule.channel_name
                          }
                          filterName={
                            rule.filter_name
                          }
                          onSuccess={() =>
                            refetch()
                          }
                        />
                      </div>
                    )
                  )}
                </div>
              </section>
            )}

            {/* Paused Rules */}
            {pausedRules.length > 0 && (
              <section className="min-w-0 space-y-3 sm:space-y-4">
                <div className="flex min-w-0 flex-col gap-3 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white">
                      <span className="size-2.5 rounded-full bg-black/25" />
                    </div>

                    <div className="min-w-0">
                      <h2 className="font-heading text-xs font-bold uppercase tracking-[0.12em] text-[#0A0A0A] min-[420px]:tracking-[0.14em]">
                        Paused rules
                      </h2>

                      <p className="mt-0.5 text-[10px] leading-4 text-black/40">
                        Saved rules currently not sending
                        alerts
                      </p>
                    </div>
                  </div>

                  <span className="w-fit shrink-0 rounded-full border border-black/10 bg-black/5 px-3 py-1 text-[10px] font-bold text-black/45">
                    {pausedRules.length} paused
                  </span>
                </div>

                <div className="grid min-w-0 gap-3 lg:grid-cols-2 lg:gap-4 2xl:grid-cols-3">
                  {pausedRules.map(
                    (rule, index) => (
                      <div
                        key={rule.id}
                        style={{
                          animationDelay: `${index * 70
                            }ms`,
                        }}
                        className="animate-in fade-in slide-in-from-bottom-3 h-full min-w-0"
                      >
                        <RuleCard
                          rule={rule}
                          channelName={
                            rule.channel_name
                          }
                          filterName={
                            rule.filter_name
                          }
                          onSuccess={() =>
                            refetch()
                          }
                        />
                      </div>
                    )
                  )}
                </div>
              </section>
            )}
          </div>
        )}
    </div>
    </SubscriptionGate>
  );
}
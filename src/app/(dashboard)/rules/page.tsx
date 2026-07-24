"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import type {
  NotificationRule,
  NotificationChannel,
  JobFilter,
} from "@/lib/supabase/database-types";
import { RuleFormDialog } from "@/components/rule-form";
import { RuleCard } from "@/components/rule-card";
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
  Plus,
  RefreshCw,
  AlertCircle,
  Network,
  Bell,
  Filter,
} from "lucide-react";

// ─── Fetch Rules with related data ─────────────────────

interface RuleWithRefs extends NotificationRule {
  channel_name?: string;
  filter_name?: string;
}

async function fetchRules(userId: string): Promise<RuleWithRefs[]> {
  const { data: rules, error } = await supabase
    .from("notification_rules")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  // Resolve channel and filter names
  const channelIds = [...new Set(rules.map((r) => r.channel_id))];
  const filterIds = rules
    .map((r) => r.job_filter_id)
    .filter(Boolean) as string[];

  const [channelsRes, filtersRes] = await Promise.all([
    channelIds.length > 0
      ? supabase
          .from("notification_channels")
          .select("id, name")
          .in("id", channelIds)
      : { data: [] },
    filterIds.length > 0
      ? supabase.from("job_filters").select("id, name").in("id", filterIds)
      : { data: [] },
  ]);

  const channelMap = new Map(
    (channelsRes.data ?? []).map((c) => [c.id, c.name])
  );
  const filterMap = new Map(
    (filtersRes.data ?? []).map((f) => [f.id, f.name])
  );

  return rules.map((rule) => ({
    ...rule,
    channel_name: channelMap.get(rule.channel_id) ?? "Deleted Channel",
    filter_name: rule.job_filter_id
      ? filterMap.get(rule.job_filter_id) ?? "Deleted Filter"
      : undefined,
  }));
}

// ─── Page ──────────────────────────────────────────────

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
    queryKey: ["notification_rules", user?.id],
    queryFn: () => fetchRules(user!.id),
    enabled: !!user?.id,
  });

  const activeRules = rules?.filter((r) => r.is_active) ?? [];
  const pausedRules = rules?.filter((r) => !r.is_active) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">
            Notification Rules
          </h1>
          <p className="text-muted-foreground mt-1">
            Link your filters with notification channels and set scoring
            thresholds for when alerts are sent.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="shrink-0"
          >
            <RefreshCw
              className={`size-4 ${isRefetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="overflow-hidden border-border/60">
              <div className="h-1 bg-muted" />
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton key={j} className="h-16 rounded-lg" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-destructive/10 p-2">
                <AlertCircle className="size-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-base font-heading">
                  Failed to load rules
                </CardTitle>
                <CardDescription>
                  {error?.message ?? "An unexpected error occurred."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => refetch()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty */}
      {!isLoading && !isError && rules?.length === 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-accent-purple/10 p-3">
                <Network className="size-6 text-accent-purple" />
              </div>
              <div>
                <CardTitle className="text-lg font-heading">
                  No rules yet
                </CardTitle>
                <CardDescription>
                  Create rules to connect your filters with notification
                  channels and control exactly when alerts are sent.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pb-8">
            <div className="max-w-sm text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Each rule links a filter with a channel and defines minimum
                thresholds:
              </p>
              <ul className="text-xs text-muted-foreground/70 space-y-1 text-left">
                <li className="flex items-start gap-2">
                  <Bell className="size-3 text-accent-amber mt-0.5 shrink-0" />
                  Select a notification channel (where to send)
                </li>
                <li className="flex items-start gap-2">
                  <Filter className="size-3 text-accent-blue mt-0.5 shrink-0" />
                  Pick a job filter (what to match), or apply to all
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-purple mt-0.5 shrink-0">•</span>
                  Set score thresholds (when to alert)
                </li>
              </ul>
            </div>
            <RuleFormDialog
              trigger={
                <Button size="lg" className="mt-2">
                  <Plus className="size-4 mr-2" />
                  Create Your First Rule
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Rules Grid */}
      {!isLoading && !isError && rules && rules.length > 0 && (
        <div className="space-y-8">
          {activeRules.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-accent-green animate-pulse" />
                <h2 className="text-sm font-medium text-muted-foreground font-heading tracking-wide uppercase">
                  Active Rules
                </h2>
                <span className="text-xs text-muted-foreground/60 bg-muted/50 px-2 py-0.5 rounded-full">
                  {activeRules.length}
                </span>
              </div>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {activeRules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    channelName={rule.channel_name}
                    filterName={rule.filter_name}
                  />
                ))}
              </div>
            </section>
          )}

          {pausedRules.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-muted-foreground/30" />
                <h2 className="text-sm font-medium text-muted-foreground font-heading tracking-wide uppercase">
                  Paused Rules
                </h2>
                <span className="text-xs text-muted-foreground/60 bg-muted/50 px-2 py-0.5 rounded-full">
                  {pausedRules.length}
                </span>
              </div>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {pausedRules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    channelName={rule.channel_name}
                    filterName={rule.filter_name}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

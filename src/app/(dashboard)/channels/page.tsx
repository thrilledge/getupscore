"use client";

import { Suspense, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import type { NotificationChannel } from "@/lib/supabase/database-types";
import { ChannelFormDialog } from "@/components/channel-form";
import { ChannelCard } from "@/components/channel-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  Plus,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

async function fetchChannels(userId: string): Promise<NotificationChannel[]> {
  const { data, error } = await supabase
    .from("notification_channels")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export default function ChannelsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    }>
      <ChannelsContent />
    </Suspense>
  );
}

function ChannelsContent() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    if (success === "slack_connected") {
      toast.success("Slack connected successfully! Notifications will be delivered to your Slack workspace.");
      queryClient.invalidateQueries({ queryKey: ["notification_channels"] });
      router.replace("/channels");
    } else if (error) {
      const messages: Record<string, string> = {
        slack_denied: "Slack authorization was denied.",
        missing_params: "Missing authorization parameters.",
        invalid_state: "Invalid or expired state. Please try again.",
        token_exchange_failed: "Failed to exchange authorization code. Please try again.",
        no_webhook: "Slack did not return a webhook URL. Make sure you selected a channel.",
        save_failed: "Failed to save channel. Please try again.",
        oauth_failed: "Slack connection failed. Please try again.",
      };
      toast.error(messages[error] || `Slack error: ${error}`);
      router.replace("/channels");
    }
  }, [searchParams, queryClient, router]);

  const {
    data: channels,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["notification_channels", user?.id],
    queryFn: () => fetchChannels(user!.id),
    enabled: !!user?.id,
  });

  const activeChannels =
    channels?.filter((c) => c.is_active) ?? [];
  const pausedChannels =
    channels?.filter((c) => !c.is_active) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">
            Notification Channels
          </h1>
          <p className="text-muted-foreground mt-1">
            Connect channels to receive job alerts — Email, Telegram, Slack,
            Discord, and more.
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
          <ChannelFormDialog />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="overflow-hidden border-border/60">
              <div className="h-1 bg-muted" />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="size-8 rounded-md" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-destructive/10 p-2">
                <AlertCircle className="size-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-base font-heading">
                  Failed to load channels
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

      {/* Empty State */}
      {!isLoading && !isError && channels?.length === 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-accent-amber/10 p-3">
                <Bell className="size-6 text-accent-amber" />
              </div>
              <div>
                <CardTitle className="text-lg font-heading">
                  No channels yet
                </CardTitle>
                <CardDescription>
                  Connect a notification channel to start receiving job alerts.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pb-8">
            <div className="max-w-sm text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Channels deliver scored job alerts directly to your preferred
                messaging platforms.
              </p>
              <ul className="text-xs text-muted-foreground/70 space-y-1 text-left">
                <li className="flex items-start gap-2">
                  <span className="text-accent-amber mt-0.5">•</span>
                  Email — get alerts in your inbox
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-amber mt-0.5">•</span>
                  Telegram, Slack, Discord — instant notifications
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-amber mt-0.5">•</span>
                  Webhook — integrate with custom workflows
                </li>
              </ul>
            </div>
            <ChannelFormDialog
              trigger={
                <Button size="lg" className="mt-2">
                  <Plus className="size-4 mr-2" />
                  Create Your First Channel
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Channels Grid */}
      {!isLoading && !isError && channels && channels.length > 0 && (
        <div className="space-y-8">
          {/* Active Channels */}
          {activeChannels.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-accent-green animate-pulse" />
                <h2 className="text-sm font-medium text-muted-foreground font-heading tracking-wide uppercase">
                  Active Channels
                </h2>
                <span className="text-xs text-muted-foreground/60 bg-muted/50 px-2 py-0.5 rounded-full">
                  {activeChannels.length}
                </span>
              </div>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {activeChannels.map((channel) => (
                  <ChannelCard key={channel.id} channel={channel} />
                ))}
              </div>
            </section>
          )}

          {/* Paused Channels */}
          {pausedChannels.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-muted-foreground/30" />
                <h2 className="text-sm font-medium text-muted-foreground font-heading tracking-wide uppercase">
                  Paused Channels
                </h2>
                <span className="text-xs text-muted-foreground/60 bg-muted/50 px-2 py-0.5 rounded-full">
                  {pausedChannels.length}
                </span>
              </div>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {pausedChannels.map((channel) => (
                  <ChannelCard key={channel.id} channel={channel} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { Suspense, useEffect } from "react";
import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  Bell,
  Mail,
  MessageCircle,
  Plus,
  Radio,
  RefreshCw,
  Webhook,
} from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import type { NotificationChannel } from "@/lib/supabase/database-types";
import { ChannelFormDialog } from "@/components/channel-form";
import { ChannelCard } from "@/components/channel-card";
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

async function fetchChannels(
  userId: string
): Promise<NotificationChannel[]> {
  const { data, error } = await supabase
    .from("notification_channels")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return data ?? [];
}

function ChannelsLoading() {
  return (
    <div className="mx-auto w-full max-w-[1500px] min-w-0 space-y-4 overflow-x-clip sm:space-y-5 lg:space-y-6">
      {/* Header Skeleton */}
      <div className="overflow-hidden rounded-[20px] bg-[#0A0A0A] p-4 min-[480px]:p-5 sm:rounded-[24px] sm:p-6 lg:rounded-[28px] lg:p-7">
        <div className="flex min-w-0 flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <Skeleton className="size-10 shrink-0 rounded-xl bg-white/10 sm:size-12 sm:rounded-2xl" />

            <div className="min-w-0 flex-1 space-y-2.5">
              <Skeleton className="h-6 w-40 max-w-full bg-white/10 min-[420px]:w-56 sm:h-7 sm:w-72" />

              <Skeleton className="h-4 w-52 max-w-full bg-white/10 min-[420px]:w-64 sm:w-96" />
            </div>
          </div>

          <div className="flex w-full min-w-0 items-center gap-2 xl:w-auto xl:shrink-0">
            <Skeleton className="size-10 shrink-0 rounded-xl bg-white/10" />

            <Skeleton className="h-10 min-w-0 flex-1 rounded-xl bg-[#00C98B]/20 xl:w-40 xl:flex-none" />
          </div>
        </div>
      </div>

      {/* Cards Skeleton */}
      <div className="grid min-w-0 gap-3 lg:grid-cols-2 lg:gap-4 2xl:grid-cols-3">
        {Array.from({ length: 3 }).map(
          (_, index) => (
            <Card
              key={index}
              className="min-w-0 gap-0 overflow-hidden rounded-[18px] border-black/10 bg-white py-0"
            >
              <div className="h-[3px] bg-[#00C98B]/30" />

              <CardHeader className="p-4 pb-3 min-[480px]:p-5 min-[480px]:pb-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-5 w-32 max-w-full bg-black/10" />
                    <Skeleton className="h-3 w-24 max-w-full bg-black/10" />
                  </div>

                  <Skeleton className="size-9 shrink-0 rounded-xl bg-[#00C98B]/10" />
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-0 min-[480px]:p-5 min-[480px]:pt-0">
                <Skeleton className="h-4 w-48 max-w-full bg-black/10" />
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
}

export default function ChannelsPage() {
  return (
    <Suspense fallback={<ChannelsLoading />}>
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
      toast.success(
        "Slack connected successfully! Notifications will be delivered to your Slack workspace."
      );

      queryClient.invalidateQueries({
        queryKey: ["notification_channels"],
      });

      router.replace("/channels");
    } else if (error) {
      const messages: Record<string, string> = {
        slack_denied:
          "Slack authorization was denied.",
        missing_params:
          "Missing authorization parameters.",
        invalid_state:
          "Invalid or expired state. Please try again.",
        token_exchange_failed:
          "Failed to exchange authorization code. Please try again.",
        no_webhook:
          "Slack did not return a webhook URL. Make sure you selected a channel.",
        save_failed:
          "Failed to save channel. Please try again.",
        oauth_failed:
          "Slack connection failed. Please try again.",
      };

      toast.error(
        messages[error] || `Slack error: ${error}`
      );

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
    queryKey: [
      "notification_channels",
      user?.id,
    ],
    queryFn: () => fetchChannels(user!.id),
    enabled: !!user?.id,
  });

  const activeChannels =
    channels?.filter(
      (channel) => channel.is_active
    ) ?? [];

  const pausedChannels =
    channels?.filter(
      (channel) => !channel.is_active
    ) ?? [];

  return (
    <SubscriptionGate feature="Channels">
    <div className="mx-auto w-full max-w-[1500px] min-w-0 space-y-4 overflow-x-clip pb-6 sm:space-y-5 lg:space-y-6">
      {/* Header */}
      <section className="animate-in fade-in slide-in-from-bottom-3 relative min-w-0 overflow-hidden rounded-[20px] bg-[#0A0A0A] px-4 py-5 duration-500 min-[480px]:px-5 sm:rounded-[24px] sm:px-6 sm:py-6 lg:rounded-[28px] lg:px-7 lg:py-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[#00C98B]/15 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-1/3 h-px w-1/2 bg-gradient-to-r from-transparent via-[#00C98B]/70 to-transparent"
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
          {/* Header Content */}
          <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#00C98B]/30 bg-[#00C98B]/10 text-[#00C98B] sm:size-12 sm:rounded-2xl">
              <Bell className="size-5 sm:size-6" />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="max-w-full break-words font-heading text-xl font-bold leading-tight tracking-tight text-white min-[420px]:text-2xl sm:text-3xl">
                Notification Channels
              </h1>

              <p className="mt-1.5 max-w-2xl text-xs leading-5 text-white/60 min-[420px]:text-sm min-[420px]:leading-6">
                Connect and manage the channels where
                you want to receive real-time job
                alerts.
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
              aria-label="Refresh notification channels"
              title="Refresh channels"
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
              <ChannelFormDialog
                trigger={
                  <Button className="h-10 w-full min-w-0 max-w-full overflow-hidden rounded-xl bg-[#00C98B] px-3 text-xs font-semibold text-[#0A0A0A] shadow-[0_8px_24px_rgba(0,201,139,0.2)] hover:bg-[#00C98B]/90 min-[380px]:px-4 min-[380px]:text-sm xl:w-auto">
                    <Plus className="size-4 shrink-0" />

                    <span className="truncate whitespace-nowrap">
                      Connect channel
                    </span>
                  </Button>
                }
                onSuccess={() => refetch()}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Loading State */}
      {isLoading && (
        <div className="grid min-w-0 gap-3 lg:grid-cols-2 lg:gap-4 2xl:grid-cols-3">
          {Array.from({ length: 3 }).map(
            (_, index) => (
              <Card
                key={index}
                className="min-w-0 gap-0 overflow-hidden rounded-[18px] border-black/10 bg-white py-0 shadow-[0_8px_28px_rgba(0,0,0,0.04)]"
              >
                <div className="h-[3px] bg-[#00C98B]/30" />

                <CardHeader className="p-4 pb-3 min-[480px]:p-5 min-[480px]:pb-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-5 w-32 max-w-full bg-black/10" />
                      <Skeleton className="h-3 w-24 max-w-full bg-black/10" />
                    </div>

                    <Skeleton className="size-9 shrink-0 rounded-xl bg-[#00C98B]/10" />
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-0 min-[480px]:p-5 min-[480px]:pt-0">
                  <Skeleton className="h-4 w-48 max-w-full bg-black/10" />
                </CardContent>
              </Card>
            )
          )}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <Card className="animate-in fade-in slide-in-from-bottom-3 min-w-0 gap-0 overflow-hidden rounded-[18px] border-black/10 bg-white py-0 duration-500 shadow-[0_12px_34px_rgba(0,0,0,0.05)] sm:rounded-2xl">
          <div className="h-[3px] bg-[#0A0A0A]" />

          <CardHeader className="p-4 min-[480px]:p-5 sm:p-6">
            <div className="flex min-w-0 flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center sm:gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#0A0A0A] text-[#00C98B] sm:size-11 sm:rounded-2xl">
                <AlertCircle className="size-5" />
              </div>

              <div className="min-w-0">
                <CardTitle className="font-heading text-base text-[#0A0A0A] sm:text-lg">
                  Failed to load channels
                </CardTitle>

                <CardDescription className="mt-1 break-words text-xs leading-5 text-black/55 sm:text-sm">
                  {error?.message ??
                    "An unexpected error occurred."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-4 pb-4 min-[480px]:px-5 min-[480px]:pb-5 sm:px-6 sm:pb-6">
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="h-9 w-full rounded-xl border-black/15 bg-white px-4 text-[#0A0A0A] hover:border-[#00C98B] hover:bg-[#00C98B]/10 min-[420px]:w-auto"
            >
              <RefreshCw className="size-4" />
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading &&
        !isError &&
        channels?.length === 0 && (
          <Card className="animate-in fade-in slide-in-from-bottom-3 relative min-w-0 gap-0 overflow-hidden rounded-[20px] border-[#00C98B]/25 bg-white py-0 duration-500 shadow-[0_16px_45px_rgba(0,0,0,0.05)] sm:rounded-[24px]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-[#00C98B]/10 blur-3xl"
            />

            <CardHeader className="relative p-4 pb-3 min-[480px]:p-5 min-[480px]:pb-4 sm:p-7 sm:pb-5">
              <div className="flex min-w-0 flex-col gap-3 min-[480px]:flex-row min-[480px]:items-center sm:gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#0A0A0A] text-[#00C98B] shadow-lg sm:size-12 sm:rounded-2xl">
                  <Bell className="size-5 sm:size-6" />
                </div>

                <div className="min-w-0">
                  <CardTitle className="font-heading text-lg font-bold text-[#0A0A0A] sm:text-xl">
                    Connect your first channel
                  </CardTitle>

                  <CardDescription className="mt-1 max-w-xl text-xs leading-5 text-black/55 sm:text-sm sm:leading-6">
                    Choose where UpScore should deliver
                    relevant job alerts when one of your
                    notification rules is triggered.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="relative space-y-5 p-4 pt-2 min-[480px]:p-5 min-[480px]:pt-2 sm:space-y-6 sm:p-7 sm:pt-2">
              <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    icon: Mail,
                    title: "Email",
                    description:
                      "Receive alerts directly in your inbox.",
                  },
                  {
                    icon: MessageCircle,
                    title: "Messaging",
                    description:
                      "Connect Telegram, Slack or Discord.",
                  },
                  {
                    icon: Radio,
                    title: "Instant alerts",
                    description:
                      "Get notified when a matching job appears.",
                  },
                  {
                    icon: Webhook,
                    title: "Webhook",
                    description:
                      "Connect alerts with custom workflows.",
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className="group min-w-0 rounded-[16px] border border-black/10 bg-[#FAFAFA] p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C98B]/40 hover:bg-[#00C98B]/5 hover:shadow-[0_12px_30px_rgba(0,201,139,0.08)] sm:rounded-2xl sm:p-4"
                    >
                      <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-[#00C98B]/10 text-[#00C98B] transition-colors group-hover:bg-[#00C98B] group-hover:text-[#0A0A0A]">
                        <Icon className="size-4" />
                      </div>

                      <h3 className="text-sm font-semibold text-[#0A0A0A]">
                        {item.title}
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-black/50">
                        {item.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="flex min-w-0 flex-col gap-3 border-t border-black/10 pt-4 lg:flex-row lg:items-center lg:justify-between sm:pt-5">
                <p className="min-w-0 text-xs leading-5 text-black/45">
                  You can pause, update or remove a
                  connected channel at any time.
                </p>

                <div className="w-full min-w-0 lg:w-auto lg:shrink-0">
                  <ChannelFormDialog
                    trigger={
                      <Button
                        size="lg"
                        className="h-10 w-full min-w-0 overflow-hidden rounded-xl bg-[#0A0A0A] px-4 text-xs font-semibold text-white shadow-[0_10px_28px_rgba(0,0,0,0.15)] hover:bg-[#00C98B] hover:text-[#0A0A0A] min-[420px]:text-sm lg:w-auto sm:h-11 sm:px-5"
                      >
                        <Plus className="size-4 shrink-0" />

                        <span className="truncate whitespace-nowrap">
                          Create your first channel
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

      {/* Channels Grid */}
      {!isLoading &&
        !isError &&
        channels &&
        channels.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-3 min-w-0 space-y-7 duration-500 sm:space-y-8">
            {/* Active Channels */}
            {activeChannels.length > 0 && (
              <section className="min-w-0 space-y-3 sm:space-y-4">
                <div className="flex min-w-0 flex-col gap-3 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#0A0A0A]">
                      <span className="size-2.5 animate-pulse rounded-full bg-[#00C98B] shadow-[0_0_12px_rgba(0,201,139,0.9)]" />
                    </div>

                    <div className="min-w-0">
                      <h2 className="font-heading text-xs font-bold uppercase tracking-[0.12em] text-[#0A0A0A] min-[420px]:text-sm">
                        Active channels
                      </h2>

                      <p className="mt-0.5 text-[11px] leading-4 text-black/45 min-[420px]:text-xs">
                        Currently available for alert
                        delivery
                      </p>
                    </div>
                  </div>

                  <span className="w-fit shrink-0 rounded-full border border-[#00C98B]/25 bg-[#00C98B]/10 px-3 py-1 text-xs font-bold text-[#007A56]">
                    {activeChannels.length} active
                  </span>
                </div>

                <div className="grid min-w-0 gap-3 lg:grid-cols-2 lg:gap-4 2xl:grid-cols-3">
                  {activeChannels.map(
                    (channel, index) => (
                      <div
                        key={channel.id}
                        style={{
                          animationDelay: `${index * 70
                            }ms`,
                        }}
                        className="animate-in fade-in slide-in-from-bottom-3 h-full min-w-0 rounded-2xl transition-transform duration-300 hover:-translate-y-1"
                      >
                        <ChannelCard
                          channel={channel}
                          onSuccess={() => refetch()}
                        />
                      </div>
                    )
                  )}
                </div>
              </section>
            )}

            {/* Paused Channels */}
            {pausedChannels.length > 0 && (
              <section className="min-w-0 space-y-3 sm:space-y-4">
                <div className="flex min-w-0 flex-col gap-3 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white">
                      <span className="size-2.5 rounded-full bg-black/25" />
                    </div>

                    <div className="min-w-0">
                      <h2 className="font-heading text-xs font-bold uppercase tracking-[0.12em] text-[#0A0A0A] min-[420px]:text-sm">
                        Paused channels
                      </h2>

                      <p className="mt-0.5 text-[11px] leading-4 text-black/45 min-[420px]:text-xs">
                        Saved channels currently not
                        delivering alerts
                      </p>
                    </div>
                  </div>

                  <span className="w-fit shrink-0 rounded-full border border-black/10 bg-black/5 px-3 py-1 text-xs font-bold text-black/50">
                    {pausedChannels.length} paused
                  </span>
                </div>

                <div className="grid min-w-0 gap-3 lg:grid-cols-2 lg:gap-4 2xl:grid-cols-3">
                  {pausedChannels.map(
                    (channel, index) => (
                      <div
                        key={channel.id}
                        style={{
                          animationDelay: `${index * 70
                            }ms`,
                        }}
                        className="animate-in fade-in slide-in-from-bottom-3 h-full min-w-0 rounded-2xl opacity-80 transition-all duration-300 hover:-translate-y-1 hover:opacity-100"
                      >
                        <ChannelCard
                          channel={channel}
                          onSuccess={() => refetch()}
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
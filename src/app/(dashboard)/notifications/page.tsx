"use client";

import {
  useState,
  useEffect,
  useCallback,
} from "react";
import Link from "next/link";
import { SubscriptionGate } from "@/components/subscription-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase/client";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  ExternalLink,
  XCircle,
  Settings,
  Shield,
} from "lucide-react";

interface NotificationItem {
  id: string;
  channel: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  job_id: string;
  job_title?: string;
}

interface ChannelStatus {
  id: string;
  type: string;
  name: string;
  is_active: boolean;
  is_verified: boolean;
}

function ChannelStatusBadge({
  channel,
}: {
  channel: ChannelStatus;
}) {
  const typeColors: Record<string, string> = {
    whatsapp: "bg-green-100 text-green-800",
    email: "bg-blue-100 text-blue-800",
    slack: "bg-purple-100 text-purple-800",
    telegram: "bg-yellow-100 text-yellow-800",
  };

  const typeColor = typeColors[channel.type] ?? "bg-gray-100 text-gray-800";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${typeColor}`}
    >
      {channel.type === "whatsapp" ? (
        <svg
          className="size-3"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.414 11.586a3 3 0 00-4.242 0l-3 3a3 3 0 004.242 4.242l1.5-1.5a.75.75 0 011.06 0l2.5 2.5a.75.75 0 01-1.06 1.06l-1.5-1.5a4.5 4.5 0 00-6.363 6.364l3 3a4.5 4.5 0 006.363-6.363l-2.5-2.5a.75.75 0 01-1.06 0l-1.5 1.5a3 3 0 004.242 4.242l3-3a3 3 0 000-4.242z" />
        </svg>
      ) : (
        <Bell className="size-3" />
      )}
      {channel.type}
    </span>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<
    NotificationItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channelStatus, setChannelStatus] = useState<ChannelStatus[]>([]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/notifications/history"
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      setNotifications(data.notifications || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchChannelStatus = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setChannelStatus([]);
        return;
      }
      const { data: channels } = await supabase
        .from("notification_channels")
        .select("id, type, name, is_active, is_verified")
        .eq("user_id", user.id)
        .eq("is_active", true);
      setChannelStatus(channels ?? []);
    } catch {
      setChannelStatus([]);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchChannelStatus();
  }, [fetchNotifications, fetchChannelStatus]);

  const statusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00C98B]/25 bg-[#00C98B]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#008F64]">
            <CheckCircle2 className="size-3.5" />
            Sent
          </span>
        );

      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0A0A0A]/12 bg-[#0A0A0A]/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0A0A0A]/65">
            <XCircle className="size-3.5" />
            Failed
          </span>
        );

      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00C98B]/20 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#00A975]">
            <Clock className="size-3.5" />
            Pending
          </span>
        );

      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0A0A0A]/10 bg-[#0A0A0A]/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0A0A0A]/45">
            <Bell className="size-3.5" />
            {status}
          </span>
        );
    }
  };

  const channelLabel = (channel: string) => {
    const map: Record<string, string> = {
      email: "Email",
      telegram: "Telegram",
      slack: "Slack",
      discord: "Discord",
      webhook: "Webhook",
      whatsapp: "WhatsApp",
      sms: "SMS",
      n8n: "n8n",
      make: "Make",
      zapier: "Zapier",
    };

    return map[channel] || channel;
  };

  return (
    <SubscriptionGate feature="Notifications">
    <div className="space-y-5 pb-6">
      {/* Header */}
      <section className="animate-in fade-in slide-in-from-bottom-2 relative overflow-hidden rounded-[22px] border border-[#0A0A0A]/10 bg-[#EFF1F3] px-5 py-5 text-[#0A0A0A] shadow-[0_12px_30px_rgba(0,0,0,0.06)] duration-500 sm:px-6 dark:border-white/10 dark:bg-[#0A0A0A] dark:text-white dark:shadow-[0_16px_40px_rgba(0,0,0,0.13)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,201,139,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,139,0.07) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "linear-gradient(to right, transparent, black)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black)",
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 size-60 rounded-full bg-[#00C98B]/15 blur-[100px]"
        />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl border border-[#00C98B]/30 bg-[#00C98B]/10 text-[#00C98B]">
              <Bell className="size-5" />

              <span className="absolute -right-1 -top-1 size-2.5 rounded-full border-2 border-[#0A0A0A] bg-[#00C98B]" />
            </span>

            <div>
              {/* <div className="mb-1 flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-[#00C98B] shadow-[0_0_8px_rgba(0,201,139,0.8)]" />

                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#00C98B]">
                  Alert history
                </span>
              </div> */}

              <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                Notifications
              </h1>

              <p className="mt-1 max-w-xl text-sm leading-6 text-[#0A0A0A]/55 dark:text-white/50">
                Recent alerts sent through your configured
                notification channels.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 items-center gap-2">
            <span className="inline-flex h-9 items-center rounded-xl border border-[#00C98B]/25 bg-[#00C98B]/10 px-3 text-xs font-semibold text-[#00C98B]">
              {loading ? "..." : notifications.length}{" "}
              notification
              {notifications.length !== 1 ? "s" : ""}
            </span>

            <Button
              render={<Link href="/channels" />}
              variant="outline"
              size="sm"
              className="h-9 rounded-xl border-[#0A0A0A]/15 bg-white/70 px-3 text-[#0A0A0A]/75 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C98B]/40 hover:bg-[#00C98B]/10 hover:text-[#00C98B] dark:border-white/15 dark:bg-white/[0.045] dark:text-white/65"
            >
              <Settings className="size-4" />
              Channels
            </Button>

            <Button
              render={<Link href="/rules" />}
              variant="outline"
              size="sm"
              className="h-9 rounded-xl border-[#0A0A0A]/15 bg-white/70 px-3 text-[#0A0A0A]/75 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C98B]/40 hover:bg-[#00C98B]/10 hover:text-[#00C98B] dark:border-white/15 dark:bg-white/[0.045] dark:text-white/65"
            >
              <Shield className="size-4" />
              Rules
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchNotifications}
              disabled={loading}
              className="h-9 rounded-xl border-[#00C98B]/35 bg-[#00C98B]/10 px-3 text-[#00C98B] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C98B] hover:bg-[#00C98B] hover:text-[#0A0A0A]"
            >
              <RefreshCw
                className={`size-4 ${loading ? "animate-spin" : ""
                  }`}
              />
              Refresh
            </Button>
          </div>
        </div>
      </section>

      {/* Active Channels Summary */}
      {channelStatus.length > 0 && (
        <section className="animate-in fade-in slide-in-from-bottom-2 overflow-hidden rounded-[18px] border border-[#00C98B]/15 bg-[#00C98B]/5 px-5 py-4 shadow-[0_8px_24px_rgba(0,201,139,0.06)] duration-500">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#00C98B]">
              Active channels
            </span>
            {channelStatus.map((ch) => (
              <ChannelStatusBadge key={ch.id} channel={ch} />
            ))}
          </div>
        </section>
      )}

      {/* Loading state */}
      {loading && (
        <div className="overflow-hidden rounded-[20px] border border-[#0A0A0A]/10 bg-white shadow-[0_7px_24px_rgba(0,0,0,0.035)]">
          <div className="grid min-w-[680px] grid-cols-[130px_130px_minmax(250px,1fr)_190px] gap-4 bg-[#0A0A0A] px-5 py-3">
            {[1, 2, 3, 4].map((item) => (
              <Skeleton
                key={item}
                className="h-3 bg-white/10"
              />
            ))}
          </div>

          <div className="divide-y divide-[#0A0A0A]/7">
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="flex min-w-[680px] items-center gap-5 px-5 py-4"
              >
                <Skeleton className="h-7 w-20 rounded-full bg-[#00C98B]/10" />

                <Skeleton className="h-6 w-20 rounded-full bg-[#00C98B]/8" />

                <Skeleton className="h-4 flex-1 bg-[#0A0A0A]/7" />

                <Skeleton className="h-4 w-36 bg-[#0A0A0A]/7" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <section className="animate-in fade-in slide-in-from-bottom-2 overflow-hidden rounded-[20px] border border-[#0A0A0A]/12 bg-white shadow-[0_8px_28px_rgba(0,0,0,0.045)] duration-500">
          <div className="h-[3px] bg-[#0A0A0A]" />

          <div className="flex flex-col items-center px-5 py-8 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-[#00C98B]/10 text-[#00A975]">
              <AlertTriangle className="size-5" />
            </span>

            <h2 className="mt-4 font-heading text-lg font-bold text-[#0A0A0A]">
              Failed to load notifications
            </h2>

            <p className="mt-1 max-w-md text-sm leading-6 text-[#0A0A0A]/50">
              {error}
            </p>

            <Button
              variant="outline"
              size="sm"
              className="mt-4 h-9 rounded-xl border-[#0A0A0A]/10 bg-white px-4 font-semibold text-[#0A0A0A] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C98B]/40 hover:bg-[#00C98B]/5 hover:text-[#00A975]"
              onClick={fetchNotifications}
            >
              <RefreshCw className="size-4" />
              Retry
            </Button>
          </div>
        </section>
      )}

      {/* Empty state */}
      {!loading &&
        !error &&
        notifications.length === 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-3 relative overflow-hidden rounded-[22px] border border-[#0A0A0A]/10 bg-[#EFF1F3] text-[#0A0A0A] shadow-[0_12px_32px_rgba(0,0,0,0.06)] duration-500 dark:border-white/10 dark:bg-[#0A0A0A] dark:text-white dark:shadow-[0_16px_45px_rgba(0,0,0,0.13)]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(0,201,139,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,139,0.07) 1px, transparent 1px)",
                backgroundSize: "44px 44px",
                maskImage:
                  "radial-gradient(circle at center, black, transparent 75%)",
                WebkitMaskImage:
                  "radial-gradient(circle at center, black, transparent 75%)",
              }}
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00C98B]/15 blur-[100px]"
            />

            <div className="relative z-10 flex flex-col items-center px-5 py-12 text-center">
              <span className="relative grid size-16 place-items-center rounded-[20px] border border-[#00C98B]/30 bg-[#00C98B]/10 text-[#00C98B] shadow-[0_15px_35px_rgba(0,201,139,0.1)]">
                <Bell className="size-7" />

                <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-[#0A0A0A] bg-[#00C98B]" />
              </span>

              <h2 className="mt-5 font-heading text-xl font-bold">
                No notifications yet
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-[#0A0A0A]/55 dark:text-white/50">
                Notifications will appear here when your
                rules trigger alerts through connected
                channels.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <Button
                  render={<Link href="/channels" />}
                  className="h-10 rounded-full bg-[#00C98B] px-5 font-bold text-[#0A0A0A] shadow-[0_12px_30px_rgba(0,201,139,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#00C98B]/90"
                >
                  <Settings className="size-4" />
                  Set up channels
                </Button>

                <Button
                  render={<Link href="/rules" />}
                  variant="outline"
                  className="h-10 rounded-full border-[#0A0A0A]/15 bg-white/70 px-5 font-semibold text-[#0A0A0A]/65 transition-all duration-300 hover:border-[#00C98B]/40 hover:bg-[#00C98B]/10 hover:text-[#00C98B] dark:border-white/15 dark:bg-white/[0.045] dark:text-white/70"
                >
                  <Shield className="size-4" />
                  Configure rules
                </Button>
              </div>
            </div>
          </section>
        )}

      {/* Notifications table */}
      {!loading &&
        !error &&
        notifications.length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-2 overflow-hidden rounded-[20px] border border-[#0A0A0A]/10 bg-white shadow-[0_8px_28px_rgba(0,0,0,0.045)] duration-500">
            <div className="overflow-x-auto">
              <table className="min-w-[680px] w-full text-sm">
                <thead>
                  <tr className="border-b border-[#0A0A0A]/10 bg-[#EFF1F3] dark:border-white/10 dark:bg-[#0A0A0A]">
                    <th className="w-[150px] px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#0A0A0A]/55 dark:text-white/50">
                      Status
                    </th>

                    <th className="w-[140px] px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#0A0A0A]/55 dark:text-white/50">
                      Channel
                    </th>

                    <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#0A0A0A]/55 dark:text-white/50">
                      Job
                    </th>

                    <th className="w-[210px] px-5 py-3.5 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-[#0A0A0A]/55 dark:text-white/50">
                      Sent
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#0A0A0A]/7">
                  {notifications.map((notification) => (
                    <tr
                      key={notification.id}
                      className="group transition-all duration-200 hover:bg-[#00C98B]/5"
                    >
                      <td className="px-5 py-3.5">
                        {statusIcon(notification.status)}
                      </td>

                      <td className="px-5 py-3.5">
                        <Badge
                          variant="outline"
                          className="rounded-full border-[#00C98B]/20 bg-[#00C98B]/7 px-2.5 py-1 text-[10px] font-semibold text-[#008F64]"
                        >
                          {channelLabel(
                            notification.channel
                          )}
                        </Badge>
                      </td>

                      <td className="px-5 py-3.5">
                        <Link
                          href={`/jobs/${notification.job_id}`}
                          className="group/link inline-flex max-w-full items-center gap-1.5 font-heading font-semibold text-[#0A0A0A] transition-colors hover:text-[#00A975]"
                        >
                          <span className="truncate">
                            {notification.job_title ||
                              notification.job_id.slice(
                                0,
                                8
                              )}
                          </span>

                          <ExternalLink className="size-3.5 shrink-0 text-[#00A975] opacity-0 transition-all duration-200 group-hover/link:opacity-100" />
                        </Link>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-[#0A0A0A]/45">
                          <Clock className="size-3.5 text-[#00A975]" />

                          {new Date(
                            notification.sent_at ||
                            notification.created_at
                          ).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
    </div>
    </SubscriptionGate>
  );
}
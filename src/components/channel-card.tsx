"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { NotificationChannel } from "@/lib/supabase/database-types";
import {
  channelTypeLabels,
  channelTypeIcons,
  type ChannelType,
} from "@/lib/validations/channel";
import {
  toggleChannel,
  deleteChannel,
} from "@/actions/channels";
import { ChannelFormDialog } from "@/components/channel-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bell,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Network,
  Pencil,
  Phone,
  Power,
  PowerOff,
  Route,
  Send,
  Smartphone,
  TestTube,
  Trash2,
  Webhook,
  XCircle,
  Zap,
} from "lucide-react";

import { supabase } from "@/lib/supabase/client";

const iconMap: Record<string, React.ElementType> = {
  Mail,
  Send,
  MessageSquare,
  MessageCircle,
  Webhook,
  Smartphone,
  Phone,
  Network,
  Route,
  Zap,
};

interface ChannelCardProps {
  channel: NotificationChannel;
  onSuccess?: () => void;
}

function getConfigSummary(
  channel: NotificationChannel
): string {
  const config = channel.config as Record<string, string>;

  switch (channel.type) {
    case "email":
      return config.to ?? "";

    case "telegram":
      return `Chat: ${config.chat_id ?? "—"}`;

    case "slack":
    case "discord":
    case "webhook":
    case "n8n":
    case "make":
    case "zapier":
      return config.url ?? config.webhook_url ?? "";

    case "sms":
    case "whatsapp":
      return config.phone ?? "";

    default:
      return "";
  }
}

function getConfigPreview(
  channel: NotificationChannel
): string {
  const summary = getConfigSummary(channel);

  return summary.length > 40
    ? summary.slice(0, 40) + "…"
    : summary;
}

export function ChannelCard({
  channel,
  onSuccess,
}: ChannelCardProps) {
  const [showEditDialog, setShowEditDialog] =
    useState(false);

  const [showDeleteDialog, setShowDeleteDialog] =
    useState(false);

  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [testing, setTesting] = useState(false);

  const typeLabel =
    channelTypeLabels[channel.type as ChannelType] ??
    channel.type;

  const Icon =
    iconMap[
    channelTypeIcons[channel.type as ChannelType]
    ] ?? Bell;

  async function handleToggle() {
    setToggling(true);

    const result = await toggleChannel(
      channel.id,
      !channel.is_active
    );

    setToggling(false);

    if (!result.success) {
      toast.error(
        result.error ?? "Failed to toggle channel."
      );
      return;
    }

    toast.success(
      channel.is_active
        ? "Channel paused."
        : "Channel activated."
    );

    onSuccess?.();
  }

  async function handleDelete() {
    setDeleting(true);

    const result = await deleteChannel(channel.id);

    setDeleting(false);

    if (!result.success) {
      toast.error(
        result.error ?? "Failed to delete channel."
      );
      return;
    }

    toast.success("Channel deleted.");
    setShowDeleteDialog(false);
    onSuccess?.();
  }

  async function handleSendTest() {
    setTesting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      const response = await fetch(
        "/api/notifications/send",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token
              ? {
                Authorization: `Bearer ${token}`,
              }
              : {}),
          },
          body: JSON.stringify({
            channelId: channel.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(
          data.error ??
          "Failed to send test notification."
        );
        return;
      }

      const results = data.results ?? [];

      // Only surface results for the channel the user actually tested —
      // notifyUser dispatches to every matching rule, so a broken WhatsApp
      // channel used to swallow the Email/Telegram test result.
      const ownResults = results.filter(
        (result: any) => result.channelId === channel.id
      );

      const sent = ownResults.filter(
        (result: any) => result.ok
      ).length;

      const failed = ownResults.filter(
        (result: any) => !result.ok
      ).length;

      if (sent > 0) {
        toast.success(
          `Test notification sent via ${channel.name}!`
        );

        if (!channel.is_verified) {
          await supabase
            .from("notification_channels")
            .update({
              is_verified: true,
            })
            .eq("id", channel.id);
        }

        onSuccess?.();
      } else if (failed > 0) {
        const firstError = failed.find(
          (result: any) => !result.ok
        )?.error;

        toast.error(
          `Failed: ${firstError ?? "No matching rules"}`
        );
      } else {
        toast.info(
          "No matching rules for this channel. Create a rule first."
        );
      }
    } catch (error: any) {
      toast.error(
        error.message ??
        "Failed to send test notification."
      );
    } finally {
      setTesting(false);
    }
  }

  return (
    <>
      <Card
        className={`group relative h-full min-w-0 gap-0 overflow-hidden rounded-[18px] border py-0 transition-all duration-300 sm:rounded-2xl ${channel.is_active
            ? "border-[#00C98B]/25 bg-white shadow-[0_8px_26px_rgba(0,0,0,0.045)] hover:-translate-y-0.5 hover:border-[#00C98B]/50 hover:shadow-[0_16px_36px_rgba(0,201,139,0.09)]"
            : "border-black/10 bg-white opacity-70 shadow-[0_7px_22px_rgba(0,0,0,0.035)] hover:-translate-y-0.5 hover:opacity-100"
          }`}
      >
        {/* Top accent */}
        <div
          className={`h-[3px] w-full transition-colors duration-300 ${channel.is_active
              ? "bg-[#00C98B]"
              : "bg-[#0A0A0A]/15"
            }`}
        />

        <CardHeader className="min-w-0 p-4 pb-3 min-[480px]:p-5 min-[480px]:pb-4">
          <div className="flex min-w-0 items-start justify-between gap-2 min-[420px]:gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-2.5 min-[420px]:gap-3">
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 min-[480px]:size-11 min-[480px]:rounded-2xl ${channel.is_active
                    ? "border-[#00C98B]/20 bg-[#00C98B]/10 text-[#00C98B] group-hover:bg-[#00C98B] group-hover:text-[#0A0A0A]"
                    : "border-black/10 bg-black/5 text-black/40"
                  }`}
              >
                <Icon className="size-[18px] min-[480px]:size-5" />
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex min-w-0 flex-col items-start gap-1.5 min-[380px]:flex-row min-[380px]:items-center min-[380px]:gap-2">
                  <CardTitle
                    className="max-w-full truncate font-heading text-sm font-bold tracking-tight text-[#0A0A0A] min-[420px]:text-base"
                    title={channel.name}
                  >
                    {channel.name}
                  </CardTitle>

                  <Badge
                    variant="outline"
                    className={`h-5 shrink-0 rounded-full px-2 text-[9px] font-bold min-[420px]:text-[10px] ${channel.is_active
                        ? "border-[#00C98B]/25 bg-[#00C98B]/10 text-[#007A56]"
                        : "border-black/10 bg-black/5 text-black/45"
                      }`}
                  >
                    <span
                      className={`mr-1.5 size-1.5 rounded-full ${channel.is_active
                          ? "bg-[#00C98B]"
                          : "bg-black/30"
                        }`}
                    />

                    {channel.is_active
                      ? "Active"
                      : "Paused"}
                  </Badge>
                </div>

                <CardDescription className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-black/45 min-[420px]:text-xs">
                  <span className="max-w-full truncate font-medium">
                    {typeLabel}
                  </span>

                  <span className="size-1 shrink-0 rounded-full bg-black/20" />

                  {channel.is_verified ? (
                    <span className="inline-flex shrink-0 items-center gap-1 font-medium text-[#008F64]">
                      <CheckCircle2 className="size-3" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 text-black/40">
                      <XCircle className="size-3" />
                      Not verified
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Open actions for ${channel.name}`}
                    className="size-8 shrink-0 rounded-xl text-black/45 opacity-100 transition-all hover:bg-[#0A0A0A] hover:text-[#00C98B] lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
                  />
                }
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                sideOffset={6}
                className="w-48 max-w-[calc(100vw-1rem)] rounded-2xl border-black/10 bg-white p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.14)]"
              >
                <DropdownMenuLabel className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-black/40">
                  Channel actions
                </DropdownMenuLabel>

                <DropdownMenuItem
                  onClick={() => setShowEditDialog(true)}
                  className="cursor-pointer rounded-xl px-2.5 py-2 text-sm text-[#0A0A0A] focus:bg-[#00C98B]/10 focus:text-[#0A0A0A]"
                >
                  <Pencil className="mr-2 size-3.5 text-[#00C98B]" />
                  Edit channel
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={handleSendTest}
                  disabled={testing}
                  className="cursor-pointer rounded-xl px-2.5 py-2 text-sm text-[#0A0A0A] focus:bg-[#00C98B]/10 focus:text-[#0A0A0A]"
                >
                  {testing ? (
                    <Loader2 className="mr-2 size-3.5 animate-spin text-[#00C98B]" />
                  ) : (
                    <TestTube className="mr-2 size-3.5 text-[#00C98B]" />
                  )}

                  Send test
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={handleToggle}
                  disabled={toggling}
                  className="cursor-pointer rounded-xl px-2.5 py-2 text-sm text-[#0A0A0A] focus:bg-[#00C98B]/10 focus:text-[#0A0A0A]"
                >
                  {toggling ? (
                    <Loader2 className="mr-2 size-3.5 animate-spin text-[#00C98B]" />
                  ) : channel.is_active ? (
                    <PowerOff className="mr-2 size-3.5 text-[#00C98B]" />
                  ) : (
                    <Power className="mr-2 size-3.5 text-[#00C98B]" />
                  )}

                  {channel.is_active
                    ? "Pause channel"
                    : "Activate channel"}
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1 bg-black/10" />

                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="cursor-pointer rounded-xl px-2.5 py-2 text-sm text-[#0A0A0A] focus:bg-black/5 focus:text-[#0A0A0A]"
                >
                  <Trash2 className="mr-2 size-3.5 text-black/55" />
                  Delete channel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="min-w-0 px-4 pb-3 min-[480px]:px-5 min-[480px]:pb-4">
          <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-black/5 bg-[#F7F8F8] px-3 py-2.5 min-[420px]:gap-3 min-[420px]:px-3.5 min-[420px]:py-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#00C98B] shadow-sm">
              <Icon className="size-4" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-black/35 min-[420px]:text-[10px]">
                Destination
              </p>

              <p
                className="truncate font-mono text-[11px] font-medium text-black/65 min-[420px]:text-xs"
                title={getConfigSummary(channel)}
              >
                {getConfigPreview(channel) ||
                  "No destination provided"}
              </p>
            </div>
          </div>

          {["webhook", "n8n", "make", "zapier"].includes(channel.type) &&
            (channel.config as Record<string, string>)?.secret && (
              <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-[#00C98B]/10 bg-[#F0FDF8] px-3 py-2.5 min-[420px]:gap-3 min-[420px]:px-3.5 min-[420px]:py-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#008F64] shadow-sm">
                  <KeyRound className="size-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#008F64]/60 min-[420px]:text-[10px]">
                    Webhook secret
                  </p>

                  <p className="truncate font-mono text-[11px] font-medium text-black/65 min-[420px]:text-xs" title={`X-UpScore-Secret: ${(channel.config as Record<string, string>).secret}`}>
                    {(channel.config as Record<string, string>).secret}
                  </p>
                </div>
              </div>
            )}
        </CardContent>

        <CardFooter className="mt-auto flex min-w-0 items-center justify-between gap-2 border-t border-black/5 px-4 py-3 min-[480px]:gap-3 min-[480px]:px-5 min-[480px]:py-3.5">
          <div className="min-w-0 text-[10px] text-black/40 min-[420px]:text-[11px]">
            <span className="block truncate">
              Created{" "}
              {new Date(
                channel.created_at
              ).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSendTest}
            disabled={testing}
            className="h-7 shrink-0 rounded-lg px-2 text-[10px] font-semibold text-[#0A0A0A] hover:bg-[#00C98B]/10 hover:text-[#008F64] min-[380px]:px-2.5 min-[380px]:text-[11px]"
          >
            {testing ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <TestTube className="size-3" />
            )}

            <span className="hidden min-[340px]:inline">
              Test channel
            </span>

            <span className="min-[340px]:hidden">
              Test
            </span>
          </Button>
        </CardFooter>
      </Card>

      {/* Edit Dialog */}
      <ChannelFormDialog
        channel={channel}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={onSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      >
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-[430px] gap-0 overflow-hidden rounded-[20px] border-black/10 bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.22)] sm:rounded-[24px]">
          <div className="h-[3px] shrink-0 bg-[#00C98B]" />

          <div className="min-h-0 overflow-y-auto p-4 min-[420px]:p-5 sm:p-6">
            <DialogHeader className="text-left">
              <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-[#0A0A0A] text-[#00C98B] sm:mb-4 sm:size-11 sm:rounded-2xl">
                <Trash2 className="size-5" />
              </div>

              <DialogTitle className="font-heading text-lg font-bold text-[#0A0A0A] sm:text-xl">
                Delete channel?
              </DialogTitle>

              <DialogDescription className="pt-1 text-xs leading-5 text-black/55 sm:text-sm sm:leading-6">
                Are you sure you want to delete{" "}
                <strong className="break-words font-semibold text-[#0A0A0A]">
                  {channel.name}
                </strong>
                ? This action cannot be undone and will also
                remove any associated notification rules.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:flex sm:justify-end">
              <Button
                variant="outline"
                onClick={() =>
                  setShowDeleteDialog(false)
                }
                disabled={deleting}
                className="h-10 min-w-0 rounded-xl border-black/15 bg-white px-3 text-xs font-semibold text-[#0A0A0A] hover:border-[#00C98B]/40 hover:bg-[#00C98B]/10 sm:w-auto sm:px-4 sm:text-sm"
              >
                Cancel
              </Button>

              <Button
                onClick={handleDelete}
                disabled={deleting}
                className="h-10 min-w-0 rounded-xl bg-[#0A0A0A] px-3 text-xs font-semibold text-white hover:bg-[#00C98B] hover:text-[#0A0A0A] sm:w-auto sm:px-4 sm:text-sm"
              >
                {deleting && (
                  <Loader2 className="size-4 shrink-0 animate-spin" />
                )}

                <span className="truncate">
                  Delete channel
                </span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
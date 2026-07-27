"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { NotificationChannel } from "@/lib/supabase/database-types";
import {
  channelTypeLabels,
  channelTypeIcons,
  type ChannelType,
} from "@/lib/validations/channel";
import { toggleChannel, deleteChannel } from "@/actions/channels";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Loader2,
  Mail,
  Send,
  MessageSquare,
  MessageCircle,
  Webhook,
  Smartphone,
  Bell,
  CheckCircle2,
  XCircle,
  TestTube,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const iconMap: Record<string, React.ElementType> = {
  Mail,
  Send,
  MessageSquare,
  MessageCircle,
  Webhook,
  Smartphone,
};

interface ChannelCardProps {
  channel: NotificationChannel;
  onSuccess?: () => void;
}

function getConfigSummary(channel: NotificationChannel): string {
  const config = channel.config as Record<string, string>;
  switch (channel.type) {
    case "email":
      return config.to ?? "";
    case "telegram":
      return `Chat: ${config.chat_id ?? "—"}`;
    case "slack":
    case "discord":
    case "webhook":
      return config.url ?? config.webhook_url ?? "";
    case "sms":
      return config.phone ?? "";
    default:
      return "";
  }
}

function getConfigPreview(channel: NotificationChannel): string {
  const summary = getConfigSummary(channel);
  return summary.length > 40 ? summary.slice(0, 40) + "…" : summary;
}

export function ChannelCard({ channel, onSuccess }: ChannelCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [testing, setTesting] = useState(false);

  const typeLabel = channelTypeLabels[channel.type as ChannelType] ?? channel.type;
  const Icon = iconMap[channelTypeIcons[channel.type as ChannelType]] ?? Bell;

  async function handleToggle() {
    setToggling(true);
    const result = await toggleChannel(channel.id, !channel.is_active);
    setToggling(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to toggle channel.");
      return;
    }

    toast.success(channel.is_active ? "Channel paused." : "Channel activated.");
    onSuccess?.();
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteChannel(channel.id);
    setDeleting(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to delete channel.");
      return;
    }

    toast.success("Channel deleted.");
    setShowDeleteDialog(false);
    onSuccess?.();
  }

  async function handleSendTest() {
    setTesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ channelId: channel.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to send test notification.");
        return;
      }

      const results = data.results ?? [];
      const sent = results.filter((r: any) => r.ok).length;
      const failed = results.filter((r: any) => !r.ok).length;

      if (sent > 0) {
        toast.success(`Test notification sent via ${channel.name}!`);
        if (!channel.is_verified) {
          await supabase
            .from("notification_channels")
            .update({ is_verified: true })
            .eq("id", channel.id);
        }
        onSuccess?.();
      } else if (failed > 0) {
        const firstError = results.find((r: any) => !r.ok)?.error;
        toast.error(`Failed: ${firstError ?? "No matching rules"}`);
      } else {
        toast.info("No matching rules for this channel. Create a rule first.");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send test notification.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <>
      <Card
        className={`group relative overflow-hidden border-border/60 bg-card transition-all duration-300 hover:shadow-lg hover:border-border/100 hover:-translate-y-0.5 ${
          !channel.is_active ? "opacity-60" : ""
        }`}
      >
        {/* Accent bar */}
        <div
          className={`absolute top-0 left-0 h-1 w-full transition-colors duration-300 ${
            channel.is_active
              ? "bg-gradient-to-r from-accent-amber via-accent-amber/80 to-accent-amber/60"
              : "bg-muted-foreground/20"
          }`}
        />

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div
                  className={`rounded-lg p-1.5 transition-colors ${
                    channel.is_active
                      ? "bg-accent-amber/10 text-accent-amber"
                      : "bg-muted/50 text-muted-foreground/50"
                  }`}
                >
                  <Icon className="size-4" />
                </div>
                <CardTitle className="text-base font-heading font-semibold tracking-tight">
                  {channel.name}
                </CardTitle>
                <Badge
                  variant={channel.is_active ? "default" : "secondary"}
                  className="text-[10px] px-2 py-0 h-5 font-medium"
                >
                  {channel.is_active ? "Active" : "Paused"}
                </Badge>
              </div>
              <CardDescription className="text-xs flex items-center gap-2">
                <span>{typeLabel}</span>
                <span>·</span>
                <span>
                  {channel.is_verified ? (
                    <span className="flex items-center gap-1 text-accent-green">
                      <CheckCircle2 className="size-3" />
                      Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-muted-foreground/60">
                      <XCircle className="size-3" />
                      Not verified
                    </span>
                  )}
                </span>
              </CardDescription>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                }
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-xl p-1.5">
                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 py-1.5">
                  Actions
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                  <Pencil className="size-3.5 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleSendTest}
                  disabled={testing}
                  className="cursor-pointer"
                >
                  {testing ? (
                    <Loader2 className="size-3.5 mr-2 animate-spin" />
                  ) : (
                    <TestTube className="size-3.5 mr-2" />
                  )}
                  Send Test
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleToggle}
                  disabled={toggling}
                  className="cursor-pointer"
                >
                  {toggling ? (
                    <Loader2 className="size-3.5 mr-2 animate-spin" />
                  ) : channel.is_active ? (
                    <PowerOff className="size-3.5 mr-2" />
                  ) : (
                    <Power className="size-3.5 mr-2" />
                  )}
                  {channel.is_active ? "Pause" : "Activate"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive cursor-pointer focus:text-destructive focus:bg-destructive/10"
                >
                  <Trash2 className="size-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="pb-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon className="size-4 shrink-0 text-muted-foreground/50" />
            <span className="truncate font-mono text-xs">
              {getConfigPreview(channel)}
            </span>
          </div>
        </CardContent>

        <CardFooter className="pt-0">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
            <span>
              Created{" "}
              {new Date(channel.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
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
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Delete Channel</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{channel.name}</strong>?
              This action cannot be undone and will also remove any associated
              notification rules.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="size-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

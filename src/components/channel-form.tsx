"use client";

import { useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  channelFormSchema,
  channelTypeLabels,
  channelTypeIcons,
  getConfigFields,
  getConfigFieldLabel,
  getConfigFieldPlaceholder,
  type ChannelFormValues,
  type ChannelType,
} from "@/lib/validations/channel";
import { createChannel, updateChannel } from "@/actions/channels";
import type { NotificationChannel } from "@/lib/supabase/database-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Loader2,
  Asterisk,
  Mail,
  Send,
  MessageSquare,
  MessageCircle,
  Webhook,
  Smartphone,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

// ─── Icon map ──────────────────────────────────────────

const iconMap: Record<string, React.ElementType> = {
  Mail,
  Send,
  MessageSquare,
  MessageCircle,
  Webhook,
  Smartphone,
};

// ─── Helpers ───────────────────────────────────────────

function channelToFormValues(
  channel?: NotificationChannel
): ChannelFormValues {
  return {
    name: channel?.name ?? "",
    type: (channel?.type as ChannelType) ?? "email",
    config: (channel?.config as Record<string, unknown>) ?? {},
  };
}

function configToFormEntries(
  config: Record<string, unknown>
): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const [key, value] of Object.entries(config)) {
    entries[key] = value != null ? String(value) : "";
  }
  return entries;
}

// ─── Props ─────────────────────────────────────────────

interface ChannelFormDialogProps {
  channel?: NotificationChannel;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

// ─── Component ─────────────────────────────────────────

export function ChannelFormDialog({
  channel,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
}: ChannelFormDialogProps) {
  const isEditing = !!channel;
  const [internalOpen, setInternalOpen] = useState(false);

  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [submitting, setSubmitting] = useState(false);
  const [connectingSlack, setConnectingSlack] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<ChannelFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(channelFormSchema) as any,
    defaultValues: channelToFormValues(channel),
  });

  const selectedType = watch("type") as ChannelType;
  const configFields = getConfigFields(selectedType);

  // Handle Slack OAuth flow
  const handleSlackConnect = useCallback(async () => {
    setConnectingSlack(true);
    try {
      const channelName = watch("name") || "Slack Notifications";
      const res = await fetch("/api/notifications/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_type: "slack",
          name: channelName,
        }),
      });
      const data = await res.json();
      if (data.auth_url) {
        window.location.href = data.auth_url;
      } else {
        toast.error(data.error || "Failed to initiate Slack connection.");
        setConnectingSlack(false);
      }
    } catch {
      toast.error("Failed to connect to Slack.");
      setConnectingSlack(false);
    }
  }, [watch]);

  // Reset form when dialog opens / channel changes
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen) {
        reset(channelToFormValues(channel));
      }
    },
    [channel, reset, setOpen]
  );

  const onSubmit = useCallback(
    async (values: ChannelFormValues) => {
      if (values.type === "slack" && !isEditing) {
        return;
      }
      setSubmitting(true);
      try {
        const formData = new FormData();
        formData.append("name", values.name);
        formData.append("type", values.type);
        // Append config fields with config_ prefix
        if (values.config) {
          for (const [key, value] of Object.entries(values.config)) {
            if (value != null) {
              formData.append(`config_${key}`, String(value));
            }
          }
        }

        const result = isEditing
          ? await updateChannel(channel!.id, formData)
          : await createChannel(formData);

        if (!result.success) {
          toast.error(result.error ?? "Something went wrong.");
          return;
        }

        toast.success(
          isEditing
            ? "Channel updated successfully."
            : "Channel created successfully."
        );
        setOpen(false);
        onSuccess?.();
      } finally {
        setSubmitting(false);
      }
    },
    [isEditing, channel, setOpen, onSuccess]
  );

  // Update config field in the form
  const setConfigField = useCallback(
    (field: string, value: string) => {
      const currentConfig = watch("config") ?? {};
      setValue("config", { ...currentConfig, [field]: value }, {
        shouldValidate: true,
      });
    },
    [watch, setValue]
  );

  const TypeIcon = iconMap[channelTypeIcons[selectedType]] || Mail;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isEditing && controlledOpen === undefined && (
        <DialogTrigger
          render={
            trigger ?? (
              <Button>
                <Plus className="size-4 mr-2" />
                Add Channel
              </Button>
            )
          }
        />
      )}
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit(onSubmit as (v: ChannelFormValues) => void)}>
          <DialogHeader>
            <DialogTitle className="font-heading">
              {isEditing ? "Edit Channel" : "Create Channel"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update your notification channel settings."
                : "Connect a notification channel to receive job alerts."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-1">
                Channel Name <Asterisk className="size-3 text-destructive" />
              </Label>
              <Input
                id="name"
                placeholder="e.g. My Email, Team Slack"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type" className="flex items-center gap-1">
                Channel Type <Asterisk className="size-3 text-destructive" />
              </Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val: string | null, _details) => {
                      field.onChange(val ?? "");
                      // Reset config when type changes
                      setValue("config", {});
                    }}
                  >
                    <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="Select a channel type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {(Object.keys(channelTypeLabels) as ChannelType[]).map(
                          (type) => {
                            const Icon =
                              iconMap[channelTypeIcons[type]] || Mail;
                            return (
                              <SelectItem key={type} value={type}>
                                <span className="flex items-center gap-2">
                                  <Icon className="size-4 text-muted-foreground" />
                                  {channelTypeLabels[type]}
                                </span>
                              </SelectItem>
                            );
                          }
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && (
                <p className="text-xs text-destructive">
                  {errors.type.message}
                </p>
              )}
            </div>

            {/* Type-specific config fields */}
            {selectedType === "slack" && !isEditing ? (
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
                <div className="flex items-center gap-2 pb-1">
                  <MessageSquare className="size-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Slack Configuration
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Connect your Slack workspace with one click. We&apos;ll request permission to post notifications to your chosen channel.
                </p>
                <Button
                  type="button"
                  variant="default"
                  className="w-full bg-[#4A154B] hover:bg-[#350d36] text-white"
                  onClick={handleSlackConnect}
                  disabled={connectingSlack}
                >
                  {connectingSlack ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <MessageSquare className="size-4 mr-2" />
                  )}
                  {connectingSlack ? "Connecting..." : "Connect with Slack"}
                  {!connectingSlack && <ExternalLink className="size-3 ml-2 opacity-60" />}
                </Button>
              </div>
            ) : selectedType === "slack" && isEditing && (watch("config")?.webhook_url) ? (
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
                <div className="flex items-center gap-2 pb-1">
                  <MessageSquare className="size-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Slack Configuration
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="size-4" />
                  <span>Connected via Slack OAuth</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  To reconnect, delete this channel and add a new Slack channel.
                </p>
              </div>
            ) : selectedType === "slack" && isEditing ? (
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
                <div className="flex items-center gap-2 pb-1">
                  <MessageSquare className="size-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Slack Configuration
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  This channel is not connected yet. Connect your Slack workspace:
                </p>
                <Button
                  type="button"
                  variant="default"
                  className="w-full bg-[#4A154B] hover:bg-[#350d36] text-white"
                  onClick={handleSlackConnect}
                  disabled={connectingSlack}
                >
                  {connectingSlack ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <MessageSquare className="size-4 mr-2" />
                  )}
                  {connectingSlack ? "Connecting..." : "Connect with Slack"}
                  {!connectingSlack && <ExternalLink className="size-3 ml-2 opacity-60" />}
                </Button>
              </div>
            ) : configFields.length > 0 ? (
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
                <div className="flex items-center gap-2 pb-1">
                  <TypeIcon className="size-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {channelTypeLabels[selectedType]} Configuration
                  </span>
                </div>
                {configFields.map((field) => {
                  const isSelectField = field === "method";
                  const currentConfig = watch("config") ?? {};

                  if (isSelectField) {
                    return (
                      <div key={field} className="space-y-2">
                        <Label htmlFor={`config_${field}`}>
                          {getConfigFieldLabel(selectedType, field)}
                        </Label>
                        <Select
                          value={String(currentConfig[field] ?? "POST")}
                          onValueChange={(val: string | null) =>
                            setConfigField(field, val ?? "POST")
                          }
                        >
                          <SelectTrigger className="w-full h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {["GET", "POST", "PUT"].map((method) => (
                                <SelectItem key={method} value={method}>
                                  {method}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  }

                  return (
                    <div key={field} className="space-y-2">
                      <Label htmlFor={`config_${field}`}>
                        {getConfigFieldLabel(selectedType, field)}
                      </Label>
                      <Input
                        id={`config_${field}`}
                        type={field === "phone" ? "tel" : "text"}
                        placeholder={getConfigFieldPlaceholder(
                          selectedType,
                          field
                        )}
                        value={String(currentConfig[field] ?? "")}
                        onChange={(e) =>
                          setConfigField(field, e.target.value)
                        }
                      />
                    </div>
                  );
                })}
                {/* Config validation errors */}
                {errors.config?.message && (
                  <p className="text-xs text-destructive">
                    {String(errors.config.message)}
                  </p>
                )}
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            {!(selectedType === "slack" && !isEditing) && (
              <Button type="submit" disabled={submitting}>
                {submitting && (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                )}
                {isEditing ? "Save Changes" : "Create Channel"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

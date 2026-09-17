"use client";

import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  channelFormSchema,
  channelTypeIcons,
  channelTypeLabels,
  getConfigFieldLabel,
  getConfigFieldPlaceholder,
  getConfigFields,
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
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  Network,
  Pencil,
  Phone,
  Plus,
  Route,
  Send,
  Smartphone,
  Webhook,
  Zap,
} from "lucide-react";

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

function channelToFormValues(
  channel?: NotificationChannel
): ChannelFormValues {
  return {
    name: channel?.name ?? "",
    type: (channel?.type as ChannelType) ?? "email",
    config:
      (channel?.config as Record<string, unknown>) ?? {},
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

interface ChannelFormDialogProps {
  channel?: NotificationChannel;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ChannelFormDialog({
  channel,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
}: ChannelFormDialogProps) {
  const isEditing = !!channel;

  const [internalOpen, setInternalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [connectingSlack, setConnectingSlack] =
    useState(false);
  const [createdChannel, setCreatedChannel] =
    useState<NotificationChannel | null>(null);
  const [copiedSecret, setCopiedSecret] =
    useState(false);

  const open = controlledOpen ?? internalOpen;
  const setOpen =
    controlledOnOpenChange ?? setInternalOpen;

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

  const TypeIcon =
    iconMap[channelTypeIcons[selectedType]] || Mail;

  const handleSlackConnect = useCallback(async () => {
    setConnectingSlack(true);

    try {
      const channelName =
        watch("name") || "Slack Notifications";

      const res = await fetch(
        "/api/notifications/channels",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            channel_type: "slack",
            name: channelName,
          }),
        }
      );

      const data = await res.json();

      if (data.auth_url) {
        window.location.href = data.auth_url;
      } else {
        toast.error(
          data.error ||
          "Failed to initiate Slack connection."
        );
        setConnectingSlack(false);
      }
    } catch {
      toast.error("Failed to connect to Slack.");
      setConnectingSlack(false);
    }
  }, [watch]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);

      if (nextOpen) {
        reset(channelToFormValues(channel));
        setCreatedChannel(null);
        setCopiedSecret(false);
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

        if (values.config) {
          for (const [key, value] of Object.entries(
            values.config
          )) {
            if (value != null) {
              formData.append(
                `config_${key}`,
                String(value)
              );
            }
          }
        }

        const result = isEditing
          ? await updateChannel(channel!.id, formData)
          : await createChannel(formData);

        if (!result.success) {
          toast.error(
            result.error ?? "Something went wrong."
          );
          return;
        }

        const isWebhookType = [
          "webhook",
          "n8n",
          "make",
          "zapier",
        ].includes(values.type);

        // Webhook-based channels get an auto-generated secret. Show it in the
        // dialog (copyable) before closing, so the user can grab it while it's
        // fresh instead of digging it out of the channel card later.
        if (!isEditing && isWebhookType) {
          setCreatedChannel(result.channel ?? null);
          setCopiedSecret(false);
        } else {
          toast.success(
            isEditing
              ? "Channel updated successfully."
              : "Channel created successfully."
          );
          setOpen(false);
          onSuccess?.();
        }
      } finally {
        setSubmitting(false);
      }
    },
    [isEditing, channel, setOpen, onSuccess]
  );

  const setConfigField = useCallback(
    (field: string, value: string) => {
      const currentConfig = watch("config") ?? {};

      setValue(
        "config",
        {
          ...currentConfig,
          [field]: value,
        },
        {
          shouldValidate: true,
        }
      );
    },
    [watch, setValue]
  );

  const handleCopySecret = useCallback(async () => {
    const secret = (createdChannel?.config as Record<string, unknown> | null)?.secret;
    if (typeof secret !== "string" || !secret) return;

    try {
      await navigator.clipboard.writeText(secret);
      setCopiedSecret(true);
      window.setTimeout(() => setCopiedSecret(false), 2000);
    } catch {
      toast.error("Failed to copy secret.");
    }
  }, [createdChannel]);

  const handleFinish = useCallback(() => {
    toast.success("Channel created successfully.");
    setOpen(false);
    onSuccess?.();
  }, [onSuccess, setOpen]);

  const inputClassName =
    "h-10 rounded-lg border-black/10 bg-white px-3 text-[13px] text-[#0A0A0A] shadow-none placeholder:text-black/30 transition-colors hover:border-black/20 focus-visible:border-[#00C98B] focus-visible:ring-2 focus-visible:ring-[#00C98B]/15";

  const selectTriggerClassName =
    "h-10 w-full rounded-lg border-black/10 bg-white px-3 text-[13px] text-[#0A0A0A] shadow-none transition-colors hover:border-black/20 focus:border-[#00C98B] focus:ring-2 focus:ring-[#00C98B]/15";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isEditing && controlledOpen === undefined && (
        <DialogTrigger
          render={
            trigger ?? (
              <Button className="h-9 rounded-lg bg-[#00C98B] px-3.5 text-xs font-semibold text-[#0A0A0A] hover:bg-[#00C98B]/90">
                <Plus className="size-3.5" />
                Add channel
              </Button>
            )
          }
        />
      )}

      <DialogContent className="max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.25rem)] overflow-hidden rounded-2xl border border-black/10 bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.25)] sm:max-h-[calc(100dvh-3rem)] sm:max-w-[520px] [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:rounded-lg [&_[data-slot=dialog-close]]:text-white/60 [&_[data-slot=dialog-close]]:hover:bg-white/10 [&_[data-slot=dialog-close]]:hover:text-white">
        {createdChannel ? (
          <div className="relative overflow-hidden bg-[#0A0A0A]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-14 -top-16 size-44 rounded-full bg-[#00C98B]/15 blur-3xl"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-20 -left-16 size-44 rounded-full bg-[#00C98B]/10 blur-3xl"
            />

            <div className="relative px-5 py-6 sm:px-6 sm:py-7">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-[#00C98B]/30 bg-[#00C98B]/10 text-[#00C98B]">
                  <CheckCircle2 className="size-5" />
                </span>

                <div className="min-w-0">
                  <h2 className="font-heading text-lg font-bold leading-tight tracking-tight text-white">
                    Channel created
                  </h2>

                  <p className="mt-1 text-xs leading-relaxed text-white/50">
                    Copy your webhook secret now — it&apos;s used to
                    verify alerts are genuinely from UpScore
                    (<code className="rounded bg-white/10 px-1 py-0.5 font-mono text-[11px] text-[#00C98B]">
                      X-UpScore-Secret
                    </code>{" "}
                    header).
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.045] p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                    Channel
                  </p>

                  <p className="mt-1 flex items-center gap-2 truncate text-sm font-bold text-white">
                    <TypeIcon className="size-3.5 text-[#00C98B]" />

                    {createdChannel.name}
                  </p>
                </div>

                <div className="rounded-xl border border-[#00C98B]/25 bg-[#00C98B]/10 p-3.5">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#00C98B]">
                    <KeyRound className="size-3" />
                    Webhook secret
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded-lg bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-[#00C98B]">
                      {String((createdChannel.config as Record<string, unknown> | null)?.secret ?? "")}
                    </code>

                    <Button
                      type="button"
                      onClick={handleCopySecret}
                      className="h-9 shrink-0 gap-1.5 rounded-lg bg-[#00C98B] px-3 text-xs font-bold text-[#0A0A0A] hover:bg-[#00C98B]/90"
                    >
                      {copiedSecret ? (
                        <>
                          <Check className="size-3.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>

                  <p className="mt-2 text-[11px] leading-relaxed text-[#00C98B]/70">
                    Send it to your webhook receiver&apos;s{" "}
                    <code className="rounded bg-[#0A0A0A]/40 px-1 py-0.5 font-mono text-[10px]">
                      X-UpScore-Secret
                    </code>{" "}
                    header (or the{" "}
                    <code className="rounded bg-[#0A0A0A]/40 px-1 py-0.5 font-mono text-[10px]">
                      webhook_secret
                    </code>{" "}
                    field of the JSON body) to verify requests.
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2.5">
                  <AlertTriangle className="size-3.5 shrink-0 text-amber-400" />

                  <p className="text-[11px] leading-relaxed text-amber-200/80">
                    This secret is shown only once — save it before
                    closing this dialog.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  type="button"
                  onClick={handleFinish}
                  className="h-10 rounded-lg bg-white px-5 text-sm font-bold text-[#0A0A0A] hover:bg-[#00C98B]"
                >
                  <Check className="size-4" />
                  Done
                </Button>
              </div>
            </div>
          </div>
        ) : (
        <form
          onSubmit={handleSubmit(
            onSubmit as (
              values: ChannelFormValues
            ) => void
          )}
          className="flex max-h-[calc(100dvh-1.5rem)] min-h-0 flex-col sm:max-h-[calc(100dvh-3rem)]"
        >
          {/* Header */}
          <div className="relative shrink-0 overflow-hidden bg-[#0A0A0A] px-5 pb-5 pt-6 pr-14 sm:px-6 sm:pr-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-12 -top-16 size-40 rounded-full bg-[#00C98B]/10 blur-3xl"
            />

            <DialogHeader className="relative text-left">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#00C98B]/25 bg-[#00C98B]/10 text-[#00C98B]">
                  {isEditing ? (
                    <Pencil className="size-4" />
                  ) : (
                    <TypeIcon className="size-4" />
                  )}
                </div>

                <div className="min-w-0">
                  <DialogTitle className="font-heading text-base font-bold leading-tight tracking-tight text-white sm:text-lg">
                    {isEditing
                      ? "Edit notification channel"
                      : "Add notification channel"}
                  </DialogTitle>

                  <DialogDescription className="mt-1.5 text-[11px] leading-relaxed text-white/50 sm:text-xs">
                    {isEditing
                      ? "Update the delivery details for this channel."
                      : "Choose where you want to receive job alerts."}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Form Content */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#F7F8F8]">
            <div className="space-y-4 p-5 sm:p-6">
              {/* Channel Name */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="name"
                  className="text-[12px] font-semibold text-[#0A0A0A]"
                >
                  Channel name
                  <span className="ml-1 text-[#00C98B]">
                    *
                  </span>
                </Label>

                <Input
                  id="name"
                  placeholder="e.g. My Email"
                  className={inputClassName}
                  {...register("name")}
                />

                {errors.name && (
                  <p className="px-0.5 text-[11px] font-medium text-black/55">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Channel Type */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="type"
                  className="text-[12px] font-semibold text-[#0A0A0A]"
                >
                  Channel type
                  <span className="ml-1 text-[#00C98B]">
                    *
                  </span>
                </Label>

                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(
                        value: string | null,
                        _details
                      ) => {
                        field.onChange(value ?? "");
                        setValue("config", {});
                      }}
                    >
                      <SelectTrigger
                        className={selectTriggerClassName}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <TypeIcon className="size-3.5 shrink-0 text-[#00C98B]" />

                          <SelectValue placeholder="Select channel" />
                        </div>
                      </SelectTrigger>

                      <SelectContent className="rounded-xl border-black/10 bg-white p-1 shadow-[0_16px_45px_rgba(0,0,0,0.14)]">
                        <SelectGroup>
                          {(
                            Object.keys(
                              channelTypeLabels
                            ) as ChannelType[]
                          ).map((type) => {
                            const Icon =
                              iconMap[
                              channelTypeIcons[type]
                              ] || Mail;

                            return (
                              <SelectItem
                                key={type}
                                value={type}
                                className="rounded-lg py-2 text-xs focus:bg-[#00C98B]/10 focus:text-[#0A0A0A]"
                              >
                                <span className="flex items-center gap-2">
                                  <Icon className="size-3.5 text-[#00C98B]" />

                                  {channelTypeLabels[type]}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />

                {errors.type && (
                  <p className="px-0.5 text-[11px] font-medium text-black/55">
                    {errors.type.message}
                  </p>
                )}
              </div>

              {/* New Slack */}
              {selectedType === "slack" &&
                !isEditing ? (
                <div className="rounded-xl border border-[#00C98B]/20 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#0A0A0A] text-[#00C98B]">
                      <MessageSquare className="size-3.5" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0A0A0A]">
                        Connect Slack
                      </p>

                      <p className="mt-1 text-[11px] leading-relaxed text-black/45">
                        Select your workspace and delivery
                        channel through Slack.
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleSlackConnect}
                    disabled={connectingSlack}
                    className="mt-4 h-9 w-full rounded-lg bg-[#0A0A0A] text-xs font-semibold text-white hover:bg-[#00C98B] hover:text-[#0A0A0A]"
                  >
                    {connectingSlack ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <MessageSquare className="size-3.5" />
                    )}

                    {connectingSlack
                      ? "Connecting..."
                      : "Connect with Slack"}

                    {!connectingSlack && (
                      <ExternalLink className="size-3 opacity-50" />
                    )}
                  </Button>
                </div>
              ) : selectedType === "slack" &&
                isEditing &&
                watch("config")?.webhook_url ? (
                /* Connected Slack */
                <div className="rounded-xl border border-[#00C98B]/25 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#00C98B] text-[#0A0A0A]">
                      <CheckCircle2 className="size-3.5" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0A0A0A]">
                        Slack connected
                      </p>

                      <p className="mt-1 text-[11px] leading-relaxed text-black/45">
                        This channel is connected through Slack
                        OAuth. Delete it to connect another
                        workspace.
                      </p>
                    </div>
                  </div>
                </div>
              ) : selectedType === "slack" &&
                isEditing ? (
                /* Slack Not Connected */
                <div className="rounded-xl border border-black/10 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#0A0A0A] text-[#00C98B]">
                      <MessageSquare className="size-3.5" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0A0A0A]">
                        Slack not connected
                      </p>

                      <p className="mt-1 text-[11px] leading-relaxed text-black/45">
                        Connect your workspace to start
                        receiving notifications.
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleSlackConnect}
                    disabled={connectingSlack}
                    className="mt-4 h-9 w-full rounded-lg bg-[#0A0A0A] text-xs font-semibold text-white hover:bg-[#00C98B] hover:text-[#0A0A0A]"
                  >
                    {connectingSlack ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <MessageSquare className="size-3.5" />
                    )}

                    {connectingSlack
                      ? "Connecting..."
                      : "Connect with Slack"}

                    {!connectingSlack && (
                      <ExternalLink className="size-3 opacity-50" />
                    )}
                  </Button>
                </div>
              ) : configFields.length > 0 ? (
                /* Other Channel Configuration */
                <div className="rounded-xl border border-black/10 bg-white p-4">
                  <div className="mb-4 flex items-center gap-2.5 border-b border-black/5 pb-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#0A0A0A] text-[#00C98B]">
                      <TypeIcon className="size-3.5" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-[#0A0A0A]">
                        {channelTypeLabels[selectedType]}{" "}
                        details
                      </p>

                      <p className="mt-0.5 text-[10px] text-black/40">
                        Enter the required information
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {configFields.map((field) => {
                      const currentConfig =
                        watch("config") ?? {};

                      return (
                        <div
                          key={field}
                          className="space-y-1.5"
                        >
                          <Label
                            htmlFor={`config_${field}`}
                            className="text-[12px] font-semibold text-[#0A0A0A]"
                          >
                            {getConfigFieldLabel(
                              selectedType,
                              field
                            )}
                          </Label>

                          <Input
                            id={`config_${field}`}
                            type={
                              ["phone"].includes(field)
                                ? "tel"
                                : "text"
                            }
                            placeholder={getConfigFieldPlaceholder(
                              selectedType,
                              field
                            )}
                            value={String(
                              currentConfig[field] ?? ""
                            )}
                            onChange={(event) =>
                              setConfigField(
                                field,
                                event.target.value
                              )
                            }
                            className={inputClassName}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {errors.config?.message && (
                    <p className="mt-3 text-[11px] font-medium text-black/55">
                      {String(errors.config.message)}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-black/10 bg-white px-5 py-4 sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
              className="h-9 w-24 shrink-0 rounded-lg border-black/15 bg-white px-3 text-xs font-semibold text-[#0A0A0A] shadow-none hover:border-black/25 hover:bg-black/5"
            >
              Cancel
            </Button>

            {!(
              selectedType === "slack" && !isEditing
            ) && (
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-9 min-w-36 rounded-lg bg-[#0A0A0A] px-4 text-xs font-semibold text-white shadow-none hover:bg-[#00C98B] hover:text-[#0A0A0A]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="size-3.5" />

                      {isEditing
                        ? "Save changes"
                        : "Create channel"}
                    </>
                  )}
                </Button>
              )}
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
"use client";

import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import {
  ruleFormSchema,
  type RuleFormValues,
} from "@/lib/validations/rule";
import { createRule, updateRule } from "@/actions/rules";
import type {
  JobFilter,
  NotificationChannel,
  NotificationRule,
} from "@/lib/supabase/database-types";
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
  Bell,
  Check,
  Filter,
  Gauge,
  Globe,
  Loader2,
  Pencil,
  Plus,
  Target,
  Users,
} from "lucide-react";

function useUserFilters(userId?: string) {
  return useQuery({
    queryKey: ["job_filters", userId],
    queryFn: async (): Promise<JobFilter[]> => {
      const { data } = await supabase
        .from("job_filters")
        .select("*")
        .eq("user_id", userId!)
        .order("name");

      return data ?? [];
    },
    enabled: !!userId,
  });
}

function useUserChannels(userId?: string) {
  return useQuery({
    queryKey: ["notification_channels", userId],
    queryFn: async (): Promise<
      NotificationChannel[]
    > => {
      const { data } = await supabase
        .from("notification_channels")
        .select("*")
        .eq("user_id", userId!)
        .order("name");

      return data ?? [];
    },
    enabled: !!userId,
  });
}

function ruleToFormValues(
  rule?: NotificationRule
): RuleFormValues {
  return {
    channel_id: rule?.channel_id ?? "",
    job_filter_id: rule?.job_filter_id ?? null,
    match_score_min: rule?.match_score_min ?? 75,
    opportunity_score_min:
      rule?.opportunity_score_min ?? 70,
    max_proposals: rule?.max_proposals ?? 20,
  };
}

interface RuleFormDialogProps {
  rule?: NotificationRule;

  /** Pre-select a channel when creating from the channel page */
  preselectedChannelId?: string;

  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function RuleFormDialog({
  rule,
  preselectedChannelId,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
}: RuleFormDialogProps) {
  const isEditing = !!rule;
  const { user } = useUser();

  const [internalOpen, setInternalOpen] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const open = controlledOpen ?? internalOpen;
  const setOpen =
    controlledOnOpenChange ?? setInternalOpen;

  const { data: filters = [] } = useUserFilters(
    user?.id
  );

  const { data: channels = [] } = useUserChannels(
    user?.id
  );

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<RuleFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(ruleFormSchema) as any,
    defaultValues: {
      ...ruleToFormValues(rule),
      ...(preselectedChannelId
        ? {
          channel_id: preselectedChannelId,
        }
        : {}),
    },
  });

  const selectedChannelId = watch("channel_id");
  const selectedFilterId = watch("job_filter_id");

  const selectedChannel = channels.find(
    (channel) => channel.id === selectedChannelId
  );

  const selectedFilter = filters.find(
    (filter) => filter.id === selectedFilterId
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);

      if (nextOpen) {
        reset({
          ...ruleToFormValues(rule),
          ...(preselectedChannelId
            ? {
              channel_id: preselectedChannelId,
            }
            : {}),
        });
      }
    },
    [rule, preselectedChannelId, reset, setOpen]
  );

  const onSubmit = useCallback(
    async (values: RuleFormValues) => {
      setSubmitting(true);

      try {
        const formData = new FormData();

        formData.append(
          "channel_id",
          values.channel_id
        );

        formData.append(
          "job_filter_id",
          values.job_filter_id ?? ""
        );

        formData.append(
          "match_score_min",
          String(values.match_score_min)
        );

        formData.append(
          "opportunity_score_min",
          String(values.opportunity_score_min)
        );

        formData.append(
          "max_proposals",
          String(values.max_proposals)
        );

        const result = isEditing
          ? await updateRule(rule!.id, formData)
          : await createRule(formData);

        if (!result.success) {
          toast.error(
            result.error ?? "Something went wrong."
          );
          return;
        }

        toast.success(
          isEditing
            ? "Rule updated successfully."
            : "Rule created successfully."
        );

        setOpen(false);
        onSuccess?.();
      } finally {
        setSubmitting(false);
      }
    },
    [isEditing, rule, setOpen, onSuccess]
  );

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
                Add rule
              </Button>
            )
          }
        />
      )}

      <DialogContent className="max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.25rem)] overflow-hidden rounded-2xl border border-black/10 bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.25)] sm:max-h-[calc(100dvh-3rem)] sm:max-w-[520px] [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:rounded-lg [&_[data-slot=dialog-close]]:text-white/60 [&_[data-slot=dialog-close]]:hover:bg-white/10 [&_[data-slot=dialog-close]]:hover:text-white">
        <form
          onSubmit={handleSubmit(
            onSubmit as (
              values: RuleFormValues
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
                    <Bell className="size-4" />
                  )}
                </div>

                <div className="min-w-0">
                  <DialogTitle className="font-heading text-base font-bold leading-tight tracking-tight text-white sm:text-lg">
                    {isEditing
                      ? "Edit notification rule"
                      : "Create notification rule"}
                  </DialogTitle>

                  <DialogDescription className="mt-1.5 text-[11px] leading-relaxed text-white/50 sm:text-xs">
                    {isEditing
                      ? "Update when and where this rule sends alerts."
                      : "Connect a channel with your job matching criteria."}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Scrollable Content */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#F7F8F8]">
            <div className="space-y-4 p-5 sm:p-6">
              {/* Channel */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="channel_id"
                  className="text-[12px] font-semibold text-[#0A0A0A]"
                >
                  Notification channel
                  <span className="ml-1 text-[#00C98B]">
                    *
                  </span>
                </Label>

                <Controller
                  name="channel_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(
                        value: string | null
                      ) =>
                        field.onChange(value ?? "")
                      }
                    >
                      <SelectTrigger
                        className={selectTriggerClassName}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Bell className="size-3.5 shrink-0 text-[#00C98B]" />
                          <SelectValue placeholder="Select a channel" />
                        </div>
                      </SelectTrigger>

                      <SelectContent className="rounded-xl border-black/10 bg-white p-1 shadow-[0_16px_45px_rgba(0,0,0,0.14)]">
                        <SelectGroup>
                          {channels.length === 0 && (
                            <div className="px-3 py-5 text-center">
                              <Bell className="mx-auto size-5 text-black/25" />

                              <p className="mt-2 text-[11px] text-black/45">
                                No channels yet. Create a
                                channel first.
                              </p>
                            </div>
                          )}

                          {channels.map((channel) => (
                            <SelectItem
                              key={channel.id}
                              value={channel.id}
                              className="rounded-lg py-2 text-xs focus:bg-[#00C98B]/10 focus:text-[#0A0A0A]"
                            >
                              <span className="flex items-center gap-2">
                                <Bell className="size-3.5 text-[#00C98B]" />
                                {channel.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />

                {errors.channel_id && (
                  <p className="px-0.5 text-[11px] font-medium text-black/55">
                    {errors.channel_id.message}
                  </p>
                )}
              </div>

              {/* Job Filter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <Label
                    htmlFor="job_filter_id"
                    className="text-[12px] font-semibold text-[#0A0A0A]"
                  >
                    Job filter
                  </Label>

                  <span className="text-[10px] font-medium text-black/35">
                    Optional
                  </span>
                </div>

                <Controller
                  name="job_filter_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(
                        value: string | null
                      ) =>
                        field.onChange(value || null)
                      }
                    >
                      <SelectTrigger
                        className={selectTriggerClassName}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Filter className="size-3.5 shrink-0 text-[#00C98B]" />

                          <SelectValue placeholder="All filters" />
                        </div>
                      </SelectTrigger>

                      <SelectContent className="rounded-xl border-black/10 bg-white p-1 shadow-[0_16px_45px_rgba(0,0,0,0.14)]">
                        <SelectGroup>
                          <SelectItem
                            value=""
                            className="rounded-lg py-2 text-xs focus:bg-[#00C98B]/10 focus:text-[#0A0A0A]"
                          >
                            <span className="flex items-center gap-2">
                              <Globe className="size-3.5 text-[#00C98B]" />
                              All filters
                            </span>
                          </SelectItem>

                          {filters.map((filter) => (
                            <SelectItem
                              key={filter.id}
                              value={filter.id}
                              className="rounded-lg py-2 text-xs focus:bg-[#00C98B]/10 focus:text-[#0A0A0A]"
                            >
                              <span className="flex items-center gap-2">
                                <Filter className="size-3.5 text-[#00C98B]" />
                                {filter.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />

                <p className="px-0.5 text-[10px] leading-relaxed text-black/40">
                  Leave empty to apply the rule to all job
                  filters.
                </p>
              </div>

              {/* Thresholds */}
              <div className="rounded-xl border border-black/10 bg-white p-4">
                <div className="mb-4 flex items-center gap-2.5 border-b border-black/5 pb-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#0A0A0A] text-[#00C98B]">
                    <Gauge className="size-3.5" />
                  </div>

                  <div>
                    <p className="text-xs font-bold text-[#0A0A0A]">
                      Scoring thresholds
                    </p>

                    <p className="mt-0.5 text-[10px] text-black/40">
                      Control which jobs can trigger an alert
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Match Score */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="match_score_min"
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0A0A0A]"
                    >
                      <Target className="size-3 text-[#00C98B]" />
                      Match score
                    </Label>

                    <div className="relative">
                      <Input
                        id="match_score_min"
                        type="number"
                        min={0}
                        max={100}
                        placeholder="75"
                        className={`${inputClassName} pr-9`}
                        {...register("match_score_min")}
                      />

                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-black/30">
                        /100
                      </span>
                    </div>

                    {errors.match_score_min && (
                      <p className="text-[10px] font-medium leading-tight text-black/55">
                        {errors.match_score_min.message}
                      </p>
                    )}
                  </div>

                  {/* Opportunity Score */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="opportunity_score_min"
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0A0A0A]"
                    >
                      <Gauge className="size-3 text-[#00C98B]" />
                      Opportunity
                    </Label>

                    <div className="relative">
                      <Input
                        id="opportunity_score_min"
                        type="number"
                        min={0}
                        max={100}
                        placeholder="70"
                        className={`${inputClassName} pr-9`}
                        {...register(
                          "opportunity_score_min"
                        )}
                      />

                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-black/30">
                        /100
                      </span>
                    </div>

                    {errors.opportunity_score_min && (
                      <p className="text-[10px] font-medium leading-tight text-black/55">
                        {
                          errors.opportunity_score_min
                            .message
                        }
                      </p>
                    )}
                  </div>
                </div>

                {/* Maximum Proposals */}
                <div className="mt-4 space-y-1.5 border-t border-black/5 pt-4">
                  <Label
                    htmlFor="max_proposals"
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0A0A0A]"
                  >
                    <Users className="size-3 text-[#00C98B]" />
                    Maximum proposals
                  </Label>

                  <Input
                    id="max_proposals"
                    type="number"
                    min={0}
                    placeholder="20"
                    className={inputClassName}
                    {...register("max_proposals")}
                  />

                  <p className="text-[10px] leading-relaxed text-black/40">
                    Jobs above this proposal count will be
                    excluded.
                  </p>

                  {errors.max_proposals && (
                    <p className="text-[10px] font-medium text-black/55">
                      {errors.max_proposals.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Summary */}
              {selectedChannel && (
                <div className="rounded-xl border border-[#00C98B]/20 bg-[#00C98B]/5 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#00C98B] text-[#0A0A0A]">
                      <Check className="size-3.5" />
                    </div>

                    <p className="text-[11px] leading-relaxed text-black/55">
                      Alerts will be delivered to{" "}
                      <strong className="font-semibold text-[#0A0A0A]">
                        {selectedChannel.name}
                      </strong>

                      {selectedFilterId
                        ? ` when jobs match "${selectedFilter?.name ?? ""
                        }"`
                        : " for jobs matching any filter"}
                      .
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-black/10 bg-white px-5 py-4 sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
              className="h-9 w-24 shrink-0 rounded-lg border-black/15 bg-white px-3 text-xs font-semibold text-[#0A0A0A] shadow-none hover:bg-black/5"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={submitting}
              className="h-9 min-w-32 rounded-lg bg-[#0A0A0A] px-4 text-xs font-semibold text-white hover:bg-[#00C98B] hover:text-[#0A0A0A]"
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
                    : "Create rule"}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
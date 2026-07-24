"use client";

import { useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
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
import type { NotificationRule, JobFilter, NotificationChannel } from "@/lib/supabase/database-types";
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
  Loader2,
  Asterisk,
  Filter,
  Bell,
  Globe,
} from "lucide-react";

// ─── Data Fetching ─────────────────────────────────────

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
    queryFn: async (): Promise<NotificationChannel[]> => {
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

// ─── Helpers ───────────────────────────────────────────

function ruleToFormValues(rule?: NotificationRule): RuleFormValues {
  return {
    channel_id: rule?.channel_id ?? "",
    job_filter_id: rule?.job_filter_id ?? null,
    match_score_min: rule?.match_score_min ?? 75,
    opportunity_score_min: rule?.opportunity_score_min ?? 70,
    max_proposals: rule?.max_proposals ?? 20,
  };
}

// ─── Props ─────────────────────────────────────────────

interface RuleFormDialogProps {
  rule?: NotificationRule;
  /** Pre-select a channel (useful when creating from channel page) */
  preselectedChannelId?: string;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

// ─── Component ─────────────────────────────────────────

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
  const [internalOpen, setInternalOpen] = useState(false);

  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [submitting, setSubmitting] = useState(false);

  const { data: filters = [] } = useUserFilters(user?.id);
  const { data: channels = [] } = useUserChannels(user?.id);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<RuleFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(ruleFormSchema) as any,
    defaultValues: {
      ...ruleToFormValues(rule),
      ...(preselectedChannelId ? { channel_id: preselectedChannelId } : {}),
    },
  });

  const selectedChannelId = watch("channel_id");
  const selectedFilterId = watch("job_filter_id");

  // Reset when dialog opens
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen) {
        reset({
          ...ruleToFormValues(rule),
          ...(preselectedChannelId ? { channel_id: preselectedChannelId } : {}),
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
        formData.append("channel_id", values.channel_id);
        formData.append("job_filter_id", values.job_filter_id ?? "");
        formData.append("match_score_min", String(values.match_score_min));
        formData.append(
          "opportunity_score_min",
          String(values.opportunity_score_min)
        );
        formData.append("max_proposals", String(values.max_proposals));

        const result = isEditing
          ? await updateRule(rule!.id, formData)
          : await createRule(formData);

        if (!result.success) {
          toast.error(result.error ?? "Something went wrong.");
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

  const selectedChannel = channels.find((c) => c.id === selectedChannelId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isEditing && controlledOpen === undefined && (
        <DialogTrigger
          render={
            trigger ?? (
              <Button>
                <Plus className="size-4 mr-2" />
                Add Rule
              </Button>
            )
          }
        />
      )}
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={handleSubmit(onSubmit as (v: RuleFormValues) => void)}
        >
          <DialogHeader>
            <DialogTitle className="font-heading">
              {isEditing ? "Edit Rule" : "Create Rule"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update your notification rule."
                : "Link a channel with a filter to define when alerts are sent."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            {/* Channel */}
            <div className="space-y-2">
              <Label
                htmlFor="channel_id"
                className="flex items-center gap-1"
              >
                Notification Channel{" "}
                <Asterisk className="size-3 text-destructive" />
              </Label>
              <Controller
                name="channel_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val: string | null) =>
                      field.onChange(val ?? "")
                    }
                  >
                    <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="Select a channel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {channels.length === 0 && (
                          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                            No channels yet. Create one first.
                          </div>
                        )}
                        {channels.map((ch) => (
                          <SelectItem key={ch.id} value={ch.id}>
                            <span className="flex items-center gap-2">
                              <Bell className="size-4 text-muted-foreground" />
                              {ch.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.channel_id && (
                <p className="text-xs text-destructive">
                  {errors.channel_id.message}
                </p>
              )}
            </div>

            {/* Job Filter */}
            <div className="space-y-2">
              <Label htmlFor="job_filter_id">Job Filter (optional)</Label>
              <Controller
                name="job_filter_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(val: string | null) =>
                      field.onChange(val || null)
                    }
                  >
                    <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="All filters (no filter)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="">
                          <span className="flex items-center gap-2">
                            <Globe className="size-4 text-muted-foreground" />
                            All filters
                          </span>
                        </SelectItem>
                        {filters.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            <span className="flex items-center gap-2">
                              <Filter className="size-4 text-muted-foreground" />
                              {f.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to apply this rule to all your filters.
              </p>
            </div>

            {/* Thresholds */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
              <div className="flex items-center gap-2 pb-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Scoring Thresholds
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="match_score_min">
                    Min Match Score
                  </Label>
                  <Input
                    id="match_score_min"
                    type="number"
                    min={0}
                    max={100}
                    placeholder="75"
                    {...register("match_score_min")}
                  />
                  <p className="text-xs text-muted-foreground">
                    0–100
                  </p>
                  {errors.match_score_min && (
                    <p className="text-xs text-destructive">
                      {errors.match_score_min.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opportunity_score_min">
                    Min Opportunity Score
                  </Label>
                  <Input
                    id="opportunity_score_min"
                    type="number"
                    min={0}
                    max={100}
                    placeholder="70"
                    {...register("opportunity_score_min")}
                  />
                  <p className="text-xs text-muted-foreground">
                    0–100
                  </p>
                  {errors.opportunity_score_min && (
                    <p className="text-xs text-destructive">
                      {errors.opportunity_score_min.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_proposals">
                  Max Proposals on Job
                </Label>
                <Input
                  id="max_proposals"
                  type="number"
                  min={0}
                  placeholder="20"
                  {...register("max_proposals")}
                />
                <p className="text-xs text-muted-foreground">
                  Exclude jobs with more proposals than this.
                </p>
                {errors.max_proposals && (
                  <p className="text-xs text-destructive">
                    {errors.max_proposals.message}
                  </p>
                )}
              </div>
            </div>

            {/* Summary */}
            {selectedChannel && (
              <div className="rounded-xl bg-accent-amber/5 border border-accent-amber/20 p-3">
                <p className="text-xs text-muted-foreground">
                  Alerts will be sent to{" "}
                  <strong className="text-foreground">
                    {selectedChannel.name}
                  </strong>
                  {selectedFilterId
                    ? ` when jobs match filter "${filters.find(f => f.id === selectedFilterId)?.name ?? ""}"`
                    : " for all matching jobs"}
                  .
                </p>
              </div>
            )}
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
            <Button type="submit" disabled={submitting}>
              {submitting && (
                <Loader2 className="size-4 mr-2 animate-spin" />
              )}
              {isEditing ? "Save Changes" : "Create Rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

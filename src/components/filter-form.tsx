"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  filterFormSchema,
  parseKeywords,
  type FilterFormValues,
} from "@/lib/validations/filter";
import { createFilter, updateFilter } from "@/actions/filters";
import type { JobFilter } from "@/lib/supabase/database-types";
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
  Plus,
  Pencil,
  Loader2,
  Asterisk,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────

function filterToFormValues(filter?: JobFilter): FilterFormValues {
  return {
    name: filter?.name ?? "",
    keywords: filter?.keywords?.join(", ") ?? "",
    min_budget: filter?.min_budget ?? null,
    max_budget: filter?.max_budget ?? null,
    client_countries: filter?.client_countries?.join(", ") ?? "",
    min_client_spend: filter?.min_client_spend ?? null,
    max_proposals: filter?.max_proposals ?? null,
  };
}

// ─── Props ──────────────────────────────────────────────

interface FilterFormDialogProps {
  /** Existing filter to edit, or undefined to create new */
  filter?: JobFilter;
  /** Optional trigger element — if omitted, renders a default "Add Filter" button */
  trigger?: React.ReactElement;
  /** Controlled open state (when used without a trigger) */
  open?: boolean;
  /** Called when open state changes (when used without a trigger) */
  onOpenChange?: (open: boolean) => void;
  /** Called after a successful save (useful for closing a parent dialog) */
  onSuccess?: () => void;
}

// ─── Component ──────────────────────────────────────────

export function FilterFormDialog({
  filter,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
}: FilterFormDialogProps) {
  const isEditing = !!filter;
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FilterFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(filterFormSchema) as any,
    defaultValues: filterToFormValues(filter),
  });

  // Reset form when dialog opens / filter changes
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen) {
        reset(filterToFormValues(filter));
      }
    },
    [filter, reset]
  );

  const onSubmit = useCallback(
    async (values: FilterFormValues) => {
      setSubmitting(true);
      try {
        const formData = new FormData();
        formData.append("name", values.name);
        formData.append("keywords", values.keywords);
        if (values.min_budget != null)
          formData.append("min_budget", String(values.min_budget));
        if (values.max_budget != null)
          formData.append("max_budget", String(values.max_budget));
        formData.append("client_countries", values.client_countries ?? "");
        if (values.min_client_spend != null)
          formData.append("min_client_spend", String(values.min_client_spend));
        if (values.max_proposals != null)
          formData.append("max_proposals", String(values.max_proposals));

        const result = isEditing
          ? await updateFilter(filter!.id, formData)
          : await createFilter(formData);

        if (!result.success) {
          toast.error(result.error ?? "Something went wrong.");
          return;
        }

        toast.success(
          isEditing
            ? "Filter updated successfully."
            : "Filter created successfully."
        );
        setOpen(false);
        onSuccess?.();
      } finally {
        setSubmitting(false);
      }
    },
    [isEditing, filter, onSuccess]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button>
              <Plus className="size-4 mr-2" />
              Add Filter
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit(onSubmit as (v: FilterFormValues) => void)}>
          <DialogHeader>
            <DialogTitle className="font-heading">
              {isEditing ? "Edit Filter" : "Create Filter"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update your filter criteria below."
                : "Define keywords, budget range, and other criteria to find relevant jobs."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-1">
                Filter Name <Asterisk className="size-3 text-destructive" />
              </Label>
              <Input
                id="name"
                placeholder="e.g. React Developer Jobs"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Keywords */}
            <div className="space-y-2">
              <Label htmlFor="keywords" className="flex items-center gap-1">
                Keywords <Asterisk className="size-3 text-destructive" />
              </Label>
              <Input
                id="keywords"
                placeholder="react, typescript, next.js"
                {...register("keywords")}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of keywords to match.
              </p>
              {errors.keywords && (
                <p className="text-xs text-destructive">
                  {errors.keywords.message}
                </p>
              )}
            </div>

            {/* Budget Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_budget">Min Budget ($)</Label>
                <Input
                  id="min_budget"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0"
                  {...register("min_budget")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_budget">Max Budget ($)</Label>
                <Input
                  id="max_budget"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="10000"
                  {...register("max_budget")}
                />
              </div>
            </div>

            {/* Client Countries */}
            <div className="space-y-2">
              <Label htmlFor="client_countries">Client Countries</Label>
              <Input
                id="client_countries"
                placeholder="United States, United Kingdom, Canada"
                {...register("client_countries")}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of countries (leave empty for all).
              </p>
            </div>

            {/* Min Client Spend + Max Proposals */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_client_spend">
                  Min Client Spend ($)
                </Label>
                <Input
                  id="min_client_spend"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0"
                  {...register("min_client_spend")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_proposals">Max Proposals</Label>
                <Input
                  id="max_proposals"
                  type="number"
                  min={0}
                  step={1}
                  placeholder="20"
                  {...register("max_proposals")}
                />
                <p className="text-xs text-muted-foreground">
                  Max number of proposals a job has.
                </p>
              </div>
            </div>
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
              {isEditing ? "Save Changes" : "Create Filter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

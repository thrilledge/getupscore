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
import { CATEGORIES, getSubcategories } from "@/lib/filter-options";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Autocomplete } from "@/components/ui/autocomplete";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
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
  XIcon,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────

function filterToFormValues(filter?: JobFilter): FilterFormValues {
  return {
    name: filter?.name ?? "",
    keywords: filter?.keywords?.join(", ") ?? "",
    job_type: filter?.job_type ?? "",
    contractor_tier: filter?.contractor_tier ?? "",
    category: filter?.category ?? "",
    subcategory: filter?.subcategory ?? "",
    min_budget: filter?.min_budget ?? null,
    max_budget: filter?.max_budget ?? null,
    hourly_min: filter?.hourly_min ?? null,
    hourly_max: filter?.hourly_max ?? null,
    skills: filter?.skills?.join(", ") ?? "",
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
    watch,
    setValue,
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
      <DialogContent showCloseButton={false} className="sm:max-w-2xl max-h-[80vh] overflow-y-auto overflow-x-hidden p-0">
        <form onSubmit={handleSubmit(onSubmit as (v: FilterFormValues) => void)} >
          <DialogHeader className="sticky top-0 bg-background z-10 pb-2 p-2 sm:p-4 flex flex-row items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <DialogTitle className="font-heading">
                {isEditing ? "Edit Filter" : "Create Filter"}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Update your filter criteria below."
                  : "Define keywords, budget range, and other criteria to find relevant jobs."}
              </DialogDescription>
            </div>
            <DialogClose render={<Button variant="ghost" size="icon-sm" className="shrink-0" />}>
              <XIcon />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>

          <div className="grid gap-5 py-4 p-4 sm:p-6">
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
              <Autocomplete
                id="keywords"
                placeholder="react, typescript, next.js"
                value={watch("keywords")}
                onChange={(v) => { setValue("keywords", v, { shouldValidate: true }); }}
                type="keywords"
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

            {/* Job Type */}
            <div className="space-y-2">
              <Label htmlFor="job_type">Job Type</Label>
              <Select
                value={watch("job_type") || null}
                onValueChange={(v) => setValue("job_type", v ?? "")}
              >
                <SelectTrigger id="job_type" className="h-9 text-sm">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="HOURLY">Hourly</SelectItem>
                  <SelectItem value="FIXED">Fixed Price</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Experience Level */}
            <div className="space-y-2">
              <Label htmlFor="contractor_tier">Experience Level</Label>
              <Select
                value={watch("contractor_tier") || null}
                onValueChange={(v) => setValue("contractor_tier", v ?? "")}
              >
                <SelectTrigger id="contractor_tier" className="h-9 text-sm">
                  <SelectValue placeholder="Any level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any level</SelectItem>
                  <SelectItem value="EntryLevel">Entry</SelectItem>
                  <SelectItem value="IntermediateLevel">Intermediate</SelectItem>
                  <SelectItem value="ExpertLevel">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={watch("category") || null}
                onValueChange={(v) => { setValue("category", v ?? ""); setValue("subcategory", ""); }}
              >
                <SelectTrigger id="category" className="h-9 text-sm">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.label} value={cat.label}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subcategory */}
            {watch("category") && (
              <div className="space-y-2">
                <Label htmlFor="subcategory">Subcategory</Label>
                <Select
                  value={watch("subcategory") || null}
                  onValueChange={(v) => setValue("subcategory", v ?? "")}
                >
                  <SelectTrigger id="subcategory" className="h-9 text-sm">
                    <SelectValue placeholder="All subcategories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All subcategories</SelectItem>
                    {getSubcategories(watch("category")).map((sub) => (
                      <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Fixed Price Budget */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-medium">Fixed Price Budget ($)</Label>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="Min"
                  {...register("min_budget")}
                />
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="Max"
                  {...register("max_budget")}
                />
              </div>
            </div>

            {/* Hourly Rate */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-medium">Hourly Rate ($/hr)</Label>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  placeholder="Min"
                  {...register("hourly_min")}
                />
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  placeholder="Max"
                  {...register("hourly_max")}
                />
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <Label htmlFor="skills">Skills</Label>
              <Autocomplete
                id="skills"
                placeholder="react, typescript, python"
                value={watch("skills")}
                onChange={(v) => { setValue("skills", v); }}
                type="skills"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of required skills.
              </p>
            </div>

            {/* Client Countries */}
            <div className="space-y-2">
              <Label htmlFor="client_countries">Client Countries</Label>
              <Autocomplete
                id="client_countries"
                placeholder="United States, United Kingdom, Canada"
                value={watch("client_countries")}
                onChange={(v) => { setValue("client_countries", v); }}
                type="countries"
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

          <DialogFooter className="gap-2 sticky bottom-0">
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

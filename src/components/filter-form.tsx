"use client";

import {
  useState,
  useCallback,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  filterFormSchema,
  type FilterFormValues,
} from "@/lib/validations/filter";
import {
  createFilter,
  updateFilter,
} from "@/actions/filters";
import type { JobFilter } from "@/lib/supabase/database-types";
import {
  CATEGORIES,
  getSubcategories,
} from "@/lib/filter-options";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Asterisk,
  Filter,
  Loader2,
  Pencil,
  Plus,
  XIcon,
} from "lucide-react";

function filterToFormValues(
  filter?: JobFilter
): FilterFormValues {
  return {
    name: filter?.name ?? "",
    keywords: filter?.keywords?.join(", ") ?? "",
    job_type: filter?.job_type ?? "",
    contractor_tier:
      filter?.contractor_tier ?? "",
    category: filter?.category ?? "",
    subcategory: filter?.subcategory ?? "",
    min_budget: filter?.min_budget ?? null,
    max_budget: filter?.max_budget ?? null,
    hourly_min: filter?.hourly_min ?? null,
    hourly_max: filter?.hourly_max ?? null,
    skills: filter?.skills?.join(", ") ?? "",
    client_countries:
      filter?.client_countries?.join(", ") ??
      "",
    min_client_spend:
      filter?.min_client_spend ?? null,
    max_proposals:
      filter?.max_proposals ?? null,
  };
}

interface FilterFormDialogProps {
  filter?: JobFilter;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

const inputClassName =
  "h-10 rounded-xl border-black/10 bg-[#F8F9F9] px-3 text-sm text-[#0A0A0A] shadow-none transition-colors placeholder:text-black/30 hover:border-black/20 focus-visible:border-[#00C98B] focus-visible:ring-[#00C98B]/20";

const selectClassName =
  "h-10 w-full rounded-xl border-black/10 bg-[#F8F9F9] px-3 text-sm text-[#0A0A0A] shadow-none transition-colors hover:border-black/20 focus-visible:border-[#00C98B] focus-visible:ring-[#00C98B]/20";

const labelClassName =
  "text-xs font-semibold text-[#0A0A0A] min-[420px]:text-sm";

function FieldError({
  message,
}: {
  message?: string;
}) {
  if (!message) return null;

  return (
    <p className="rounded-lg border border-black/10 bg-black/[0.03] px-2.5 py-1.5 text-[11px] leading-4 text-black/60">
      {message}
    </p>
  );
}

export function FilterFormDialog({
  filter,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
}: FilterFormDialogProps) {
  const isEditing = !!filter;

  const [internalOpen, setInternalOpen] =
    useState(false);

  const open =
    controlledOpen ?? internalOpen;

  const setOpen =
    controlledOnOpenChange ?? setInternalOpen;

  const [submitting, setSubmitting] =
    useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FilterFormValues>({
    resolver: zodResolver(
      filterFormSchema
    ) as any,

    defaultValues: filterToFormValues(filter),
  });

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);

      if (nextOpen) {
        reset(filterToFormValues(filter));
      }
    },
    [filter, reset, setOpen]
  );

  const onSubmit = useCallback(
    async (values: FilterFormValues) => {
      setSubmitting(true);

      try {
        const formData = new FormData();

        formData.append("name", values.name);
        formData.append(
          "keywords",
          values.keywords
        );

        if (values.min_budget != null) {
          formData.append(
            "min_budget",
            String(values.min_budget)
          );
        }

        if (values.max_budget != null) {
          formData.append(
            "max_budget",
            String(values.max_budget)
          );
        }

        formData.append(
          "client_countries",
          values.client_countries ?? ""
        );

        if (
          values.min_client_spend != null
        ) {
          formData.append(
            "min_client_spend",
            String(values.min_client_spend)
          );
        }

        if (values.max_proposals != null) {
          formData.append(
            "max_proposals",
            String(values.max_proposals)
          );
        }

        const result = isEditing
          ? await updateFilter(
            filter!.id,
            formData
          )
          : await createFilter(formData);

        if (!result.success) {
          toast.error(
            result.error ??
            "Something went wrong."
          );
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
    [
      isEditing,
      filter,
      onSuccess,
      setOpen,
    ]
  );

  const selectedCategory =
    watch("category");

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      <DialogTrigger
        render={
          trigger ?? (
            <Button className="h-10 rounded-xl mt-6 bg-[#0A0A0A] px-4 text-sm font-semibold text-white hover:bg-[#00C98B] hover:text-[#0A0A0A]">
              <Plus className="size-4" />
              Add Filter
            </Button>
          )
        }
      />

      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-[760px] gap-0 overflow-hidden rounded-[20px] border-black/10 bg-white p-0 shadow-[0_24px_90px_rgba(0,0,0,0.24)] sm:rounded-[24px]"
      >
        <form
          onSubmit={handleSubmit(
            onSubmit as (
              values: FilterFormValues
            ) => void
          )}
          className="flex max-h-[calc(100dvh-1rem)] min-h-0 flex-col overflow-hidden"
        >
          {/* Header */}
          <DialogHeader className="relative shrink-0 overflow-hidden bg-[#0A0A0A] p-4 text-left min-[480px]:p-5 sm:p-6">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-14 -top-16 size-44 rounded-full bg-[#00C98B]/15 blur-3xl"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 left-1/3 h-px w-1/2 bg-gradient-to-r from-transparent via-[#00C98B]/60 to-transparent"
            />

            <div className="relative flex min-w-0 items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3 min-[480px]:gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#00C98B]/30 bg-[#00C98B]/10 text-[#00C98B] min-[480px]:size-11 min-[480px]:rounded-2xl">
                  {isEditing ? (
                    <Pencil className="size-[18px] min-[480px]:size-5" />
                  ) : (
                    <Filter className="size-[18px] min-[480px]:size-5" />
                  )}
                </div>

                <div className="min-w-0">
                  <DialogTitle className="font-heading text-lg font-bold tracking-tight text-white min-[420px]:text-xl sm:text-2xl">
                    {isEditing
                      ? "Edit Filter"
                      : "Create Filter"}
                  </DialogTitle>

                  <DialogDescription className="mt-1 max-w-xl text-xs leading-5 text-white/55 sm:text-sm">
                    {isEditing
                      ? "Update your filter criteria below."
                      : "Define the criteria UpScore should use to find relevant opportunities."}
                  </DialogDescription>
                </div>
              </div>

              <DialogClose
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0 rounded-xl border border-white/10 bg-white/5 text-white hover:border-[#00C98B]/40 hover:bg-[#00C98B]/10 hover:text-[#00C98B]"
                  />
                }
              >
                <XIcon className="size-4" />
                <span className="sr-only">
                  Close
                </span>
              </DialogClose>
            </div>
          </DialogHeader>

          {/* Scrollable Form Content */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white">
            <div className="space-y-5 p-4 min-[480px]:p-5 sm:p-6">
              {/* Main Information */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-black/10 pb-2.5">
                  <span className="size-1.5 rounded-full bg-[#00C98B]" />

                  <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-black/45">
                    Basic information
                  </h3>
                </div>

                {/* Filter Name */}
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className={`flex items-center gap-1 ${labelClassName}`}
                  >
                    Filter Name

                    <Asterisk className="size-3 text-[#00C98B]" />
                  </Label>

                  <Input
                    id="name"
                    placeholder="e.g. React Developer Jobs"
                    className={inputClassName}
                    {...register("name")}
                  />

                  <FieldError
                    message={errors.name?.message}
                  />
                </div>

                {/* Keywords */}
                <div className="space-y-2">
                  <Label
                    htmlFor="keywords"
                    className={`flex items-center gap-1 ${labelClassName}`}
                  >
                    Keywords

                    <Asterisk className="size-3 text-[#00C98B]" />
                  </Label>

                  <Autocomplete
                    id="keywords"
                    placeholder="react, typescript, next.js"
                    value={watch("keywords")}
                    onChange={(value) => {
                      setValue(
                        "keywords",
                        value,
                        {
                          shouldValidate: true,
                        }
                      );
                    }}
                    type="keywords"
                  />

                  <p className="text-[11px] leading-4 text-black/40">
                    Add multiple keywords separated
                    with commas.
                  </p>

                  <FieldError
                    message={
                      errors.keywords?.message
                    }
                  />
                </div>
              </section>

              {/* Job Preferences */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-black/10 pb-2.5">
                  <span className="size-1.5 rounded-full bg-[#00C98B]" />

                  <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-black/45">
                    Job preferences
                  </h3>
                </div>

                <div className="grid min-w-0 gap-4 min-[620px]:grid-cols-2">
                  {/* Job Type */}
                  <div className="min-w-0 space-y-2">
                    <Label
                      htmlFor="job_type"
                      className={labelClassName}
                    >
                      Job Type
                    </Label>

                    <Select
                      value={
                        watch("job_type") ||
                        null
                      }
                      onValueChange={(value) =>
                        setValue(
                          "job_type",
                          value ?? ""
                        )
                      }
                    >
                      <SelectTrigger
                        id="job_type"
                        className={
                          selectClassName
                        }
                      >
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>

                      <SelectContent className="border-black/10 bg-white">
                        <SelectItem value="">
                          All types
                        </SelectItem>

                        <SelectItem value="HOURLY">
                          Hourly
                        </SelectItem>

                        <SelectItem value="FIXED">
                          Fixed Price
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Experience Level */}
                  <div className="min-w-0 space-y-2">
                    <Label
                      htmlFor="contractor_tier"
                      className={labelClassName}
                    >
                      Experience Level
                    </Label>

                    <Select
                      value={
                        watch(
                          "contractor_tier"
                        ) || null
                      }
                      onValueChange={(value) =>
                        setValue(
                          "contractor_tier",
                          value ?? ""
                        )
                      }
                    >
                      <SelectTrigger
                        id="contractor_tier"
                        className={
                          selectClassName
                        }
                      >
                        <SelectValue placeholder="Any level" />
                      </SelectTrigger>

                      <SelectContent className="border-black/10 bg-white">
                        <SelectItem value="">
                          Any level
                        </SelectItem>

                        <SelectItem value="EntryLevel">
                          Entry
                        </SelectItem>

                        <SelectItem value="IntermediateLevel">
                          Intermediate
                        </SelectItem>

                        <SelectItem value="ExpertLevel">
                          Expert
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category */}
                  <div
                    className={`min-w-0 space-y-2 ${selectedCategory
                      ? ""
                      : "min-[620px]:col-span-2"
                      }`}
                  >
                    <Label
                      htmlFor="category"
                      className={labelClassName}
                    >
                      Category
                    </Label>

                    <Select
                      value={
                        selectedCategory || null
                      }
                      onValueChange={(value) => {
                        setValue(
                          "category",
                          value ?? ""
                        );

                        setValue(
                          "subcategory",
                          ""
                        );
                      }}
                    >
                      <SelectTrigger
                        id="category"
                        className={
                          selectClassName
                        }
                      >
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>

                      <SelectContent className="border-black/10 bg-white">
                        <SelectItem value="">
                          All categories
                        </SelectItem>

                        {CATEGORIES.map(
                          (category) => (
                            <SelectItem
                              key={
                                category.label
                              }
                              value={
                                category.label
                              }
                            >
                              {
                                category.label
                              }
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subcategory */}
                  {selectedCategory && (
                    <div className="min-w-0 space-y-2">
                      <Label
                        htmlFor="subcategory"
                        className={
                          labelClassName
                        }
                      >
                        Subcategory
                      </Label>

                      <Select
                        value={
                          watch(
                            "subcategory"
                          ) || null
                        }
                        onValueChange={(value) =>
                          setValue(
                            "subcategory",
                            value ?? ""
                          )
                        }
                      >
                        <SelectTrigger
                          id="subcategory"
                          className={
                            selectClassName
                          }
                        >
                          <SelectValue placeholder="All subcategories" />
                        </SelectTrigger>

                        <SelectContent className="border-black/10 bg-white">
                          <SelectItem value="">
                            All subcategories
                          </SelectItem>

                          {getSubcategories(
                            selectedCategory
                          ).map(
                            (subcategory) => (
                              <SelectItem
                                key={
                                  subcategory
                                }
                                value={
                                  subcategory
                                }
                              >
                                {
                                  subcategory
                                }
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </section>

              {/* Budget */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-black/10 pb-2.5">
                  <span className="size-1.5 rounded-full bg-[#00C98B]" />

                  <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-black/45">
                    Budget and rates
                  </h3>
                </div>

                <div className="grid min-w-0 gap-4 min-[680px]:grid-cols-2">
                  {/* Fixed Price Budget */}
                  <div className="min-w-0 space-y-2">
                    <Label
                      className={
                        labelClassName
                      }
                    >
                      Fixed Price Budget ($)
                    </Label>

                    <div className="grid min-w-0 gap-2 min-[420px]:grid-cols-2">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="Min"
                        className={
                          inputClassName
                        }
                        {...register(
                          "min_budget"
                        )}
                      />

                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="Max"
                        className={
                          inputClassName
                        }
                        {...register(
                          "max_budget"
                        )}
                      />
                    </div>
                  </div>

                  {/* Hourly Rate */}
                  <div className="min-w-0 space-y-2">
                    <Label
                      className={
                        labelClassName
                      }
                    >
                      Hourly Rate ($/hr)
                    </Label>

                    <div className="grid min-w-0 gap-2 min-[420px]:grid-cols-2">
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        placeholder="Min"
                        className={
                          inputClassName
                        }
                        {...register(
                          "hourly_min"
                        )}
                      />

                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        placeholder="Max"
                        className={
                          inputClassName
                        }
                        {...register(
                          "hourly_max"
                        )}
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Skills and Location */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-black/10 pb-2.5">
                  <span className="size-1.5 rounded-full bg-[#00C98B]" />

                  <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-black/45">
                    Skills and clients
                  </h3>
                </div>

                <div className="grid min-w-0 gap-4 min-[680px]:grid-cols-2">
                  {/* Skills */}
                  <div className="min-w-0 space-y-2">
                    <Label
                      htmlFor="skills"
                      className={
                        labelClassName
                      }
                    >
                      Skills
                    </Label>

                    <Autocomplete
                      id="skills"
                      placeholder="react, typescript, python"
                      value={watch("skills")}
                      onChange={(value) => {
                        setValue(
                          "skills",
                          value
                        );
                      }}
                      type="skills"
                    />

                    <p className="text-[11px] leading-4 text-black/40">
                      Add required skills separated
                      with commas.
                    </p>
                  </div>

                  {/* Client Countries */}
                  <div className="min-w-0 space-y-2">
                    <Label
                      htmlFor="client_countries"
                      className={
                        labelClassName
                      }
                    >
                      Client Countries
                    </Label>

                    <Autocomplete
                      id="client_countries"
                      placeholder="United States, Canada"
                      value={watch(
                        "client_countries"
                      )}
                      onChange={(value) => {
                        setValue(
                          "client_countries",
                          value
                        );
                      }}
                      type="countries"
                    />

                    <p className="text-[11px] leading-4 text-black/40">
                      Leave empty to include clients
                      from all countries.
                    </p>
                  </div>
                </div>

                <div className="grid min-w-0 gap-4 min-[560px]:grid-cols-2">
                  {/* Minimum Client Spend */}
                  <div className="min-w-0 space-y-2">
                    <Label
                      htmlFor="min_client_spend"
                      className={
                        labelClassName
                      }
                    >
                      Min Client Spend ($)
                    </Label>

                    <Input
                      id="min_client_spend"
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0"
                      className={
                        inputClassName
                      }
                      {...register(
                        "min_client_spend"
                      )}
                    />
                  </div>

                  {/* Maximum Proposals */}
                  <div className="min-w-0 space-y-2">
                    <Label
                      htmlFor="max_proposals"
                      className={
                        labelClassName
                      }
                    >
                      Max Proposals
                    </Label>

                    <Input
                      id="max_proposals"
                      type="number"
                      min={0}
                      step={1}
                      placeholder="20"
                      className={
                        inputClassName
                      }
                      {...register(
                        "max_proposals"
                      )}
                    />

                    <p className="text-[11px] leading-4 text-black/40">
                      Maximum proposals a job may
                      already have.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-black/10 bg-white p-3.5 min-[420px]:p-4 sm:px-6">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="h-10 min-w-0 rounded-xl border-black/15 bg-white px-3 text-xs font-semibold text-[#0A0A0A] hover:border-[#00C98B]/40 hover:bg-[#00C98B]/10 min-[420px]:text-sm sm:w-auto sm:px-5"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={submitting}
                className="h-10 min-w-0 rounded-xl bg-[#0A0A0A] px-3 text-xs font-semibold text-white hover:bg-[#00C98B] hover:text-[#0A0A0A] min-[420px]:text-sm sm:w-auto sm:px-5"
              >
                {submitting && (
                  <Loader2 className="size-4 shrink-0 animate-spin" />
                )}

                <span className="truncate">
                  {isEditing
                    ? "Save Changes"
                    : "Create Filter"}
                </span>
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
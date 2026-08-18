"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { JobFilter } from "@/lib/supabase/database-types";
import {
  toggleFilter,
  deleteFilter,
} from "@/actions/filters";
import { FilterFormDialog } from "@/components/filter-form";
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
  MoreHorizontal,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Globe,
  DollarSign,
  Users,
  Clock,
  Briefcase,
  Wrench,
  LayoutGrid,
  Loader2,
  Filter,
} from "lucide-react";

interface FilterCardProps {
  filter: JobFilter;
}

export function FilterCard({
  filter,
}: FilterCardProps) {
  const [
    showEditDialog,
    setShowEditDialog,
  ] = useState(false);

  const [
    showDeleteDialog,
    setShowDeleteDialog,
  ] = useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [toggling, setToggling] =
    useState(false);

  async function handleToggle() {
    setToggling(true);

    const result = await toggleFilter(
      filter.id,
      !filter.is_active
    );

    setToggling(false);

    if (!result.success) {
      toast.error(
        result.error ??
        "Failed to toggle filter."
      );
      return;
    }

    toast.success(
      filter.is_active
        ? "Filter paused."
        : "Filter activated."
    );
  }

  async function handleDelete() {
    setDeleting(true);

    const result = await deleteFilter(
      filter.id
    );

    setDeleting(false);

    if (!result.success) {
      toast.error(
        result.error ??
        "Failed to delete filter."
      );
      return;
    }

    toast.success("Filter deleted.");
    setShowDeleteDialog(false);
  }

  const hasBudget =
    filter.min_budget != null ||
    filter.max_budget != null;

  const hasHourly =
    filter.hourly_min != null ||
    filter.hourly_max != null;

  const hasCountries =
    filter.client_countries.length > 0;

  const hasSkills =
    filter.skills.length > 0;

  return (
    <>
      <Card
        className={`group relative flex h-full min-w-0 flex-col gap-0 overflow-hidden rounded-[18px] border py-0 transition-all duration-300 sm:rounded-2xl ${filter.is_active
            ? "border-[#00C98B]/25 bg-white shadow-[0_8px_26px_rgba(0,0,0,0.045)] hover:-translate-y-0.5 hover:border-[#00C98B]/50 hover:shadow-[0_16px_38px_rgba(0,201,139,0.09)]"
            : "border-black/10 bg-white opacity-65 shadow-[0_7px_22px_rgba(0,0,0,0.035)] hover:-translate-y-0.5 hover:opacity-100"
          }`}
      >
        {/* Top Accent */}
        <div
          className={`h-[3px] w-full shrink-0 transition-colors duration-300 ${filter.is_active
              ? "bg-[#00C98B]"
              : "bg-[#0A0A0A]/15"
            }`}
        />

        {/* Header */}
        <CardHeader className="min-w-0 p-4 pb-3 min-[480px]:p-5 min-[480px]:pb-4">
          <div className="flex min-w-0 items-start justify-between gap-2 min-[420px]:gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-2.5 min-[420px]:gap-3">
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 min-[480px]:size-11 min-[480px]:rounded-2xl ${filter.is_active
                    ? "border-[#00C98B]/20 bg-[#00C98B]/10 text-[#00A975] group-hover:bg-[#00C98B] group-hover:text-[#0A0A0A]"
                    : "border-black/10 bg-black/5 text-black/35"
                  }`}
              >
                <Filter className="size-[18px] min-[480px]:size-5" />
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex min-w-0 flex-col items-start gap-1.5 min-[400px]:flex-row min-[400px]:items-center min-[400px]:gap-2">
                  <CardTitle
                    title={filter.name}
                    className="max-w-full truncate font-heading text-sm font-bold tracking-tight text-[#0A0A0A] min-[420px]:text-base"
                  >
                    {filter.name}
                  </CardTitle>

                  <Badge
                    variant="outline"
                    className={`h-5 shrink-0 rounded-full px-2 text-[9px] font-bold min-[420px]:text-[10px] ${filter.is_active
                        ? "border-[#00C98B]/25 bg-[#00C98B]/10 text-[#007A56]"
                        : "border-black/10 bg-black/5 text-black/45"
                      }`}
                  >
                    <span
                      className={`mr-1.5 size-1.5 rounded-full ${filter.is_active
                          ? "bg-[#00C98B]"
                          : "bg-black/30"
                        }`}
                    />

                    {filter.is_active
                      ? "Active"
                      : "Paused"}
                  </Badge>
                </div>

                <CardDescription className="mt-1.5 text-[10px] leading-4 text-black/40 min-[420px]:text-[11px]">
                  Created{" "}
                  {new Date(
                    filter.created_at
                  ).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }
                  )}
                </CardDescription>
              </div>
            </div>

            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Open actions for ${filter.name}`}
                    className="size-8 shrink-0 rounded-xl text-black/45 opacity-100 transition-all hover:bg-[#0A0A0A] hover:text-[#00C98B] lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
                  />
                }
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                sideOffset={6}
                className="w-44 max-w-[calc(100vw-1rem)] rounded-2xl border-black/10 bg-white p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.14)]"
              >
                <DropdownMenuLabel className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-black/40">
                  Filter actions
                </DropdownMenuLabel>

                <DropdownMenuItem
                  onClick={() =>
                    setShowEditDialog(true)
                  }
                  className="cursor-pointer rounded-xl px-2.5 py-2 text-sm text-[#0A0A0A] focus:bg-[#00C98B]/10 focus:text-[#0A0A0A]"
                >
                  <Pencil className="mr-2 size-3.5 text-[#00A975]" />
                  Edit filter
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={handleToggle}
                  disabled={toggling}
                  className="cursor-pointer rounded-xl px-2.5 py-2 text-sm text-[#0A0A0A] focus:bg-[#00C98B]/10 focus:text-[#0A0A0A]"
                >
                  {toggling ? (
                    <Loader2 className="mr-2 size-3.5 animate-spin text-[#00A975]" />
                  ) : filter.is_active ? (
                    <PowerOff className="mr-2 size-3.5 text-[#00A975]" />
                  ) : (
                    <Power className="mr-2 size-3.5 text-[#00A975]" />
                  )}

                  {filter.is_active
                    ? "Pause filter"
                    : "Activate filter"}
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1 bg-black/10" />

                <DropdownMenuItem
                  onClick={() =>
                    setShowDeleteDialog(true)
                  }
                  className="cursor-pointer rounded-xl px-2.5 py-2 text-sm text-[#0A0A0A] focus:bg-black/5 focus:text-[#0A0A0A]"
                >
                  <Trash2 className="mr-2 size-3.5 text-black/55" />
                  Delete filter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="min-w-0 flex-1 px-4 pb-3 min-[480px]:px-5 min-[480px]:pb-4">
          {/* Keywords */}
          <div className="mb-4 flex min-w-0 flex-wrap gap-1.5">
            {filter.keywords
              .slice(0, 8)
              .map((keyword) => (
                <Badge
                  key={keyword}
                  variant="outline"
                  className="max-w-full truncate rounded-full border-[#00C98B]/20 bg-[#00C98B]/5 px-2 py-0.5 text-[9px] font-semibold text-[#007A56] min-[420px]:text-[10px]"
                >
                  {keyword}
                </Badge>
              ))}

            {filter.keywords.length > 8 && (
              <Badge
                variant="outline"
                className="shrink-0 rounded-full border-black/10 bg-black/[0.03] px-2 py-0.5 text-[9px] font-semibold text-black/45 min-[420px]:text-[10px]"
              >
                +{filter.keywords.length - 8} more
              </Badge>
            )}
          </div>

          {/* Filter Details */}
          <div className="grid min-w-0 gap-2 min-[480px]:grid-cols-2">
            {filter.job_type && (
              <div className="flex min-w-0 items-start gap-2 rounded-xl border border-black/5 bg-[#F7F8F8] px-3 py-2.5">
                <Briefcase className="mt-0.5 size-3.5 shrink-0 text-[#00A975]" />

                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-black/30">
                    Job type
                  </p>

                  <p className="mt-0.5 truncate text-[11px] font-medium text-black/65">
                    {filter.job_type ===
                      "HOURLY"
                      ? "Hourly"
                      : "Fixed Price"}
                  </p>
                </div>
              </div>
            )}

            {filter.contractor_tier && (
              <div className="flex min-w-0 items-start gap-2 rounded-xl border border-black/5 bg-[#F7F8F8] px-3 py-2.5">
                <Users className="mt-0.5 size-3.5 shrink-0 text-[#00A975]" />

                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-black/30">
                    Experience
                  </p>

                  <p className="mt-0.5 break-words text-[11px] font-medium text-black/65">
                    {filter.contractor_tier
                      .replace(
                        /([A-Z])/g,
                        " $1"
                      )
                      .trim()}
                  </p>
                </div>
              </div>
            )}

            {filter.category && (
              <div className="flex min-w-0 items-start gap-2 rounded-xl border border-black/5 bg-[#F7F8F8] px-3 py-2.5">
                <LayoutGrid className="mt-0.5 size-3.5 shrink-0 text-[#00A975]" />

                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-black/30">
                    Category
                  </p>

                  <p className="mt-0.5 line-clamp-2 break-words text-[11px] font-medium leading-4 text-black/65">
                    {filter.category}

                    {filter.subcategory &&
                      ` / ${filter.subcategory}`}
                  </p>
                </div>
              </div>
            )}

            {hasBudget && (
              <div className="flex min-w-0 items-start gap-2 rounded-xl border border-black/5 bg-[#F7F8F8] px-3 py-2.5">
                <DollarSign className="mt-0.5 size-3.5 shrink-0 text-[#00A975]" />

                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-black/30">
                    Fixed budget
                  </p>

                  <p className="mt-0.5 truncate text-[11px] font-semibold tabular-nums text-black/65">
                    {filter.min_budget != null
                      ? `$${filter.min_budget}`
                      : "$0"}
                    {" — "}
                    {filter.max_budget != null
                      ? `$${filter.max_budget}`
                      : "∞"}
                  </p>
                </div>
              </div>
            )}

            {hasHourly && (
              <div className="flex min-w-0 items-start gap-2 rounded-xl border border-black/5 bg-[#F7F8F8] px-3 py-2.5">
                <Clock className="mt-0.5 size-3.5 shrink-0 text-[#00A975]" />

                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-black/30">
                    Hourly rate
                  </p>

                  <p className="mt-0.5 truncate text-[11px] font-semibold tabular-nums text-black/65">
                    {filter.hourly_min != null
                      ? `$${filter.hourly_min}`
                      : "$0"}
                    {" — "}
                    {filter.hourly_max != null
                      ? `$${filter.hourly_max}`
                      : "∞"}
                    /hr
                  </p>
                </div>
              </div>
            )}

            {hasSkills && (
              <div className="flex min-w-0 items-start gap-2 rounded-xl border border-black/5 bg-[#F7F8F8] px-3 py-2.5">
                <Wrench className="mt-0.5 size-3.5 shrink-0 text-[#00A975]" />

                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-black/30">
                    Skills
                  </p>

                  <p className="mt-0.5 line-clamp-2 break-words text-[11px] font-medium leading-4 text-black/65">
                    {filter.skills
                      .slice(0, 3)
                      .join(", ")}

                    {filter.skills.length > 3 &&
                      ` (+${filter.skills.length - 3
                      })`}
                  </p>
                </div>
              </div>
            )}

            {hasCountries && (
              <div className="flex min-w-0 items-start gap-2 rounded-xl border border-black/5 bg-[#F7F8F8] px-3 py-2.5">
                <Globe className="mt-0.5 size-3.5 shrink-0 text-[#00A975]" />

                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-black/30">
                    Countries
                  </p>

                  <p className="mt-0.5 line-clamp-2 break-words text-[11px] font-medium leading-4 text-black/65">
                    {filter.client_countries
                      .slice(0, 2)
                      .join(", ")}

                    {filter.client_countries
                      .length > 2 &&
                      " (+ more)"}
                  </p>
                </div>
              </div>
            )}

            {filter.min_client_spend !=
              null && (
                <div className="flex min-w-0 items-start gap-2 rounded-xl border border-black/5 bg-[#F7F8F8] px-3 py-2.5">
                  <DollarSign className="mt-0.5 size-3.5 shrink-0 text-[#00A975]" />

                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-black/30">
                      Client spend
                    </p>

                    <p className="mt-0.5 truncate text-[11px] font-semibold tabular-nums text-black/65">
                      Minimum $
                      {filter.min_client_spend}
                    </p>
                  </div>
                </div>
              )}

            {filter.max_proposals != null && (
              <div className="flex min-w-0 items-start gap-2 rounded-xl border border-black/5 bg-[#F7F8F8] px-3 py-2.5">
                <Users className="mt-0.5 size-3.5 shrink-0 text-[#00A975]" />

                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-black/30">
                    Competition
                  </p>

                  <p className="mt-0.5 truncate text-[11px] font-medium text-black/65">
                    Max {filter.max_proposals}{" "}
                    proposals
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>

        {/* Footer */}
        <CardFooter className="mt-auto flex min-w-0 items-center justify-between gap-2 border-t border-black/5 px-4 py-3 min-[480px]:px-5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-black/40 min-[420px]:text-[11px]">
            <span className="whitespace-nowrap">
              {filter.keywords.length} keyword
              {filter.keywords.length !== 1
                ? "s"
                : ""}
            </span>

            {hasCountries && (
              <>
                <span className="size-1 rounded-full bg-black/20" />

                <span className="whitespace-nowrap">
                  {
                    filter.client_countries
                      .length
                  }{" "}
                  {filter.client_countries
                    .length === 1
                    ? "country"
                    : "countries"}
                </span>
              </>
            )}
          </div>

          <span
            className={`size-2 shrink-0 rounded-full ${filter.is_active
                ? "bg-[#00C98B] shadow-[0_0_8px_rgba(0,201,139,0.65)]"
                : "bg-black/25"
              }`}
          />
        </CardFooter>
      </Card>

      {/* Edit Dialog */}
      <FilterFormDialog
        filter={filter}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
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
                Delete filter?
              </DialogTitle>

              <DialogDescription className="pt-1 text-xs leading-5 text-black/55 sm:text-sm sm:leading-6">
                Are you sure you want to delete{" "}
                <strong className="break-words font-semibold text-[#0A0A0A]">
                  {filter.name}
                </strong>
                ? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:flex sm:justify-end">
              <Button
                type="button"
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
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="h-10 min-w-0 rounded-xl bg-[#0A0A0A] px-3 text-xs font-semibold text-white hover:bg-[#00C98B] hover:text-[#0A0A0A] sm:w-auto sm:px-4 sm:text-sm"
              >
                {deleting && (
                  <Loader2 className="size-4 shrink-0 animate-spin" />
                )}

                <span className="truncate">
                  Delete filter
                </span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
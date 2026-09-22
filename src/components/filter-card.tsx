"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { JobFilter } from "@/lib/supabase/database-types";
import { toggleFilter, deleteFilter } from "@/actions/filters";
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

export function FilterCard({ filter }: FilterCardProps) {
  const queryClient = useQueryClient();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  function invalidateFilters() {
    queryClient.invalidateQueries({ queryKey: ["job_filters"] });
  }

  async function handleToggle() {
    setToggling(true);
    const result = await toggleFilter(filter.id, !filter.is_active);
    setToggling(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to toggle filter.");
      return;
    }

    toast.success(
      filter.is_active ? "Filter paused." : "Filter activated."
    );
    invalidateFilters();
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteFilter(filter.id);
    setDeleting(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to delete filter.");
      return;
    }

    toast.success("Filter deleted.");
    setShowDeleteDialog(false);
    invalidateFilters();
  }

  const hasBudget = filter.min_budget != null || filter.max_budget != null;
  const hasHourly = filter.hourly_min != null || filter.hourly_max != null;
  const hasCountries = filter.client_countries.length > 0;
  const hasSkills = filter.skills.length > 0;

  return (
    <>
      <Card
        className={`group relative overflow-hidden border-border/60 bg-card transition-all duration-300 hover:shadow-lg hover:border-border/100 hover:-translate-y-0.5 ${!filter.is_active ? "opacity-60" : ""
          }`}
      >
        {/* Accent bar */}
        <div
          className={`absolute top-0 left-0 h-1 w-full transition-colors duration-300 ${filter.is_active
            ? "bg-gradient-to-r from-accent-blue via-accent-blue/80 to-accent-blue/60"
            : "bg-muted-foreground/20"
            }`}
        />

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div
                  className={`rounded-lg p-1.5 transition-colors ${filter.is_active
                    ? "bg-accent-blue/10 text-accent-blue"
                    : "bg-muted/50 text-muted-foreground/50"
                    }`}
                >
                  <Filter className="size-4" />
                </div>
                <CardTitle className="text-base font-heading font-semibold tracking-tight">
                  {filter.name}
                </CardTitle>
                <Badge
                  variant={filter.is_active ? "default" : "secondary"}
                  className="text-[10px] px-2 py-0 h-5 font-medium"
                >
                  {filter.is_active ? "Active" : "Paused"}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Created{" "}
                {new Date(filter.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
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
                  <Pencil className="size-3.5" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleToggle}
                  disabled={toggling}
                  className="cursor-pointer"
                >
                  {toggling ? (
                    <Loader2 className="size-3.5 mr-2 animate-spin" />
                  ) : filter.is_active ? (
                    <PowerOff className="size-3.5 mr-2" />
                  ) : (
                    <Power className="size-3.5 mr-2" />
                  )}
                  {filter.is_active ? "Pause" : "Activate"}
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
          {/* Keywords */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {filter.keywords.slice(0, 8).map((keyword) => (
              <Badge
                key={keyword}
                variant="outline"
                className="text-[11px] font-medium px-2 py-0.5 border-border/60 bg-muted/30"
              >
                {keyword}
              </Badge>
            ))}
            {filter.keywords.length > 8 && (
              <Badge
                variant="secondary"
                className="text-[11px] px-2 py-0.5"
              >
                +{filter.keywords.length - 8} more
              </Badge>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {filter.job_type && (
              <span className="flex items-center gap-1">
                <Briefcase className="size-3" />
                {filter.job_type === "HOURLY" ? "Hourly" : "Fixed"}
              </span>
            )}
            {filter.contractor_tier && (
              <span className="flex items-center gap-1">
                {filter.contractor_tier.replace(/([A-Z])/g, " $1").trim()}
              </span>
            )}
            {filter.category && (
              <span className="flex items-center gap-1">
                <LayoutGrid className="size-3" />
                {filter.category}
                {filter.subcategory && ` / ${filter.subcategory}`}
              </span>
            )}
            {hasBudget && (
              <span className="flex items-center gap-1">
                <DollarSign className="size-3" />
                {filter.min_budget != null
                  ? `$${filter.min_budget}`
                  : "$0"}
                {" — "}
                {filter.max_budget != null
                  ? `$${filter.max_budget}`
                  : "∞"}
              </span>
            )}
            {hasHourly && (
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {filter.hourly_min != null
                  ? `$${filter.hourly_min}`
                  : "$0"}
                {" — "}
                {filter.hourly_max != null
                  ? `$${filter.hourly_max}`
                  : "∞"}
                /hr
              </span>
            )}
            {hasSkills && (
              <span className="flex items-center gap-1">
                <Wrench className="size-3" />
                {filter.skills.slice(0, 3).join(", ")}
                {filter.skills.length > 3 && ` (+${filter.skills.length - 3})`}
              </span>
            )}
            {hasCountries && (
              <span className="flex items-center gap-1">
                <Globe className="size-3" />
                {filter.client_countries.slice(0, 2).join(", ")}
                {filter.client_countries.length > 2 && " (+ more)"}
              </span>
            )}
            {filter.min_client_spend != null && (
              <span className="flex items-center gap-1">
                <Users className="size-3" />
                Min spend: ${filter.min_client_spend}
              </span>
            )}
            {filter.max_proposals != null && (
              <span className="flex items-center gap-1">
                Max {filter.max_proposals} proposals
              </span>
            )}
          </div>
        </CardContent>

        <CardFooter className="pt-0">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
            <span>
              {filter.keywords.length} keyword
              {filter.keywords.length !== 1 ? "s" : ""}
            </span>
            {hasCountries && (
              <>
                <span>·</span>
                <span>
                  {filter.client_countries.length} countr
                  {filter.client_countries.length !== 1 ? "ies" : "y"}
                </span>
              </>
            )}
          </div>
        </CardFooter>
      </Card>


      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Delete Filter</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{filter.name}</strong>?
              This action cannot be undone.
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

      {/* Edit Filter Dialog */}
      <FilterFormDialog
        filter={filter}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={invalidateFilters}
      />
    </>
  );
}

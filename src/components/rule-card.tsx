"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { toast } from "sonner";
import type {
  NotificationRule,
  JobFilter,
  NotificationChannel,
} from "@/lib/supabase/database-types";
import { toggleRule, deleteRule } from "@/actions/rules";
import { RuleFormDialog } from "@/components/rule-form";
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
  BarChart3,
  Bell,
  Filter,
  Loader2,
  MoreHorizontal,
  Pencil,
  Power,
  PowerOff,
  Target,
  Trash2,
  Users,
} from "lucide-react";

interface RuleCardProps {
  rule: NotificationRule;

  /** Pre-resolved channel name to avoid extra query */
  channelName?: string;

  /** Pre-resolved filter name */
  filterName?: string;

  onSuccess?: () => void;
}

export function RuleCard({
  rule,
  channelName,
  filterName,
  onSuccess,
}: RuleCardProps) {
  const [showEditDialog, setShowEditDialog] =
    useState(false);

  const [showDeleteDialog, setShowDeleteDialog] =
    useState(false);

  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function handleToggle() {
    setToggling(true);

    const result = await toggleRule(
      rule.id,
      !rule.is_active
    );

    setToggling(false);

    if (!result.success) {
      toast.error(
        result.error ?? "Failed to toggle rule."
      );
      return;
    }

    toast.success(
      rule.is_active
        ? "Rule paused."
        : "Rule activated."
    );

    onSuccess?.();
  }

  async function handleDelete() {
    setDeleting(true);

    const result = await deleteRule(rule.id);

    setDeleting(false);

    if (!result.success) {
      toast.error(
        result.error ?? "Failed to delete rule."
      );
      return;
    }

    toast.success("Rule deleted.");
    setShowDeleteDialog(false);
    onSuccess?.();
  }

  return (
    <>
      <Card
        className={`group relative h-full gap-0 overflow-hidden rounded-2xl border py-0 transition-all duration-300 ${rule.is_active
            ? "border-[#00C98B]/25 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:-translate-y-1 hover:border-[#00C98B]/50 hover:shadow-[0_18px_42px_rgba(0,201,139,0.1)]"
            : "border-black/10 bg-white opacity-70 shadow-[0_8px_24px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:opacity-100"
          }`}
      >
        {/* Top Accent */}
        <div
          className={`h-1 w-full ${rule.is_active
              ? "bg-[#00C98B]"
              : "bg-black/15"
            }`}
        />

        {/* Card Header */}
        <CardHeader className="p-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors duration-300 ${rule.is_active
                    ? "border-[#00C98B]/20 bg-[#00C98B]/10 text-[#00C98B] group-hover:bg-[#00C98B] group-hover:text-[#0A0A0A]"
                    : "border-black/10 bg-black/5 text-black/35"
                  }`}
              >
                <Bell className="size-[18px]" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="truncate font-heading text-sm font-bold tracking-tight text-[#0A0A0A]">
                    {channelName ?? "Unknown Channel"}
                  </CardTitle>

                  <Badge
                    variant="outline"
                    className={`h-5 rounded-full px-2 text-[9px] font-bold ${rule.is_active
                        ? "border-[#00C98B]/25 bg-[#00C98B]/10 text-[#007A56]"
                        : "border-black/10 bg-black/5 text-black/45"
                      }`}
                  >
                    <span
                      className={`mr-1.5 size-1.5 rounded-full ${rule.is_active
                          ? "bg-[#00C98B]"
                          : "bg-black/30"
                        }`}
                    />

                    {rule.is_active
                      ? "Active"
                      : "Paused"}
                  </Badge>
                </div>

                <CardDescription className="mt-2">
                  {filterName ? (
                    <div className="flex min-w-0 items-center gap-2 text-[11px] text-black/45">
                      <Filter className="size-3 shrink-0 text-[#00C98B]" />

                      <span className="truncate">
                        {filterName}
                      </span>
                    </div>
                  ) : (
                    <Badge
                      variant="outline"
                      className="h-5 rounded-full border-black/10 bg-black/5 px-2 text-[9px] font-medium text-black/45"
                    >
                      <Filter className="mr-1 size-2.5" />
                      All filters
                    </Badge>
                  )}
                </CardDescription>
              </div>
            </div>

            {/* Action Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Open rule actions"
                    className="size-8 shrink-0 rounded-lg text-black/45 opacity-100 hover:bg-[#0A0A0A] hover:text-[#00C98B] sm:opacity-0 sm:group-hover:opacity-100"
                  />
                }
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-44 rounded-xl border-black/10 bg-white p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.14)]"
              >
                <DropdownMenuLabel className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-black/40">
                  Rule actions
                </DropdownMenuLabel>

                <DropdownMenuItem
                  onClick={() =>
                    setShowEditDialog(true)
                  }
                  className="cursor-pointer rounded-lg px-2.5 py-2 text-xs text-[#0A0A0A] focus:bg-[#00C98B]/10 focus:text-[#0A0A0A]"
                >
                  <Pencil className="mr-2 size-3.5 text-[#00C98B]" />
                  Edit rule
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={handleToggle}
                  disabled={toggling}
                  className="cursor-pointer rounded-lg px-2.5 py-2 text-xs text-[#0A0A0A] focus:bg-[#00C98B]/10 focus:text-[#0A0A0A]"
                >
                  {toggling ? (
                    <Loader2 className="mr-2 size-3.5 animate-spin text-[#00C98B]" />
                  ) : rule.is_active ? (
                    <PowerOff className="mr-2 size-3.5 text-[#00C98B]" />
                  ) : (
                    <Power className="mr-2 size-3.5 text-[#00C98B]" />
                  )}

                  {rule.is_active
                    ? "Pause rule"
                    : "Activate rule"}
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1 bg-black/10" />

                <DropdownMenuItem
                  onClick={() =>
                    setShowDeleteDialog(true)
                  }
                  className="cursor-pointer rounded-lg px-2.5 py-2 text-xs text-[#0A0A0A] focus:bg-black/5 focus:text-[#0A0A0A]"
                >
                  <Trash2 className="mr-2 size-3.5 text-black/50" />
                  Delete rule
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        {/* Channel to Filter Mapping */}
        <CardContent className="px-5 pb-4">
          <div className="flex min-w-0 items-center gap-2 rounded-xl border border-black/5 bg-[#F7F8F8] px-3 py-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Bell className="size-3.5 shrink-0 text-[#00C98B]" />

              <span className="truncate text-[11px] font-medium text-black/60">
                {channelName ?? "Unknown Channel"}
              </span>
            </div>

            <span className="shrink-0 text-xs text-black/20">
              →
            </span>

            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
              <Filter className="size-3.5 shrink-0 text-[#00C98B]" />

              <span className="truncate text-[11px] font-medium text-black/60">
                {filterName ?? "All filters"}
              </span>
            </div>
          </div>
        </CardContent>

        {/* Rule Scores */}
        <CardContent className="px-5 pb-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-black/5 bg-white px-2 py-3 text-center shadow-[0_4px_14px_rgba(0,0,0,0.03)]">
              <Target className="mx-auto size-3.5 text-[#00C98B]" />

              <p className="mt-1.5 font-heading text-base font-bold leading-none tracking-tight text-[#0A0A0A]">
                {rule.match_score_min}
              </p>

              <p className="mt-1 text-[9px] leading-tight text-black/40">
                Min match
              </p>
            </div>

            <div className="rounded-xl border border-black/5 bg-white px-2 py-3 text-center shadow-[0_4px_14px_rgba(0,0,0,0.03)]">
              <BarChart3 className="mx-auto size-3.5 text-[#00C98B]" />

              <p className="mt-1.5 font-heading text-base font-bold leading-none tracking-tight text-[#0A0A0A]">
                {rule.opportunity_score_min}
              </p>

              <p className="mt-1 text-[9px] leading-tight text-black/40">
                Opportunity
              </p>
            </div>

            <div className="rounded-xl border border-black/5 bg-white px-2 py-3 text-center shadow-[0_4px_14px_rgba(0,0,0,0.03)]">
              <Users className="mx-auto size-3.5 text-[#00C98B]" />

              <p className="mt-1.5 font-heading text-base font-bold leading-none tracking-tight text-[#0A0A0A]">
                {rule.max_proposals}
              </p>

              <p className="mt-1 text-[9px] leading-tight text-black/40">
                Max proposals
              </p>
            </div>
          </div>
        </CardContent>

        {/* Card Footer */}
        <CardFooter className="mt-auto flex items-center justify-between gap-3 border-t border-black/5 px-5 py-3">
          <span className="text-[10px] text-black/40">
            Created{" "}
            {new Date(
              rule.created_at
            ).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            disabled={toggling}
            className="h-7 rounded-lg px-2.5 text-[10px] font-semibold text-[#0A0A0A] hover:bg-[#00C98B]/10 hover:text-[#007A56]"
          >
            {toggling ? (
              <Loader2 className="size-3 animate-spin" />
            ) : rule.is_active ? (
              <PowerOff className="size-3" />
            ) : (
              <Power className="size-3" />
            )}

            {rule.is_active ? "Pause" : "Activate"}
          </Button>
        </CardFooter>
      </Card>

      {/* Edit Dialog */}
      <RuleFormDialog
        rule={rule}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={onSuccess}
      />

      {/* Delete Confirmation */}
      <Dialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      >
        <DialogContent className="w-[calc(100%-1.25rem)] overflow-hidden rounded-2xl border-black/10 bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:max-w-md [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:text-white/60 [&_[data-slot=dialog-close]]:hover:bg-white/10 [&_[data-slot=dialog-close]]:hover:text-white">
          <div className="relative overflow-hidden bg-[#0A0A0A] px-5 pb-5 pt-6 pr-14 sm:px-6 sm:pr-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-12 -top-14 size-36 rounded-full bg-[#00C98B]/15 blur-3xl"
            />

            <DialogHeader className="relative text-left">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#00C98B]/25 bg-[#00C98B]/10 text-[#00C98B]">
                  <Trash2 className="size-4" />
                </div>

                <div>
                  <DialogTitle className="font-heading text-lg font-bold text-white">
                    Delete this rule?
                  </DialogTitle>

                  <DialogDescription className="mt-1.5 text-xs leading-relaxed text-white/50">
                    This action permanently removes the
                    notification rule and cannot be undone.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="flex items-center justify-end gap-2 bg-white px-5 py-4 sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setShowDeleteDialog(false)
              }
              disabled={deleting}
              className="h-9 w-24 rounded-lg border-black/15 bg-white px-3 text-xs font-semibold text-[#0A0A0A] shadow-none hover:bg-black/5"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="h-9 min-w-32 rounded-lg bg-[#0A0A0A] px-4 text-xs font-semibold text-white hover:bg-[#00C98B] hover:text-[#0A0A0A]"
            >
              {deleting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5" />
                  Delete rule
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
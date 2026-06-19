"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { toast } from "sonner";
import type { NotificationRule, JobFilter, NotificationChannel } from "@/lib/supabase/database-types";
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
  Loader2,
  Bell,
  Filter,
  Target,
  BarChart3,
  Users,
} from "lucide-react";

interface RuleCardProps {
  rule: NotificationRule;
  /** Pre-resolved channel name to avoid extra query */
  channelName?: string;
  /** Pre-resolved filter name */
  filterName?: string;
}

export function RuleCard({
  rule,
  channelName,
  filterName,
}: RuleCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function handleToggle() {
    setToggling(true);
    const result = await toggleRule(rule.id, !rule.is_active);
    setToggling(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to toggle rule.");
      return;
    }

    toast.success(rule.is_active ? "Rule paused." : "Rule activated.");
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteRule(rule.id);
    setDeleting(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to delete rule.");
      return;
    }

    toast.success("Rule deleted.");
    setShowDeleteDialog(false);
  }

  return (
    <>
      <Card
        className={`group relative overflow-hidden border-border/60 bg-card transition-all duration-300 hover:shadow-lg hover:border-border/100 hover:-translate-y-0.5 ${
          !rule.is_active ? "opacity-60" : ""
        }`}
      >
        {/* Accent bar */}
        <div
          className={`absolute top-0 left-0 h-1 w-full transition-colors duration-300 ${
            rule.is_active
              ? "bg-gradient-to-r from-accent-purple via-accent-purple/80 to-accent-purple/60"
              : "bg-muted-foreground/20"
          }`}
        />

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-heading font-semibold tracking-tight">
                  {channelName ?? "Unknown Channel"}
                </CardTitle>
                {filterName && (
                  <>
                    <span className="text-muted-foreground/30">→</span>
                    <span className="text-sm text-muted-foreground">
                      {filterName}
                    </span>
                  </>
                )}
                {!filterName && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-5 font-medium border-accent-amber/30 text-accent-amber bg-accent-amber/5"
                  >
                    All filters
                  </Badge>
                )}
                <Badge
                  variant={rule.is_active ? "default" : "secondary"}
                  className="text-[10px] px-2 py-0 h-5 font-medium"
                >
                  {rule.is_active ? "Active" : "Paused"}
                </Badge>
              </div>
              <CardDescription className="text-xs flex items-center gap-2">
                <Bell className="size-3" />
                <span>{channelName ?? "—"}</span>
                {filterName && (
                  <>
                    <Filter className="size-3" />
                    <span>{filterName}</span>
                  </>
                )}
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
                  <Pencil className="size-3.5 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleToggle}
                  disabled={toggling}
                  className="cursor-pointer"
                >
                  {toggling ? (
                    <Loader2 className="size-3.5 mr-2 animate-spin" />
                  ) : rule.is_active ? (
                    <PowerOff className="size-3.5 mr-2" />
                  ) : (
                    <Power className="size-3.5 mr-2" />
                  )}
                  {rule.is_active ? "Pause" : "Activate"}
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
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted/30 p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 text-accent-blue mb-1">
                <Target className="size-3.5" />
              </div>
              <p className="text-lg font-bold font-heading tracking-tight">
                {rule.match_score_min}
              </p>
              <p className="text-[10px] text-muted-foreground/70">
                Min match
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 text-accent-amber mb-1">
                <BarChart3 className="size-3.5" />
              </div>
              <p className="text-lg font-bold font-heading tracking-tight">
                {rule.opportunity_score_min}
              </p>
              <p className="text-[10px] text-muted-foreground/70">
                Min opportunity
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 text-accent-green mb-1">
                <Users className="size-3.5" />
              </div>
              <p className="text-lg font-bold font-heading tracking-tight">
                {rule.max_proposals}
              </p>
              <p className="text-[10px] text-muted-foreground/70">
                Max proposals
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-0">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
            <span>
              Created{" "}
              {new Date(rule.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </CardFooter>
      </Card>

      {/* Edit Dialog */}
      <RuleFormDialog
        rule={rule}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />

      {/* Delete Confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Delete Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this rule? This action cannot be
              undone.
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
    </>
  );
}

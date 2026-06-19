"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import type { JobFilter } from "@/lib/supabase/database-types";
import { FilterFormDialog } from "@/components/filter-form";
import { FilterCard } from "@/components/filter-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Filter,
  Plus,
  RefreshCw,
  AlertCircle,
  Inbox,
} from "lucide-react";

async function fetchFilters(userId: string): Promise<JobFilter[]> {
  const { data, error } = await supabase
    .from("job_filters")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export default function FiltersPage() {
  const { user } = useUser();
  const queryClient = useQueryClient();

  const {
    data: filters,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["job_filters", user?.id],
    queryFn: () => fetchFilters(user!.id),
    enabled: !!user?.id,
  });

  // Separate active/paused filters
  const activeFilters =
    filters?.filter((f) => f.is_active) ?? [];
  const pausedFilters =
    filters?.filter((f) => !f.is_active) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">
            Job Filters
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your job search filters to find relevant
            opportunities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="shrink-0"
          >
            <RefreshCw
              className={`size-4 ${isRefetching ? "animate-spin" : ""}`}
            />
          </Button>
          <FilterFormDialog />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="overflow-hidden border-border/60">
              <div className="h-1 bg-muted" />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="size-8 rounded-md" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-5 w-16 rounded-full" />
                  ))}
                </div>
                <Skeleton className="h-3 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-destructive/10 p-2">
                <AlertCircle className="size-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-base font-heading">
                  Failed to load filters
                </CardTitle>
                <CardDescription>
                  {error?.message ?? "An unexpected error occurred."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => refetch()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filters?.length === 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-accent-blue/10 p-3">
                <Filter className="size-6 text-accent-blue" />
              </div>
              <div>
                <CardTitle className="text-lg font-heading">
                  No filters yet
                </CardTitle>
                <CardDescription>
                  Create your first filter to start monitoring Upwork for
                  relevant jobs.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pb-8">
            <div className="max-w-sm text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Filters scan Upwork jobs based on your criteria and score them
                for match quality and opportunity.
              </p>
              <ul className="text-xs text-muted-foreground/70 space-y-1 text-left">
                <li className="flex items-start gap-2">
                  <span className="text-accent-blue mt-0.5">•</span>
                  Add keywords like &quot;react&quot;, &quot;typescript&quot;
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-blue mt-0.5">•</span>
                  Set budget range and client preferences
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-blue mt-0.5">•</span>
                  Get scored job alerts via your notification channels
                </li>
              </ul>
            </div>
            <FilterFormDialog
              trigger={
                <Button size="lg" className="mt-2">
                  <Plus className="size-4 mr-2" />
                  Create Your First Filter
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Filters Grid */}
      {!isLoading && !isError && filters && filters.length > 0 && (
        <div className="space-y-8">
          {/* Active Filters */}
          {activeFilters.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-accent-green animate-pulse" />
                <h2 className="text-sm font-medium text-muted-foreground font-heading tracking-wide uppercase">
                  Active Filters
                </h2>
                <span className="text-xs text-muted-foreground/60 bg-muted/50 px-2 py-0.5 rounded-full">
                  {activeFilters.length}
                </span>
              </div>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {activeFilters.map((filter) => (
                  <FilterCard key={filter.id} filter={filter} />
                ))}
              </div>
            </section>
          )}

          {/* Paused Filters */}
          {pausedFilters.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-muted-foreground/30" />
                <h2 className="text-sm font-medium text-muted-foreground font-heading tracking-wide uppercase">
                  Paused Filters
                </h2>
                <span className="text-xs text-muted-foreground/60 bg-muted/50 px-2 py-0.5 rounded-full">
                  {pausedFilters.length}
                </span>
              </div>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {pausedFilters.map((filter) => (
                  <FilterCard key={filter.id} filter={filter} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { SubscriptionGate } from "@/components/subscription-gate";
import type { JobFilter } from "@/lib/supabase/database-types";
import { FilterFormDialog } from "@/components/filter-form";
import { FilterCard } from "@/components/filter-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Filter,
  Inbox,
  Plus,
  RefreshCw,
} from "lucide-react";

async function fetchFilters(
  userId: string
): Promise<JobFilter[]> {
  const { data, error } = await supabase
    .from("job_filters")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

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

  const activeFilters =
    filters?.filter(
      (filter) => filter.is_active
    ) ?? [];

  const pausedFilters =
    filters?.filter(
      (filter) => !filter.is_active
    ) ?? [];

  return (
    <SubscriptionGate feature="Job Filters">
    <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-4 overflow-x-clip pb-6 sm:space-y-5 sm:pb-8 xl:space-y-6">
      {/* Header */}
      <section className="animate-in fade-in slide-in-from-bottom-2 relative overflow-hidden rounded-2xl border border-[#0A0A0A]/10 bg-white p-4 shadow-[0_8px_28px_rgba(0,0,0,0.04)] duration-500 min-[480px]:p-5 sm:rounded-[22px] md:p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 size-48 rounded-full bg-[#00C98B]/10 blur-[80px] sm:size-52"
        />

        <div className="relative z-10 flex min-w-0 flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-3 min-[480px]:gap-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#00C98B]/20 bg-[#00C98B]/10 text-[#00A975] min-[480px]:size-12 min-[480px]:rounded-2xl">
              <Filter className="size-4 min-[480px]:size-5" />
            </span>

            <div className="min-w-0">
              <h1 className="font-heading text-xl font-bold tracking-tight text-[#0A0A0A] min-[480px]:text-2xl sm:text-3xl">
                Job Filters
              </h1>

              <p className="mt-1 max-w-2xl text-xs leading-5 text-[#0A0A0A]/50 min-[480px]:text-sm min-[480px]:leading-6">
                Create and manage your job search
                filters to find relevant opportunities.
              </p>
            </div>
          </div>

          <div className="flex w-full min-w-0 items-center gap-2 md:w-auto md:shrink-0">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Refresh filters"
              title="Refresh filters"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="size-10 shrink-0 rounded-xl border-[#0A0A0A]/10 bg-white text-[#0A0A0A]/55 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C98B]/40 hover:bg-[#00C98B]/5 hover:text-[#00A975]"
            >
              <RefreshCw
                className={`size-4 ${
                  isRefetching
                    ? "animate-spin"
                    : ""
                }`}
              />
            </Button>

            <FilterFormDialog
              onSuccess={() =>
                queryClient.invalidateQueries({
                  queryKey: ["job_filters", user?.id],
                })
              }
              trigger={
                <Button className="group h-10 min-w-0 flex-1 rounded-xl bg-[#0A0A0A] px-4 text-xs font-semibold text-white shadow-[0_8px_22px_rgba(0,0,0,0.13)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#00C98B] hover:text-[#0A0A0A] md:flex-none sm:text-sm">
                  <Plus className="size-4 shrink-0 transition-transform duration-300 group-hover:rotate-90" />

                  <span className="truncate">
                    Create filter
                  </span>
                </Button>
              }
            />
          </div>
        </div>
      </section>

      {/* Loading State */}
      {isLoading && (
        <div className="grid min-w-0 grid-cols-1 gap-3 min-[680px]:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {Array.from({
            length: 3,
          }).map((_, index) => (
            <Card
              key={index}
              className="min-w-0 gap-0 overflow-hidden rounded-xl border border-[#0A0A0A]/10 bg-white py-0 shadow-[0_6px_22px_rgba(0,0,0,0.035)] sm:rounded-2xl"
            >
              <div className="h-[2px] bg-[#00C98B]/30" />

              <CardHeader className="px-4 pb-3 pt-4 min-[480px]:px-5 min-[480px]:pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2.5">
                    <Skeleton className="h-5 w-32 max-w-full bg-[#0A0A0A]/10" />
                    <Skeleton className="h-3 w-24 max-w-full bg-[#0A0A0A]/5" />
                  </div>

                  <Skeleton className="size-8 shrink-0 rounded-lg bg-[#00C98B]/10 min-[480px]:size-9 min-[480px]:rounded-xl" />
                </div>
              </CardHeader>

              <CardContent className="px-4 pb-4 pt-0 min-[480px]:px-5 min-[480px]:pb-5">
                <div className="mb-4 flex flex-wrap gap-1.5 min-[480px]:gap-2">
                  {Array.from({
                    length: 4,
                  }).map(
                    (_, itemIndex) => (
                      <Skeleton
                        key={itemIndex}
                        className="h-5 w-14 rounded-full bg-[#00C98B]/10 min-[480px]:w-16"
                      />
                    )
                  )}
                </div>

                <Skeleton className="h-3 w-48 max-w-full bg-[#0A0A0A]/5" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <Card className="animate-in fade-in slide-in-from-bottom-2 min-w-0 gap-0 overflow-hidden rounded-2xl border border-[#0A0A0A]/10 bg-white py-0 shadow-[0_10px_30px_rgba(0,0,0,0.05)] duration-500 sm:rounded-[22px]">
          <div className="h-[3px] bg-[#0A0A0A]" />

          <CardHeader className="px-4 pb-3 pt-4 min-[480px]:px-5 min-[480px]:pt-5 sm:px-6">
            <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-start">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#00C98B]/10 text-[#00A975] min-[480px]:size-11 min-[480px]:rounded-2xl">
                <AlertCircle className="size-5" />
              </span>

              <div className="min-w-0">
                <CardTitle className="font-heading text-sm font-bold text-[#0A0A0A] min-[480px]:text-base">
                  Failed to load filters
                </CardTitle>

                <CardDescription className="mt-1 break-words text-xs leading-relaxed text-[#0A0A0A]/50 min-[480px]:text-sm">
                  {error?.message ??
                    "An unexpected error occurred."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-4 pb-4 pt-1 min-[480px]:px-5 min-[480px]:pb-5 sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-9 w-full rounded-xl border-[#0A0A0A]/10 bg-white px-4 text-xs font-semibold text-[#0A0A0A] transition-all duration-300 hover:border-[#00C98B]/40 hover:bg-[#00C98B]/5 hover:text-[#00A975] min-[420px]:w-auto"
            >
              <RefreshCw
                className={`size-3.5 ${
                  isRefetching
                    ? "animate-spin"
                    : ""
                }`}
              />

              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading &&
        !isError &&
        filters?.length === 0 && (
          <Card className="animate-in fade-in slide-in-from-bottom-3 relative min-w-0 gap-0 overflow-hidden rounded-2xl border border-[#0A0A0A]/10 bg-[#EFF1F3] py-0 text-[#0A0A0A] shadow-[0_14px_38px_rgba(0,0,0,0.07)] duration-500 sm:rounded-[24px] dark:border-white/10 dark:bg-[#0A0A0A] dark:text-white dark:shadow-[0_18px_50px_rgba(0,0,0,0.15)]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 hidden opacity-35 sm:block"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(0,201,139,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,139,0.07) 1px, transparent 1px)",

                backgroundSize: "44px 44px",

                maskImage:
                  "radial-gradient(circle at center, black, transparent 75%)",

                WebkitMaskImage:
                  "radial-gradient(circle at center, black, transparent 75%)",
              }}
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-[#00C98B]/15 blur-[100px] sm:size-[280px]"
            />

            <CardContent className="relative z-10 flex flex-col items-center px-4 py-8 text-center min-[480px]:px-5 min-[480px]:py-10 sm:px-7 sm:py-11 lg:px-8 lg:py-12">
              <div className="relative mb-4 min-[480px]:mb-5">
                <span className="absolute inset-0 scale-150 rounded-full bg-[#00C98B]/15 blur-xl" />

                <span className="relative grid size-14 place-items-center rounded-2xl border border-[#00C98B]/30 bg-[#00C98B]/10 text-[#00C98B] shadow-[0_15px_35px_rgba(0,201,139,0.1)] min-[480px]:size-16 min-[480px]:rounded-[20px]">
                  <Inbox className="size-6 min-[480px]:size-7" />
                </span>

                <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-lg border-2 border-[#0A0A0A] bg-[#00C98B] text-[#0A0A0A] min-[480px]:size-7">
                  <Filter className="size-3 min-[480px]:size-3.5" />
                </span>
              </div>

              <CardTitle className="font-heading text-xl font-bold text-[#0A0A0A] min-[480px]:text-2xl dark:text-white">
                No filters yet
              </CardTitle>

              <CardDescription className="mt-2 max-w-lg text-xs leading-5 text-[#0A0A0A]/55 min-[480px]:text-sm min-[480px]:leading-6 dark:text-white/50">
                Create your first filter to start
                monitoring Upwork for relevant jobs.
              </CardDescription>

              <div className="mt-5 grid w-full max-w-3xl grid-cols-1 gap-2.5 text-left min-[520px]:grid-cols-2 sm:mt-6 sm:gap-3 lg:grid-cols-3">
                {[
                  'Add keywords like "react" or "typescript"',
                  "Set budget range and client preferences",
                  "Receive scored alerts through your channels",
                ].map((item, index) => (
                  <div
                    key={item}
                    className={`group flex min-w-0 items-start gap-3 rounded-xl border border-[#0A0A0A]/10 bg-white/70 p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C98B]/30 hover:bg-[#00C98B]/10 sm:rounded-2xl sm:p-4 dark:border-white/10 dark:bg-white/5 ${
                      index === 2
                        ? "min-[520px]:col-span-2 lg:col-span-1"
                        : ""
                    }`}
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#00C98B]/10 text-[10px] font-bold text-[#00C98B]">
                      {index + 1}
                    </span>

                    <p className="min-w-0 text-[11px] leading-5 text-[#0A0A0A]/60 sm:text-xs dark:text-white/55">
                      {item}
                    </p>
                  </div>
                ))}
              </div>

              <FilterFormDialog
                onSuccess={() =>
                  queryClient.invalidateQueries({
                    queryKey: ["job_filters", user?.id],
                  })
                }
                trigger={
                  <Button
                    size="lg"
                    className="group mt-6 h-10 w-full rounded-xl bg-[#00C98B] px-5 text-xs font-bold text-[#0A0A0A] shadow-[0_12px_30px_rgba(0,201,139,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#00C98B]/90 hover:shadow-[0_16px_36px_rgba(0,201,139,0.24)] min-[420px]:w-auto min-[420px]:rounded-full min-[480px]:mt-7 min-[480px]:h-11 min-[480px]:px-6 min-[480px]:text-sm"
                  >
                    <Plus className="size-4 shrink-0 transition-transform duration-300 group-hover:rotate-90" />

                    <span className="truncate">
                      Create your first filter
                    </span>
                  </Button>
                }
              />
            </CardContent>
          </Card>
        )}

      {/* Filters Grid */}
      {!isLoading &&
        !isError &&
        filters &&
        filters.length > 0 && (
          <div className="min-w-0 space-y-7 sm:space-y-8">
            {/* Active Filters */}
            {activeFilters.length > 0 && (
              <section className="animate-in fade-in slide-in-from-bottom-2 min-w-0 space-y-3 duration-500 sm:space-y-4">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="relative flex size-2.5 shrink-0">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#00C98B] opacity-30" />

                    <span className="relative inline-flex size-2.5 rounded-full bg-[#00C98B]" />
                  </span>

                  <h2 className="shrink-0 font-heading text-[10px] font-bold uppercase tracking-[0.13em] text-[#0A0A0A]/60 min-[480px]:text-xs min-[480px]:tracking-[0.15em]">
                    Active filters
                  </h2>

                  <span className="shrink-0 rounded-full border border-[#00C98B]/20 bg-[#00C98B]/10 px-2 py-0.5 text-[9px] font-bold text-[#00A975] min-[480px]:text-[10px]">
                    {activeFilters.length}
                  </span>

                  <span className="h-px min-w-0 flex-1 bg-[#0A0A0A]/10" />
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-3 min-[680px]:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                  {activeFilters.map(
                    (filter) => (
                      <div
                        key={filter.id}
                        className="min-w-0"
                      >
                        <FilterCard
                          filter={filter}
                        />
                      </div>
                    )
                  )}
                </div>
              </section>
            )}

            {/* Paused Filters */}
            {pausedFilters.length > 0 && (
              <section className="animate-in fade-in slide-in-from-bottom-2 min-w-0 space-y-3 duration-500 sm:space-y-4">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full border-2 border-[#0A0A0A]/20" />

                  <h2 className="shrink-0 font-heading text-[10px] font-bold uppercase tracking-[0.13em] text-[#0A0A0A]/45 min-[480px]:text-xs min-[480px]:tracking-[0.15em]">
                    Paused filters
                  </h2>

                  <span className="shrink-0 rounded-full border border-[#0A0A0A]/10 bg-[#0A0A0A]/5 px-2 py-0.5 text-[9px] font-bold text-[#0A0A0A]/45 min-[480px]:text-[10px]">
                    {pausedFilters.length}
                  </span>

                  <span className="h-px min-w-0 flex-1 bg-[#0A0A0A]/10" />
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-3 min-[680px]:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                  {pausedFilters.map(
                    (filter) => (
                      <div
                        key={filter.id}
                        className="min-w-0"
                      >
                        <FilterCard
                          filter={filter}
                        />
                      </div>
                    )
                  )}
                </div>
              </section>
            )}
          </div>
        )}
    </div>
    </SubscriptionGate>
  );
}
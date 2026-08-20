"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  Clock3,
  FolderTree,
  Globe,
  Users,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { SubscriptionGate } from "@/components/subscription-gate";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { OverviewTab } from "@/components/market-trends/overview-tab";
import { SkillsTab } from "@/components/market-trends/skills-tab";
import { BudgetsTab } from "@/components/market-trends/budgets-tab";
import { TimingTab } from "@/components/market-trends/timing-tab";
import { SubcategoriesTab } from "@/components/market-trends/subcategories-tab";
import { GeographyTab } from "@/components/market-trends/geography-tab";
import { ClientsTab } from "@/components/market-trends/clients-tab";
import { ChartSkeleton } from "@/components/market-trends/shared";
import {
  RANGES,
  type MarketRange,
  type MarketTrends,
} from "@/lib/market-trends";

const TABS = [
  {
    value: "overview",
    label: "Market Overview",
    icon: LayoutDashboard,
  },
  {
    value: "skills",
    label: "Skill Demand",
    icon: TrendingUp,
  },
  {
    value: "budgets",
    label: "Budget Intelligence",
    icon: Wallet,
  },
  {
    value: "timing",
    label: "Posting Timing",
    icon: Clock3,
  },
  {
    value: "subcategories",
    label: "Subcategories",
    icon: FolderTree,
  },
  {
    value: "geography",
    label: "Geography",
    icon: Globe,
  },
  {
    value: "clients",
    label: "Client Quality",
    icon: Users,
  },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export default function MarketTrendsPage() {
  const [days, setDays] = useState<MarketRange>(30);
  const [activeTab, setActiveTab] =
    useState<TabValue>("overview");
  const [data, setData] =
    useState<MarketTrends | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] =
    useState<string | null>(null);
  const [refreshing, setRefreshing] =
    useState(false);

  const abortRef =
    useRef<AbortController | null>(null);

  const load = useCallback(
    async (
      range: MarketRange,
      signal?: AbortSignal
    ) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/market-trends?days=${range}`,
          { signal }
        );

        if (!response.ok) {
          const body = await response
            .json()
            .catch(() => null);

          throw new Error(
            body?.error ??
            `Request failed (${response.status})`
          );
        }

        const json = await response.json();

        if (json?.error) {
          throw new Error(json.error);
        }

        setData(json as MarketTrends);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setError(
          (error as Error).message ||
          "Failed to load market trends"
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    abortRef.current?.abort();

    const controller = new AbortController();

    abortRef.current = controller;

    load(days, controller.signal);

    return () => controller.abort();
  }, [days, load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load(days);
  };

  return (
    <SubscriptionGate feature="Market Trends">
    <div
      className="market-theme space-y-5 pb-6"
      style={
        {
          "--color-accent-blue": "#00C98B",
          "--color-accent-purple": "#00C98B",
          "--color-accent-green": "#00C98B",
          "--color-accent-amber": "#00C98B",
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <section className="animate-in fade-in slide-in-from-bottom-2 relative overflow-hidden rounded-[22px] border border-white/10 bg-[#0A0A0A] px-5 py-5 text-white shadow-[0_16px_40px_rgba(0,0,0,0.13)] duration-500 sm:px-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,201,139,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,139,0.07) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "linear-gradient(to right, transparent, black)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black)",
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 size-60 rounded-full bg-[#00C98B]/15 blur-[100px]"
        />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl border border-[#00C98B]/30 bg-[#00C98B]/10 text-[#00C98B]">
              <BarChart3 className="size-5" />

              <span className="absolute -right-1 -top-1 size-2.5 rounded-full border-2 border-[#0A0A0A] bg-[#00C98B]" />
            </span>

            <div>
              {/* <div className="mb-1 flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-[#00C98B] shadow-[0_0_8px_rgba(0,201,139,0.8)]" />

                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#00C98B]">
                  Live market intelligence
                </span>
              </div> */}

              <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                Market Trends
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-white/50">
                Live demand signals from the jobs we track —
                skills, budgets, timing and client quality, so
                you can position your proposals where the
                market is hottest.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/[0.045] text-white/55 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C98B]/40 hover:bg-[#00C98B]/10 hover:text-[#00C98B] disabled:pointer-events-none disabled:opacity-40"
              aria-label="Refresh data"
            >
              <RefreshCw
                className={cn(
                  "size-4",
                  refreshing && "animate-spin"
                )}
              />
            </button>

            <ToggleGroup
              value={[String(days)]}
              onValueChange={(value) => {
                const next = Number(value[0]);

                if ([7, 30].includes(next)) {
                  setDays(next as MarketRange);
                }
              }}
              size="sm"
              className="rounded-xl border border-white/10 bg-white/[0.045] p-1"
            >
              {RANGES.map((range) => (
                <ToggleGroupItem
                  key={range.value}
                  value={String(range.value)}
                  className="h-8 rounded-lg border-0 px-3 text-xs font-semibold text-white/45 transition-all duration-200 hover:bg-[#00C98B]/10 hover:text-[#00C98B] data-[state=on]:bg-[#00C98B] data-[state=on]:text-[#0A0A0A] data-[pressed]:bg-[#00C98B] data-[pressed]:text-[#0A0A0A]"
                >
                  {range.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-0"
      >
        <div className="rounded-[18px] border border-[#0A0A0A]/10 bg-white p-1.5 shadow-[0_6px_22px_rgba(0,0,0,0.035)]">
          <TabsList className="h-auto w-full max-w-full justify-start gap-1 overflow-x-auto rounded-xl bg-transparent p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="group/tab h-10 min-w-fit flex-none whitespace-nowrap rounded-xl border border-transparent px-3 text-[12px] font-semibold text-[#0A0A0A]/45 shadow-none transition-all duration-250 hover:bg-[#00C98B]/7 hover:text-[#00A975] sm:flex-1 data-[state=active]:border-[#0A0A0A] data-[state=active]:bg-[#0A0A0A] data-[state=active]:text-[#00C98B] data-[state=active]:shadow-[0_8px_20px_rgba(0,0,0,0.13)] data-[selected]:border-[#0A0A0A] data-[selected]:bg-[#0A0A0A] data-[selected]:text-[#00C98B]"
              >
                <tab.icon className="size-4 shrink-0 transition-transform duration-250 group-hover/tab:scale-105" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {error ? (
          <TabsContent
            value={activeTab}
            className="mt-0 pt-4"
          >
            <section className="animate-in fade-in slide-in-from-bottom-2 overflow-hidden rounded-[22px] border border-[#0A0A0A]/12 bg-white shadow-[0_8px_28px_rgba(0,0,0,0.045)] duration-500">
              <div className="h-[3px] bg-[#0A0A0A]" />

              <div className="flex flex-col items-center px-5 py-12 text-center">
                <span className="grid size-14 place-items-center rounded-[18px] bg-[#00C98B]/10 text-[#00A975]">
                  <TrendingUp className="size-6" />
                </span>

                <h3 className="mt-4 font-heading text-lg font-bold text-[#0A0A0A]">
                  Could not load market trends
                </h3>

                <p className="mt-2 max-w-xl text-xs leading-6 text-[#0A0A0A]/50">
                  {error}. This page depends on the{" "}
                  <code className="rounded-md border border-[#00C98B]/15 bg-[#00C98B]/8 px-1.5 py-0.5 font-semibold text-[#008F64]">
                    get_market_trends
                  </code>{" "}
                  database function. Make sure migration{" "}
                  <code className="rounded-md border border-[#00C98B]/15 bg-[#00C98B]/8 px-1.5 py-0.5 font-semibold text-[#008F64]">
                    00018_market_trends_rpc.sql
                  </code>{" "}
                  has been applied in the Supabase SQL
                  editor, then refresh.
                </p>

                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="mt-5 inline-flex h-9 items-center gap-2 rounded-xl border border-[#0A0A0A]/10 bg-white px-4 text-sm font-semibold text-[#0A0A0A] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C98B]/40 hover:bg-[#00C98B]/5 hover:text-[#00A975] disabled:opacity-50"
                >
                  <RefreshCw
                    className={cn(
                      "size-4",
                      refreshing && "animate-spin"
                    )}
                  />

                  Try again
                </button>
              </div>
            </section>
          </TabsContent>
        ) : loading ? (
          <TabsContent
            value={activeTab}
            className="mt-0 pt-4"
          >
            <div className="overflow-hidden rounded-[22px] border border-[#0A0A0A]/10 bg-white p-4 shadow-[0_7px_24px_rgba(0,0,0,0.035)] sm:p-5">
              <ChartSkeleton />
            </div>
          </TabsContent>
        ) : data ? (
          <>
            <TabsContent
              value="overview"
              className="mt-0 pt-4"
            >
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <OverviewTab data={data} />
              </div>
            </TabsContent>

            <TabsContent
              value="skills"
              className="mt-0 pt-4"
            >
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <SkillsTab data={data} />
              </div>
            </TabsContent>

            <TabsContent
              value="budgets"
              className="mt-0 pt-4"
            >
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <BudgetsTab data={data} />
              </div>
            </TabsContent>

            <TabsContent
              value="timing"
              className="mt-0 pt-4"
            >
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <TimingTab data={data} />
              </div>
            </TabsContent>

            <TabsContent
              value="subcategories"
              className="mt-0 pt-4"
            >
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <SubcategoriesTab data={data} />
              </div>
            </TabsContent>

            <TabsContent
              value="geography"
              className="mt-0 pt-4"
            >
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <GeographyTab data={data} />
              </div>
            </TabsContent>

            <TabsContent
              value="clients"
              className="mt-0 pt-4"
            >
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <ClientsTab data={data} />
              </div>
            </TabsContent>
          </>
        ) : null}
      </Tabs>
    </div>
    </SubscriptionGate>
  );
}
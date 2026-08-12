"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { OverviewTab } from "@/components/market-trends/overview-tab";
import { SkillsTab } from "@/components/market-trends/skills-tab";
import { BudgetsTab } from "@/components/market-trends/budgets-tab";
import { TimingTab } from "@/components/market-trends/timing-tab";
import { SubcategoriesTab } from "@/components/market-trends/subcategories-tab";
import { GeographyTab } from "@/components/market-trends/geography-tab";
import { ClientsTab } from "@/components/market-trends/clients-tab";
import { ChartSkeleton } from "@/components/market-trends/shared";
import { RANGES, type MarketRange, type MarketTrends } from "@/lib/market-trends";

const TABS = [
  { value: "overview", label: "Market Overview", icon: LayoutDashboard },
  { value: "skills", label: "Skill Demand", icon: TrendingUp },
  { value: "budgets", label: "Budget Intelligence", icon: Wallet },
  { value: "timing", label: "Posting Timing", icon: Clock3 },
  { value: "subcategories", label: "Subcategories", icon: FolderTree },
  { value: "geography", label: "Geography", icon: Globe },
  { value: "clients", label: "Client Quality", icon: Users },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export default function MarketTrendsPage() {
  const [days, setDays] = useState<MarketRange>(30);
  const [activeTab, setActiveTab] = useState<TabValue>("overview");
  const [data, setData] = useState<MarketTrends | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (range: MarketRange, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/market-trends?days=${range}`, { signal });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      const json = await res.json();
      if (json?.error) throw new Error(json.error);
      setData(json as MarketTrends);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message || "Failed to load market trends");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6">
        <div className="absolute -top-20 -right-20 size-56 rounded-full bg-accent-blue/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 size-48 rounded-full bg-accent-purple/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-accent-blue/10 p-3">
              <BarChart3 className="size-6 text-accent-blue" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                Market Trends
              </h1>
              <p className="mt-1 max-w-lg text-sm text-muted-foreground">
                Live demand signals from the jobs we track — skills, budgets, timing and client
                quality, so you can position your proposals where the market is hottest.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              aria-label="Refresh data"
            >
              <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
            </button>
            <ToggleGroup
              value={[String(days)]}
              onValueChange={(v) => {
                const next = Number(v[0]);
                if ([7, 30].includes(next)) setDays(next as MarketRange);
              }}
              size="sm"
            >
              {RANGES.map((r) => (
                <ToggleGroupItem
                  key={r.value}
                  value={String(r.value)}
                  className="px-3"
                >
                  {r.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto w-full max-w-full justify-start overflow-x-auto bg-muted/70 p-1">
          {TABS.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="flex-1 whitespace-nowrap px-3 text-[13px]"
            >
              <t.icon className="size-4" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {error ? (
          <TabsContent value={activeTab} className="pt-4">
            <div className="flex flex-col items-center justify-center rounded-xl border border-red-500/30 bg-red-500/5 py-14 text-center">
              <div className="rounded-2xl bg-red-500/10 p-3">
                <TrendingUp className="size-6 text-red-400" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">Could not load market trends</h3>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                {error}. This page depends on the <code className="rounded bg-muted px-1 py-0.5">get_market_trends</code>{" "}
                database function — make sure migration{" "}
                <code className="rounded bg-muted px-1 py-0.5">00018_market_trends_rpc.sql</code> has been applied
                in the Supabase SQL editor, then refresh.
              </p>
            </div>
          </TabsContent>
        ) : loading ? (
          <TabsContent value={activeTab} className="pt-4">
            <ChartSkeleton />
          </TabsContent>
        ) : data ? (
          <>
            <TabsContent value="overview" className="pt-4">
              <OverviewTab data={data} />
            </TabsContent>
            <TabsContent value="skills" className="pt-4">
              <SkillsTab data={data} />
            </TabsContent>
            <TabsContent value="budgets" className="pt-4">
              <BudgetsTab data={data} />
            </TabsContent>
            <TabsContent value="timing" className="pt-4">
              <TimingTab data={data} />
            </TabsContent>
            <TabsContent value="subcategories" className="pt-4">
              <SubcategoriesTab data={data} />
            </TabsContent>
            <TabsContent value="geography" className="pt-4">
              <GeographyTab data={data} />
            </TabsContent>
            <TabsContent value="clients" className="pt-4">
              <ClientsTab data={data} />
            </TabsContent>
          </>
        ) : null}
      </Tabs>
    </div>
  );
}

"use client";

import { FolderTree, Layers } from "lucide-react";
import { SectionCard, EmptyState } from "./shared";
import { type MarketTrends, formatNumber, formatPct, sharePct, CHART_COLORS } from "@/lib/market-trends";

function RankList({ title, icon, items, total, emptyTitle, emptyDescription }: {
  title: string;
  icon: typeof FolderTree;
  items: { name: string; n: number }[];
  total: number;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const max = items[0]?.n ?? 1;

  return (
    <SectionCard icon={icon} title={title} subtitle="Nested specialization data"
      action={
        <span className="text-xs text-muted-foreground">
          {formatNumber(total)} tagged jobs
        </span>
      }
    >
      {items.length === 0 ? (
        <EmptyState icon={icon} title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="space-y-3">
          {items.map((c, i) => (
            <div key={c.name} className="flex items-center gap-3">
              <span className="w-5 shrink-0 text-right text-xs font-medium text-muted-foreground tabular-nums">
                {i + 1}
              </span>
              <span className="w-56 shrink-0 truncate text-sm font-medium text-foreground">{c.name}</span>
              <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max((c.n / max) * 100, 2)}%`,
                    backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                  }}
                />
              </div>
              <span className="w-20 shrink-0 text-right text-sm font-semibold text-foreground tabular-nums">
                {formatNumber(c.n)}
              </span>
              <span className="w-14 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                {formatPct(sharePct(c.n, total))}
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

export function SubcategoriesTab({ data }: { data: MarketTrends }) {
  const { subcategories, categories, meta } = data;

  return (
    <div className="space-y-6">
      <RankList
        title="Subcategory breakdown"
        icon={FolderTree}
        items={subcategories}
        total={subcategories.reduce((s, c) => s + c.n, 0)}
        emptyTitle="Subcategory data not available yet"
        emptyDescription="Subcategories are captured when a job is enriched with its Upwork details (occupation field). Once the enrichment pipeline runs on a new batch, this breakdown will populate. Browse the top categories below as an alternative view."
      />

      <RankList
        title="Fallback: top categories"
        icon={Layers}
        items={categories}
        total={categories.reduce((s, c) => s + c.n, 0)}
        emptyTitle="No category data"
        emptyDescription="No jobs in this window carry a category tag."
      />

      <p className="text-xs text-muted-foreground text-center">
        Subcategory coverage: {formatNumber(subcategories.length)} groups over {formatNumber(meta.totalJobs)} jobs in this window.
      </p>
    </div>
  );
}

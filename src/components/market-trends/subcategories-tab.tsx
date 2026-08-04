"use client";

import { FolderTree, Layers } from "lucide-react";
import { SectionCard, EmptyState } from "./shared";
import { type MarketTrends, formatNumber, formatPct, sharePct, CHART_COLORS } from "@/lib/market-trends";

export function SubcategoriesTab({ data }: { data: MarketTrends }) {
  const { categories, meta } = data;
  const maxCategory = categories[0]?.n ?? 1;

  return (
    <div className="space-y-6">
      <SectionCard
        icon={FolderTree}
        title="Subcategory breakdown"
        subtitle="Nested specialization data"
      >
        <EmptyState
          icon={FolderTree}
          title="Subcategory data not available yet"
          description="Subcategories are only captured for a small fraction of ingested jobs right now. Enable the enrichment pipeline (job details enrich) to unlock this breakdown, or browse the top categories below as an alternative view."
        />
      </SectionCard>

      <SectionCard
        icon={Layers}
        title="Fallback: top categories"
        subtitle="Coarser view until subcategory enrichment lands"
        action={
          <span className="text-xs text-muted-foreground">
            {formatNumber(categories.reduce((s, c) => s + c.n, 0))} tagged jobs
          </span>
        }
      >
        {categories.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No category data"
            description="No jobs in this window carry a category tag."
          />
        ) : (
          <div className="space-y-3">
            {categories.map((c, i) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="w-5 shrink-0 text-right text-xs font-medium text-muted-foreground tabular-nums">
                  {i + 1}
                </span>
                <span className="w-56 shrink-0 truncate text-sm font-medium text-foreground">{c.name}</span>
                <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max((c.n / maxCategory) * 100, 2)}%`,
                      backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                    }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right text-sm font-semibold text-foreground tabular-nums">
                  {formatNumber(c.n)}
                </span>
                <span className="w-14 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                  {formatPct(sharePct(c.n, meta.totalJobs))}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

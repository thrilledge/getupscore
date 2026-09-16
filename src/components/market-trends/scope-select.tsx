"use client";

import { useMemo, useState } from "react";
import type { JobFilter } from "@/lib/supabase/database-types";
import type { MarketScope } from "@/lib/market-trends";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FilterFormDialog } from "@/components/filter-form";
import { Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScopeValue {
  scope: MarketScope;
  filterIds: string[];
}

interface Props {
  value: ScopeValue;
  onChange: (v: ScopeValue) => void;
  filters: JobFilter[];
}

const SCOPE_ITEMS: Array<{ value: MarketScope; label: string; hint: string }> = [
  { value: "all", label: "Default", hint: "All market data" },
  { value: "filters", label: "All my filters", hint: "Matched by your saved filters" },
  { value: "custom", label: "Custom filters…", hint: "Pick specific filters" },
];

export function MarketScopeSelect({ value, onChange, filters }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<string[]>([]);
  const [prevScope, setPrevScope] = useState<MarketScope>("all");

  const activeFilters = useMemo(
    () => filters.filter((f) => f.is_active),
    [filters]
  );

  const matchedFilters = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return activeFilters;
    return activeFilters.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.keywords?.some((kw) => kw.toLowerCase().includes(q))
    );
  }, [activeFilters, search]);

  const handleScopeChange = (scope: string | null) => {
    if (!scope) return;
    if (scope === "custom") {
      setPrevScope(value.scope);
      setDraft(value.filterIds);
      setSearch("");
      onChange({ scope: "custom", filterIds: value.filterIds });
      setOpen(true);
    } else {
      setOpen(false);
      onChange({ scope: scope as MarketScope, filterIds: [] });
    }
  };

  const cancel = () => {
    onChange({
      scope: prevScope,
      filterIds: prevScope === "custom" ? value.filterIds : [],
    });
    setOpen(false);
  };

  const apply = () => {
    onChange({ scope: "custom", filterIds: draft });
    setOpen(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) cancel();
  };

  const toggleFilter = (id: string) => {
    setDraft((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={value.scope} onValueChange={handleScopeChange}>
        <SelectTrigger
          className="h-9 w-auto min-w-[180px] max-w-[220px] shrink-0 rounded-xl border-white/10 bg-white/[0.045] text-xs font-semibold text-white/60 backdrop-blur-sm hover:border-[#00C98B]/40 hover:text-white/80 data-[state=open]:border-[#00C98B]/40 data-[state=open]:text-white/80"
          aria-label="Select data scope"
        >
          <SelectValue placeholder="All market data" />
        </SelectTrigger>

        <SelectContent className="bg-white">
          {SCOPE_ITEMS.map((item) => (
            <SelectItem
              key={item.value}
              value={item.value}
              className="text-[13px]"
            >
              <span className="font-medium text-[#0A0A0A]">{item.label}</span>
              <span className="ml-1.5 text-xs text-[#0A0A0A]/45">{item.hint}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value.scope === "custom" && value.filterIds.length > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-[#00C98B]/25 bg-[#00C98B]/10 px-2.5 py-1 text-[10px] font-bold text-[#00C98B]">
          {value.filterIds.length} selected
          <button
            type="button"
            onClick={() => onChange({ scope: "all", filterIds: [] })}
            className="ml-0.5 rounded-full p-0.5 text-[#00C98B]/60 hover:text-[#00C98B]"
            aria-label="Clear filter selection"
          >
            <X className="size-3" />
          </button>
        </span>
      )}

      <FilterFormDialog
        trigger={
          <button
            type="button"
            className="ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-xs font-semibold text-white/55 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C98B]/40 hover:bg-[#00C98B]/10 hover:text-[#00C98B]"
          >
            <Plus className="size-3.5 transition-transform duration-300 group-hover:rotate-90" />
            <span className="hidden sm:inline">Create filter</span>
          </button>
        }
      />

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="gap-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Custom market filters</DialogTitle>
            <DialogDescription>
              Pick filters to scope the analysis — jobs matching
              any selected filter (OR) are included.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search filters…"
              className="h-9 w-full rounded-lg border border-border bg-muted/50 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-[#00C98B] focus:outline-none"
            />
          </div>

          <div className="max-h-[260px] space-y-1 overflow-y-auto pr-1">
            {matchedFilters.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-6">
                <p className="text-[11px] text-muted-foreground">
                  {activeFilters.length === 0
                    ? "No filters yet"
                    : "No filters match your search"}
                </p>
                {activeFilters.length === 0 && (
                  <FilterFormDialog
                    trigger={
                      <span className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-[#00C98B] transition-colors hover:underline">
                        <Plus className="size-3" />
                        Create your first filter
                      </span>
                    }
                  />
                )}
              </div>
            )}

            {matchedFilters.map((f) => {
              const active = draft.includes(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggleFilter(f.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all duration-200",
                    active
                      ? "border-[#00C98B]/30 bg-[#00C98B]/10 text-[#00C98B]"
                      : "border-transparent text-foreground/75 hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-4 shrink-0 place-items-center rounded border-[1.5px] transition-all duration-200",
                      active
                        ? "border-[#00C98B] bg-[#00C98B]"
                        : "border-border bg-transparent"
                    )}
                  >
                    {active && (
                      <svg viewBox="0 0 12 10" className="size-2.5 text-[#0A0A0A]">
                        <path
                          d="M1 5l3.5 3.5L11 1"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">{f.name}</span>
                    {f.keywords && f.keywords.length > 0 && (
                      <span className="mt-0.5 flex flex-wrap gap-1 text-[10px] opacity-50">
                        {f.keywords.slice(0, 3).map((kw) => (
                          <span
                            key={kw}
                            className="inline-block rounded bg-muted/80 px-1.5 py-0.5 leading-none"
                          >
                            {kw}
                          </span>
                        ))}
                        {f.keywords.length > 3 && (
                          <span className="text-[9px] opacity-50">
                            +{f.keywords.length - 3}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={cancel}>
              Cancel
            </Button>
            <Button
              onClick={apply}
              className="bg-[#00C98B] font-semibold text-[#0A0A0A] hover:bg-[#00C98B]/85"
            >
              Apply{draft.length > 0 ? ` (${draft.length})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
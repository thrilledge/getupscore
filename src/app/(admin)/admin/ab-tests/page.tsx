"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

interface AbTestVariant {
  name: string;
  weight: number;
}

interface AbTest {
  id: string;
  name: string;
  description: string | null;
  status: string;
  variants: AbTestVariant[];
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  variant_counts: Record<string, number>;
  total_assignments: number;
}

const statusBadge: Record<string, string> = {
  draft: "bg-gray-500/15 text-gray-700 border-gray-500/20",
  running: "bg-[#00C98B]/15 text-[#00C98B] border-[#00C98B]/20",
  paused: "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
  completed: "bg-blue-500/15 text-blue-700 border-blue-500/20",
};

export default function AdminAbTestsPage() {
  const [tests, setTests] = useState<AbTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [formError, setFormError] = useState("");

  // New test form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [variants, setVariants] = useState<AbTestVariant[]>([
    { name: "", weight: 50 },
    { name: "", weight: 50 },
  ]);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ab-tests");
      const json = await res.json();
      if (json.ok) setTests(json.tests ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const createTest = async () => {
    setFormError("");
    const cleaned = variants
      .map((v) => ({ name: v.name.trim(), weight: v.weight }))
      .filter((v) => v.name.length > 0);

    if (!name.trim()) {
      setFormError("Test name is required.");
      return;
    }
    if (cleaned.length < 2) {
      setFormError("At least 2 named variants are required.");
      return;
    }
    const totalWeight = cleaned.reduce((sum, v) => sum + v.weight, 0);
    if (totalWeight !== 100) {
      setFormError(`Variant weights must sum to 100 (currently ${totalWeight}).`);
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/admin/ab-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          variants: cleaned,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setName("");
        setDescription("");
        setVariants([
          { name: "", weight: 50 },
          { name: "", weight: 50 },
        ]);
        setShowForm(false);
        fetchTests();
      } else {
        setFormError(json.error ?? "Failed to create test.");
      }
    } catch {
      setFormError("Failed to create test.");
    } finally {
      setCreating(false);
    }
  };

  const changeStatus = async (testId: string, action: "start" | "pause" | "complete") => {
    setActionId(testId);
    try {
      const res = await fetch("/api/admin/ab-tests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId, action }),
      });
      if (res.ok) fetchTests();
    } catch {
      // ignore
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FlaskConical className="size-4 text-[#00C98B]" />
          A/B Tests
          <span className="text-xs text-muted-foreground font-normal">({tests.length})</span>
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={fetchTests}
            disabled={loading}
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-[#00C98B] hover:bg-[#00b57d] text-white"
            onClick={() => {
              setFormError("");
              setShowForm((v) => !v);
            }}
          >
            {showForm ? (
              <>
                <X className="size-3.5" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="size-3.5" />
                New Test
              </>
            )}
          </Button>
        </div>
      </div>

      {/* New Test Inline Form */}
      {showForm && (
        <Card className="bg-white border-[#00C98B]/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">New A/B Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Test Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. proposal-tone-experiment"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this test measure?"
                  rows={1}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00C98B] disabled:cursor-not-allowed disabled:opacity-50 resize-none h-9"
                />
              </div>
            </div>

            {/* Variants */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Variants (weights must sum to 100)
              </label>
              {variants.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={v.name}
                    onChange={(e) =>
                      setVariants((prev) =>
                        prev.map((pv, pi) =>
                          pi === i ? { ...pv, name: e.target.value } : pv
                        )
                      )
                    }
                    placeholder={`Variant ${i + 1} name`}
                    className="h-8 flex-1 text-xs"
                  />
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={v.weight}
                    onChange={(e) =>
                      setVariants((prev) =>
                        prev.map((pv, pi) =>
                          pi === i ? { ...pv, weight: Number(e.target.value) || 0 } : pv
                        )
                      )
                    }
                    className="h-8 w-24 text-xs tabular-nums"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    disabled={variants.length <= 2}
                    onClick={() =>
                      setVariants((prev) => prev.filter((_, pi) => pi !== i))
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-[11px]"
                  onClick={() =>
                    setVariants((prev) => [...prev, { name: "", weight: 0 }])
                  }
                >
                  <Plus className="size-3" />
                  Add Variant
                </Button>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  Total: {variants.reduce((s, v) => s + v.weight, 0)}%
                </span>
              </div>
            </div>

            {formError && (
              <p className="text-xs text-red-600">{formError}</p>
            )}

            <Button
              size="sm"
              className="h-8 gap-1.5 bg-[#00C98B] hover:bg-[#00b57d] text-white"
              onClick={createTest}
              disabled={creating}
            >
              <Plus className="size-3.5" />
              {creating ? "Creating..." : "Create Test"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tests Table */}
      <Card className="bg-white">
        <CardContent>
          {loading ? (
            <div className="space-y-2 py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : tests.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              No A/B tests yet. Create your first one above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-8"></TableHead>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Variants</TableHead>
                    <TableHead className="text-xs">Start / End</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests.map((t) => (
                    <>
                      <TableRow key={t.id}>
                        <TableCell>
                          <button
                            onClick={() =>
                              setExpanded((prev) => ({ ...prev, [t.id]: !prev[t.id] }))
                            }
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {expanded[t.id] ? (
                              <ChevronDown className="size-4" />
                            ) : (
                              <ChevronRight className="size-4" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[220px]">
                            <p className="text-xs font-medium truncate">{t.name}</p>
                            {t.description && (
                              <p className="text-[11px] text-muted-foreground truncate">
                                {t.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] capitalize ${statusBadge[t.status] ?? statusBadge.draft}`}
                          >
                            {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[240px]">
                            {(t.variants ?? []).map((v) => (
                              <Badge
                                key={v.name}
                                variant="outline"
                                className="text-[10px]"
                                title={`${t.variant_counts[v.name] ?? 0} assignments`}
                              >
                                {v.name} · {v.weight}%
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {t.start_date ? new Date(t.start_date).toLocaleDateString() : "—"}
                          {" / "}
                          {t.end_date ? new Date(t.end_date).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-1.5">
                            {t.status === "draft" || t.status === "paused" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[11px] gap-1"
                                disabled={actionId === t.id}
                                onClick={() => changeStatus(t.id, "start")}
                              >
                                <Play className="size-3 text-[#00C98B]" />
                                Start
                              </Button>
                            ) : null}
                            {t.status === "running" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[11px] gap-1"
                                disabled={actionId === t.id}
                                onClick={() => changeStatus(t.id, "pause")}
                              >
                                <Pause className="size-3 text-yellow-600" />
                                Pause
                              </Button>
                            ) : null}
                            {t.status === "running" || t.status === "paused" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[11px] gap-1"
                                disabled={actionId === t.id}
                                onClick={() => changeStatus(t.id, "complete")}
                              >
                                Complete
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded: variant assignment counts */}
                      {expanded[t.id] && (
                        <TableRow key={`${t.id}-expanded`}>
                          <TableCell colSpan={6} className="bg-muted/30">
                            <div className="py-1 space-y-1.5">
                              <p className="text-[11px] font-medium text-muted-foreground">
                                Variant Assignments ({t.total_assignments} total)
                              </p>
                              {(t.variants ?? []).length === 0 ? (
                                <p className="text-[11px] text-muted-foreground">
                                  No variants defined.
                                </p>
                              ) : (
                                (t.variants ?? []).map((v) => {
                                  const count = t.variant_counts[v.name] ?? 0;
                                  const pct =
                                    t.total_assignments > 0
                                      ? Math.round((count / t.total_assignments) * 100)
                                      : 0;
                                  return (
                                    <div key={v.name} className="flex items-center gap-3">
                                      <span className="text-[11px] w-32 truncate" title={v.name}>
                                        {v.name}
                                      </span>
                                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                        <div
                                          className="h-full rounded-full bg-[#00C98B]"
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                      <span className="text-[11px] tabular-nums text-muted-foreground w-20 text-right">
                                        {count} ({pct}%)
                                      </span>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

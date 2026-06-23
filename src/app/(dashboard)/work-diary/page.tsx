"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  BookOpen,
  Loader2,
  Clock,
  CalendarDays,
  TrendingUp,
  RefreshCw,
} from "lucide-react";

interface DiaryEntry {
  id: string;
  contract_id: string;
  date: string;
  hours_worked: number;
  notes: string | null;
  screenshot_count: number | null;
  activity_level: number | null;
  contracts: { title: string; client_name: string | null } | null;
}

export default function WorkDiaryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/work-diary");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // Group entries by week
  const grouped = entries.reduce<Record<string, DiaryEntry[]>>((acc, entry) => {
    const d = new Date(entry.date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().split("T")[0];
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  const totalHours = entries.reduce((sum, e) => sum + e.hours_worked, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">Work Diary</h1>
          <p className="text-muted-foreground mt-1">
            Your Upwork work diary entries synced via the extension.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchEntries} disabled={loading}>
          <RefreshCw className={`size-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
        {[
          { label: "Total Hours", value: totalHours.toFixed(1), icon: Clock },
          { label: "Entries", value: entries.length, icon: BookOpen },
          { label: "Avg / Day", value: entries.length > 0 ? (totalHours / entries.length).toFixed(1) : "0", icon: TrendingUp },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border-border/60">
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <Icon className="size-5 text-accent-blue shrink-0" />
                <div>
                  <p className="text-lg font-bold">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <BookOpen className="size-8 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium">No diary entries yet</p>
            <p className="text-sm mt-1">
              Install the extension and visit your work diary on Upwork to sync your hours.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([weekStart, weekEntries]) => {
            const weekTotal = weekEntries.reduce((s, e) => s + e.hours_worked, 0);
            return (
              <div key={weekStart}>
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-medium text-muted-foreground">
                    Week of {new Date(weekStart).toLocaleDateString()} — {weekTotal.toFixed(1)}h
                  </h2>
                </div>
                <div className="space-y-2">
                  {weekEntries.sort((a, b) => b.date.localeCompare(a.date)).map((entry) => (
                    <Card key={entry.id} className="border-border/60">
                      <CardContent className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              {entry.contracts?.title ?? "Unknown Contract"}
                            </p>
                            <p className="text-sm font-bold">{entry.hours_worked}h</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(entry.date).toLocaleDateString()}
                            {entry.activity_level ? ` · Activity: ${entry.activity_level}%` : ""}
                          </p>
                          {entry.notes && (
                            <p className="text-xs text-muted-foreground/70 mt-1 italic">{entry.notes}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

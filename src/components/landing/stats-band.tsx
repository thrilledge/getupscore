import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, Activity, Zap, Target } from "lucide-react";

export function StatsBand({
  totalJobs,
  jobs24h,
}: {
  totalJobs: number;
  jobs24h: number;
}) {
  const stats = [
    {
      label: "Jobs tracked",
      value: totalJobs.toLocaleString("en-US"),
      icon: Briefcase,
      color: "text-accent-blue",
      sub: "in our database",
    },
    {
      label: "New in 24h",
      value: jobs24h.toLocaleString("en-US"),
      icon: Activity,
      color: "text-accent-green",
      sub: "fresh opportunities",
    },
    {
      label: "AI scores",
      value: "100%",
      icon: Target,
      color: "text-accent-purple",
      sub: "every job analyzed",
    },
    {
      label: "Alert latency",
      value: "<5min",
      icon: Zap,
      color: "text-accent-amber",
      sub: "from post to push",
    },
  ];

  return (
    <section className="border-b border-border/40 py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="border-border/50">
              <CardContent className="flex flex-col gap-2 py-5">
                <s.icon className={`size-5 ${s.color}`} />
                <div className="font-heading text-2xl font-bold tracking-tight tabular-nums">
                  {s.value}
                </div>
                <div className="text-sm font-medium text-foreground">{s.label}</div>
                <div className="text-xs text-muted-foreground">{s.sub}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

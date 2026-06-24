"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  UserCircle,
  Loader2,
  Star,
  Briefcase,
  Wallet,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

interface PortfolioItem {
  title: string;
  description?: string;
  url?: string;
  images?: string[];
  skills?: string[];
}

export default function UpworkProfilePage() {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/upwork-profile");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setProfile(data.profile);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">Upwork Profile</h1>
          <p className="text-muted-foreground mt-1">
            Your freelancer profile synced from Upwork via the extension.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchProfile} disabled={loading}>
          <RefreshCw className={`size-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {!profile ? (
        <Card>
          <CardHeader>
            <CardTitle>No Profile Synced</CardTitle>
            <CardDescription>
              Install the extension and visit your Upwork freelancer profile to sync your data.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-10 text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-2xl bg-muted/50 p-4 ring-1 ring-border/50">
                <UserCircle className="size-10 text-muted-foreground/50" />
              </div>
              <p className="text-sm max-w-md">
                The UpScore extension will automatically sync your Upwork freelancer profile
                when you visit your profile page on Upwork.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Profile Info Card */}
          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-accent-blue/10 p-2.5">
                  <UserCircle className="size-5 text-accent-blue" />
                </div>
                <div>
                  <CardTitle className="text-lg font-heading">
                    {profile.title as string || "Untitled Profile"}
                  </CardTitle>
                  <CardDescription>
                    {profile.upwork_url ? (
                      <a href={profile.upwork_url as string} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-accent-blue hover:underline">
                        View on Upwork <ExternalLink className="size-3" />
                      </a>
                    ) : "No URL linked"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {profile.bio as string || "No bio synced."}
              </p>

              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                {[
                  { label: "Hourly Rate", value: profile.hourly_rate ? `$${profile.hourly_rate}/hr` : "—", icon: Wallet },
                  { label: "Total Earned", value: profile.total_earnings ? `$${Number(profile.total_earnings).toLocaleString()}` : "—", icon: Wallet },
                  { label: "Jobs Done", value: profile.total_jobs_done ?? "—", icon: Briefcase },
                  { label: "Rating", value: profile.client_rating ? `${profile.client_rating}/5` : "—", icon: Star },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="rounded-lg border border-border/60 bg-background/50 p-3 text-center">
                      <Icon className="size-4 mx-auto text-muted-foreground mb-1" />
                      <p className="text-lg font-bold">{String(s.value)}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* Skills */}
              {Array.isArray(profile.skills) && (profile.skills as string[]).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(profile.skills as string[]).map((skill: string) => (
                      <span key={skill} className="inline-flex px-2.5 py-1 rounded-full bg-accent-blue/10 text-accent-blue text-xs font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Portfolio */}
              {Array.isArray(profile.portfolio) && (profile.portfolio as PortfolioItem[]).length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Portfolio</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(profile.portfolio as PortfolioItem[]).map((item, i) => (
                      <div key={item.title + i} className="rounded-lg border border-border/60 bg-background/50 p-3 space-y-2">
                        {item.images?.[0] && (
                          <img src={item.images[0]} alt={item.title} className="w-full h-32 object-cover rounded-md" />
                        )}
                        <div>
                          <p className="text-sm font-semibold">{item.title}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                          )}
                        </div>
                        {Array.isArray(item.skills) && item.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.skills.map((s) => (
                              <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{s}</span>
                            ))}
                          </div>
                        )}
                        {item.url && (
                          <a href={item.url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-accent-blue hover:underline inline-flex items-center gap-1">
                            View Project <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

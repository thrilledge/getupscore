"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  Settings2,
  Timer,
  Trash2,
  Users,
  Zap,
} from "lucide-react";

type SlotStatus = "ok" | "expiring" | "expired" | "needs_reconnect" | "missing";

interface Slot {
  slot: number;
  label: string;
  org_uid: string | null;
  role_label: string | null;
  added_at: string | null;
  last_used_at: string | null;
  last_refreshed_at: string | null;
  last_error: string | null;
  has_refresh: boolean;
  status: SlotStatus;
  expires_at: string | null;
  seconds_left: number;
  days_left: number;
}

interface SlotAccount {
  name: string | null;
  org_uid: string | null;
  role_label: string | null;
  checked_at: string | null;
  error: string | null;
}

interface Pool {
  total: number;
  healthy: number;
  expiring: number;
  needs_action: number;
  active_slot: number | null;
  slots: Slot[];
  accounts: Record<string, SlotAccount>;
}

interface IngestConfig {
  jobsPerSync: number;
  syncIntervalMinutes: number;
  lastSyncAt: string | null;
  lastSyncJobs: number | null;
  updatedAt: string | null;
}

interface StatusResponse {
  ok: boolean;
  error?: string;
  pool: Pool;
  config: IngestConfig;
  mcp: { reachable: boolean | null; error: string | null; checked_at: string | null };
}

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  ok: { label: "Healthy", cls: "bg-green-500/15 text-green-700 border-green-500/20" },
  expiring: { label: "Expiring soon", cls: "bg-amber-500/15 text-amber-700 border-amber-500/20" },
  expired: { label: "Expired", cls: "bg-red-500/15 text-red-700 border-red-500/20" },
  needs_reconnect: { label: "Needs reconnect", cls: "bg-red-500/15 text-red-700 border-red-500/20" },
  missing: { label: "No token", cls: "bg-zinc-500/15 text-zinc-600 border-zinc-500/20" },
};

const USABLE: SlotStatus[] = ["ok", "expiring"];

function countdown(seconds: number) {
  if (seconds <= 0) return "expired";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h left`;
  }
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

function timeAgo(iso: string | null) {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AdminUpworkTokenPage() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [linkSlot, setLinkSlot] = useState<number | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [linkState, setLinkState] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [jobs, setJobs] = useState("10");
  const [interval, setInterval] = useState("5");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/upwork-token", { cache: "no-store" });
      const json = await res.json();
      setError(json.error ?? null);
      if (json.config) {
        setJobs(String(json.config.jobsPerSync));
        setInterval(String(json.config.syncIntervalMinutes));
      }
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function post(payload: Record<string, unknown>) {
    setActionError(null);
    const res = await fetch("/api/admin/upwork-token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Request failed");
    return json;
  }

  function resetLink() {
    setLinkSlot(null);
    setLink(null);
    setLinkState(null);
    setCode("");
  }

  async function generateLink(slot?: number) {
    setBusy(slot ? `link:${slot}` : "link");
    try {
      const json = await post({ action: "generate-link", ...(slot ? { slot } : {}) });
      setLinkSlot(json.slot);
      setLink(json.authUrl);
      setLinkState(json.state);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to generate link");
    } finally {
      setBusy(null);
    }
  }

  async function connect() {
    if (linkSlot === null) return;
    setBusy(`connect:${linkSlot}`);
    try {
      await post({ action: "connect", slot: linkSlot, code, state: linkState });
      resetLink();
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to connect");
    } finally {
      setBusy(null);
    }
  }

  async function refreshSlot(slot: number) {
    setBusy(`refresh:${slot}`);
    try {
      await post({ action: "refresh", slot });
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to refresh");
    } finally {
      setBusy(null);
    }
  }

  async function removeSlot(slot: number) {
    setBusy(`delete:${slot}`);
    try {
      await post({ action: "delete-slot", slot });
      if (linkSlot === slot) resetLink();
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to remove account");
    } finally {
      setBusy(null);
    }
  }

  async function saveIngest() {
    setBusy("save");
    try {
      await post({
        action: "ingest",
        jobsPerSync: Number(jobs),
        syncIntervalMinutes: Number(interval),
      });
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i} className="bg-white">
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-48" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const pool = data?.pool;
  const slots = pool?.slots ?? [];
  const cfg = data?.config;
  const usable = slots.filter((s) => USABLE.includes(s.status));
  const allDown = slots.length > 0 && usable.length === 0;
  const linkTarget = slots.find((s) => s.slot === linkSlot) ?? null;

  return (
    <div className="space-y-5">
      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Token server unreachable</p>
              <p className="mt-0.5 text-xs text-red-600/80 dark:text-red-400/80">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {allDown && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                No usable Upwork account — job syncing is stopped
              </p>
              <p className="mt-0.5 text-xs text-red-600/80 dark:text-red-400/80">
                Upwork rejected the saved token. Reconnect below to resume syncing.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---------- Connected account ---------- */}
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Upwork connection</CardTitle>
            <div className="flex items-center gap-2">
              {slots.length === 0 && (
                <Button
                  onClick={() => generateLink(1)}
                  disabled={busy !== null}
                  className="bg-[#00C98B] text-[#0A0A0A] hover:bg-[#00C98B]/90"
                  size="sm"
                >
                  {busy === "link" ? (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  ) : (
                    <ExternalLink className="mr-1.5 size-3.5" />
                  )}
                  Connect account
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={load} disabled={busy !== null}>
                <RefreshCw className="mr-1.5 size-3.5" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border px-3 py-2">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="size-3" /> Accounts
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums">{pool?.total ?? 0}</p>
            </div>
            <div className="rounded-lg border px-3 py-2">
              <p className="text-xs text-muted-foreground">Healthy</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-green-600">{pool?.healthy ?? 0}</p>
            </div>
            <div className="rounded-lg border px-3 py-2">
              <p className="text-xs text-muted-foreground">Expiring soon</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-amber-600">{pool?.expiring ?? 0}</p>
            </div>
            <div className="rounded-lg border px-3 py-2">
              <p className="text-xs text-muted-foreground">Needs action</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-red-600">{pool?.needs_action ?? 0}</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            The access token renews itself from the stored refresh token, so this normally stays
            connected without you doing anything. Renew it early with the button below, or reconnect
            only if Upwork ever revokes it.
            {pool?.active_slot ? ` Currently syncing with slot ${pool.active_slot}.` : ""}
          </p>

          {actionError && (
            <p className="text-xs text-red-600 dark:text-red-400">{actionError}</p>
          )}

          <div className="space-y-3">
            {slots.length === 0 && (
              <p className="rounded-lg border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
                No account connected yet. Use &ldquo;Connect account&rdquo; to link your Upwork
                account — this is a one-time step.
              </p>
            )}

            {slots.map((s) => {
              const acct = pool?.accounts?.[String(s.slot)];
              const style = STATUS_STYLE[s.status] ?? STATUS_STYLE.missing;
              const isActive = pool?.active_slot === s.slot;
              const label = acct?.name || s.label;
              const org = acct?.org_uid || s.org_uid;

              return (
                <div key={s.slot} className="rounded-lg border">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Activity className="size-4 shrink-0 text-[#00C98B]" />
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-medium">
                          <span className="truncate">{label}</span>
                          {isActive && (
                            <Badge variant="secondary" className="text-[10px]">in use</Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Slot {s.slot}
                          {s.role_label || acct?.role_label ? ` · ${s.role_label || acct?.role_label}` : ""}
                          {" · "}
                          {USABLE.includes(s.status) ? countdown(s.seconds_left) : "not usable"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {org && (
                        <Badge variant="outline" className="font-mono text-[10px]">{org}</Badge>
                      )}
                      <Badge variant="outline" className={style.cls}>{style.label}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refreshSlot(s.slot)}
                        disabled={busy !== null || !s.has_refresh}
                        title={s.has_refresh ? "Renew this token now" : "No refresh token for this account"}
                      >
                        {busy === `refresh:${s.slot}` ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="size-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => generateLink(s.slot)}
                        disabled={busy !== null}
                        title="Reconnect this account"
                      >
                        {busy === `link:${s.slot}` ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <ExternalLink className="size-3.5" />
                        )}
                      </Button>
                      {slots.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSlot(s.slot)}
                          disabled={busy !== null}
                          title="Remove this account"
                        >
                          {busy === `delete:${s.slot}` ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5 text-red-500" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t px-4 py-2 text-[11px] text-muted-foreground sm:grid-cols-4">
                    <span>Added {timeAgo(s.added_at)}</span>
                    <span>Last used {timeAgo(s.last_used_at)}</span>
                    <span>Last renewed {timeAgo(s.last_refreshed_at)}</span>
                    <span className="truncate">
                      {s.expires_at ? `Expires ${new Date(s.expires_at).toLocaleString()}` : "No expiry"}
                    </span>
                  </div>

                  {s.last_error && !USABLE.includes(s.status) && (
                    <p className="border-t px-4 py-2 text-[11px] text-red-600 dark:text-red-400">
                      {s.last_error}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ---------- Connect flow (own card so a brand-new slot shows up too) ---------- */}
      {link && linkSlot !== null && (
        <Card className="border-[#00C98B]/30 bg-[#00C98B]/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {linkTarget
                ? `Reconnect “${linkTarget.label}”`
                : `Connect new account (slot ${linkSlot})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-[#00C98B]/30 bg-white/70 p-3 dark:bg-transparent">
              <p className="text-xs font-medium text-muted-foreground">
                1. Open this link and sign in with the Upwork account you want to add
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded bg-black/5 px-2 py-1.5 text-[11px] dark:bg-white/10">
                  {link}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(link);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? <Check className="size-4 text-[#00C98B]" /> : <Copy className="size-4" />}
                </Button>
              </div>
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#00C98B] hover:underline"
              >
                Open in browser <ExternalLink className="size-3" />
              </a>
            </div>

            <div className="rounded-lg border bg-white p-3 dark:bg-transparent">
              <Label htmlFor="code" className="text-xs font-medium text-muted-foreground">
                2. Paste the callback URL from your address bar
              </Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="http://localhost:8123/callback?code=…&state=…"
                className="mt-1.5 font-mono text-xs"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                The page will not load — that is expected. Copy the whole URL and paste it here.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  onClick={connect}
                  disabled={busy !== null || !code.trim()}
                  className="bg-[#00C98B] text-[#0A0A0A] hover:bg-[#00C98B]/90"
                >
                  {busy === `connect:${linkSlot}` ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 size-4" />
                  )}
                  Connect &amp; save
                </Button>
                <Button variant="ghost" size="sm" onClick={resetLink}>Cancel</Button>
              </div>
            </div>

            {actionError && (
              <p className="text-xs text-red-600 dark:text-red-400">{actionError}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ---------- Ingestion settings ---------- */}
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Job Ingestion</CardTitle>
            <Settings2 className="size-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="jobs" className="text-xs text-muted-foreground">Jobs per sync</Label>
              <Input
                id="jobs"
                type="number"
                min={1}
                max={200}
                value={jobs}
                onChange={(e) => setJobs(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="interval" className="text-xs text-muted-foreground">Every N minutes</Label>
              <Input
                id="interval"
                type="number"
                min={1}
                max={1440}
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="rounded-lg border px-3 py-2">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Zap className="size-3" /> Jobs saved / cycle
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums">{cfg?.lastSyncJobs ?? "—"}</p>
            </div>
            <div className="rounded-lg border px-3 py-2">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Timer className="size-3" /> Last sync
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums">{timeAgo(cfg?.lastSyncAt ?? null)}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button
              onClick={saveIngest}
              disabled={busy !== null}
              className="bg-[#00C98B] text-[#0A0A0A] hover:bg-[#00C98B]/90"
            >
              {busy === "save" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
              Save settings
            </Button>
            <p className="text-xs text-muted-foreground">
              Applies to the next sync cycle — no VPS restart needed.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed bg-transparent">
        <CardContent className="p-4">
          <p className="text-sm font-medium">Adding a second Upwork account</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Upwork ties every API client to a single account, so the same authorization link cannot
            be used to connect a different Upwork account — Upwork rejects it with
            &ldquo;User is not eligible to authorize.&rdquo; A second account would need its own
            approved Upwork API key (client ID + secret) requested from that account, and Upwork only
            grants keys to accounts that pass its eligibility review. Upwork&rsquo;s API is also
            licensed for personal or internal use only, so extra accounts must not be used to work
            around request or activity limits — doing so can get the owning account suspended.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

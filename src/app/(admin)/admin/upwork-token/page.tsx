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
  KeyRound,
  Loader2,
  RefreshCw,
  Settings2,
  Timer,
  Zap,
} from "lucide-react";

interface TokenDetail {
  issued_at: string | null;
  expires_in: number | null;
  expires_at: string | null;
  expires_seconds_left: number;
  expires_days_left: number;
  status: "ok" | "expiring" | "expired" | "no_token";
  has_refresh: boolean;
  client_id: string | null;
}

interface Account {
  name: string;
  org_uid: string;
  role_label: string;
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
  token: boolean;
  detail: TokenDetail | null;
  account: Account | null;
  mcp: { reachable: boolean | null; lookup: string; error: string | null; checked_at: string | null };
  config: IngestConfig;
}

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  ok: { label: "Healthy", cls: "bg-green-500/15 text-green-700 border-green-500/20" },
  expiring: { label: "Expiring soon", cls: "bg-amber-500/15 text-amber-700 border-amber-500/20" },
  expired: { label: "Expired", cls: "bg-red-500/15 text-red-700 border-red-500/20" },
  no_token: { label: "No token", cls: "bg-zinc-500/15 text-zinc-600 border-zinc-500/20" },
};

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

  const [link, setLink] = useState<string | null>(null);
  const [linkState, setLinkState] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"link" | "connect" | "save" | null>(null);
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

  async function generateLink() {
    setBusy("link");
    try {
      const json = await post({ action: "generate-link" });
      setLink(json.authUrl);
      setLinkState(json.state);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to generate link");
    } finally {
      setBusy(null);
    }
  }

  async function connect() {
    setBusy("connect");
    try {
      await post({ action: "connect", code, state: linkState });
      setLink(null);
      setLinkState(null);
      setCode("");
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to connect");
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
            <CardContent className="p-5 space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-48" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const detail = data?.detail ?? null;
  const status = detail?.status ?? "no_token";
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.no_token;
  const needsReconnect = status === "expired" || status === "no_token";
  const cfg = data?.config;

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

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ---------- Token health ---------- */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">UpWork MCP Token</CardTitle>
              <Button variant="ghost" size="sm" onClick={load} disabled={busy !== null}>
                <RefreshCw className="mr-1.5 size-3.5" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div className="flex items-center gap-3">
                <Activity className="size-4 text-[#00C98B]" />
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <p className="text-xs text-muted-foreground">
                    {detail ? countdown(detail.expires_seconds_left) : "no token on the VPS"}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className={style.cls}>{style.label}</Badge>
            </div>

            {data?.account && (
              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div className="flex items-center gap-3">
                  <KeyRound className="size-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Connected account</p>
                    <p className="text-xs text-muted-foreground">
                      {data.account.name} · {data.account.role_label}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {data.account.org_uid}
                </Badge>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border px-3 py-2">
                <p className="text-muted-foreground">Issued</p>
                <p className="mt-0.5 font-medium">
                  {detail?.issued_at ? new Date(detail.issued_at).toLocaleString() : "—"}
                </p>
              </div>
              <div className="rounded-lg border px-3 py-2">
                <p className="text-muted-foreground">Expires</p>
                <p className="mt-0.5 font-medium">
                  {detail?.expires_at ? new Date(detail.expires_at).toLocaleString() : "—"}
                </p>
              </div>
            </div>

            {data?.mcp?.reachable === null && detail?.status === "ok" && (
              <p className="text-xs text-muted-foreground">
                Verifying connection with UpWork…
              </p>
            )}
          </CardContent>
        </Card>

        {/* ---------- Reconnect ---------- */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reconnect UpWork</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!link ? (
              <>
                <p className="text-xs text-muted-foreground">
                  The VPS token lasts 24 hours. When it expires, generate a connection link,
                  approve it in your UpWork account, then paste the code back here.
                </p>
                <Button
                  onClick={generateLink}
                  disabled={busy !== null}
                  className="w-full bg-[#00C98B] text-[#0A0A0A] hover:bg-[#00C98B]/90"
                >
                  {busy === "link" ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <ExternalLink className="mr-2 size-4" />
                  )}
                  {needsReconnect ? "Generate connection link" : "Generate new link"}
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border border-[#00C98B]/30 bg-[#00C98B]/5 p-3">
                  <p className="text-xs font-medium text-muted-foreground">1. Open this link</p>
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

                <div className="rounded-lg border p-3">
                  <Label htmlFor="code" className="text-xs font-medium text-muted-foreground">
                    2. Paste the code from the callback URL
                  </Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="code=… or the full callback URL"
                    className="mt-1.5 font-mono text-xs"
                  />
                  <Button
                    onClick={connect}
                    disabled={busy !== null || !code.trim()}
                    className="mt-2 w-full bg-[#00C98B] text-[#0A0A0A] hover:bg-[#00C98B]/90"
                  >
                    {busy === "connect" ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 size-4" />
                    )}
                    Connect &amp; save token
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setLink(null); setLinkState(null); setCode(""); }}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            )}

            {actionError && (
              <p className="text-xs text-red-600 dark:text-red-400">{actionError}</p>
            )}
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
}

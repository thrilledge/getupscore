"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  ExternalLink,
  XCircle,
  Settings,
  Shield,
} from "lucide-react";
interface NotificationItem {
  id: string;
  channel: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  job_id: string;
  job_title?: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications/history");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const statusIcon = (status: string) => {
    switch (status) {
      case "sent": return <CheckCircle2 className="size-4 text-accent-green" />;
      case "failed": return <XCircle className="size-4 text-destructive" />;
      case "pending": return <Clock className="size-4 text-accent-amber" />;
      default: return <Bell className="size-4 text-muted-foreground" />;
    }
  };

  const channelLabel = (ch: string) => {
    const map: Record<string, string> = { email: "Email", telegram: "Telegram", slack: "Slack", discord: "Discord", webhook: "Webhook" };
    return map[ch] || ch;
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading flex items-center gap-3">
            <Bell className="size-7" />
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            Recent alerts sent via your notification channels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/channels">
            <Button variant="outline" size="sm">
              <Settings className="size-4 mr-2" />
              Channels
            </Button>
          </Link>
          <Link href="/rules">
            <Button variant="outline" size="sm">
              <Shield className="size-4 mr-2" />
              Rules
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={fetchNotifications} disabled={loading}>
            <RefreshCw className={"size-4 mr-2" + (loading ? " animate-spin" : "")} />
            Refresh
          </Button>
        </div>
      </div>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-6 text-center">
          <AlertTriangle className="size-6 mx-auto mb-2 text-red-500" />
          <p className="text-red-500 font-medium text-sm">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={fetchNotifications}>Retry</Button>
        </div>
      )}

      {!loading && !error && notifications.length === 0 && (
        <div className="rounded-lg border border-border/60 p-12 text-center">
          <Bell className="size-10 mx-auto mb-3 text-muted-foreground/40" />
          <h3 className="font-semibold text-lg mb-1">No notifications yet</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Notifications will appear here when rules trigger alerts via your channels.
          </p>
        </div>
      )}

      {!loading && !error && notifications.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="text-left font-semibold text-muted-foreground px-4 py-3">Status</th>
                <th className="text-left font-semibold text-muted-foreground px-4 py-3">Channel</th>
                <th className="text-left font-semibold text-muted-foreground px-4 py-3">Job</th>
                <th className="text-right font-semibold text-muted-foreground px-4 py-3">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {notifications.map((n) => (
                <tr key={n.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">{statusIcon(n.status)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">{channelLabel(n.channel)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/jobs/${n.job_id}`} className="text-accent-blue hover:underline font-medium">
                      {n.job_title || n.job_id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                    {new Date(n.sent_at || n.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

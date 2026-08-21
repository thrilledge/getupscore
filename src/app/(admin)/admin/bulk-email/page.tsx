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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Mail,
  Plus,
  RefreshCw,
  Send,
  X,
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  target_segment: string;
  status: string;
  total_recipients: number | null;
  sent_count: number | null;
  failed_count: number | null;
  created_at: string;
  sent_at: string | null;
}

const statusBadge: Record<string, string> = {
  draft: "bg-gray-500/15 text-gray-700 border-gray-500/20",
  sending: "bg-blue-500/15 text-blue-700 border-blue-500/20",
  sent: "bg-[#00C98B]/15 text-[#00C98B] border-[#00C98B]/20",
  failed: "bg-red-500/15 text-red-700 border-red-500/20",
};

const SEGMENTS = [
  "all",
  "free",
  "pro",
  "churned",
  "active",
  "inactive_7d",
  "inactive_30d",
];

export default function AdminBulkEmailPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  // New campaign form state
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState("all");

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bulk-email");
      const json = await res.json();
      if (json.ok) setCampaigns(json.campaigns ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const createCampaign = async () => {
    if (!name.trim() || !subject.trim() || !body.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/bulk-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          subject: subject.trim(),
          body: body.trim(),
          target_segment: segment,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setName("");
        setSubject("");
        setBody("");
        setSegment("all");
        setShowForm(false);
        fetchCampaigns();
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  const sendCampaign = async (campaignId: string) => {
    setSendingId(campaignId);
    try {
      const res = await fetch("/api/admin/bulk-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", campaignId }),
      });
      if (res.ok) fetchCampaigns();
    } catch {
      // ignore
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Mail className="size-4 text-[#00C98B]" />
          Bulk Email Campaigns
          <span className="text-xs text-muted-foreground font-normal">
            ({campaigns.length})
          </span>
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={fetchCampaigns}
            disabled={loading}
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-[#00C98B] hover:bg-[#00b57d] text-white"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? (
              <>
                <X className="size-3.5" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="size-3.5" />
                New Campaign
              </>
            )}
          </Button>
        </div>
      </div>

      {/* New Campaign Inline Form */}
      {showForm && (
        <Card className="bg-white border-[#00C98B]/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">New Email Campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Campaign Name
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Pro Feature Announcement"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Target Segment
                </label>
                <Select value={segment} onValueChange={(v) => setSegment(v ?? "all")}>
                  <SelectTrigger className="h-9 w-full text-xs">
                    <SelectValue placeholder="Select segment" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEGMENTS.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs capitalize">
                        {s.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Subject</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject line"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Email content..."
                rows={6}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00C98B] disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-[#00C98B] hover:bg-[#00b57d] text-white"
              onClick={createCampaign}
              disabled={creating || !name.trim() || !subject.trim() || !body.trim()}
            >
              <Send className="size-3.5" />
              {creating ? "Creating..." : "Create Campaign"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Campaigns Table */}
      <Card className="bg-white">
        <CardContent>
          {loading ? (
            <div className="space-y-2 py-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              No campaigns yet. Create your first one above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Subject</TableHead>
                    <TableHead className="text-xs">Segment</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-center">Sent / Total</TableHead>
                    <TableHead className="text-xs">Created</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs font-medium max-w-[180px] truncate">
                        {c.name}
                      </TableCell>
                      <TableCell className="text-xs max-w-[220px] truncate" title={c.subject}>
                        {c.subject}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {c.target_segment.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize ${statusBadge[c.status] ?? statusBadge.draft}`}
                        >
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-center tabular-nums">
                        {c.sent_count ?? 0} / {c.total_recipients ?? 0}
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {new Date(c.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.status === "draft" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px] gap-1.5"
                            disabled={sendingId === c.id}
                            onClick={() => sendCampaign(c.id)}
                          >
                            <Send className="size-3 text-[#00C98B]" />
                            {sendingId === c.id ? "Sending..." : "Send"}
                          </Button>
                        ) : c.sent_at ? (
                          <span className="text-[11px] text-muted-foreground">
                            Sent {new Date(c.sent_at).toLocaleDateString()}
                          </span>
                        ) : null}
                      </TableCell>
                    </TableRow>
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

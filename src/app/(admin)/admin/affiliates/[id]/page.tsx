"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  MousePointerClick,
  Users,
  Link2,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Calendar,
  CreditCard,
  Copy,
  CheckCircle,
  ExternalLink,
} from "lucide-react";

interface AffiliateData {
  affiliate: {
    id: string;
    user_id: string;
    referral_code: string;
    commission_rate: number;
    commission_type: string;
    status: string;
    total_referrals: number;
    total_signups: number;
    total_conversions: number;
    total_earned: number;
    total_paid_out: number;
    pending_commission: number;
    total_clicks: number;
    unique_clicks: number;
    payout_method: string;
    payout_email: string;
    created_at: string;
    email: string;
    name: string;
  };
  commissions: Array<{
    id: string;
    commission_amount: number;
    status: string;
    sale_amount: number;
    plan: string;
    created_at: string;
    paddle_transaction_id: string;
    customer_user_id: string;
  }>;
  signups: Array<{
    id: string;
    user_id: string;
    status: string;
    created_at: string;
    fingerprint: string;
    referred_user_email?: string;
  }>;
  clicks: Array<{
    created_at: string;
    ip_address: string;
  }>;
  clicksByDay: Record<string, number>;
  payouts: Array<{
    id: string;
    amount: number;
    status: string;
    bank_name: string;
    account_number: string;
    created_at: string;
    processed_at: string;
  }>;
  commissionBreakdown: { pending: number; approved: number; paid: number; total: number };
  signupBreakdown: { total: number; pending: number; active: number; converted: number };
}

export default function AffiliateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<AffiliateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({ commission_rate: "", status: "", payout_method: "", payout_email: "" });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchAffiliate();
  }, [id]);

  async function fetchAffiliate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/affiliates/${id}`);
      const d = await res.json();
      if (d.ok) {
        setData(d);
        setEditForm({
          commission_rate: String(d.affiliate.commission_rate),
          status: d.affiliate.status ?? "",
          payout_method: d.affiliate.payout_method ?? "",
          payout_email: d.affiliate.payout_email ?? "",
        });
      }
    } catch {
      console.error("Failed to fetch affiliate");
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/admin/affiliates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          commission_rate: Number(editForm.commission_rate),
          status: editForm.status,
          payout_method: editForm.payout_method,
          payout_email: editForm.payout_email,
        }),
      });
      setEditDialog(false);
      fetchAffiliate();
    } catch {
      console.error("Failed to save");
    }
    setSaving(false);
  }

  async function toggleStatus() {
    if (!data) return;
    try {
      await fetch("/api/admin/affiliates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: data.affiliate.status === "active" ? "paused" : "active",
        }),
      });
      fetchAffiliate();
    } catch {
      console.error("Failed to toggle status");
    }
  }

  function copyCode() {
    if (!data) return;
    navigator.clipboard.writeText(data.affiliate.referral_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="size-8 animate-spin rounded-full border-2 border-white/10 border-t-[#00C98B]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground">Affiliate not found</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4 rounded-xl">
          Go Back
        </Button>
      </div>
    );
  }

  const { affiliate, commissions, signups, clicksByDay, payouts, commissionBreakdown, signupBreakdown } = data;

  // Build clicks chart data (last 30 days)
  const chartDays: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    chartDays.push(d.toISOString().split("T")[0]);
  }
  const maxClicks = Math.max(1, ...chartDays.map((d) => clicksByDay[d] || 0));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="grid size-10 place-items-center rounded-xl border border-[#0A0A0A]/10 text-muted-foreground transition-colors hover:bg-[#0A0A0A]/5"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex-1">
          <h2 className="font-heading text-2xl font-bold text-[#0A0A0A]">
            {affiliate.name || "Unknown"}
          </h2>
          <p className="text-sm text-muted-foreground">{affiliate.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={affiliate.status === "active" ? "default" : "secondary"}
            className={
              affiliate.status === "active"
                ? "bg-[#00C98B]/10 text-[#00A975]"
                : affiliate.status === "banned"
                ? "bg-red-500/10 text-red-600"
                : ""
            }
          >
            {affiliate.status}
          </Badge>
          <button
            onClick={toggleStatus}
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-[#00C98B]/10 hover:text-[#00A975]"
            title={affiliate.status === "active" ? "Pause" : "Activate"}
          >
            {affiliate.status === "active" ? (
              <ToggleRight className="size-5 text-[#00C98B]" />
            ) : (
              <ToggleLeft className="size-5" />
            )}
          </button>
          <button
            onClick={() => setEditDialog(true)}
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-blue-500/10 hover:text-blue-600"
            title="Edit"
          >
            <Pencil className="size-4" />
          </button>
        </div>
      </div>

      {/* Referral Code */}
      <Card className="border-[#0A0A0A]/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Link2 className="size-4 text-[#00A975]" />
            <span className="text-sm font-medium text-muted-foreground">Referral Code</span>
            <code className="rounded-lg bg-[#0A0A0A]/5 px-3 py-1.5 font-mono text-sm font-bold">
              {affiliate.referral_code}
            </code>
            <button
              onClick={copyCode}
              className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-[#00C98B]/10 hover:text-[#00A975]"
            >
              {copied ? <CheckCircle className="size-3.5 text-[#00C98B]" /> : <Copy className="size-3.5" />}
            </button>
            <span className="ml-2 text-xs text-muted-foreground">
              getupscore.com?ref={affiliate.referral_code}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Earned", value: `$${affiliate.total_earned.toFixed(2)}`, icon: DollarSign, color: "text-[#00A975]" },
          { label: "Pending", value: `$${affiliate.pending_commission.toFixed(2)}`, icon: TrendingUp, color: "text-amber-600" },
          { label: "Total Clicks", value: affiliate.total_clicks, icon: MousePointerClick, color: "text-blue-600" },
          { label: "Conversions", value: affiliate.total_conversions, icon: Users, color: "text-purple-600" },
        ].map((stat) => (
          <Card key={stat.label} className="border-[#0A0A0A]/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 font-heading text-2xl font-bold">{stat.value}</p>
                </div>
                <div className="grid size-10 place-items-center rounded-xl bg-[#00C98B]/10">
                  <stat.icon className={`size-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Commission Breakdown + Signup Breakdown */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-[#0A0A0A]/10">
          <CardHeader>
            <CardTitle className="font-heading text-base font-bold">Commission Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Pending", value: commissionBreakdown.pending, color: "text-amber-600" },
              { label: "Approved", value: commissionBreakdown.approved, color: "text-blue-600" },
              { label: "Paid", value: commissionBreakdown.paid, color: "text-[#00A975]" },
              { label: "Total", value: commissionBreakdown.total, color: "text-[#0A0A0A] font-bold" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className={`font-heading text-sm font-bold ${item.color}`}>
                  ${item.value.toFixed(2)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-[#0A0A0A]/10">
          <CardHeader>
            <CardTitle className="font-heading text-base font-bold">Signup Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Total Signups", value: signupBreakdown.total },
              { label: "Pending", value: signupBreakdown.pending },
              { label: "Active / Paid", value: signupBreakdown.active },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="font-heading text-sm font-bold">{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Clicks Chart (last 30 days) */}
      <Card className="border-[#0A0A0A]/10">
        <CardHeader>
          <CardTitle className="font-heading text-base font-bold">Clicks (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-32">
            {chartDays.map((day) => {
              const count = clicksByDay[day] || 0;
              const height = maxClicks > 0 ? (count / maxClicks) * 100 : 0;
              return (
                <div
                  key={day}
                  className="group relative flex-1"
                  style={{ height: "100%" }}
                >
                  <div className="absolute bottom-0 w-full">
                    <div
                      className="mx-auto w-full max-w-[16px] rounded-t bg-[#00C98B]/80 transition-colors hover:bg-[#00C98B]"
                      style={{ height: `${Math.max(height, count > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                  <div className="absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#0A0A0A] px-2 py-1 text-xs text-white group-hover:block">
                    {day}: {count}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            <span>{chartDays[0]}</span>
            <span>{chartDays[chartDays.length - 1]}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payout Requests */}
      {payouts.length > 0 && (
        <Card className="border-[#0A0A0A]/10">
          <CardHeader>
            <CardTitle className="font-heading text-base font-bold">Payout Requests</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-[#0A0A0A]/5 hover:bg-transparent">
                  <TableHead className="font-semibold">Amount</TableHead>
                  <TableHead className="font-semibold">Bank Name</TableHead>
                  <TableHead className="font-semibold">Account Number</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Requested</TableHead>
                  <TableHead className="font-semibold">Processed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((p) => (
                  <TableRow key={p.id} className="border-[#0A0A0A]/5">
                    <TableCell className="font-heading font-bold">${Number(p.amount).toFixed(2)}</TableCell>
                    <TableCell>{p.bank_name}</TableCell>
                    <TableCell>
                      <code className="font-mono text-xs">{p.account_number}</code>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={p.status === "completed" ? "default" : p.status === "pending" ? "secondary" : "destructive"}
                        className={p.status === "completed" ? "bg-[#00C98B]/10 text-[#00A975]" : ""}
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.processed_at ? new Date(p.processed_at).toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Commissions Table */}
      {commissions.length > 0 && (
        <Card className="border-[#0A0A0A]/10">
          <CardHeader>
            <CardTitle className="font-heading text-base font-bold">Commissions ({commissions.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-[#0A0A0A]/5 hover:bg-transparent">
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Sale Amount</TableHead>
                  <TableHead className="font-semibold">Commission</TableHead>
                  <TableHead className="font-semibold">Plan</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Transaction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((c) => (
                  <TableRow key={c.id} className="border-[#0A0A0A]/5">
                    <TableCell className="text-sm">
                      {new Date(c.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-heading font-bold">
                      ${Number(c.sale_amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="font-heading font-bold text-[#00A975]">
                      ${Number(c.commission_amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{c.plan || "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={c.status === "paid" ? "default" : "secondary"}
                        className={c.status === "paid" ? "bg-[#00C98B]/10 text-[#00A975]" : ""}
                      >
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="font-mono text-xs text-muted-foreground">
                        {c.paddle_transaction_id ? `${c.paddle_transaction_id.slice(0, 16)}...` : "—"}
                      </code>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Referral Signups */}
      {signups.length > 0 && (
        <Card className="border-[#0A0A0A]/10">
          <CardHeader>
            <CardTitle className="font-heading text-base font-bold">Referral Signups ({signups.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-[#0A0A0A]/5 hover:bg-transparent">
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">User ID</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Fingerprint</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signups.map((s) => (
                  <TableRow key={s.id} className="border-[#0A0A0A]/5">
                    <TableCell className="text-sm">
                      {new Date(s.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <code className="font-mono text-xs text-muted-foreground">
                        {s.user_id.slice(0, 12)}...
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={s.status === "paid" ? "default" : "secondary"}
                        className={s.status === "paid" ? "bg-[#00C98B]/10 text-[#00A975]" : ""}
                      >
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="font-mono text-xs text-muted-foreground">
                        {s.fingerprint ? `${s.fingerprint.slice(0, 12)}...` : "—"}
                      </code>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Account Info */}
      <Card className="border-[#0A0A0A]/10">
        <CardHeader>
          <CardTitle className="font-heading text-base font-bold">Account Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Joined</span>
            <span className="text-sm font-medium">{new Date(affiliate.created_at).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Commission Rate</span>
            <span className="text-sm font-bold">{affiliate.commission_rate}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Commission Type</span>
            <span className="text-sm font-medium capitalize">{affiliate.commission_type || "percentage"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Payout Method</span>
            <span className="text-sm font-medium capitalize">{affiliate.payout_method || "Not set"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Payout Email</span>
            <span className="text-sm font-medium">{affiliate.payout_email || "—"}</span>
          </div>
          {/* Show bank details from latest payout request if available */}
          {payouts.length > 0 && payouts[0].bank_name && (
            <>
              <div className="my-2 border-t border-[#0A0A0A]/5" />
              <p className="text-xs font-semibold text-muted-foreground">Latest Payout Request Details</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Bank / Service</span>
                <span className="text-sm font-medium">{payouts[0].bank_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Account Number</span>
                <code className="font-mono text-sm">{payouts[0].account_number}</code>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={() => setEditDialog(false)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold">
              Edit Affiliate — {affiliate.name || affiliate.email}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Commission Rate (%)</Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={editForm.commission_rate}
                onChange={(e) => setEditForm({ ...editForm, commission_rate: e.target.value })}
                className="h-11 rounded-xl border-[#0A0A0A]/10 bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Status</Label>
              <Select value={String(editForm.status)} onValueChange={(v) => setEditForm({ ...editForm, status: v ?? "" })}>
                <SelectTrigger className="h-11 rounded-xl border-[#0A0A0A]/10 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="banned">Banned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Payout Method</Label>
              <Select value={String(editForm.payout_method)} onValueChange={(v) => setEditForm({ ...editForm, payout_method: v ?? "" })}>
                <SelectTrigger className="h-11 rounded-xl border-[#0A0A0A]/10 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Payout Email</Label>
              <Input
                type="email"
                value={editForm.payout_email}
                onChange={(e) => setEditForm({ ...editForm, payout_email: e.target.value })}
                className="h-11 rounded-xl border-[#0A0A0A]/10 bg-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-[#00C98B] font-bold text-[#0A0A0A] hover:bg-[#00C98B]/90"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

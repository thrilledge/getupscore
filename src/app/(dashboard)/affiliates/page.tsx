"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Link2,
  Copy,
  Check,
  MousePointerClick,
  Users,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ExternalLink,
  Loader2,
  Share2,
  Award,
  Clock,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface AffiliateStats {
  registered: boolean;
  referral_code: string;
  status: string;
  commission_rate: number;
  commission_type: string;
  total_clicks: number;
  unique_clicks: number;
  total_referrals: number;
  total_signups: number;
  total_conversions: number;
  total_earned: number;
  total_paid_out: number;
  pending_commission: number;
  payout_method: string;
  payout_email: string;
  minimum_payout: number;
  conversion_rate: number;
}

interface Referral {
  id: string;
  user_id: string;
  status: string;
  plan_purchased: string | null;
  converted_at: string | null;
  created_at: string;
}

interface Commission {
  id: string;
  plan: string;
  sale_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
}

interface DailyClick {
  date: string;
  count: number;
}

export default function AffiliateDashboard() {
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [dailyClicks, setDailyClicks] = useState<DailyClick[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [copied, setCopied] = useState(false);
  const [payoutDialog, setPayoutDialog] = useState(false);
  const [payoutEmail, setPayoutEmail] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("paypal");

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://www.getupscore.com";

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [statsRes, referralsRes] = await Promise.all([
        fetch("/api/affiliate/register"),
        fetch("/api/affiliate/referrals"),
      ]);

      const statsData = await statsRes.json();
      if (statsData.ok) setStats(statsData);

      const referralsData = await referralsRes.json();
      if (referralsData.ok) {
        setReferrals(referralsData.referrals);
        setCommissions(referralsData.commissions);
        setDailyClicks(referralsData.dailyClicks);
      }
    } catch {
      console.error("Failed to fetch affiliate data");
    }
    setLoading(false);
  }

  async function handleRegister() {
    setRegistering(true);
    try {
      const res = await fetch("/api/affiliate/register", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        toast.success("You're now an affiliate!");
        fetchData();
      } else {
        toast.error(data.error || "Failed to register");
      }
    } catch {
      toast.error("Network error");
    }
    setRegistering(false);
  }

  function copyLink() {
    if (!stats?.referral_code) return;
    const link = `${baseUrl}/?ref=${stats.referral_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "paid":
        return <Badge className="bg-[#00C98B]/10 text-[#00A975]">Paid</Badge>;
      case "approved":
        return <Badge className="bg-blue-500/10 text-blue-600">Approved</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-600">Rejected</Badge>;
      case "signup":
        return <Badge variant="secondary">Signed Up</Badge>;
      case "active":
        return <Badge className="bg-[#00C98B]/10 text-[#00A975]">Active</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 animate-spin rounded-full border-2 border-white/10 border-t-[#00C98B]" />
      </div>
    );
  }

  // Not registered yet
  if (!stats?.registered) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="border-[#0A0A0A]/10">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-[#00C98B]/10">
              <Award className="size-8 text-[#00C98B]" />
            </div>
            <h2 className="font-heading text-2xl font-bold">Become an Affiliate</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Earn 20% recurring commission for every user you refer. Share your unique link
              and earn money when they upgrade to Pro.
            </p>
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Check className="size-4 text-[#00C98B]" />
                <span>20% recurring commission on every sale</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Check className="size-4 text-[#00C98B]" />
                <span>30-day cookie attribution</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Check className="size-4 text-[#00C98B]" />
                <span>Real-time tracking dashboard</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Check className="size-4 text-[#00C98B]" />
                <span>$50 minimum payout via PayPal</span>
              </div>
            </div>
            <Button
              onClick={handleRegister}
              disabled={registering}
              className="mt-8 rounded-xl bg-[#00C98B] font-bold text-[#0A0A0A] hover:bg-[#00C98B]/90"
            >
              {registering ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Link2 className="size-4" />
                  Join Affiliate Program
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const referralLink = `${baseUrl}/?ref=${stats.referral_code}`;

  const maxClicks = Math.max(...dailyClicks.map(d => d.count), 1);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-heading text-2xl font-bold">Affiliate Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Track your referrals, commissions, and earnings
        </p>
      </div>

      {/* Referral Link */}
      <Card className="border-[#0A0A0A]/10">
        <CardContent className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground">Your Referral Link</p>
              <div className="mt-1.5 flex items-center gap-2">
                <code className="flex-1 truncate rounded-xl bg-[#0A0A0A]/5 px-4 py-2.5 font-mono text-sm font-bold">
                  {referralLink}
                </code>
                <Button
                  onClick={copyLink}
                  variant="outline"
                  className="shrink-0 rounded-xl border-[#0A0A0A]/15"
                >
                  {copied ? <Check className="size-4 text-[#00C98B]" /> : <Copy className="size-4" />}
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => window.open(`https://twitter.com/intent/tweet?text=Check%20out%20UpScore%20-%20AI-powered%20Upwork%20job%20scoring!&url=${encodeURIComponent(referralLink)}`, "_blank")}
                className="rounded-xl border-[#0A0A0A]/15"
              >
                <Share2 className="size-4" />
                Share
              </Button>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Code: {stats.referral_code}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {stats.commission_rate}% commission
            </Badge>
            <Badge variant={stats.status === "active" ? "default" : "secondary"} className={stats.status === "active" ? "bg-[#00C98B]/10 text-[#00A975]" : ""}>
              {stats.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Clicks", value: stats.total_clicks, icon: MousePointerClick, color: "text-blue-500" },
          { label: "Signups", value: stats.total_signups, icon: Users, color: "text-[#00C98B]" },
          { label: "Conversions", value: stats.total_conversions, icon: TrendingUp, color: "text-purple-500" },
          { label: "Conversion Rate", value: `${stats.conversion_rate}%`, icon: Award, color: "text-orange-500" },
        ].map((stat) => (
          <Card key={stat.label} className="border-[#0A0A0A]/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 font-heading text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={`grid size-10 place-items-center rounded-xl bg-[#0A0A0A]/5`}>
                  <stat.icon className={`size-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Earnings */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-[#0A0A0A]/10">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-[#00C98B]/10">
                <DollarSign className="size-6 text-[#00C98B]" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Earned</p>
                <p className="font-heading text-2xl font-bold">${stats.total_earned.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#0A0A0A]/10">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-orange-500/10">
                <Clock className="size-6 text-orange-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Pending</p>
                <p className="font-heading text-2xl font-bold">${stats.pending_commission.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#0A0A0A]/10">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-blue-500/10">
                <Wallet className="size-6 text-blue-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Paid Out</p>
                <p className="font-heading text-2xl font-bold">${stats.total_paid_out.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clicks Chart */}
      <Card className="border-[#0A0A0A]/10">
        <CardHeader>
          <CardTitle className="font-heading text-sm">Clicks (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-32">
            {dailyClicks.map((d) => (
              <div
                key={d.date}
                className="flex-1 rounded-t bg-[#00C98B]/60 transition-all hover:bg-[#00C98B]"
                style={{ height: `${(d.count / maxClicks) * 100}%`, minHeight: d.count > 0 ? "4px" : "1px" }}
                title={`${d.date}: ${d.count} clicks`}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </CardContent>
      </Card>

      {/* Recent Referrals */}
      <Card className="border-[#0A0A0A]/10">
        <CardHeader>
          <CardTitle className="font-heading text-sm">Recent Referrals</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {referrals.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No referrals yet. Share your link to get started!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#0A0A0A]/5 hover:bg-transparent">
                  <TableHead className="font-semibold">User</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Plan</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.slice(0, 10).map((r) => (
                  <TableRow key={r.id} className="border-[#0A0A0A]/5">
                    <TableCell className="font-mono text-xs">{r.user_id.slice(0, 8)}...</TableCell>
                    <TableCell>{getStatusBadge(r.status)}</TableCell>
                    <TableCell>{r.plan_purchased ?? "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Commission History */}
      <Card className="border-[#0A0A0A]/10">
        <CardHeader>
          <CardTitle className="font-heading text-sm">Commission History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {commissions.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No commissions yet. Commissions are earned when referrals upgrade to Pro.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#0A0A0A]/5 hover:bg-transparent">
                  <TableHead className="font-semibold">Sale</TableHead>
                  <TableHead className="font-semibold">Rate</TableHead>
                  <TableHead className="font-semibold">Commission</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((c) => (
                  <TableRow key={c.id} className="border-[#0A0A0A]/5">
                    <TableCell>
                      ${c.sale_amount.toFixed(2)}
                      <span className="ml-1 text-xs text-muted-foreground">({c.plan})</span>
                    </TableCell>
                    <TableCell>{c.commission_rate}%</TableCell>
                    <TableCell className="font-heading font-bold text-[#00A975]">
                      ${c.commission_amount.toFixed(2)}
                    </TableCell>
                    <TableCell>{getStatusBadge(c.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
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
import Link from "next/link";
import {
  Users,
  DollarSign,
  TrendingUp,
  MousePointerClick,
  Link2,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Search,
  ExternalLink,
} from "lucide-react";

interface Affiliate {
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
  commission_breakdown: {
    pending: number;
    approved: number;
    paid: number;
    total: number;
  };
}

interface Summary {
  totalAffiliates: number;
  activeAffiliates: number;
  totalEarned: number;
  totalPaidOut: number;
  totalPending: number;
  totalClicks: number;
  totalConversions: number;
}

export default function AdminAffiliatesPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editDialog, setEditDialog] = useState<Affiliate | null>(null);
  const [editForm, setEditForm] = useState({ commission_rate: "", status: "", payout_method: "", payout_email: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAffiliates();
  }, []);

  async function fetchAffiliates() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/affiliates");
      const data = await res.json();
      if (data.ok) {
        setAffiliates(data.affiliates);
        setSummary(data.summary);
      }
    } catch {
      console.error("Failed to fetch affiliates");
    }
    setLoading(false);
  }

  function openEdit(a: Affiliate) {
    setEditDialog(a);
    setEditForm({
      commission_rate: String(a.commission_rate),
      status: a.status ?? "",
      payout_method: a.payout_method ?? "",
      payout_email: a.payout_email ?? "",
    });
  }

  async function handleSave() {
    if (!editDialog) return;
    setSaving(true);
    try {
      await fetch("/api/admin/affiliates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editDialog.id,
          commission_rate: Number(editForm.commission_rate),
          status: editForm.status,
          payout_method: editForm.payout_method,
          payout_email: editForm.payout_email,
        }),
      });
      setEditDialog(null);
      fetchAffiliates();
    } catch {
      console.error("Failed to save");
    }
    setSaving(false);
  }

  async function toggleStatus(a: Affiliate) {
    try {
      await fetch("/api/admin/affiliates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: a.id,
          status: a.status === "active" ? "paused" : "active",
        }),
      });
      fetchAffiliates();
    } catch {
      console.error("Failed to toggle status");
    }
  }

  const filtered = affiliates.filter(
    (a) =>
      a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.referral_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold text-[#0A0A0A]">Affiliates</h2>
        <p className="text-sm text-muted-foreground">Manage affiliate partners and commissions</p>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Affiliates", value: summary.totalAffiliates, icon: Users },
            { label: "Active", value: summary.activeAffiliates, icon: Link2 },
            { label: "Total Earned", value: `$${summary.totalEarned.toFixed(2)}`, icon: DollarSign },
            { label: "Pending Payout", value: `$${summary.totalPending.toFixed(2)}`, icon: TrendingUp },
          ].map((stat) => (
            <Card key={stat.label} className="border-[#0A0A0A]/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 font-heading text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className="grid size-10 place-items-center rounded-xl bg-[#00C98B]/10">
                    <stat.icon className="size-5 text-[#00A975]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Input
          placeholder="Search by email, name, or code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-11 rounded-xl border-[#0A0A0A]/10 bg-white pl-10"
        />
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>

      {/* Table */}
      <Card className="border-[#0A0A0A]/10">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="size-6 animate-spin rounded-full border-2 border-white/10 border-t-[#00C98B]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {searchQuery ? "No affiliates match your search" : "No affiliates yet"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#0A0A0A]/5 hover:bg-transparent">
                  <TableHead className="font-semibold">Affiliate</TableHead>
                  <TableHead className="font-semibold">Code</TableHead>
                  <TableHead className="font-semibold">Commission</TableHead>
                  <TableHead className="font-semibold">Clicks</TableHead>
                  <TableHead className="font-semibold">Conversions</TableHead>
                  <TableHead className="font-semibold">Earned</TableHead>
                  <TableHead className="font-semibold">Pending</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id} className="border-[#0A0A0A]/5">
                    <TableCell>
                      <Link href={`/admin/affiliates/${a.id}`} className="group">
                        <p className="font-semibold text-sm text-[#0A0A0A] transition-colors group-hover:text-[#00A975]">{a.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground group-hover:text-[#00A975]/70">{a.email}</p>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <code className="rounded-lg bg-[#0A0A0A]/5 px-2 py-1 font-mono text-xs font-bold">
                        {a.referral_code}
                      </code>
                    </TableCell>
                    <TableCell>
                      <span className="font-heading font-bold">{a.commission_rate}%</span>
                    </TableCell>
                    <TableCell>
                      <span>{a.total_clicks}</span>
                      <span className="text-xs text-muted-foreground"> / {a.unique_clicks} unique</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{a.total_conversions}</span>
                      <span className="text-xs text-muted-foreground"> / {a.total_signups} signups</span>
                    </TableCell>
                    <TableCell className="font-heading font-bold text-[#00A975]">
                      ${a.total_earned.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      ${a.pending_commission.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={a.status === "active" ? "default" : "secondary"}
                        className={a.status === "active" ? "bg-[#00C98B]/10 text-[#00A975]" : a.status === "banned" ? "bg-red-500/10 text-red-600" : ""}
                      >
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleStatus(a)}
                          className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-[#00C98B]/10 hover:text-[#00A975]"
                          title={a.status === "active" ? "Pause" : "Activate"}
                        >
                          {a.status === "active" ? (
                            <ToggleRight className="size-4 text-[#00C98B]" />
                          ) : (
                            <ToggleLeft className="size-4" />
                          )}
                        </button>
                        <button
                          onClick={() => openEdit(a)}
                          className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-blue-500/10 hover:text-blue-600"
                          title="Edit"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold">
              Edit Affiliate — {editDialog?.name || editDialog?.email}
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
            <Button variant="outline" onClick={() => setEditDialog(null)} className="rounded-xl">
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

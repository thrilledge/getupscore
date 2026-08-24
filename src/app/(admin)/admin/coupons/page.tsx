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
import {
  Tag,
  Plus,
  Trash2,
  Pencil,
  Copy,
  Check,
  Percent,
  DollarSign,
  X,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Users,
  Zap,
} from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  max_uses_per_user: number;
  allowed_plans: string[] | null;
  starts_at: string | null;
  expires_at: string | null;
  active: boolean;
  created_at: string;
  usage_count: number;
  total_discount_given: number;
}

interface CouponForm {
  code: string;
  description: string;
  discount_type: "percent" | "fixed";
  discount_value: string;
  max_uses: string;
  max_uses_per_user: string;
  allowed_plans: string[];
  starts_at: string;
  expires_at: string;
}

const emptyForm: CouponForm = {
  code: "",
  description: "",
  discount_type: "percent",
  discount_value: "",
  max_uses: "",
  max_uses_per_user: "1",
  allowed_plans: [],
  starts_at: "",
  expires_at: "",
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchCoupons();
  }, []);

  async function fetchCoupons() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/coupons");
      const data = await res.json();
      if (data.ok) setCoupons(data.coupons);
    } catch {
      console.error("Failed to fetch coupons");
    }
    setLoading(false);
  }

  function openCreateDialog() {
    setEditingCoupon(null);
    setForm(emptyForm);
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(coupon: Coupon) {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      description: coupon.description ?? "",
      discount_type: coupon.discount_type,
      discount_value: String(coupon.discount_value),
      max_uses: coupon.max_uses ? String(coupon.max_uses) : "",
      max_uses_per_user: String(coupon.max_uses_per_user),
      allowed_plans: coupon.allowed_plans ?? [],
      starts_at: coupon.starts_at ? coupon.starts_at.slice(0, 16) : "",
      expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 16) : "",
    });
    setError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    setError(null);
    setSaving(true);

    if (!form.code.trim()) {
      setError("Code is required");
      setSaving(false);
      return;
    }

    if (!form.discount_value || Number(form.discount_value) <= 0) {
      setError("Discount value must be greater than 0");
      setSaving(false);
      return;
    }

    if (form.discount_type === "percent" && Number(form.discount_value) > 100) {
      setError("Percent discount cannot exceed 100%");
      setSaving(false);
      return;
    }

    const payload = {
      ...(editingCoupon ? { id: editingCoupon.id } : {}),
      code: form.code.trim(),
      description: form.description.trim() || null,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      max_uses_per_user: Number(form.max_uses_per_user) || 1,
      allowed_plans: form.allowed_plans.length ? form.allowed_plans : null,
      starts_at: form.starts_at || new Date().toISOString(),
      expires_at: form.expires_at || null,
    };

    try {
      const method = editingCoupon ? "PUT" : "POST";
      const res = await fetch("/api/admin/coupons", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save coupon");
        setSaving(false);
        return;
      }

      setDialogOpen(false);
      fetchCoupons();
    } catch {
      setError("Network error");
    }
    setSaving(false);
  }

  async function handleToggleActive(coupon: Coupon) {
    try {
      await fetch("/api/admin/coupons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: coupon.id, active: !coupon.active }),
      });
      fetchCoupons();
    } catch {
      console.error("Failed to toggle coupon");
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/admin/coupons?id=${id}`, { method: "DELETE" });
      setDeleteConfirm(null);
      fetchCoupons();
    } catch {
      console.error("Failed to delete coupon");
    }
  }

  function copyCode(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function isExpired(coupon: Coupon) {
    return coupon.expires_at && new Date(coupon.expires_at) < new Date();
  }

  function isMaxedOut(coupon: Coupon) {
    return coupon.max_uses !== null && coupon.used_count >= coupon.max_uses;
  }

  function formatDiscount(coupon: Coupon) {
    return coupon.discount_type === "percent"
      ? `${coupon.discount_value}%`
      : `$${coupon.discount_value}`;
  }

  const filtered = coupons.filter(
    (c) =>
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: coupons.length,
    active: coupons.filter((c) => c.active && !isExpired(c)).length,
    totalUses: coupons.reduce((s, c) => s + c.usage_count, 0),
    totalDiscount: coupons.reduce((s, c) => s + c.total_discount_given, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-[#0A0A0A]">
            Coupons
          </h2>
          <p className="text-sm text-muted-foreground">
            Create and manage discount codes for Paddle subscriptions
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="rounded-xl bg-[#00C98B] font-bold text-[#0A0A0A] hover:bg-[#00C98B]/90"
        >
          <Plus className="size-4" />
          Create Coupon
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Coupons", value: stats.total, icon: Tag },
          { label: "Active", value: stats.active, icon: Zap },
          { label: "Total Uses", value: stats.totalUses, icon: Users },
          { label: "Discount Given", value: `$${stats.totalDiscount.toFixed(2)}`, icon: DollarSign },
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

      {/* Search */}
      <div className="relative">
        <Input
          placeholder="Search coupons..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-11 rounded-xl border-[#0A0A0A]/10 bg-white pl-10"
        />
        <Tag className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
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
              {searchQuery ? "No coupons match your search" : "No coupons yet. Create one to get started."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#0A0A0A]/5 hover:bg-transparent">
                  <TableHead className="font-semibold">Code</TableHead>
                  <TableHead className="font-semibold">Discount</TableHead>
                  <TableHead className="font-semibold">Uses</TableHead>
                  <TableHead className="font-semibold">Plans</TableHead>
                  <TableHead className="font-semibold">Expires</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((coupon) => {
                  const expired = isExpired(coupon);
                  const maxed = isMaxedOut(coupon);
                  const status = !coupon.active
                    ? "disabled"
                    : expired
                      ? "expired"
                      : maxed
                        ? "maxed"
                        : "active";

                  return (
                    <TableRow key={coupon.id} className="border-[#0A0A0A]/5">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="rounded-lg bg-[#0A0A0A]/5 px-2.5 py-1 font-mono text-sm font-bold">
                            {coupon.code}
                          </code>
                          <button
                            onClick={() => copyCode(coupon.code, coupon.id)}
                            className="text-muted-foreground transition-colors hover:text-[#00A975]"
                          >
                            {copiedId === coupon.id ? (
                              <Check className="size-3.5 text-[#00C98B]" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                          </button>
                        </div>
                        {coupon.description && (
                          <p className="mt-1 max-w-[200px] truncate text-xs text-muted-foreground">
                            {coupon.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {coupon.discount_type === "percent" ? (
                            <Percent className="size-3.5 text-[#00A975]" />
                          ) : (
                            <DollarSign className="size-3.5 text-[#00A975]" />
                          )}
                          <span className="font-heading font-bold">
                            {formatDiscount(coupon)}
                          </span>
                          <span className="text-xs text-muted-foreground">off</span>
                        </div>
                        {coupon.total_discount_given > 0 && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            ${coupon.total_discount_given.toFixed(2)} given
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {coupon.usage_count}
                        </span>
                        {coupon.max_uses && (
                          <span className="text-xs text-muted-foreground">
                            {" "}/ {coupon.max_uses}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {coupon.allowed_plans?.length ? (
                          <div className="flex gap-1">
                            {coupon.allowed_plans.map((p) => (
                              <Badge key={p} variant="secondary" className="text-xs">
                                {p}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">All plans</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {coupon.expires_at ? (
                          <span className="text-xs">
                            {new Date(coupon.expires_at).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={status === "active" ? "default" : "secondary"}
                          className={
                            status === "active"
                              ? "bg-[#00C98B]/10 text-[#00A975]"
                              : status === "expired"
                                ? "bg-orange-500/10 text-orange-600"
                                : "bg-red-500/10 text-red-600"
                          }
                        >
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleToggleActive(coupon)}
                            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-[#00C98B]/10 hover:text-[#00A975]"
                            title={coupon.active ? "Disable" : "Enable"}
                          >
                            {coupon.active ? (
                              <ToggleRight className="size-4 text-[#00C98B]" />
                            ) : (
                              <ToggleLeft className="size-4" />
                            )}
                          </button>
                          <button
                            onClick={() => openEditDialog(coupon)}
                            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-blue-500/10 hover:text-blue-600"
                            title="Edit"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(coupon.id)}
                            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold">
              {editingCoupon ? "Edit Coupon" : "Create Coupon"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3.5 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Code *</Label>
              <Input
                placeholder="e.g. SUMMER25, LAUNCH50"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().trim() })}
                className="h-11 rounded-xl border-[#0A0A0A]/10 bg-white font-mono font-bold uppercase"
              />
              <p className="text-xs text-muted-foreground">
                Users will enter this code at checkout
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Description</Label>
              <Input
                placeholder="e.g. Summer sale - 25% off"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="h-11 rounded-xl border-[#0A0A0A]/10 bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Discount Type *</Label>
                <Select
                  value={form.discount_type}
                  onValueChange={(v) => setForm({ ...form, discount_type: v as "percent" | "fixed" })}
                >
                  <SelectTrigger className="h-11 rounded-xl border-[#0A0A0A]/10 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">
                      <div className="flex items-center gap-2">
                        <Percent className="size-3.5" />
                        Percentage
                      </div>
                    </SelectItem>
                    <SelectItem value="fixed">
                      <div className="flex items-center gap-2">
                        <DollarSign className="size-3.5" />
                        Fixed Amount
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  {form.discount_type === "percent" ? "Percentage (%)" : "Amount ($)"} *
                </Label>
                <Input
                  type="number"
                  min="0"
                  max={form.discount_type === "percent" ? "100" : undefined}
                  step={form.discount_type === "percent" ? "1" : "0.01"}
                  placeholder={form.discount_type === "percent" ? "25" : "5.00"}
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  className="h-11 rounded-xl border-[#0A0A0A]/10 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Max Total Uses</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={form.max_uses}
                  onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                  className="h-11 rounded-xl border-[#0A0A0A]/10 bg-white"
                />
                <p className="text-xs text-muted-foreground">Leave empty for unlimited</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Max Uses Per User</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.max_uses_per_user}
                  onChange={(e) => setForm({ ...form, max_uses_per_user: e.target.value })}
                  className="h-11 rounded-xl border-[#0A0A0A]/10 bg-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Plan Restrictions</Label>
              <div className="flex gap-2">
                {["monthly", "yearly"].map((plan) => (
                  <button
                    key={plan}
                    type="button"
                    onClick={() => {
                      const plans = form.allowed_plans.includes(plan)
                        ? form.allowed_plans.filter((p) => p !== plan)
                        : [...form.allowed_plans, plan];
                      setForm({ ...form, allowed_plans: plans });
                    }}
                    className={`rounded-xl border-2 px-4 py-2 text-sm font-semibold capitalize transition-all ${
                      form.allowed_plans.includes(plan) || form.allowed_plans.length === 0
                        ? "border-[#00C98B] bg-[#00C98B]/10 text-[#00A975]"
                        : "border-[#0A0A0A]/10 text-muted-foreground hover:border-[#0A0A0A]/20"
                    }`}
                  >
                    {plan}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave none selected for all plans
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Start Date</Label>
                <Input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                  className="h-11 rounded-xl border-[#0A0A0A]/10 bg-white"
                />
                <p className="text-xs text-muted-foreground">Defaults to now</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Expiry Date</Label>
                <Input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  className="h-11 rounded-xl border-[#0A0A0A]/10 bg-white"
                />
                <p className="text-xs text-muted-foreground">Leave empty for no expiry</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-[#00C98B] font-bold text-[#0A0A0A] hover:bg-[#00C98B]/90"
            >
              {saving ? "Saving..." : editingCoupon ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold">Delete Coupon?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete this coupon and all its usage records. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="rounded-xl bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

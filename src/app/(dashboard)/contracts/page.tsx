"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Briefcase,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";

interface Contract {
  id: string;
  title: string;
  client_name: string | null;
  client_url: string | null;
  client_rating: number | null;
  type: "hourly" | "fixed";
  status: "active" | "closed" | "cancelled";
  hourly_rate: number | null;
  fixed_price: number | null;
  total_hours: number | null;
  total_earned: number | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "closed">("active");

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/contracts");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setContracts(data.contracts ?? []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  const handleClose = useCallback(async (contract: Contract) => {
    try {
      const res = await fetch("/api/contracts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: contract.id, status: "closed", ended_at: new Date().toISOString().split("T")[0] }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Contract closed.");
      await fetchContracts();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  }, [fetchContracts]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this contract?")) return;
    try {
      const res = await fetch(`/api/contracts?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Contract deleted.");
      await fetchContracts();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }, [fetchContracts]);

  const activeContracts = contracts.filter((c) => c.status === "active");
  const historyContracts = contracts.filter((c) => c.status === "closed" || c.status === "cancelled");
  const displayed = tab === "active" ? activeContracts : historyContracts;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">Contracts</h1>
          <p className="text-muted-foreground mt-1">
            Your Upwork contracts synced via the extension.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchContracts} disabled={loading}>
          <RefreshCw className={`size-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex items-center gap-4 border-b border-border/60 pb-3">
        <button onClick={() => setTab("active")}
          className={`text-sm font-medium pb-1 border-b-2 transition-colors ${tab === "active" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          Active ({activeContracts.length})
        </button>
        <button onClick={() => setTab("closed")}
          className={`text-sm font-medium pb-1 border-b-2 transition-colors ${tab === "closed" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          History ({historyContracts.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : displayed.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <Briefcase className="size-8 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium">No {tab} contracts</p>
            <p className="text-sm mt-1">
              Install the extension and visit your contracts page on Upwork to sync them here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayed.map((contract) => (
            <Card key={contract.id} className="border-border/60">
              <CardContent className="py-4 px-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{contract.title}</p>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        contract.status === "active"
                          ? "bg-accent-green/10 text-accent-green"
                          : contract.status === "closed"
                          ? "bg-muted/50 text-muted-foreground"
                          : "bg-destructive/10 text-destructive"
                      }`}>
                        {contract.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {contract.client_name && <span>{contract.client_name} · </span>}
                      {contract.type === "hourly"
                        ? `${contract.hourly_rate ? `$${contract.hourly_rate}/hr` : "Hourly"}`
                        : `Fixed: $${contract.fixed_price?.toLocaleString() ?? "—"}`}
                      {contract.total_hours ? ` · ${contract.total_hours}h worked` : ""}
                      {contract.total_earned ? ` · Earned: $${contract.total_earned.toLocaleString()}` : ""}
                      {contract.started_at ? ` · Started ${new Date(contract.started_at).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {contract.status === "active" && (
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => handleClose(contract)}>
                        <CheckCircle2 className="size-3 mr-1" /> Close
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => handleDelete(contract.id)}>
                      <XCircle className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

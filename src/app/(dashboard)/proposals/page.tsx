"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  FileText,
  Loader2,
  Copy,
  Clock,
  ExternalLink,
  Trash2,
  RefreshCw,
} from "lucide-react";

interface ProposalItem {
  id: string;
  generated_text: string;
  final_text: string | null;
  score: number | null;
  status: string;
  created_at: string;
  job: {
    title: string;
    url: string | null;
    upwork_job_id: string;
  } | null;
}

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const fetchProposals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/proposals");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProposals(data.proposals || []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const copyProposal = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Proposal copied to clipboard!");
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this proposal?")) return;

    try {
      const res = await fetch(`/api/proposals?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Proposal deleted");
      await fetchProposals();
    } catch (err: unknown) {
      toast.error(`Delete failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, [fetchProposals]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">Proposals</h1>
          <p className="text-muted-foreground mt-1">
            Every proposal you&apos;ve written with AI — from the job chat or the extension.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchProposals} disabled={loading}>
          <RefreshCw className={`size-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-destructive">Error loading proposals: {error}</p>
            <Button variant="outline" className="mt-4" onClick={fetchProposals}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : proposals.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Proposal Activity</CardTitle>
            <CardDescription>
              Your AI-written proposals will show up here automatically
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-12 text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-2xl bg-muted/50 p-4 ring-1 ring-border/50">
                <FileText className="size-8 text-muted-foreground/50" />
              </div>
              <div>
                <p className="font-medium">No proposals written yet</p>
                <p className="text-sm mt-1 max-w-md">
                  Open any job and use the Job Assistant to draft a proposal — it&apos;s saved here
                  automatically. Proposals written with the extension land here too.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => {
            const isViewing = viewingId === proposal.id;
            return (
              <Card key={proposal.id} className="border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-heading">
                        {proposal.job?.title || "Untitled Job"}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {new Date(proposal.created_at).toLocaleDateString()}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          proposal.status === "draft"
                            ? "bg-accent-amber/10 text-accent-amber"
                            : proposal.status === "sent"
                            ? "bg-accent-blue/10 text-accent-blue"
                            : proposal.status === "won"
                            ? "bg-accent-green/10 text-accent-green"
                            : "bg-muted/50 text-muted-foreground"
                        }`}>
                          {proposal.status}
                        </span>
                        {proposal.score && (
                          <span className="flex items-center gap-1 text-accent-purple">
                            Score: {proposal.score}/100
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      {proposal.job?.url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => window.open(proposal.job!.url!, "_blank")}
                          title="View on Upwork"
                        >
                          <ExternalLink className="size-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => copyProposal(proposal.final_text || proposal.generated_text)}
                        title="Copy proposal"
                      >
                        <Copy className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive"
                        onClick={() => handleDelete(proposal.id)}
                        title="Delete"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <div
                      className={`prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap ${
                        !isViewing ? "line-clamp-4" : ""
                      }`}
                    >
                      {proposal.final_text || proposal.generated_text}
                    </div>
                    {!isViewing && (
                      <button
                        onClick={() => setViewingId(proposal.id)}
                        className="mt-2 text-xs text-accent-blue hover:underline"
                      >
                        Show full proposal
                      </button>
                    )}
                    {isViewing && (
                      <button
                        onClick={() => setViewingId(null)}
                        className="mt-2 text-xs text-accent-blue hover:underline"
                      >
                        Show less
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

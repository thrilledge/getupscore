"use client";

import {
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Sparkles,
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
  const [proposals, setProposals] = useState<
    ProposalItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<
    string | null
  >(null);

  const fetchProposals = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/proposals");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      setProposals(data.proposals || []);
      setError(null);
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Unknown error"
      );
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

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this proposal?")) return;

      try {
        const response = await fetch(
          `/api/proposals?id=${id}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          throw new Error("Delete failed");
        }

        toast.success("Proposal deleted");
        await fetchProposals();
      } catch (error: unknown) {
        toast.error(
          `Delete failed: ${error instanceof Error
            ? error.message
            : "Unknown error"
          }`
        );
      }
    },
    [fetchProposals]
  );

  if (loading) {
    return (
      <div className="relative flex min-h-[60vh] items-center justify-center overflow-hidden rounded-[24px] bg-[#0A0A0A]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00C98B]/15 blur-[110px]"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,201,139,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,139,0.07) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(circle at center, black, transparent 70%)",
            WebkitMaskImage:
              "radial-gradient(circle at center, black, transparent 70%)",
          }}
        />

        <div className="relative z-10 flex flex-col items-center">
          <span className="relative grid size-14 place-items-center rounded-2xl border border-[#00C98B]/25 bg-[#00C98B]/10">
            <Loader2 className="size-6 animate-spin text-[#00C98B]" />
          </span>

          <p className="mt-4 font-heading text-sm font-semibold text-white">
            Loading proposals
          </p>

          <p className="mt-1 text-xs text-white/35">
            Preparing your AI-written proposals...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <section className="animate-in fade-in slide-in-from-bottom-2 relative overflow-hidden rounded-[22px] border border-white/10 bg-[#0A0A0A] px-5 py-5 text-white shadow-[0_16px_40px_rgba(0,0,0,0.13)] duration-500 sm:px-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,201,139,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,139,0.07) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "linear-gradient(to right, transparent, black)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black)",
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 size-60 rounded-full bg-[#00C98B]/15 blur-[100px]"
        />

        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl border border-[#00C98B]/30 bg-[#00C98B]/10 text-[#00C98B]">
              <FileText className="size-5" />

              {/* <Sparkles className="absolute -right-1.5 -top-1.5 size-3.5 text-[#00C98B]" /> */}
            </span>

            <div>
              {/* <div className="mb-1 flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-[#00C98B] shadow-[0_0_8px_rgba(0,201,139,0.8)]" />

                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#00C98B]">
                  AI proposal workspace
                </span>
              </div> */}

              <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                Proposals
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-white/50">
                Every proposal you&apos;ve written with AI —
                from the job chat or the extension.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-9 items-center rounded-xl border border-[#00C98B]/25 bg-[#00C98B]/10 px-3 text-xs font-semibold text-[#00C98B]">
              {proposals.length} proposal
              {proposals.length !== 1 ? "s" : ""}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchProposals}
              disabled={loading}
              className="h-9 rounded-xl border-[#00C98B]/35 bg-[#00C98B]/10 px-3 text-[#00C98B] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C98B] hover:bg-[#00C98B] hover:text-[#0A0A0A]"
            >
              <RefreshCw
                className={`size-4 ${loading ? "animate-spin" : ""
                  }`}
              />

              Refresh
            </Button>
          </div>
        </div>
      </section>

      {/* Error state */}
      {error ? (
        <Card className="animate-in fade-in slide-in-from-bottom-2 gap-0 overflow-hidden rounded-[20px] border border-[#0A0A0A]/12 bg-white py-0 shadow-[0_8px_28px_rgba(0,0,0,0.045)] duration-500">
          <div className="h-[3px] bg-[#0A0A0A]" />

          <CardContent className="flex flex-col items-center px-5 py-9 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-[#00C98B]/10 text-[#00A975]">
              <FileText className="size-5" />
            </span>

            <h2 className="mt-4 font-heading text-lg font-bold text-[#0A0A0A]">
              Failed to load proposals
            </h2>

            <p className="mt-1 max-w-md text-sm leading-6 text-[#0A0A0A]/50">
              Error loading proposals: {error}
            </p>

            <Button
              variant="outline"
              className="mt-4 h-9 rounded-xl border-[#0A0A0A]/10 bg-white px-4 font-semibold text-[#0A0A0A] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C98B]/40 hover:bg-[#00C98B]/5 hover:text-[#00A975]"
              onClick={fetchProposals}
            >
              <RefreshCw className="size-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : proposals.length === 0 ? (
        /* Empty state */
        <Card className="animate-in fade-in slide-in-from-bottom-3 relative gap-0 overflow-hidden rounded-[22px] border border-white/10 bg-[#0A0A0A] py-0 text-white shadow-[0_16px_45px_rgba(0,0,0,0.13)] duration-500">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0,201,139,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,139,0.07) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
              maskImage:
                "radial-gradient(circle at center, black, transparent 75%)",
              WebkitMaskImage:
                "radial-gradient(circle at center, black, transparent 75%)",
            }}
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00C98B]/15 blur-[100px]"
          />

          <CardHeader className="relative z-10 items-center px-5 pb-0 pt-10 text-center">
            <span className="relative grid size-16 place-items-center rounded-[20px] border border-[#00C98B]/30 bg-[#00C98B]/10 text-[#00C98B] shadow-[0_15px_35px_rgba(0,201,139,0.1)]">
              <FileText className="size-7" />

              {/* <Sparkles className="absolute -right-1.5 -top-1.5 size-4" /> */}
            </span>

            <CardTitle className="mt-4 font-heading text-xl font-bold text-white">
              No proposals written yet
            </CardTitle>

            <CardDescription className="mx-auto mt-1 max-w-md text-center text-sm leading-6 text-white/50">
              Your AI-written proposals will show up here
              automatically.
            </CardDescription>
          </CardHeader>

          <CardContent className="relative z-10 flex flex-col items-center px-5 pb-11 pt-4 text-center">
            <p className="max-w-lg text-sm leading-6 text-white/45">
              Open any job and use the Job Assistant to draft
              a proposal. Proposals written through the
              extension will appear here too.
            </p>

            <Button
              render={<a href="/jobs" />}
              className="mt-6 h-10 rounded-full bg-[#00C98B] px-5 font-bold text-[#0A0A0A] shadow-[0_12px_30px_rgba(0,201,139,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#00C98B]/90"
            >
              <FileText className="size-4" />
              Browse jobs
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Proposals list */
        <div className="space-y-4">
          {proposals.map((proposal, index) => {
            const isViewing =
              viewingId === proposal.id;

            return (
              <Card
                key={proposal.id}
                className="animate-in fade-in slide-in-from-bottom-2 group relative gap-0 overflow-hidden rounded-[20px] border border-[#0A0A0A]/10 bg-white py-0 shadow-[0_7px_24px_rgba(0,0,0,0.035)] fill-mode-both transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C98B]/30 hover:shadow-[0_14px_32px_rgba(0,201,139,0.08)]"
                style={{
                  animationDelay: `${index * 60}ms`,
                  animationDuration: "450ms",
                }}
              >
                <div className="absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-[#00C98B] transition-transform duration-300 group-hover:scale-x-100" />

                <CardHeader className="border-b border-[#0A0A0A]/7 px-4 pb-4 pt-5 sm:px-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <CardTitle className="line-clamp-2 font-heading text-base font-bold leading-6 text-[#0A0A0A] transition-colors group-hover:text-[#00A975]">
                        {proposal.job?.title ||
                          "Untitled Job"}
                      </CardTitle>

                      <CardDescription className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 text-[#0A0A0A]/45">
                          <Clock className="size-3.5 text-[#00A975]" />

                          {new Date(
                            proposal.created_at
                          ).toLocaleDateString()}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${proposal.status === "won"
                            ? "border-[#00C98B] bg-[#00C98B] text-[#0A0A0A]"
                            : proposal.status === "sent"
                              ? "border-[#00C98B]/25 bg-[#00C98B]/10 text-[#008F64]"
                              : proposal.status === "draft"
                                ? "border-[#00C98B]/25 bg-white text-[#00A975]"
                                : "border-[#0A0A0A]/10 bg-[#0A0A0A]/5 text-[#0A0A0A]/45"
                            }`}
                        >
                          {proposal.status}
                        </span>

                        {proposal.score && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-[#00C98B]/20 bg-[#00C98B]/7 px-2.5 py-1 text-[9px] font-bold text-[#008F64]">
                            <Sparkles className="size-3" />
                            Score: {proposal.score}/100
                          </span>
                        )}
                      </CardDescription>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {proposal.job?.url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-9 rounded-xl text-[#0A0A0A]/40 transition-all duration-200 hover:bg-[#00C98B]/10 hover:text-[#00A975]"
                          onClick={() =>
                            window.open(
                              proposal.job!.url!,
                              "_blank"
                            )
                          }
                          title="View on Upwork"
                        >
                          <ExternalLink className="size-4" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-xl text-[#0A0A0A]/40 transition-all duration-200 hover:bg-[#00C98B]/10 hover:text-[#00A975]"
                        onClick={() =>
                          copyProposal(
                            proposal.final_text ||
                            proposal.generated_text
                          )
                        }
                        title="Copy proposal"
                      >
                        <Copy className="size-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-xl text-[#0A0A0A]/35 transition-all duration-200 hover:bg-[#0A0A0A]/7 hover:text-[#0A0A0A]"
                        onClick={() =>
                          handleDelete(proposal.id)
                        }
                        title="Delete"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="px-4 py-4 sm:px-5">
                  <div className="relative rounded-2xl border border-[#0A0A0A]/7 bg-[#F8F9F9] p-4">
                    <div
                      className={`max-w-none whitespace-pre-wrap text-sm leading-6 text-[#0A0A0A]/65 ${!isViewing ? "line-clamp-4" : ""
                        }`}
                    >
                      {proposal.final_text ||
                        proposal.generated_text}
                    </div>

                    {!isViewing && (
                      <button
                        type="button"
                        onClick={() =>
                          setViewingId(proposal.id)
                        }
                        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#00A975] transition-colors hover:text-[#00C98B]"
                      >
                        Show full proposal
                      </button>
                    )}

                    {isViewing && (
                      <button
                        type="button"
                        onClick={() => setViewingId(null)}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#00A975] transition-colors hover:text-[#00C98B]"
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
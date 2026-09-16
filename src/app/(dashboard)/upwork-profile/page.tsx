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
import { ProfileAuditChat } from "@/components/profile-audit-chat";
import { ChatLauncher } from "@/components/chat-launcher";
import { toast } from "sonner";
import {
  UserCircle,
  Loader2,
  Star,
  Briefcase,
  Wallet,
  ExternalLink,
  RefreshCw,
  Sparkles,
  MapPin,
  Clock,
} from "lucide-react";

interface PortfolioItem {
  title: string;
  description?: string;
  url?: string;
  images?: string[];
  skills?: string[];
}

export default function UpworkProfilePage() {
  const [profile, setProfile] = useState<Record<
    string,
    unknown
  > | null>(null);

  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/upwork-profile"
      );

      if (!response.ok) {
        throw new Error("Failed to load");
      }

      const data = await response.json();

      setProfile(data.profile);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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
          <span className="grid size-14 place-items-center rounded-2xl border border-[#00C98B]/25 bg-[#00C98B]/10">
            <Loader2 className="size-6 animate-spin text-[#00C98B]" />
          </span>

          <p className="mt-4 font-heading text-sm font-semibold text-white">
            Loading your profile
          </p>

          <p className="mt-1 text-xs text-white/35">
            Syncing your Upwork information...
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
              <UserCircle className="size-5" />

              {/* <Sparkles className="absolute -right-1.5 -top-1.5 size-3.5" /> */}
            </span>

            <div>
              {/* <div className="mb-1 flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-[#00C98B] shadow-[0_0_8px_rgba(0,201,139,0.8)]" />

                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#00C98B]">
                  Freelancer intelligence
                </span>
              </div> */}

              <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                Upwork Profile
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-white/50">
                Your freelancer profile synced from Upwork
                through the extension.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold ${profile
                ? "border-[#00C98B]/25 bg-[#00C98B]/10 text-[#00C98B]"
                : "border-white/10 bg-white/[0.045] text-white/45"
                }`}
            >
              <span
                className={`size-1.5 rounded-full ${profile
                  ? "bg-[#00C98B] shadow-[0_0_8px_rgba(0,201,139,0.8)]"
                  : "bg-white/25"
                  }`}
              />

              {profile
                ? "Profile synced"
                : "Not connected"}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchProfile}
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

      <div className="grid grid-cols-1 items-start gap-5">
        <div className="min-w-0 space-y-5">
          {!profile ? (
            /* No profile state */
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
                <span className="relative grid size-16 place-items-center rounded-[20px] border border-[#00C98B]/30 bg-[#00C98B]/10 text-[#00C98B] shadow-[0_15px_35px_rgba(0,201,139,0.1)] m-auto">
                  <UserCircle className="size-8" />

                  <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-[#0A0A0A] bg-[#00C98B]" />
                </span>

                <CardTitle className="mt-4 font-heading text-xl font-bold text-white">
                  No profile synced
                </CardTitle>
              </CardHeader>

              <CardContent className="relative z-10 px-5 pb-11 pt-4 text-center">
                <p className="mx-auto max-w-lg text-sm leading-6 text-white/45">
                  The UpScore extension automatically syncs
                  your freelancer profile when you visit your
                  profile page on Upwork.
                </p>
              </CardContent>
            </Card>
          ) : (
            /* Profile information */
            <Card className="animate-in fade-in slide-in-from-bottom-2 group gap-0 overflow-hidden rounded-[22px] border border-[#0A0A0A]/10 bg-white py-0 shadow-[0_8px_28px_rgba(0,0,0,0.045)] duration-500">
              <div className="h-[3px] bg-[#00C98B]" />

              <CardHeader className="border-b border-[#0A0A0A]/7 px-5 pb-5 pt-5 sm:px-6">
                <div className="flex items-start gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[#00C98B]/20 bg-[#00C98B]/10 text-[#00A975]">
                    <UserCircle className="size-5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <CardTitle className="font-heading text-lg font-bold leading-6 text-[#0A0A0A] sm:text-xl">
                      {(profile.title as string) ||
                        "Untitled Profile"}
                    </CardTitle>

                    <CardDescription className="mt-1">
                      {profile.upwork_url ? (
                        <a
                          href={
                            profile.upwork_url as string
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#00A975] transition-colors hover:text-[#00C98B] hover:underline"
                        >
                          View on Upwork
                          <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-[#0A0A0A]/40">
                          No URL linked
                        </span>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 px-5 py-5 sm:px-6">
                {/* Bio */}
                <div className="rounded-2xl border border-[#0A0A0A]/7 bg-[#F8F9F9] p-4">
                  <p className="text-sm leading-6 text-[#0A0A0A]/60">
                    {(profile.bio as string) ||
                      "No bio synced."}
                  </p>
                </div>

                {/* Profile statistics */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                  {[
                    {
                      label: "Hourly Rate",
                      value: profile.hourly_rate
                        ? `$${profile.hourly_rate}/hr`
                        : "—",
                      icon: Wallet,
                    },
                    {
                      label: "Total Earned",
                      value: profile.total_earnings
                        ? `$${Number(
                          profile.total_earnings
                        ).toLocaleString()}`
                        : "—",
                      icon: Wallet,
                    },
                    {
                      label: "Jobs Done",
                      value:
                        profile.total_jobs_done ?? "—",
                      icon: Briefcase,
                    },
                    {
                      label: "Rating",
                      value: profile.client_rating
                        ? `${profile.client_rating}/5`
                        : "—",
                      icon: Star,
                    },
                    {
                      label: "Location",
                      value:
                        (profile.location as string) ??
                        "—",
                      icon: MapPin,
                    },
                    {
                      label: "Availability",
                      value:
                        (profile.availability as string) ??
                        "—",
                      icon: Clock,
                    },
                  ].map((stat) => {
                    const Icon = stat.icon;

                    return (
                      <div
                        key={stat.label}
                        className="group/stat rounded-2xl border border-[#0A0A0A]/9 bg-white p-3 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C98B]/30 hover:shadow-[0_10px_24px_rgba(0,201,139,0.07)]"
                      >
                        <span className="mx-auto grid size-8 place-items-center rounded-xl bg-[#00C98B]/10 text-[#00A975] transition-colors duration-300 group-hover/stat:bg-[#00C98B] group-hover/stat:text-[#0A0A0A]">
                          <Icon className="size-4" />
                        </span>

                        <p className="mt-2 font-heading text-lg font-bold leading-none text-[#0A0A0A]">
                          {String(stat.value)}
                        </p>

                        <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#0A0A0A]/40">
                          {stat.label}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Skills */}
                {Array.isArray(profile.skills) &&
                  (profile.skills as string[]).length >
                  0 && (
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <p className="font-heading text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A0A0A]/50">
                          Skills
                        </p>

                        <span className="h-px flex-1 bg-[#0A0A0A]/7" />
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {(profile.skills as string[]).map(
                          (skill: string) => (
                            <span
                              key={skill}
                              className="inline-flex rounded-full border border-[#00C98B]/20 bg-[#00C98B]/8 px-2.5 py-1 text-[11px] font-semibold text-[#008F64] transition-all duration-200 hover:border-[#00C98B]/40 hover:bg-[#00C98B]/12"
                            >
                              {skill}
                            </span>
                          )
                        )}
                      </div>
                    </section>
                  )}

                {/* Languages */}
                {Array.isArray(profile.languages) &&
                  (profile.languages as Array<Record<string, unknown>>)
                    .length > 0 && (
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <p className="font-heading text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A0A0A]/50">
                          Languages
                        </p>

                        <span className="h-px flex-1 bg-[#0A0A0A]/7" />
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {(profile.languages as Array<Record<string, unknown>>).map(
                          (lang, index) => (
                            <span
                              key={String(lang.name ?? index)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-[#00C98B]/20 bg-[#00C98B]/8 px-2.5 py-1 text-[11px] font-semibold text-[#008F64]"
                            >
                              {String(lang.name)}
                              {lang.proficiency ? (
                                <span className="text-[9px] font-medium text-[#008F64]/50">
                                  {String(lang.proficiency)}
                                </span>
                              ) : null}
                            </span>
                          )
                        )}
                      </div>
                    </section>
                  )}

                {/* Education */}
                {Array.isArray(profile.education) &&
                  (profile.education as Array<Record<string, unknown>>)
                    .length > 0 && (
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <p className="font-heading text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A0A0A]/50">
                          Education
                        </p>

                        <span className="h-px flex-1 bg-[#0A0A0A]/7" />
                      </div>

                      <div className="space-y-2.5">
                        {(profile.education as Array<Record<string, unknown>>).map(
                          (edu, index) => (
                            <div
                              key={index}
                              className="rounded-2xl border border-[#0A0A0A]/9 bg-white p-3.5"
                            >
                              <p className="font-heading text-sm font-bold text-[#0A0A0A]">
                                {String(edu.degree ?? "Degree")}
                              </p>
                              <p className="mt-0.5 text-xs text-[#0A0A0A]/45">
                                {String(edu.areaOfStudy ?? "")}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-[#00A975]">
                                {String(edu.institutionName ?? "")}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </section>
                  )}

                {/* Employment */}
                {Array.isArray(profile.employment) &&
                  (profile.employment as Array<Record<string, unknown>>)
                    .length > 0 && (
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <p className="font-heading text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A0A0A]/50">
                          Work Experience
                        </p>

                        <span className="h-px flex-1 bg-[#0A0A0A]/7" />
                      </div>

                      <div className="space-y-2.5">
                        {(profile.employment as Array<Record<string, unknown>>).map(
                          (job, index) => (
                            <div
                              key={index}
                              className="rounded-2xl border border-[#0A0A0A]/9 bg-white p-3.5"
                            >
                              <p className="font-heading text-sm font-bold text-[#0A0A0A]">
                                {String(job.jobTitle ?? "Role")}
                              </p>
                              <p className="mt-0.5 text-xs font-semibold text-[#00A975]">
                                {String(job.companyName ?? "")}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </section>
                  )}

                {/* Portfolio */}
                {Array.isArray(profile.portfolio) &&
                  (
                    profile.portfolio as PortfolioItem[]
                  ).length > 0 && (
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <p className="font-heading text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A0A0A]/50">
                          Portfolio
                        </p>

                        <span className="h-px flex-1 bg-[#0A0A0A]/7" />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {(
                          profile.portfolio as PortfolioItem[]
                        ).map((item, index) => (
                          <article
                            key={item.title + index}
                            className="group/portfolio overflow-hidden rounded-2xl border border-[#0A0A0A]/9 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00C98B]/30 hover:shadow-[0_12px_28px_rgba(0,201,139,0.08)]"
                          >
                            {item.images?.[0] && (
                              <div className="relative h-36 overflow-hidden bg-[#F8F9F9]">
                                <img
                                  src={item.images[0]}
                                  alt={item.title}
                                  className="size-full object-cover transition-transform duration-500 group-hover/portfolio:scale-[1.04]"
                                />

                                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0A0A0A]/45 to-transparent" />
                              </div>
                            )}

                            <div className="space-y-2.5 p-4">
                              <div>
                                <h3 className="font-heading text-sm font-bold text-[#0A0A0A] transition-colors group-hover/portfolio:text-[#00A975]">
                                  {item.title}
                                </h3>

                                {item.description && (
                                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#0A0A0A]/45">
                                    {item.description}
                                  </p>
                                )}
                              </div>

                              {Array.isArray(item.skills) &&
                                item.skills.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {item.skills.map(
                                      (skill) => (
                                        <span
                                          key={skill}
                                          className="rounded-full bg-[#00C98B]/8 px-2 py-0.5 text-[9px] font-semibold text-[#008F64]"
                                        >
                                          {skill}
                                        </span>
                                      )
                                    )}
                                  </div>
                                )}

                              {item.url && (
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#00A975] transition-colors hover:text-[#00C98B] hover:underline"
                                >
                                  View project
                                  <ExternalLink className="size-3" />
                                </a>
                              )}
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ChatLauncher label="Profile Auditor">
        <ProfileAuditChat className="h-full rounded-none border-0 shadow-none min-h-0" />
      </ChatLauncher>
    </div>
  );
}
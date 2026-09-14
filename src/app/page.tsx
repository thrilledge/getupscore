import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/landing/site-header";
import { Hero } from "@/components/landing/hero";
import { LiveJobs, type LiveJob } from "@/components/landing/live-jobs";
// import { StatsBand } from "@/components/landing/stats-band";
import { Features } from "@/components/landing/features";
import { Integrations } from "@/components/landing/integrations";
import { Platforms } from "@/components/landing/platforms";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Testimonials } from "@/components/landing/testimonials";
import { Pricing } from "@/components/landing/pricing";
import { FAQ } from "@/components/landing/faq";
import { CtaFooter } from "@/components/landing/cta-footer";

export const dynamic = "force-dynamic";

async function fetchJobs() {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: jobs, error } = await supabase
      .from("jobs")
      .select(
        `
        id,
        title,
        description,
        posted_at,
        budget,
        hourly_min,
        hourly_max,
        job_type,
        client_country,
        client_location_country,
        payment_verified,
        proposals_count,
        client_total_spend,
        client_rating,
        category,
        subcategory
        `
      )
      .not("title", "is", null)
      .order("posted_at", { ascending: false, nullsFirst: false })
      .limit(10);

    if (error) {
      console.error("[Landing] Jobs fetch error:", error.message);
      return {
        jobs: [] as LiveJob[],
        totalJobs: 0,
        jobs24h: 0,
        countryCount: "0",
      };
    }

    // Total + 24h counts for the stats band (estimated, no full count scan)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: totalJobs } = await supabase
      .from("jobs")
      .select("id", { count: "estimated", head: true });
    const { count: jobs24h } = await supabase
      .from("jobs")
      .select("id", { count: "estimated", head: true })
      .gte("posted_at", since);

    // Distinct client countries (capped select, no full scan)
    const { data: countryRows } = await supabase
      .from("jobs")
      .select("client_country")
      .not("client_country", "is", null)
      .limit(3000);
    const countrySet = new Set(
      (countryRows ?? [])
        .map((row) => row.client_country as string)
        .filter(Boolean)
    );
    const countryCount =
      countrySet.size >= 3000
        ? "3000+"
        : countrySet.size.toString();

    return {
      jobs: (jobs ?? []) as LiveJob[],
      totalJobs: totalJobs ?? 0,
      jobs24h: jobs24h ?? 0,
      countryCount,
    };
  } catch (err) {
    console.error("[Landing] Jobs fetch failed:", err);
    return {
      jobs: [] as LiveJob[],
      totalJobs: 0,
      jobs24h: 0,
      countryCount: "0",
    };
  }
}

export default async function Home() {
  const { jobs, totalJobs, jobs24h, countryCount } = await fetchJobs();

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <Hero />
        <LiveJobs jobs={jobs} />
        {/* <StatsBand totalJobs={totalJobs} jobs24h={jobs24h} /> */}
        <Features />
        <Integrations />
        <Platforms totalJobs={totalJobs} jobs24h={jobs24h} countryCount={countryCount} />
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <FAQ />
      </main>
      <CtaFooter />
    </div>
  );
}

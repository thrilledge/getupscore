import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/landing/site-header";
import { Hero } from "@/components/landing/hero";
import { LiveJobs, type LiveJob } from "@/components/landing/live-jobs";
import { StatsBand } from "@/components/landing/stats-band";
import { Features } from "@/components/landing/features";
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
        posted_at,
        budget,
        hourly_min,
        hourly_max,
        job_type,
        client_country,
        client_location_country,
        payment_verified,
        category,
        subcategory
        `
      )
      .not("title", "is", null)
      .order("posted_at", { ascending: false, nullsFirst: false })
      .limit(10);

    if (error) {
      console.error("[Landing] Jobs fetch error:", error.message);
      return { jobs: [] as LiveJob[], totalJobs: 0, jobs24h: 0 };
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

    return {
      jobs: (jobs ?? []) as LiveJob[],
      totalJobs: totalJobs ?? 0,
      jobs24h: jobs24h ?? 0,
    };
  } catch (err) {
    console.error("[Landing] Jobs fetch failed:", err);
    return { jobs: [] as LiveJob[], totalJobs: 0, jobs24h: 0 };
  }
}

export default async function Home() {
  const { jobs, totalJobs, jobs24h } = await fetchJobs();

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <Hero />
        <LiveJobs jobs={jobs} />
        <StatsBand totalJobs={totalJobs} jobs24h={jobs24h} />
        <Features />
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <FAQ />
      </main>
      <CtaFooter />
    </div>
  );
}

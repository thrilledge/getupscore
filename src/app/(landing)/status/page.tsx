import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "Status",
  description:
    "UpScore service status and platform telemetry.",
};

export default function StatusPage() {
  return (
    <LegalPage title="Status Telemetry" updated="September 1, 2026">
      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          Service Availability
        </h2>
        <p>
          UpScore runs on Vercel&apos;s globally distributed edge
          network with data stored in Supabase. Our goal is 99.9%+
          uptime for the dashboard, API, and job alerting pipeline.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          Telemetry We Track
        </h2>
        <p>
          We monitor request latency, error rates, job sync health, and
          alert delivery success across all channels. This telemetry is
          used to keep the service healthy and is never used to profile
          individual users.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          Outage Responses
        </h2>
        <p>
          In the event of an incident, our team responds to restore
          service as quickly as possible. Critical failures are
          investigated immediately and fixes are deployed through our
          standard CI/CD pipeline.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          Maintenance Windows
        </h2>
        <p>
          Scheduled maintenance that may cause downtime is announced in
          advance through the app or by email whenever possible.
          Maintenance is generally scheduled during off-peak hours.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          Reporting Issues
        </h2>
        <p>
          Experiencing an issue? Contact{" "}
          <a
            href="mailto:hello@getupscore.com"
            className="font-semibold text-[#008F64] hover:text-[#00C98B]"
          >
            hello@getupscore.com
          </a>{" "}
          with details so we can help quickly.
        </p>
      </section>
    </LegalPage>
  );
}
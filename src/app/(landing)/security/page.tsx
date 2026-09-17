import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "Security Architecture",
  description:
    "How UpScore protects your account and data.",
};

export default function SecurityPage() {
  return (
    <LegalPage title="Security Architecture" updated="September 1, 2026">
      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          Authentication
        </h2>
        <p>
          Authentication is handled through Supabase Auth, which powers
          email/password and OAuth (Google) sign-in flows. Passwords are
          hashed with industry-standard algorithms and are never stored
          in plaintext.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          Authorization
        </h2>
        <p>
          Server-side row-level security (RLS) is enforced on your
          account data. Every job filter, notification rule, proposal,
          and channel is scoped to your user account — other users can
          never read or mutate your data.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          API Security
        </h2>
        <p>
          All API endpoints authenticate requests and validate input.
          Sensitive endpoints are rate-limited, cron jobs are protected
          with constant-time secret comparison, and error messages never
          leak internal details.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          Webhooks
        </h2>
        <p>
          Outbound webhook alerts include a per-channel secret
          (<code className="rounded bg-[#00C98B]/10 px-1 py-0.5 font-mono text-xs text-[#008F64]">
            X-UpScore-Secret
          </code>
          ), and webhook URLs are validated against server-side request
          forgery (SSRF) patterns before being stored.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          Encryption in Transit
        </h2>
        <p>
          All traffic to and from the Service is encrypted using TLS.
          Data stored in our database is protected at rest by our
          infrastructure providers.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          Reporting a Vulnerability
        </h2>
        <p>
          Found a security issue? Please report it privately to{" "}
          <a
            href="mailto:security@getupscore.com"
            className="font-semibold text-[#008F64] hover:text-[#00C98B]"
          >
            security@getupscore.com
          </a>{" "}
          rather than disclosing it publicly.
        </p>
      </section>
    </LegalPage>
  );
}
import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "UpScore Terms of Service — the rules and conditions for using the AI-powered Upwork opportunity finder.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="September 1, 2026">
      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          1. Acceptance of Terms
        </h2>
        <p>
          By accessing or using UpScore ("the Service"), you agree to be
          bound by these Terms of Service. If you do not agree to these
          terms, please do not use the Service.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          2. Description of Service
        </h2>
        <p>
          UpScore is an AI-powered job discovery and proposal tool for
          freelance marketplaces. It helps you monitor opportunities,
          score matching jobs, generate proposal drafts, and receive
          notifications about relevant postings. The Service does not
          apply to jobs on your behalf and does not guarantee
          employment, proposals accepted, or income.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          3. Accounts and Eligibility
        </h2>
        <p>
          You must be at least 18 years old to use the Service. You are
          responsible for safeguarding your account credentials and for
          all activity that occurs under your account. Notify us
          immediately of any unauthorized use.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          4. Acceptable Use
        </h2>
        <p>
          You agree not to misuse the Service, including: attempting to
          access systems without authorization, reselling or scraping
          the Service except as permitted, interfering with other users,
          or using automated tools that exceed normal API limits set by
          the platform.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          5. Subscriptions and Billing
        </h2>
        <p>
          Paid plans are billed in advance on a monthly or yearly basis.
          Prices are displayed in the currency selected at checkout.
          Subscriptions renew automatically unless cancelled before the
          renewal date. Refunds are handled in accordance with our
          money-back guarantee described on the pricing page.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          6. Intellectual Property
        </h2>
        <p>
          All content, software, and materials provided as part of the
          Service (excluding your own content) are owned by UpScore and
          protected by applicable intellectual property laws.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          7. Disclaimers
        </h2>
        <p>
          The Service is provided "as is" and "as available" without
          warranties of any kind, whether express or implied, including
          fitness for a particular purpose. AI-generated outputs are
          suggestions only and should be reviewed before use.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          8. Limitation of Liability
        </h2>
        <p>
          To the maximum extent permitted by law, UpScore shall not be
          liable for any indirect, incidental, special, consequential,
          or punitive damages arising out of your use of the Service,
          including lost opportunities or income.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          9. Changes to Terms
        </h2>
        <p>
          We may update these Terms from time to time. Material changes
          will be communicated through the Service or by email. Continued
          use after changes are posted constitutes acceptance of the
          revised Terms.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          10. Contact
        </h2>
        <p>
          Questions about these Terms? Reach us at{" "}
          <a
            href="mailto:hello@getupscore.com"
            className="font-semibold text-[#008F64] hover:text-[#00C98B]"
          >
            hello@getupscore.com
          </a>
          .
        </p>
      </section>
    </LegalPage>
  );
}
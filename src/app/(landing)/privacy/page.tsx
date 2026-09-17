import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How UpScore collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="September 1, 2026">
      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          1. Information We Collect
        </h2>
        <p>
          We collect the information you provide when creating an account
          (such as your email address), profile data you choose to add,
          and technical data such as browser type and usage patterns that
          help us improve the Service.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          2. How We Use Information
        </h2>
        <p>
          We use your information to operate and improve the Service,
          personalize your experience, process payments, send relevant
          job alerts you&apos;ve opted into, and provide customer
          support. AI features use your profile and job data solely to
          generate scores and drafts for your own use.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          3. Data We Do NOT Sell
        </h2>
        <p>
          We do not sell, rent, or trade your personal information to
          third parties. Your job filters, notification rules, proposals,
          and profile data are private to your account.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          4. Payments
        </h2>
        <p>
          Payment processing is handled by Stripe. We do not store your
          full credit card details on our servers. Stripe&apos;s privacy
          policy applies to the transaction data it processes.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          5. Data Retention
        </h2>
        <p>
          We retain account data while your account is active and for a
          reasonable period afterwards to comply with legal obligations.
          You may request deletion of your account and associated data at
          any time.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          6. Security
        </h2>
        <p>
          We use industry-standard safeguards including encrypted
          connections, restricted access controls, and secure credential
          storage to protect your data. No method of transmission is
          100% secure, and we cannot guarantee absolute security.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          7. Your Rights
        </h2>
        <p>
          Depending on your jurisdiction, you may have the right to
          access, correct, export, or delete your personal data. Contact
          us at{" "}
          <a
            href="mailto:hello@getupscore.com"
            className="font-semibold text-[#008F64] hover:text-[#00C98B]"
          >
            hello@getupscore.com
          </a>{" "}
          to exercise these rights.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          8. Cookies
        </h2>
        <p>
          We use essential cookies for authentication and session
          management, and, with your consent, analytics cookies to
          understand how the Service is used.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-heading text-lg font-bold text-[#0A0A0A]">
          9. Changes to This Policy
        </h2>
        <p>
          We may update this policy periodically. Significant changes
          will be communicated through the Service or by email.
        </p>
      </section>
    </LegalPage>
  );
}
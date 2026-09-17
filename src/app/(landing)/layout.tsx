import { SiteHeader } from "@/components/landing/site-header";
import { CtaFooter } from "@/components/landing/cta-footer";

export const metadata = {
  title: {
    default: "UpScore",
    template: "%s · UpScore",
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>{children}</main>
      <CtaFooter />
    </div>
  );
}
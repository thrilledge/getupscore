import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";

import { Providers } from "@/components/providers";
import { PaddleProvider } from "@/components/paddle-provider";
import { ReferralTracker } from "@/components/referral-tracker";
import { TooltipProvider } from "@/components/ui/tooltip";
import { env } from "@/lib/env";

import "./globals.css";

const poppins = localFont({
  variable: "--font-heading",
  src: [
    { path: "./fonts/Poppins-400.woff2", weight: "400" },
    { path: "./fonts/Poppins-500.woff2", weight: "500" },
    { path: "./fonts/Poppins-600.woff2", weight: "600" },
    { path: "./fonts/Poppins-700.woff2", weight: "700" },
  ],
});

const montserrat = localFont({
  variable: "--font-sans",
  src: "./fonts/Montserrat-Variable.woff2",
  weight: "300 700",
});

export const metadata: Metadata = {
  title: {
    default: env.APP_NAME,
    template: `%s | ${env.APP_NAME}`,
  },
  description:
    "AI-powered Upwork opportunity finder — discover relevant jobs faster, score opportunities, and generate winning proposals.",
};

const themeScript = `(function(){try{var t=localStorage.getItem('upscore-theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=t==='dark'||((!t||t==='system')&&m);var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${montserrat.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head><script
        dangerouslySetInnerHTML={{ __html: themeScript }}
      /></head>

      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <TooltipProvider>
          <PaddleProvider>
            <ReferralTracker />
            <Providers>{children}</Providers>
          </PaddleProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
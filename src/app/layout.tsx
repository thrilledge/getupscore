import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import { PaddleProvider } from "@/components/paddle-provider";
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
  description: "AI-powered Upwork opportunity finder — discover relevant jobs faster, score opportunities, and generate winning proposals.",
};

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
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <TooltipProvider>
          <PaddleProvider>
            <Providers>{children}</Providers>
          </PaddleProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}

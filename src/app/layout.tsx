import type { Metadata } from "next";
import { Poppins, Montserrat } from "next/font/google";
import { Providers } from "@/components/providers";
import { TooltipProvider } from "@/components/ui/tooltip";
import { env } from "@/lib/env";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const montserrat = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
          <Providers>{children}</Providers>
        </TooltipProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "waituntilmay",
  description: "waituntilmay",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
        <Script
          src="https://cloud.umami.is/script.js"
          data-website-id="17155528-dc08-4476-9298-b51d6241ee8f"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}

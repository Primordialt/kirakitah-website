import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "@/styles/globals.css";
import { siteConfig } from "@/config/site";
import { withSocialMetadata } from "@/lib/social-metadata";
import { Analytics } from "@vercel/analytics/next";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = withSocialMetadata({
  metadataBase: new URL(siteConfig.url),
  title: siteConfig.name,
  description: `${siteConfig.name} — ${siteConfig.parentOrganisation}`,
  openGraph: {
    siteName: siteConfig.name,
    type: "website",
    locale: "en",
  },
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

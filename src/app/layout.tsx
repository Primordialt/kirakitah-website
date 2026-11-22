import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "@/styles/globals.css";
import { siteConfig } from "@/config/site";
import { withSocialMetadata } from "@/lib/social-metadata";
import { OrganizationJsonLd } from "@/components/seo/OrganizationJsonLd";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080810",
};

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
        <OrganizationJsonLd />
        {children}
        <Analytics />
      </body>
    </html>
  );
}

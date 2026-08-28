import { brandAssets } from "@/config/brand";
import { footerBrand } from "@/config/navigation";
import { siteConfig } from "@/config/site";

/** Organization schema derived from published site content only. */
export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.brandName,
    url: siteConfig.url,
    logo: new URL(brandAssets.socialLogo.src, siteConfig.url).toString(),
    description: footerBrand.description,
    slogan: footerBrand.tagline,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

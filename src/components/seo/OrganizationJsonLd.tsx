import { footerBrand } from "@/config/navigation";
import { siteConfig } from "@/config/site";

/** Organization schema derived from published site content only. */
export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.brandName,
    url: siteConfig.url,
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

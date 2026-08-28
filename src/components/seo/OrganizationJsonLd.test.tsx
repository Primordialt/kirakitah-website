import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OrganizationJsonLd } from "@/components/seo/OrganizationJsonLd";
import { siteConfig } from "@/config/site";

describe("OrganizationJsonLd", () => {
  it("includes the production organization logo URL", () => {
    const html = renderToStaticMarkup(<OrganizationJsonLd />);
    const match = html.match(
      /<script type="application\/ld\+json">(.+)<\/script>/,
    );
    expect(match).not.toBeNull();

    const data = JSON.parse(match![1]!) as {
      logo?: string;
      url: string;
      name: string;
    };

    expect(data.name).toBe(siteConfig.brandName);
    expect(data.url).toBe(siteConfig.url);
    expect(data.logo).toBe(`${siteConfig.url}/brand/logo-mark.png`);
  });
});

export const brandAssets = {
  logo: {
    src: "/brand/logo.svg",
    width: 160,
    height: 50,
    alt: "KIRAKITAH",
  },
  logoWhite: {
    src: "/brand/logo-white.svg",
    width: 160,
    height: 50,
    alt: "KIRAKITAH",
  },
  logoMark: {
    src: "/brand/logo-mark.svg",
    width: 512,
    height: 512,
    alt: "KIRAKITAH",
  },
  logoMarkWhite: {
    src: "/brand/logo-mark-white.svg",
    width: 512,
    height: 512,
    alt: "KIRAKITAH",
  },
  /**
   * Purple brand mark for social / Open Graph / Twitter cards.
   * Prefer this over white marks so previews remain visible on light surfaces.
   */
  socialLogo: {
    src: "/brand/logo-mark.png",
    width: 512,
    height: 512,
    alt: "KIRAKITAH",
  },
} as const;

export type BrandAssetTone = "brand" | "white";

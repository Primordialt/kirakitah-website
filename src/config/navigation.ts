import { officialSocialFooterLinks } from "@/config/social";

export type NavigationItem = {
  label: string;
  href: string;
  external?: boolean;
  children?: NavigationItem[];
};

/** @deprecated Use NavigationItem */
export type NavItem = NavigationItem;

export const primaryNavigation: NavigationItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Initiatives", href: "/initiatives" },
  { label: "eSports", href: "/esports" },
  { label: "Community", href: "/community" },
  { label: "Stories", href: "/stories" },
  { label: "Contact", href: "/contact" },
];

/** Desktop header nav — Home is handled by the wordmark. */
export const desktopNavigation: NavigationItem[] = primaryNavigation.filter(
  (item) => item.href !== "/",
);

export const headerCta = {
  label: "JOIN KIRAKITAH",
  href: "/community",
  alternateLabel: "EXPLORE KIRAKITAH",
} as const;

export const esportsNavigation: NavigationItem[] = [
  { label: "Overview", href: "/esports" },
  { label: "Rules", href: "/esports/rules" },
  { label: "FAQ", href: "/esports/faq" },
  { label: "Register", href: "/esports/register" },
];

export interface FooterLink {
  label: string;
  href: string | null;
  external?: boolean;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export const footerBrand = {
  tagline: "PLAY. COMPETE. CREATE.",
  description:
    "A digital platform at the intersection of technology, culture, competition, and community.",
} as const;

export const footerColumns: FooterColumn[] = [
  {
    title: "Explore",
    links: [
      { label: "About", href: "/about" },
      { label: "Initiatives", href: "/initiatives" },
      { label: "eSports", href: "/esports" },
      { label: "Community", href: "/community" },
      { label: "Stories", href: "/stories" },
    ],
  },
  {
    title: "Participate",
    links: [
      { label: "Register", href: "/esports/register" },
      { label: "Tournament Rules", href: "/esports/rules" },
      { label: "FAQ", href: "/esports/faq" },
    ],
  },
  {
    title: "Connect",
    links: officialSocialFooterLinks(),
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: null },
      { label: "Terms", href: null },
      { label: "Code of Conduct", href: null },
    ],
  },
];

export const footerContactLink: FooterLink = {
  label: "Contact",
  href: "/contact",
};

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

/** Public header auth shortcuts (login, register, participant portal). */
export const headerAuthLinks = {
  login: { label: "Log in", href: "/login" },
  register: { label: "Sign up", href: "/register" },
  account: { label: "My account", href: "/dashboard" },
  fixtures: { label: "Fixtures", href: "/matches" },
} as const;

export const headerCta = {
  label: "Sign up",
  href: "/register",
  alternateLabel: "EXPLORE KIRAKITAH",
} as const;

export const esportsNavigation: NavigationItem[] = [
  { label: "Overview", href: "/esports" },
  { label: "Rules", href: "/esports/rules" },
  { label: "FAQ", href: "/esports/faq" },
  { label: "Register", href: "/register" },
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
      { label: "Log in", href: "/login" },
      { label: "Sign up", href: "/register" },
      { label: "Fixtures", href: "/matches" },
      { label: "Competition", href: "/esports" },
      { label: "Tournament Rules", href: "/esports/rules" },
      { label: "FAQ", href: "/esports/faq" },
      { label: "Code of Conduct", href: "/code-of-conduct" },
    ],
  },
  {
    title: "Connect",
    links: officialSocialFooterLinks(),
  },
  {
    title: "Legal",
    links: [
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Code of Conduct", href: "/code-of-conduct" },
    ],
  },
];

export const footerContactLink: FooterLink = {
  label: "Contact",
  href: "/contact",
};

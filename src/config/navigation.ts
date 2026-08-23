export interface NavItem {
  label: string;
  href: string;
  description?: string;
}

export const primaryNavigation: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Initiatives", href: "/initiatives" },
  { label: "eSports", href: "/esports" },
  { label: "Community", href: "/community" },
  { label: "Stories", href: "/stories" },
  { label: "Contact", href: "/contact" },
];

export const esportsNavigation: NavItem[] = [
  { label: "Overview", href: "/esports" },
  { label: "Rules", href: "/esports/rules" },
  { label: "FAQ", href: "/esports/faq" },
  { label: "Register", href: "/esports/register" },
];

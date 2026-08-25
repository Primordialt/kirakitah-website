import type { LucideIcon } from "lucide-react";
import {
  Gamepad2,
  Lightbulb,
  Palette,
  Sparkles,
  Users,
} from "lucide-react";

export interface HomepageCta {
  label: string;
  href: string | null;
}

export interface EcosystemItem {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string | null;
  featured?: boolean;
}

export interface PrincipleItem {
  id: string;
  title: string;
  description: string;
}

export interface FeaturedInitiativeStat {
  label: string;
  value: string;
}

export interface FeaturedInitiativeData {
  title: string;
  subtitle: string;
  description: string;
  commencement: string;
  stats: FeaturedInitiativeStat[];
  primaryCta: HomepageCta;
  secondaryCta: HomepageCta;
}

export const homepageHero = {
  eyebrow: "KIRAKITAH",
  headline: "THE FUTURE IS YOURS TO CREATE.",
  supportingCopy:
    "KIRAKITAH is a growing platform creating experiences around competition, creativity, technology, community and participation.",
  primaryCta: { label: "EXPLORE KIRAKITAH", href: "/about" } satisfies HomepageCta,
  secondaryCta: { label: "JOIN KIRAKITAH", href: "/community" } satisfies HomepageCta,
} as const;

export const homepageBrandIntro = {
  heading: "MORE THAN ONE THING.",
  paragraphs: [
    "KIRAKITAH is a growing platform built around competition, creativity, technology, community and experiences that bring people together.",
    "We are creating spaces where people can participate, challenge themselves, express ideas, connect with others and discover what they can become part of.",
  ],
} as const;

export const homepageEcosystem = {
  heading: "KIRAKITAH ECOSYSTEM",
  items: [
    {
      id: "gaming",
      title: "Gaming & eSports",
      description: "Competitive gaming experiences, tournaments and challenges.",
      icon: Gamepad2,
      href: "/initiatives/kirakitah-gaming",
      featured: true,
    },
    {
      id: "innovation",
      title: "Innovation",
      description: "Technology-driven ideas, digital products and experiments.",
      icon: Lightbulb,
      href: "/initiatives/innovation",
    },
    {
      id: "creativity",
      title: "Creativity",
      description: "Content, design, storytelling and creative expression.",
      icon: Palette,
      href: "/initiatives/creativity",
    },
    {
      id: "community",
      title: "Community",
      description: "People, connection, participation and shared interests.",
      icon: Users,
      href: "/community",
    },
    {
      id: "experiences",
      title: "Experiences",
      description: "New events, challenges and experiences built around participation.",
      icon: Sparkles,
      href: "/initiatives/experiences",
    },
  ] satisfies EcosystemItem[],
} as const;

export const homepageFeaturedInitiative: FeaturedInitiativeData = {
  title: "KIRAKITAH GAMING 926",
  subtitle: "eFootball Mobile Championship",
  description:
    "The first major KIRAKITAH competition — an online eFootball Mobile championship where skill, strategy and determination define who reaches the top.",
  commencement: "Commences September 14, 2026.",
  stats: [
    { label: "Players", value: "128" },
    { label: "Qualifiers", value: "32" },
    { label: "Champion", value: "1" },
    { label: "Grand Prize", value: "US$100" },
  ],
  primaryCta: { label: "EXPLORE THE COMPETITION", href: "/esports" },
  secondaryCta: { label: "REGISTER NOW", href: "/esports/register" },
};

export const homepagePrinciples = {
  heading: "BUILT DIFFERENT.",
  items: [
    { id: "compete", title: "COMPETE", description: "Challenge yourself." },
    { id: "create", title: "CREATE", description: "Turn ideas into experiences." },
    { id: "connect", title: "CONNECT", description: "Find your people." },
    { id: "grow", title: "GROW", description: "Keep improving." },
    { id: "explore", title: "EXPLORE", description: "Discover what's next." },
  ] satisfies PrincipleItem[],
} as const;

export const homepageCommunity = {
  heading: "YOU DON'T HAVE TO DO IT ALONE.",
  supportingCopy:
    "KIRAKITAH is built around people who want to play, create, compete, explore and grow together.",
  roles: ["Players", "Creators", "Participants", "Collaborators", "Community"],
  primaryCta: { label: "JOIN KIRAKITAH", href: "/community" } satisfies HomepageCta,
} as const;

export const homepageStories = {
  heading: "WHAT'S HAPPENING",
  viewAllHref: "/stories",
} as const;

export const homepageFinalCta = {
  headline: "READY TO ENTER THE KIRAKITAH?",
  supportingCopy: "Something new is always happening here.",
  primaryCta: { label: "EXPLORE KIRAKITAH", href: "/about" } satisfies HomepageCta,
  secondaryCta: { label: "JOIN KIRAKITAH", href: "/community" } satisfies HomepageCta,
} as const;

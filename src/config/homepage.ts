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
  stats: FeaturedInitiativeStat[];
  primaryCta: HomepageCta;
  secondaryCta: HomepageCta;
}

export const homepageHero = {
  eyebrow: "KIRAKITAH",
  headline: "THE FUTURE IS YOURS TO CREATE.",
  supportingCopy:
    "KIRAKITAH brings people together through competition, creativity, technology and experiences built for the future.",
  primaryCta: { label: "EXPLORE KIRAKITAH", href: "/initiatives" } satisfies HomepageCta,
  secondaryCta: {
    label: "JOIN THE MOVEMENT",
    href: null,
  } satisfies HomepageCta,
} as const;

export const homepageBrandIntro = {
  heading: "MORE THAN ONE THING.",
  supportingCopy:
    "KIRAKITAH is a growing platform built around competition, creativity, technology, community and experiences that bring people together.",
} as const;

export const homepageEcosystem = {
  heading: "BUILT FOR WHAT'S NEXT.",
  items: [
    {
      id: "gaming",
      title: "Gaming & eSports",
      description: "Competitive gaming experiences and tournaments.",
      icon: Gamepad2,
      href: "/initiatives/kirakitah-gaming",
      featured: true,
    },
    {
      id: "innovation",
      title: "Innovation",
      description: "Technology-driven ideas and experiments.",
      icon: Lightbulb,
      href: null,
    },
    {
      id: "creativity",
      title: "Creativity",
      description: "Creative projects, content and experiences.",
      icon: Palette,
      href: null,
    },
    {
      id: "community",
      title: "Community",
      description:
        "Connecting people around shared interests and opportunities.",
      icon: Users,
      href: null,
    },
    {
      id: "experiences",
      title: "Experiences",
      description: "Challenges, events and future initiatives.",
      icon: Sparkles,
      href: null,
    },
  ] satisfies EcosystemItem[],
} as const;

export const homepageFeaturedInitiative: FeaturedInitiativeData = {
  title: "KIRAKITAH GAMING 926",
  subtitle: "Inaugural eFootball Mobile Tournament",
  description:
    "The first major public-facing initiative on the KIRAKITAH platform — competitive mobile football at the intersection of culture and technology.",
  stats: [
    { label: "Players", value: "128" },
    { label: "Qualify", value: "32" },
    { label: "Champion", value: "1" },
    { label: "Grand Prize", value: "$100" },
  ],
  primaryCta: { label: "EXPLORE THE TOURNAMENT", href: "/esports" },
  secondaryCta: { label: "REGISTER TO COMPETE", href: "/esports/register" },
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
  primaryCta: { label: "JOIN THE COMMUNITY", href: null } satisfies HomepageCta,
} as const;

export const homepageStories = {
  heading: "WHAT'S HAPPENING",
  viewAllHref: null,
} as const;

export const homepageFinalCta = {
  headline: "READY TO ENTER THE KIRAKITAH?",
  supportingCopy: "Something new is always happening here.",
  primaryCta: { label: "EXPLORE KIRAKITAH", href: "/initiatives" } satisfies HomepageCta,
  secondaryCta: {
    label: "JOIN THE COMMUNITY",
    href: null,
  } satisfies HomepageCta,
} as const;

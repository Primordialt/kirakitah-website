import type { FooterLink } from "@/config/navigation";
import { officialSocialFooterLinks } from "@/config/social";

export interface EsportsCta {
  label: string;
  href: string;
}

export interface EsportsStat {
  value: string;
  label: string;
}

export interface EsportsDetailItem {
  label: string;
  value: string;
}

export interface EsportsJourneyStep {
  step: string;
  title: string;
  description: string;
}

export interface EsportsKnockoutRound {
  title: string;
}

export interface EsportsRuleSection {
  id: string;
  title: string;
  content: string[];
  pending?: boolean;
}

export interface EsportsPlatform {
  label: string;
  href: string | null;
}

export const esportsHero = {
  eyebrow: "KIRAKITAH GAMING 926",
  headline: "YOUR GAME. YOUR SKILL. YOUR SHOT.",
  supportingCopy:
    "The inaugural KIRAKITAH Gaming competition brings players together for an online eFootball Mobile championship built around competition, skill and the chance to become the first KIRAKITAH champion.",
  primaryCta: { label: "REGISTER NOW", href: "/esports/register" } satisfies EsportsCta,
  secondaryCta: {
    label: "VIEW TOURNAMENT DETAILS",
    href: "#tournament-details",
  } satisfies EsportsCta,
} as const;

export const esportsStats: EsportsStat[] = [
  { value: "128", label: "PLAYERS" },
  { value: "32", label: "QUALIFY" },
  { value: "1", label: "CHAMPION" },
  { value: "$100", label: "GRAND PRIZE" },
];

export const esportsIntro = {
  lead: "KIRAKITAH Gaming brings competitive players together for organised online gaming experiences designed to challenge, connect and celebrate talent.",
  detail:
    "KIRAKITAH GAMING 926 is the inaugural KIRAKITAH Gaming championship — an eFootball Mobile championship for the September 2026 edition where skill, strategy and determination define who reaches the top.",
} as const;

export const esportsJourneySteps: EsportsJourneyStep[] = [
  {
    step: "01",
    title: "REGISTER",
    description:
      "Submit your application with player and gaming information for KIRAKITAH GAMING 926.",
  },
  {
    step: "02",
    title: "VERIFY",
    description:
      "KIRAKITAH reviews your application and confirms eligibility before competition stages begin.",
  },
  {
    step: "03",
    title: "QUALIFY",
    description:
      "Compete in the official qualification stage to earn your place among the top performers.",
  },
  {
    step: "04",
    title: "TOP 32",
    description:
      "The KIRAKITAH Top 32 enter the knockout stage — where every match counts.",
  },
  {
    step: "05",
    title: "KNOCKOUT",
    description:
      "Single-elimination rounds determine who advances toward the grand final.",
  },
  {
    step: "06",
    title: "GRAND FINAL",
    description:
      "Two players remain. One becomes the first KIRAKITAH Gaming champion.",
  },
];

export const esportsKnockoutRounds: EsportsKnockoutRound[] = [
  { title: "Round of 32" },
  { title: "Round of 16" },
  { title: "Quarterfinal" },
  { title: "Semifinal" },
  { title: "Grand Final" },
];

export const esportsQualification = {
  intro:
    "The qualification stage is part of the official KIRAKITAH Gaming tournament.",
  startingPool: "128",
  target: "32",
  topLabel: "KIRAKITAH TOP 32",
  pendingNote:
    "Qualification mechanics will be published once finalized.",
} as const;

export const esportsTechnology = {
  title: "TOURNAMENT TECHNOLOGY",
  copy: "KIRAKITAH uses dedicated tournament-management tools to organise players, fixtures, results and progression while matches are played through eFootball Mobile.",
} as const;

export const esportsWatch = {
  title: "WATCH THE ACTION",
  copy: "Selected matches will be broadcast through KIRAKITAH's official channels.",
  platforms: [
    { label: "X", href: "https://x.com/Kirakitah" },
    { label: "Instagram", href: "https://www.instagram.com/kirakitah" },
    { label: "TikTok", href: "https://www.tiktok.com/@kirakitah926" },
    { label: "YouTube", href: null },
  ] satisfies EsportsPlatform[],
} as const;

export const esportsHighlights = {
  title: "CATCH THE MOMENTS",
  copy: "From unbelievable goals to unexpected comebacks, follow the best moments from the tournament across KIRAKITAH's social channels.",
  platforms: [
    { label: "X", href: "https://x.com/Kirakitah" },
    { label: "Instagram", href: "https://www.instagram.com/kirakitah" },
    { label: "TikTok", href: "https://www.tiktok.com/@kirakitah926" },
    { label: "YouTube", href: null },
  ] satisfies EsportsPlatform[],
} as const;

export const esportsRulesPreview = {
  title: "READ THE TOURNAMENT RULES",
  copy: "Know the rules before you enter the arena.",
  href: "/esports/rules",
} as const;

export const esportsFaqPreview = {
  title: "FREQUENTLY ASKED QUESTIONS",
  cta: { label: "VIEW ALL FAQ", href: "/esports/faq" } satisfies EsportsCta,
  previewQuestionIds: [
    "faq-esports-001",
    "faq-esports-003",
    "faq-esports-005",
    "faq-esports-007",
    "faq-esports-008",
  ],
} as const;

export const esportsFinalCta = {
  title: "READY TO ENTER THE ARENA?",
  copy: "Your game. Your skill. Your shot.",
  primaryCta: { label: "REGISTER NOW", href: "/esports/register" } satisfies EsportsCta,
  secondaryCta: { label: "READ THE RULES", href: "/esports/rules" } satisfies EsportsCta,
} as const;

export const esportsRegisterHero = {
  headline: "YOUR GAME. YOUR SKILL. YOUR SHOT.",
  copy: "Register your interest in KIRAKITAH GAMING 926.",
} as const;

export const registrationCountries = [
  { value: "NG", label: "Nigeria" },
  { value: "GH", label: "Ghana" },
  { value: "KE", label: "Kenya" },
  { value: "ZA", label: "South Africa" },
  { value: "GB", label: "United Kingdom" },
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "OTHER", label: "Other" },
];

export const registrationPlatforms = [
  { value: "ios", label: "iOS" },
  { value: "android", label: "Android" },
];

export const registrationTimezones = [
  { value: "Africa/Lagos", label: "West Africa (WAT)" },
  { value: "Africa/Johannesburg", label: "South Africa (SAST)" },
  { value: "Europe/London", label: "United Kingdom (GMT/BST)" },
  { value: "America/New_York", label: "US Eastern (ET)" },
  { value: "America/Los_Angeles", label: "US Pacific (PT)" },
  { value: "UTC", label: "UTC" },
];

export const registrationAvailabilityOptions = [
  { value: "weekday-evenings", label: "Weekday evenings" },
  { value: "weekend-mornings", label: "Weekend mornings" },
  { value: "weekend-afternoons", label: "Weekend afternoons" },
  { value: "flexible", label: "Flexible — will adapt to schedule" },
];

export const esportsRulesSections: EsportsRuleSection[] = [
  {
    id: "eligibility",
    title: "Eligibility",
    content: [
      "KIRAKITAH GAMING 926 is open to players who meet the minimum age requirement and can compete in eFootball Mobile on a supported mobile device.",
      "Participation is subject to application review and verification by KIRAKITAH.",
    ],
  },
  {
    id: "age",
    title: "Age",
    content: [
      "The minimum age to participate is 10 years old.",
      "Participants under 18 must provide parent or guardian information and consent during registration.",
    ],
  },
  {
    id: "registration",
    title: "Registration",
    content: [
      "Registration is an application process. Submitting a registration form does not guarantee participation until verified by KIRAKITAH.",
      "Registration details will be confirmed during the application process.",
    ],
  },
  {
    id: "game-platform",
    title: "Game & Platform",
    content: [
      "The competition is played on eFootball Mobile in an online 1v1 format.",
      "Players are responsible for having a compatible mobile device with the game installed and a stable internet connection.",
    ],
  },
  {
    id: "match-format",
    title: "Match Format",
    content: [
      "Matches are played as online 1v1 eFootball Mobile games.",
      "Detailed match format rules will be published once finalized.",
    ],
    pending: true,
  },
  {
    id: "scheduling",
    title: "Scheduling",
    content: [
      "Match scheduling information will be provided to verified participants before the relevant stage.",
      "Detailed scheduling rules will be published once finalized.",
    ],
    pending: true,
  },
  {
    id: "no-show",
    title: "No-Show",
    content: [
      "No-show policies will be defined in the finalized tournament rules.",
      "Detailed rules will be published once finalized.",
    ],
    pending: true,
  },
  {
    id: "connection",
    title: "Connection",
    content: [
      "Players are responsible for maintaining a stable internet connection during matches.",
      "Connection and disconnection policies will be covered in the finalized rules.",
    ],
    pending: true,
  },
  {
    id: "cheating",
    title: "Cheating",
    content: [
      "Any form of cheating, exploitation or unfair advantage is strictly prohibited.",
      "Detailed anti-cheating policies and penalties will be published once finalized.",
    ],
    pending: true,
  },
  {
    id: "disputes",
    title: "Disputes",
    content: [
      "Match disputes must be reported according to procedures that will be published in the finalized rules.",
      "Detailed dispute resolution processes will be published once finalized.",
    ],
    pending: true,
  },
  {
    id: "evidence",
    title: "Evidence",
    content: [
      "Players may be required to provide evidence in dispute situations.",
      "Evidence requirements will be published once finalized.",
    ],
    pending: true,
  },
  {
    id: "disqualification",
    title: "Disqualification",
    content: [
      "KIRAKITAH reserves the right to disqualify participants who violate tournament rules or the code of conduct.",
      "Detailed disqualification criteria will be published once finalized.",
    ],
    pending: true,
  },
  {
    id: "prize",
    title: "Prize",
    content: [
      "The grand prize for KIRAKITAH GAMING 926 is US$100.",
      "Prize distribution details will be confirmed with verified participants.",
    ],
  },
  {
    id: "media",
    title: "Media",
    content: [
      "Selected matches may be broadcast through KIRAKITAH's official channels.",
      "Participants may be asked to consent to media coverage as part of registration.",
    ],
  },
  {
    id: "safeguarding",
    title: "Safeguarding",
    content: [
      "KIRAKITAH takes safeguarding seriously, particularly for participants under 18.",
      "Parent or guardian consent is required for minors. Safeguarding policies will be published in full once finalized.",
    ],
  },
];

export const esportsSocialLinks: FooterLink[] = officialSocialFooterLinks();

export interface LegalSection {
  id: string;
  title: string;
  content: string[];
}

export interface LegalDocumentConfig {
  title: string;
  lastUpdated: string;
  introduction?: string[];
  sections: LegalSection[];
  disclaimer: string;
}

export const termsAndConditions: LegalDocumentConfig = {
  title: "Terms & Conditions",
  lastUpdated: "August 23, 2026",
  sections: [
    {
      id: "about-these-terms",
      title: "1. About These Terms",
      content: [
        "These Terms & Conditions govern the use of the KIRAKITAH website and participation in KIRAKITAH programmes, competitions and experiences made available through the website.",
        "By using the website, you agree to these Terms.",
        "Where a specific KIRAKITAH competition has additional rules, those competition rules apply to participation in that competition.",
      ],
    },
    {
      id: "about-kirakitah",
      title: "2. About KIRAKITAH",
      content: [
        "KIRAKITAH is a platform focused on competition, creativity, technology, community and experiences.",
        "KIRAKITAH Gaming is one initiative within the broader KIRAKITAH ecosystem.",
      ],
    },
    {
      id: "website-use",
      title: "3. Website Use",
      content: [
        "You agree to use the website lawfully and responsibly.",
        "You must not attempt to gain unauthorised access to the website or its systems, interfere with website functionality, introduce malicious code, scrape or misuse protected information, impersonate another person, submit false information, or use the website for unlawful purposes.",
      ],
    },
    {
      id: "tournament-participation",
      title: "4. Tournament Participation",
      content: [
        "Participation in KIRAKITAH Gaming competitions is subject to the specific tournament rules.",
        "For KIRAKITAH Gaming 926: the minimum participant age is 10; participants must satisfy all eligibility requirements; participants must provide accurate registration information; participants must comply with match schedules; participants must follow the official tournament rules and Code of Conduct; and KIRAKITAH may verify participant information.",
      ],
    },
    {
      id: "minors",
      title: "5. Minors",
      content: [
        "Participants under 18 may be required to obtain parent or legal guardian consent.",
        "KIRAKITAH may request reasonable information necessary to verify guardian consent.",
        "KIRAKITAH reserves the right to prevent participation where required consent or verification has not been completed.",
      ],
    },
    {
      id: "fair-play",
      title: "6. Fair Play",
      content: [
        "Participants must compete fairly.",
        "Prohibited behaviour includes cheating, hacking, unauthorised software, exploitation of game bugs for unfair advantage, match fixing, collusion, impersonation, account sharing where prohibited, deliberate manipulation of results, harassment and abusive behaviour.",
        "KIRAKITAH may investigate suspected violations.",
      ],
    },
    {
      id: "matches-and-results",
      title: "7. Matches and Results",
      content: [
        "Participants must follow the assigned match schedule and instructions.",
        "Players may be required to provide screenshots, recordings or other evidence to verify match results or resolve disputes.",
        "KIRAKITAH reserves the right to review and correct tournament results where necessary.",
      ],
    },
    {
      id: "technical-issues",
      title: "8. Technical Issues",
      content: [
        "Online competition may be affected by internet connectivity, device problems, game or server availability, power interruptions, software updates or other technical circumstances.",
        "KIRAKITAH will make reasonable efforts to manage technical issues fairly, but cannot guarantee uninterrupted gameplay.",
        "The official tournament rules will determine how specific technical incidents are handled.",
      ],
    },
    {
      id: "disqualification",
      title: "9. Disqualification",
      content: [
        "KIRAKITAH may disqualify a participant for rule violations, cheating, fraudulent registration, impersonation, misconduct, failure to meet eligibility requirements, failure to provide required verification, or conduct that threatens the integrity or safety of the competition.",
      ],
    },
    {
      id: "prize",
      title: "10. Prize",
      content: [
        "The inaugural KIRAKITAH Gaming 926 competition has one Grand Prize: US$100.",
        "There will be one overall winner.",
        "Prize payment is subject to winner verification and the applicable prize and payment procedures.",
        "If the winner is under 18, KIRAKITAH may require parent or guardian verification and may arrange payment through an appropriate parent or guardian process.",
      ],
    },
    {
      id: "content-and-media",
      title: "11. Content and Media",
      content: [
        "Participants may be featured in KIRAKITAH promotional and tournament-related content, subject to applicable consent requirements.",
        "For minors, KIRAKITAH will apply appropriate parent or guardian consent and safeguarding procedures before using identifiable content where required.",
      ],
    },
    {
      id: "intellectual-property",
      title: "12. Intellectual Property",
      content: [
        "KIRAKITAH's name, logo, visual identity, original website content, graphics and other proprietary materials belong to KIRAKITAH or their respective rights holders unless otherwise stated.",
        "Users may not reproduce or commercially exploit protected materials without permission.",
      ],
    },
    {
      id: "third-party-services",
      title: "13. Third-Party Services",
      content: [
        "The website may link to third-party services, including gaming platforms, social networks, streaming platforms and tournament-management services.",
        "KIRAKITAH does not control third-party services and is not responsible for their independent policies or availability.",
      ],
    },
    {
      id: "privacy",
      title: "14. Privacy",
      content: [
        "Personal information submitted through the website is handled according to the KIRAKITAH Privacy Policy.",
      ],
    },
    {
      id: "changes",
      title: "15. Changes",
      content: [
        "KIRAKITAH may update these Terms when necessary.",
        "Updated terms will be published on the website with a revised date.",
      ],
    },
    {
      id: "contact",
      title: "16. Contact",
      content: [
        "For questions about these Terms, use the official KIRAKITAH contact channel provided on the website.",
      ],
    },
  ],
  disclaimer:
    "These Terms are provided as a general website and competition framework and should be reviewed for compliance with the laws applicable to KIRAKITAH's operations and participants before final publication.",
};

export const privacyPolicy: LegalDocumentConfig = {
  title: "Privacy Policy",
  lastUpdated: "August 23, 2026",
  introduction: [
    "KIRAKITAH respects your privacy.",
    "This Privacy Policy explains how information may be collected, used, stored and protected when you use the KIRAKITAH website or participate in KIRAKITAH programmes and competitions.",
  ],
  sections: [
    {
      id: "information-collected",
      title: "2. Information We May Collect",
      content: [
        "Depending on how you interact with KIRAKITAH, we may collect identity information (full name, date of birth, country, city or location), contact information (email, phone number), gaming information (gamer tag, eFootball-related information, tournament participation information), parent or guardian information for minors where required, social media usernames voluntarily provided by participants, and limited technical information such as IP address, browser type, device type, operating system, pages visited, referring pages and approximate usage information.",
      ],
    },
    {
      id: "how-we-use",
      title: "3. How We Use Information",
      content: [
        "Information may be used to process registrations, verify eligibility, manage competitions, communicate with participants, verify parent or guardian consent, schedule matches, manage results, respond to enquiries, improve the website, maintain website security, produce permitted tournament content, provide updates about KIRAKITAH activities, and meet legal or administrative obligations.",
      ],
    },
    {
      id: "minors",
      title: "4. Minors",
      content: [
        "KIRAKITAH allows participation in certain programmes from age 10.",
        "We recognise the importance of protecting children's information.",
        "Where a participant is under 18, KIRAKITAH may require parent or guardian consent before collecting or using information where applicable.",
        "We will seek to limit the collection of children's personal information to what is reasonably necessary for participation, administration, safety and related purposes.",
        "We will not knowingly request unnecessary sensitive information from children.",
      ],
    },
    {
      id: "public-tournament",
      title: "5. Public Tournament Information",
      content: [
        "Some tournament information may be publicly displayed, such as gamer tag, tournament status, match results, bracket position, country where appropriate, and competition statistics.",
        "KIRAKITAH will not publicly display private contact information such as phone numbers, personal email addresses or guardian contact information.",
      ],
    },
    {
      id: "media",
      title: "6. Media",
      content: [
        "KIRAKITAH may record or publish tournament-related content such as match highlights, livestreams, player interviews, tournament graphics, player names or gamer tags, and competition moments.",
        "Applicable consent requirements will be followed, particularly for minors.",
      ],
    },
    {
      id: "sharing",
      title: "7. How We Share Information",
      content: [
        "KIRAKITAH does not intend to sell participants' personal information.",
        "Information may be shared with trusted service providers where reasonably necessary to operate website infrastructure, registration systems, tournament-management systems, communication systems, analytics and streaming or content services.",
        "Service providers should only receive information reasonably necessary for the service being provided.",
        "Information may also be disclosed where required by law or necessary to protect the rights, safety or security of KIRAKITAH, participants or others.",
      ],
    },
    {
      id: "security",
      title: "8. Data Security",
      content: [
        "KIRAKITAH will take reasonable technical and organisational measures to protect personal information against unauthorised access, loss, misuse, alteration and unauthorised disclosure.",
        "However, no internet-based system can guarantee absolute security.",
      ],
    },
    {
      id: "retention",
      title: "9. Data Retention",
      content: [
        "KIRAKITAH will retain information only for as long as reasonably necessary for the purpose for which it was collected, legal obligations, dispute resolution, record keeping or legitimate operational purposes.",
      ],
    },
    {
      id: "your-rights",
      title: "10. Your Rights",
      content: [
        "Depending on applicable law, you may have rights relating to your personal information, including access, correction, deletion, restriction and withdrawal of consent where applicable.",
        "Requests can be submitted through the official KIRAKITAH contact channel.",
      ],
    },
    {
      id: "cookies",
      title: "11. Cookies",
      content: [
        "The website may use cookies or similar technologies for essential website functionality, analytics, preferences and performance.",
        "Where required, users will be provided with appropriate choices or information about cookie use.",
      ],
    },
    {
      id: "third-party",
      title: "12. Third-Party Services",
      content: [
        "KIRAKITAH may use or link to third-party services including tournament-management platforms, YouTube, Instagram, TikTok, analytics providers, hosting providers and form or communication services.",
        "These services have their own privacy policies and terms.",
        "KIRAKITAH is not responsible for the independent privacy practices of third parties.",
      ],
    },
    {
      id: "international",
      title: "13. International Participation",
      content: [
        "KIRAKITAH Gaming may receive applications from participants in different countries.",
        "Personal information may therefore be processed using service providers located in countries other than the participant's country of residence, subject to applicable legal requirements.",
      ],
    },
    {
      id: "updates",
      title: "14. Policy Updates",
      content: [
        "This Privacy Policy may be updated from time to time.",
        "The latest version will be published on this page with an updated date.",
      ],
    },
    {
      id: "contact",
      title: "15. Contact",
      content: [
        "For privacy-related enquiries or requests, use the official KIRAKITAH contact channel provided on the website.",
      ],
    },
  ],
  disclaimer:
    "This Privacy Policy is a general operational framework and should be reviewed and adapted to the laws and regulatory requirements applicable to KIRAKITAH and its participants before final legal adoption.",
};

export const codeOfConduct: LegalDocumentConfig = {
  title: "KIRAKITAH Code of Conduct",
  lastUpdated: "August 23, 2026",
  introduction: [
    "Competition should be intense. The environment should still be respectful.",
    "Everyone participating in KIRAKITAH is expected to help create a safe, fair and welcoming environment.",
  ],
  sections: [
    {
      id: "rules",
      title: "Expected Conduct",
      content: [
        "Respect other participants.",
        "No harassment.",
        "No hate speech.",
        "No threats.",
        "No cheating.",
        "No match fixing.",
        "No impersonation.",
        "No abusive behaviour toward hosts or referees.",
        "No inappropriate communication with minors.",
        "Follow official tournament instructions.",
        "Report serious incidents through official channels.",
      ],
    },
    {
      id: "violations",
      title: "Violations",
      content: [
        "Violations may result in warnings, match penalties, disqualification, suspension or removal from KIRAKITAH activities depending on severity.",
      ],
    },
  ],
  disclaimer:
    "This Code of Conduct applies to all KIRAKITAH programmes and experiences. Tournament-specific rules may provide additional requirements for competition participants.",
};

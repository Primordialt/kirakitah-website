import type { FAQ } from "@/domain/faq";

export const mockFaqs: FAQ[] = [
  {
    id: "faq-001",
    question: "What is KIRAKITAH?",
    answer:
      "KIRAKITAH is a digital platform initiative spanning technology, culture, competition, and community.",
    category: "general",
    order: 1,
  },
  {
    id: "faq-002",
    question: "When does registration open?",
    answer:
      "Registration details for KIRAKITAH Gaming 2026 will be published on the eSports section.",
    category: "esports",
    order: 2,
  },
];

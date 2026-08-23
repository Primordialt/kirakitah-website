import { mockFaqs } from "@/data/mocks/faqs";
import type { FAQ } from "@/domain/faq";
import type { IFAQService } from "./types";

export class MockFAQService implements IFAQService {
  async getAll(): Promise<FAQ[]> {
    return mockFaqs;
  }

  async getByCategory(category: string): Promise<FAQ[]> {
    return mockFaqs
      .filter((faq) => faq.category === category)
      .sort((a, b) => a.order - b.order);
  }
}

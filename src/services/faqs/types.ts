import type { FAQ } from "@/domain/faq";

export interface IFAQService {
  getAll(): Promise<FAQ[]>;
  getByCategory(category: string): Promise<FAQ[]>;
}

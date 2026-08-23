import { randomBytes } from "crypto";

const REFERENCE_PREFIX = "KG926";

export function generateReferenceId(date = new Date()): string {
  const year = date.getFullYear();
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `${REFERENCE_PREFIX}-${year}-${suffix}`;
}

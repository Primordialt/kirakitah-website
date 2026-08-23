export type IdentificationType = "nin" | "passport";

export const IDENTIFICATION_TYPE_OPTIONS = [
  {
    value: "nin" as const,
    label: "National Identification Number (NIN)",
  },
  {
    value: "passport" as const,
    label: "International Passport",
  },
];

export function getIdentificationNumberLabel(type: IdentificationType): string {
  return type === "nin" ? "NIN" : "Passport number";
}

export function getIdentificationNumberPlaceholder(type: IdentificationType): string {
  return type === "nin" ? "Enter your NIN" : "Enter your passport number";
}

export function normalizeIdentificationNumber(
  type: IdentificationType,
  value: string,
): string {
  const trimmed = value.trim();

  if (type === "nin") {
    return trimmed.replace(/\s/g, "");
  }

  return trimmed.replace(/\s/g, "").toUpperCase();
}

export function validateIdentificationNumber(
  type: IdentificationType,
  value: string,
): string | undefined {
  const normalized = normalizeIdentificationNumber(type, value);

  if (!normalized) {
    return `${getIdentificationNumberLabel(type)} is required`;
  }

  if (type === "nin") {
    if (!/^\d{11}$/.test(normalized)) {
      return "NIN must be exactly 11 digits";
    }
    return undefined;
  }

  if (!/^[A-Z0-9]{6,20}$/.test(normalized)) {
    return "Passport number must be 6–20 letters or numbers";
  }

  return undefined;
}

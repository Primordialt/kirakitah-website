export type IdentificationType = "nin" | "passport" | "other_government_id";

export const IDENTIFICATION_TYPE_OPTIONS = [
  {
    value: "nin" as const,
    label: "National Identification Number (NIN)",
  },
  {
    value: "passport" as const,
    label: "International Passport",
  },
  {
    value: "other_government_id" as const,
    label: "Other Government-Issued ID",
  },
];

export function getIdentificationTypeLabel(
  type: IdentificationType | null | undefined,
  governmentIdType?: string | null,
): string {
  if (!type) return "Not provided";
  if (type === "nin") return "NIN";
  if (type === "passport") return "International Passport";
  if (governmentIdType?.trim()) {
    return `Other Government-Issued ID (${governmentIdType.trim()})`;
  }
  return "Other Government-Issued ID";
}

export function getIdentificationNumberLabel(type: IdentificationType): string {
  if (type === "nin") return "NIN";
  if (type === "passport") return "Passport number";
  return "Government ID number";
}

export function getIdentificationNumberPlaceholder(type: IdentificationType): string {
  if (type === "nin") return "Enter your NIN";
  if (type === "passport") return "Enter your passport number";
  return "Enter your government ID number";
}

export function normalizeGovernmentIdType(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function validateGovernmentIdType(value: string): string | undefined {
  const normalized = normalizeGovernmentIdType(value);
  if (!normalized) {
    return "Government ID type is required";
  }
  if (normalized.length < 2) {
    return "Government ID type must be at least 2 characters";
  }
  if (normalized.length > 120) {
    return "Government ID type must be 120 characters or fewer";
  }
  return undefined;
}

export function normalizeIdentificationNumber(
  type: IdentificationType,
  value: string,
): string {
  const trimmed = value.trim();

  if (type === "nin") {
    return trimmed.replace(/\s/g, "");
  }

  if (type === "other_government_id") {
    return trimmed.replace(/\s+/g, " ").trim();
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

  if (type === "other_government_id") {
    if (normalized.length < 3) {
      return "Government ID number must be at least 3 characters";
    }
    if (normalized.length > 40) {
      return "Government ID number must be 40 characters or fewer";
    }
    return undefined;
  }

  if (!/^[A-Z0-9]{6,20}$/.test(normalized)) {
    return "Passport number must be 6–20 letters or numbers";
  }

  return undefined;
}

export function validateIdentityFields(input: {
  identificationType: IdentificationType;
  identificationNumber?: string;
  governmentIdType?: string;
}): string | undefined {
  if (input.identificationType === "other_government_id") {
    const typeError = validateGovernmentIdType(input.governmentIdType ?? "");
    if (typeError) return typeError;
  }

  if (input.identificationNumber !== undefined) {
    return validateIdentificationNumber(
      input.identificationType,
      input.identificationNumber,
    );
  }

  return undefined;
}

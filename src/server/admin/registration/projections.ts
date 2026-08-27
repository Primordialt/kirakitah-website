/**
 * Admin-facing DTO projections — never reuse public registration DTOs.
 */

export interface AdminApplicationListItem {
  referenceId: string;
  fullName: string;
  gamerTag: string;
  createdAt: string;
  eventId: string;
  status: string;
  identityVerificationStatus: string;
  socialFollowStatus: string;
  emailVerificationStatus: string;
  phoneVerificationStatus: string;
}

export interface AdminDashboardStats {
  totalApplications: number;
  received: number;
  pendingIdentityReviews: number;
  pendingSocialReviews: number;
  pendingContactVerification: number;
  underReview: number;
  approved: number;
  rejected: number;
}

export interface AdminApplicationDetail {
  referenceId: string;
  eventId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  player: {
    fullName: string;
    dateOfBirth: string;
    country: string;
    city: string;
    email: string;
    phone: string;
  };
  gaming: {
    gamerTag: string;
    game: string;
    platform: string;
    gamingProfile: string | null;
  };
  availability: {
    timezone: string;
    availability: string[];
  };
  socialHandles: Record<string, string> | null;
  socialFollow: {
    status: string;
    attestation: boolean;
    attestationAt: string | null;
    platforms: Array<{
      platform: "x" | "instagram" | "tiktok" | "youtube";
      applicantHandle: string;
      verificationStatus: "pending" | "verified" | "rejected";
      verificationNotes: string | null;
      reviewedBy: string | null;
      reviewedAt: string | null;
    }>;
  };
  contactVerification: {
    emailStatus: string;
    emailVerifiedAt: string | null;
    phoneStatus: string;
    phoneVerifiedAt: string | null;
  };
  identity: {
    identificationType: "nin" | "passport";
    /** Masked by default */
    identificationNumberMasked: string;
    status: string;
    reviewedAt: string | null;
    reviewedBy: string | null;
    notes: string | null;
    meta: { provider: string; checkedAt: string; details?: string } | null;
  };
  /** Present only when caller has guardian permission and guardian exists */
  guardian?: {
    fullName: string;
    relationship: string;
    email: string;
    phone: string;
    consentAt: string;
  } | null;
  /** Present only when caller has photo permission */
  photo?: {
    available: boolean;
    fileName: string;
    mimeType: string;
    accessPath: string;
  } | null;
  consents: {
    rules: boolean;
    terms: boolean;
    privacy: boolean;
    codeOfConduct: boolean;
    mediaConsent: boolean;
    acceptedAt: string;
  };
}

export interface AdminSensitiveIdentity {
  identificationType: "nin" | "passport";
  identificationNumber: string;
}

export interface AdminAuditEvent {
  id: string;
  eventType: string;
  actorId: string | null;
  actorRole: string | null;
  applicationReference: string | null;
  requestId: string | null;
  metadata: Record<string, string | number | boolean | null> | null;
  createdAt: string;
}

export function maskIdentificationNumber(
  type: "nin" | "passport",
  value: string,
): string {
  if (!value) return "********";
  if (type === "nin") {
    const last4 = value.slice(-4);
    return `${"*".repeat(Math.max(0, value.length - 4))}${last4}`;
  }
  const last4 = value.slice(-4);
  return `${"*".repeat(Math.max(0, value.length - 4))}${last4}`;
}

export function sanitizeReviewNotes(notes: string | undefined): string {
  return (notes ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}

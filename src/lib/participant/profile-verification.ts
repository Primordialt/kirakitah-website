/** Participant-visible message when a Super Admin reopens a verified profile. */
export const PROFILE_REOPENED_PARTICIPANT_MESSAGE =
  "Your profile verification has been reopened for review. Please check your profile information and make any required corrections.";

export function isProfileReopenedForReview(
  correctionReason: string | null | undefined,
): boolean {
  return correctionReason === PROFILE_REOPENED_PARTICIPANT_MESSAGE;
}

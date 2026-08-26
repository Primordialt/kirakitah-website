export const PARTICIPANT_REGISTRATION_STORAGE_KEY =
  "kirakitah_participant_registration";

export type ParticipantRegistrationState = {
  email: string;
  emailVerificationToken: string;
  challengeId?: string;
  username?: string;
};

export function readRegistrationState(): ParticipantRegistrationState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PARTICIPANT_REGISTRATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ParticipantRegistrationState;
    if (
      typeof parsed?.email !== "string" ||
      typeof parsed?.emailVerificationToken !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeRegistrationState(
  state: ParticipantRegistrationState,
): void {
  sessionStorage.setItem(
    PARTICIPANT_REGISTRATION_STORAGE_KEY,
    JSON.stringify(state),
  );
}

export function clearRegistrationState(): void {
  sessionStorage.removeItem(PARTICIPANT_REGISTRATION_STORAGE_KEY);
}

export function hasVerifiedRegistrationState(
  state: ParticipantRegistrationState | null,
): state is ParticipantRegistrationState {
  return Boolean(
    state?.email &&
      state.emailVerificationToken &&
      state.emailVerificationToken.length > 0,
  );
}

export function hasUsernameRegistrationState(
  state: ParticipantRegistrationState | null,
): state is ParticipantRegistrationState & { username: string } {
  return Boolean(
    hasVerifiedRegistrationState(state) &&
      state.username &&
      state.username.trim().length > 0,
  );
}

/** Participant session snapshot for the public site header (no PII beyond username). */
export type SiteHeaderAuthState =
  | { isAuthenticated: false }
  | { isAuthenticated: true; username: string };

export const unauthenticatedSiteHeaderAuth: SiteHeaderAuthState = {
  isAuthenticated: false,
};

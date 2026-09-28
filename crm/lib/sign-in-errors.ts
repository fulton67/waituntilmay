/** Why a magic link didn't sign someone in — set by /crm/auth/callback, shown on /crm/sign-in. */
export const SIGN_IN_ERRORS = {
  expired: "That link has expired or was already used. Request a new one.",
  browser: "Open the link in the same browser you requested it from — the link only works there.",
  denied: "That email isn't on the allowlist. Ask Naim for access.",
  database: "We couldn't reach the database to check your access. Try again in a minute.",
  nocode: "That link is missing its sign-in code. Request a new one and open it straight from the email.",
  unknown: "Sign-in didn't complete. Request a new link.",
} as const;

export type SignInError = keyof typeof SIGN_IN_ERRORS;

export function signInErrorMessage(reason: string | undefined): string | null {
  if (!reason) return null;
  // "link" was the v1 catch-all.
  if (reason === "link") return SIGN_IN_ERRORS.expired;
  return reason in SIGN_IN_ERRORS ? SIGN_IN_ERRORS[reason as SignInError] : SIGN_IN_ERRORS.unknown;
}

/** Why a sign-in didn't work — set by the auth routes and actions, shown on /crm/sign-in. Plain words only. */
export const SIGN_IN_ERRORS = {
  expired: "That link has expired or was already used. Request a new one.",
  browser: "Open the link in the same browser you requested it from — or type the 6-digit code from the email instead.",
  code: "That code didn't work. Check it against the newest email, or request a new one.",
  denied: "You're not in the CRM yet — use the invite link you were sent.",
  removed: "You no longer have access to the CRM. Ask whoever runs it if that's a mistake.",
  invite: "This invite has expired — ask whoever runs the CRM for a new link.",
  database: "We couldn't reach the database to check your access. Try again in a minute.",
  nocode: "That link is missing its sign-in code. Request a new one and open it straight from the email.",
  limit: "Too many tries. Wait 15 minutes and try again.",
  unknown: "Sign-in didn't complete. Request a new link.",
} as const;

export type SignInError = keyof typeof SIGN_IN_ERRORS;

export function signInErrorMessage(reason: string | undefined): string | null {
  if (!reason) return null;
  // "link" was the v1 catch-all.
  if (reason === "link") return SIGN_IN_ERRORS.expired;
  return reason in SIGN_IN_ERRORS ? SIGN_IN_ERRORS[reason as SignInError] : SIGN_IN_ERRORS.unknown;
}

/** Map a Supabase auth error to one of the reasons above. */
export function reasonForAuthError(message: string, code?: string | null): SignInError {
  const m = `${code ?? ""} ${message}`.toLowerCase();
  // PKCE: the verifier cookie lives in the browser that asked for the link.
  if (m.includes("code verifier") || m.includes("code_verifier") || m.includes("pkce")) return "browser";
  if (m.includes("rate limit") || m.includes("too many") || m.includes("over_email_send_rate_limit") || m.includes("over_request_rate_limit")) return "limit";
  if (m.includes("expired") || m.includes("invalid") || m.includes("flow state") || m.includes("otp") || m.includes("already been used")) {
    return "expired";
  }
  return "unknown";
}

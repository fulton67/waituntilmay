/** Emails allowed to sign in, from CRM_ALLOWED_EMAILS (comma-separated). */
export function allowedEmails(): string[] {
  return (process.env.CRM_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowed(email: string | null | undefined): boolean {
  return !!email && allowedEmails().includes(email.trim().toLowerCase());
}

export function supabaseConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

/**
 * Without a Supabase project, local dev and e2e sign in with a signed cookie instead of a magic
 * link. It is never available in production unless CRM_DEV_AUTH=1 is set explicitly.
 */
export function devAuthEnabled(): boolean {
  if (supabaseConfig()) return false;
  return process.env.NODE_ENV !== "production" || process.env.CRM_DEV_AUTH === "1";
}

/** Reset-demo-data and other destructive tools. */
export function devToolsEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.CRM_DEV_AUTH === "1";
}

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
  // e2e / offline dev: ignore the Supabase keys in .env.local and use local sign-in + PGlite.
  if (process.env.CRM_FORCE_LOCAL === "1" && process.env.NODE_ENV !== "production") return null;
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

/** Public origin of the site, for links that leave the app (magic links). */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://waituntilmay.com").replace(/\/+$/, "");
}

/**
 * Origin to put in the magic link: the request's own origin when it is this site or local dev,
 * otherwise the configured site URL. A forged Origin header can't point links elsewhere.
 */
export function trustedOrigin(requestOrigin: string | null): string {
  const site = siteUrl();
  if (!requestOrigin) return site;
  try {
    const u = new URL(requestOrigin);
    if (u.origin === new URL(site).origin) return u.origin;
    if (process.env.NODE_ENV !== "production" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) return u.origin;
  } catch {
    // malformed header — fall through
  }
  return site;
}

/** Only same-site paths under /crm are allowed as a post-sign-in destination. */
export function safeCrmPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/crm") || next.startsWith("//") || next.includes("\\")) return null;
  if (next !== "/crm" && !next.startsWith("/crm/") && !next.startsWith("/crm?")) return null;
  return next;
}

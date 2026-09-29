import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { completeSignIn } from "./auth";
import { reasonForAuthError, type SignInError } from "./sign-in-errors";
import { supabaseServer } from "./supabase/server";

/**
 * Where the email link lands (/crm/auth/confirm, and the older /crm/auth/callback).
 * Preferred: ?token_hash=…&type=email from the email templates — works in any browser.
 * Fallback: ?code=… (PKCE) if the templates still use {{ .ConfirmationURL }} — same browser only.
 * Then applies a pending join and routes by role. Every failure lands on /crm/sign-in?error=<reason>.
 */
export async function authLanding(req: NextRequest) {
  const url = req.nextUrl;
  const to = (path: string) => NextResponse.redirect(new URL(path, url.origin));
  const fail = (reason: SignInError, detail: string) => {
    console.warn(`[crm auth] sign-in failed: ${reason} — ${detail}`);
    return to(`/crm/sign-in?error=${reason}`);
  };

  // Supabase reports link problems as query params on the redirect.
  const upstream = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (upstream) return fail(reasonForAuthError(upstream, url.searchParams.get("error_code")), `supabase: ${upstream}`);

  const supabase = await supabaseServer();
  if (!supabase) return fail("unknown", "Supabase env vars are not set on this deployment");

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") ?? "email") as EmailOtpType;

  let email: string | null = null;
  if (tokenHash) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return fail(reasonForAuthError(error.message, error.code), `verifyOtp: ${error.code ?? ""} ${error.message}`);
    email = data.user?.email?.toLowerCase() ?? null;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail(reasonForAuthError(error.message, error.code), `exchangeCodeForSession: ${error.code ?? ""} ${error.message}`);
    email = data.user?.email?.toLowerCase() ?? null;
  } else {
    return fail("nocode", "landing reached without ?token_hash or ?code");
  }
  if (!email) return fail("unknown", "session has no email");

  try {
    const outcome = await completeSignIn(email);
    if (outcome.ok) return to(outcome.to);
    await supabase.auth.signOut();
    return fail(outcome.reason, `${email}: ${outcome.reason}`);
  } catch (err) {
    await supabase.auth.signOut();
    return fail("database", `completeSignIn for ${email}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

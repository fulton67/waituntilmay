import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { candidateByEmail } from "@/crm/lib/auth";
import { isAllowed, safeCrmPath } from "@/crm/lib/env";
import { supabaseServer } from "@/crm/lib/supabase/server";
import type { SignInError } from "@/crm/lib/sign-in-errors";

/** Map a Supabase auth failure to a reason the sign-in page can explain. */
function reasonFor(message: string, code?: string | null): SignInError {
  const m = `${code ?? ""} ${message}`.toLowerCase();
  // PKCE: the verifier cookie lives in the browser that asked for the link.
  if (m.includes("code verifier") || m.includes("code_verifier") || m.includes("pkce")) return "browser";
  if (m.includes("expired") || m.includes("invalid") || m.includes("flow state") || m.includes("otp") || m.includes("already been used")) {
    return "expired";
  }
  return "unknown";
}

/**
 * Magic-link landing. Exchanges the PKCE code (or a token hash) for a session cookie, then routes
 * by role: interviewers to `next` when it is under /crm (default /crm), interns to /crm/me.
 * Every failure redirects to /crm/sign-in?error=<reason> and logs the same reason.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const to = (path: string) => NextResponse.redirect(new URL(path, url.origin));
  const fail = (reason: SignInError, detail: string) => {
    console.warn(`[crm auth] sign-in failed: ${reason} — ${detail}`);
    return to(`/crm/sign-in?error=${reason}`);
  };

  // Supabase reports link problems as query params on the redirect.
  const upstream = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (upstream) return fail(reasonFor(upstream, url.searchParams.get("error_code")), `supabase: ${upstream}`);

  const supabase = await supabaseServer();
  if (!supabase) return fail("unknown", "Supabase env vars are not set on this deployment");

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  let email: string | null = null;
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail(reasonFor(error.message, error.code), `exchangeCodeForSession: ${error.code ?? ""} ${error.message}`);
    email = data.user?.email?.toLowerCase() ?? null;
  } else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return fail(reasonFor(error.message, error.code), `verifyOtp: ${error.code ?? ""} ${error.message}`);
    email = data.user?.email?.toLowerCase() ?? null;
  } else {
    return fail("nocode", "callback reached without ?code or ?token_hash");
  }
  if (!email) return fail("unknown", "session has no email");

  if (isAllowed(email)) return to(safeCrmPath(url.searchParams.get("next")) ?? "/crm");

  let intern = null;
  try {
    intern = await candidateByEmail(email);
  } catch (err) {
    await supabase.auth.signOut();
    return fail("database", `candidate lookup for ${email}: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (intern) return to("/crm/me");

  await supabase.auth.signOut();
  return fail("denied", `${email} is not in CRM_ALLOWED_EMAILS and matches no candidate`);
}

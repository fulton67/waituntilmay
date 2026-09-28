import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { candidateByEmail } from "@/crm/lib/auth";
import { isAllowed, safeCrmPath } from "@/crm/lib/env";
import { supabaseServer } from "@/crm/lib/supabase/server";

/**
 * Magic-link landing. Exchanges the PKCE code (or a token hash, for email templates that use
 * {{ .TokenHash }}) for a session cookie, then routes by role: interviewers to `next` when it is
 * under /crm (default /crm), interns to /crm/me, anyone else back to sign-in.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const to = (path: string) => {
    const dest = new URL(path, url.origin);
    return NextResponse.redirect(dest);
  };
  const fail = (reason: string) => to(`/crm/sign-in?error=${reason}`);

  if (url.searchParams.get("error")) return fail("link");

  const supabase = await supabaseServer();
  if (!supabase) return fail("link");

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  let email: string | null = null;
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.warn("[crm auth] code exchange failed:", error.message);
      return fail("link");
    }
    email = data.user?.email ?? null;
  } else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) {
      console.warn("[crm auth] token verification failed:", error.message);
      return fail("link");
    }
    email = data.user?.email ?? null;
  } else {
    return fail("link");
  }

  if (email && isAllowed(email)) return to(safeCrmPath(url.searchParams.get("next")) ?? "/crm");
  if (email && (await candidateByEmail(email))) return to("/crm/me");
  await supabase.auth.signOut();
  return to("/crm/sign-in?denied=1");
}

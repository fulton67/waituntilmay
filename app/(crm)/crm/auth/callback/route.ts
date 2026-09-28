import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/crm/lib/supabase/server";

/** Magic-link landing: exchanges the code (PKCE) or token hash for a session cookie. */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const supabase = await supabaseServer();

  let ok = false;
  if (supabase && code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  else if (supabase && tokenHash && type) ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;

  const dest = url.clone();
  dest.search = "";
  dest.pathname = ok ? "/crm" : "/crm/sign-in";
  if (!ok) dest.searchParams.set("error", "link");
  return NextResponse.redirect(dest);
}

import { NextRequest, NextResponse } from "next/server";
import { DEV_COOKIE, readDevToken } from "./crm/lib/dev-session";
import { devAuthEnabled, supabaseConfig } from "./crm/lib/env";
import { refreshSupabaseSession } from "./crm/lib/supabase/proxy";

const LUNCH_BELLS_COOKIE = "lb-auth";
// Sign-in, the magic-link landing, and static brand assets (the sign-in page needs the wordmark).
const CRM_PUBLIC = ["/crm/sign-in", "/crm/auth/callback", "/crm/brand/", "/crm/api/health"];

function lunchBells(req: NextRequest) {
  if (req.nextUrl.pathname === "/lunch-bells/login") return NextResponse.next();

  const auth = req.cookies.get(LUNCH_BELLS_COOKIE)?.value;
  const password = process.env.LUNCH_BELLS_PASSWORD;

  if (password && auth === password) return NextResponse.next();

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/lunch-bells/login";
  return NextResponse.redirect(loginUrl);
}

async function crm(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // The callback sets its own auth cookies; refreshing here could clear the PKCE code verifier it needs.
  if (pathname.startsWith("/crm/auth/callback")) return NextResponse.next();
  let response = NextResponse.next();
  let email: string | null;

  if (devAuthEnabled()) {
    email = readDevToken(req.cookies.get(DEV_COOKIE)?.value);
  } else if (supabaseConfig()) {
    ({ response, email } = await refreshSupabaseSession(req));
  } else {
    email = null;
  }

  if (CRM_PUBLIC.some((p) => pathname.startsWith(p))) return response;
  // Signed in is enough here; layouts and server actions decide interviewer vs intern vs no access.
  if (email) return response;

  const url = req.nextUrl.clone();
  url.pathname = "/crm/sign-in";
  url.search = "";
  return NextResponse.redirect(url);
}

export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/crm")) return crm(req);
  return lunchBells(req);
}

export const config = {
  matcher: ["/lunch-bells", "/lunch-bells/:path*", "/crm", "/crm/:path*"],
};

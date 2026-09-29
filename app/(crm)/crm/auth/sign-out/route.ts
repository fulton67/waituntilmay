import { NextResponse, type NextRequest } from "next/server";
import { DEV_COOKIE } from "@/crm/lib/dev-session";
import { signInErrorMessage } from "@/crm/lib/sign-in-errors";
import { supabaseServer } from "@/crm/lib/supabase/server";

/**
 * Ends the session and explains why on the sign-in page. Pages send people here when their email
 * has no access any more — e.g. an interviewer removed in Settings.
 */
export async function GET(req: NextRequest) {
  const reason = req.nextUrl.searchParams.get("error");
  const target = new URL("/crm/sign-in", req.nextUrl.origin);
  if (reason && signInErrorMessage(reason)) target.searchParams.set("error", reason);
  const supabase = await supabaseServer();
  await supabase?.auth.signOut();
  const res = NextResponse.redirect(target);
  res.cookies.delete(DEV_COOKIE);
  return res;
}

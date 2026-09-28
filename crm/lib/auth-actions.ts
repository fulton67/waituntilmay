"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DEV_COOKIE, createDevToken } from "./dev-session";
import { devAuthEnabled, isAllowed } from "./env";
import { supabaseServer } from "./supabase/server";
import { candidateByEmail } from "./auth";

export type SignInState = { status: "idle" | "sent" | "denied" | "error"; message?: string; email?: string };

export async function requestSignIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  const parsed = z.string().trim().toLowerCase().email().safeParse(form.get("email"));
  if (!parsed.success) return { status: "error", message: "Enter a valid email." };
  const email = parsed.data;

  // Interviewers (allowlist) and interns (a candidate with this email) may sign in.
  if (!isAllowed(email) && !(await candidateByEmail(email))) return { status: "denied", email };

  if (devAuthEnabled()) {
    const store = await cookies();
    store.set(DEV_COOKIE, createDevToken(email), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });
    redirect(isAllowed(email) ? "/crm" : "/crm/me");
  }

  const supabase = await supabaseServer();
  if (!supabase) return { status: "error", message: "Sign-in isn't configured. Set the Supabase env vars." };
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/crm/auth/callback`, shouldCreateUser: true },
  });
  if (error) return { status: "error", message: error.message };
  return { status: "sent", email };
}

export async function signOut() {
  const store = await cookies();
  store.delete(DEV_COOKIE);
  const supabase = await supabaseServer();
  await supabase?.auth.signOut();
  redirect("/crm/sign-in");
}

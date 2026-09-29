"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DEV_COOKIE, createDevToken } from "./dev-session";
import { devAuthEnabled, trustedOrigin } from "./env";
import { supabaseServer } from "./supabase/server";
import { accessFor, completeSignIn, savePendingJoin } from "./auth";
import { inviteValid } from "./invites";
import { INVITE_ROLES, type InviteRole } from "./invite-token";
import { allow, clientIp } from "./rate-limit";
import { reasonForAuthError, SIGN_IN_ERRORS } from "./sign-in-errors";

export type SignInState = { status: "idle" | "sent" | "error"; message?: string; email?: string };

const emailField = z.string().trim().toLowerCase().email("Enter a valid email.");
const fail = (message: string, email?: string): SignInState => ({ status: "error", message, email });

/** Local dev / e2e: no email round-trip — the signed cookie is the session. */
async function devSignIn(email: string) {
  const outcome = await completeSignIn(email);
  if (!outcome.ok) return fail(SIGN_IN_ERRORS[outcome.reason], email);
  const store = await cookies();
  store.set(DEV_COOKIE, createDevToken(email), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(outcome.to);
}

/**
 * Email the magic link and 6-digit code. The link lands on /crm/auth/confirm — passed explicitly,
 * never left to the Supabase project's Site URL default.
 */
async function sendEmail(email: string): Promise<SignInState> {
  if (!(await allow(`send:${email}`, 5, 60))) return fail(SIGN_IN_ERRORS.limit, email);
  const supabase = await supabaseServer();
  if (!supabase) return fail("Sign-in isn't set up on this site yet. Tell whoever runs the CRM.", email);
  const h = await headers();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${trustedOrigin(h.get("origin"))}/crm/auth/confirm`, shouldCreateUser: true },
  });
  if (error) {
    console.warn(`[crm auth] signInWithOtp for ${email}: ${error.code ?? ""} ${error.message}`);
    const reason = reasonForAuthError(error.message, error.code);
    return fail(reason === "limit" ? SIGN_IN_ERRORS.limit : "We couldn't send the email. Try again in a minute.", email);
  }
  return { status: "sent", email };
}

/** /crm/sign-in: email only. The role comes from which table the email is in. */
export async function requestSignIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  const parsed = emailField.safeParse(form.get("email"));
  if (!parsed.success) return fail("Enter a valid email.");
  const email = parsed.data;
  if (!(await allow(`signin:${await clientIp()}`, 20, 15))) return fail(SIGN_IN_ERRORS.limit, email);

  const access = await accessFor(email);
  if (!access.role) return fail(SIGN_IN_ERRORS[access.reason], email);
  if (devAuthEnabled()) return devSignIn(email);
  return sendEmail(email);
}

const joinFields = {
  interviewer: z.object({ name: z.string().trim().min(1, "Enter your name.").max(60, "That name is too long."), email: emailField }),
  intern: z.object({
    name: z.string().trim().min(1, "Enter your name.").max(120, "That name is too long."),
    email: emailField,
    school: z.string().trim().min(1, "Enter your school.").max(160, "That's too long."),
    major: z.string().trim().min(1, "Enter your major.").max(160, "That's too long."),
  }),
};

/** /crm/join/<role>/<token>: check the invite, remember the form, then email the link and code. */
export async function requestJoin(role: InviteRole, token: string, _prev: SignInState, form: FormData): Promise<SignInState> {
  if (!INVITE_ROLES.includes(role)) return fail(SIGN_IN_ERRORS.invite);
  const typedEmail = String(form.get("email") ?? "");
  if (!(await allow(`join:${await clientIp()}`, 10, 15))) return fail(SIGN_IN_ERRORS.limit, typedEmail);
  if (!(await inviteValid(role, token))) return fail(SIGN_IN_ERRORS.invite, typedEmail);

  const parsed = joinFields[role].safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form and try again.", typedEmail);
  const v = parsed.data;
  await savePendingJoin({ role, token, ...v });

  if (devAuthEnabled()) return devSignIn(v.email);
  return sendEmail(v.email);
}

/** The 6-digit code from the email — for when the link opens in another browser or app. */
export async function verifyCode(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = emailField.safeParse(form.get("email"));
  if (!email.success) return fail("Enter a valid email.");
  const code = String(form.get("code") ?? "").replace(/\s+/g, "");
  if (!/^\d{6,10}$/.test(code)) return { status: "sent", email: email.data, message: "Enter the 6-digit code from the email." };
  if (!(await allow(`code:${email.data}`, 10, 15)) || !(await allow(`code-ip:${await clientIp()}`, 30, 15))) {
    return { status: "sent", email: email.data, message: SIGN_IN_ERRORS.limit };
  }

  const supabase = await supabaseServer();
  if (!supabase) return fail("Sign-in isn't set up on this site yet. Tell whoever runs the CRM.", email.data);
  const { error } = await supabase.auth.verifyOtp({ email: email.data, token: code, type: "email" });
  if (error) {
    console.warn(`[crm auth] verifyOtp (code) for ${email.data}: ${error.code ?? ""} ${error.message}`);
    const reason = reasonForAuthError(error.message, error.code);
    return { status: "sent", email: email.data, message: reason === "limit" ? SIGN_IN_ERRORS.limit : SIGN_IN_ERRORS.code };
  }

  const outcome = await completeSignIn(email.data);
  if (!outcome.ok) {
    await supabase.auth.signOut();
    return fail(SIGN_IN_ERRORS[outcome.reason], email.data);
  }
  redirect(outcome.to);
}

export async function signOut() {
  const store = await cookies();
  store.delete(DEV_COOKIE);
  const supabase = await supabaseServer();
  await supabase?.auth.signOut();
  redirect("/crm/sign-in");
}

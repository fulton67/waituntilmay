import { randomBytes, timingSafeEqual } from "node:crypto";

export const INVITE_ROLES = ["interviewer", "intern"] as const;
export type InviteRole = (typeof INVITE_ROLES)[number];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
export const TOKEN_LENGTH = 32;
/** The interviewer link stops working this long after it's generated; the intern link never expires. */
export const INTERVIEWER_INVITE_DAYS = 7;

/** 32 random characters from [A-Za-z0-9], without modulo bias. */
export function generateToken(): string {
  let out = "";
  while (out.length < TOKEN_LENGTH) {
    for (const b of randomBytes(TOKEN_LENGTH * 2)) {
      if (b < 248 && out.length < TOKEN_LENGTH) out += ALPHABET[b % 62]; // 248 = 4 × 62
    }
  }
  return out;
}

export function interviewerInviteExpiry(from: Date): Date {
  return new Date(from.getTime() + INTERVIEWER_INVITE_DAYS * 24 * 60 * 60 * 1000);
}

/** Constant-time check of a token from a URL against the stored one (and its expiry, if any). */
export function tokenMatches(given: string, stored: string | null, expiresAt: Date | null, now = new Date()): boolean {
  if (!stored || given.length !== stored.length) return false;
  if (!timingSafeEqual(Buffer.from(given), Buffer.from(stored))) return false;
  return !expiresAt || expiresAt.getTime() > now.getTime();
}

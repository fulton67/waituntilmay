import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../db";
import { siteUrl } from "./env";
import { generateToken, interviewerInviteExpiry, tokenMatches, type InviteRole } from "./invite-token";
import type { Invites } from "./types";

/** The settings row with both invite tokens, generating any that don't exist yet. */
async function inviteRow() {
  const db = await getDb();
  await db.insert(schema.settings).values({ id: 1 }).onConflictDoNothing();
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.id, 1));
  if (row.interviewerInvite && row.internInvite) return row;
  const now = new Date();
  const [filled] = await db
    .update(schema.settings)
    .set({
      interviewerInvite: row.interviewerInvite ?? generateToken(),
      interviewerInviteExpiresAt: row.interviewerInvite ? row.interviewerInviteExpiresAt : interviewerInviteExpiry(now),
      internInvite: row.internInvite ?? generateToken(),
    })
    .where(eq(schema.settings.id, 1))
    .returning();
  return filled;
}

export function inviteUrl(role: InviteRole, token: string) {
  return `${siteUrl()}/crm/join/${role}/${token}`;
}

/** Both links as Settings shows them. Only ever sent to interviewers. */
export async function loadInvites(): Promise<Invites> {
  const row = await inviteRow();
  return {
    interviewer: { url: inviteUrl("interviewer", row.interviewerInvite!), expiresAt: row.interviewerInviteExpiresAt?.toISOString() ?? null },
    intern: { url: inviteUrl("intern", row.internInvite!) },
  };
}

/** Is `token` the current, unexpired invite for `role`? */
export async function inviteValid(role: InviteRole, token: string): Promise<boolean> {
  const row = await inviteRow();
  return role === "interviewer"
    ? tokenMatches(token, row.interviewerInvite, row.interviewerInviteExpiresAt)
    : tokenMatches(token, row.internInvite, null);
}

/** Replace a link. The old token stops working at once, including joins still waiting on email. */
export async function regenerateInvite(role: InviteRole) {
  await inviteRow();
  const db = await getDb();
  const token = generateToken();
  await db
    .update(schema.settings)
    .set(role === "interviewer" ? { interviewerInvite: token, interviewerInviteExpiresAt: interviewerInviteExpiry(new Date()) } : { internInvite: token })
    .where(eq(schema.settings.id, 1));
  await db.delete(schema.pendingJoins).where(eq(schema.pendingJoins.role, role));
}

import { createHmac, timingSafeEqual } from "node:crypto";

export const DEV_COOKIE = "crm-dev-session";

function secret() {
  return process.env.CRM_DEV_SECRET || "fomo-crm-local-dev-secret";
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createDevToken(email: string): string {
  const payload = Buffer.from(email.toLowerCase()).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readDevToken(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return Buffer.from(payload, "base64url").toString();
}

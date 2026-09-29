import assert from "node:assert/strict";
import { test } from "node:test";
import { generateToken, interviewerInviteExpiry, tokenMatches } from "./invite-token";

test("generateToken: 32 characters from [A-Za-z0-9], different every time", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const t = generateToken();
    assert.match(t, /^[A-Za-z0-9]{32}$/);
    seen.add(t);
  }
  assert.equal(seen.size, 200);
});

test("tokenMatches: exact token, and only before expiry", () => {
  const t = generateToken();
  const now = new Date("2026-09-28T12:00:00Z");
  const exp = interviewerInviteExpiry(now);
  assert.equal(exp.toISOString(), "2026-10-05T12:00:00.000Z");
  assert.equal(tokenMatches(t, t, null, now), true);
  assert.equal(tokenMatches(t, t, exp, now), true);
  assert.equal(tokenMatches(t, t, exp, new Date("2026-10-05T12:00:00Z")), false);
  assert.equal(tokenMatches(t, generateToken(), null, now), false);
  assert.equal(tokenMatches(t.slice(1), t, null, now), false);
  assert.equal(tokenMatches(t, null, null, now), false);
});

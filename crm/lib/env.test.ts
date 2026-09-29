import assert from "node:assert/strict";
import { test } from "node:test";
import { isOwner, ownerEmails, safeCrmPath, trustedOrigin } from "./env";

test("safeCrmPath only allows paths under /crm", () => {
  assert.equal(safeCrmPath("/crm"), "/crm");
  assert.equal(safeCrmPath("/crm/me"), "/crm/me");
  assert.equal(safeCrmPath("/crm?x=1"), "/crm?x=1");
  for (const bad of [null, "", "/", "/work", "//evil.com", "/crmx", "https://evil.com/crm", "/crm\\evil"]) assert.equal(safeCrmPath(bad), null, String(bad));
});

test("trustedOrigin keeps this site, falls back to the site URL otherwise", () => {
  assert.equal(trustedOrigin("https://waituntilmay.com"), "https://waituntilmay.com");
  assert.equal(trustedOrigin("https://evil.example"), "https://waituntilmay.com");
  assert.equal(trustedOrigin(null), "https://waituntilmay.com");
  assert.equal(trustedOrigin("not a url"), "https://waituntilmay.com");
});

test("owners come from CRM_ALLOWED_EMAILS, case-insensitive", () => {
  const before = process.env.CRM_ALLOWED_EMAILS;
  process.env.CRM_ALLOWED_EMAILS = " Owner@Example.com , second@example.com,";
  try {
    assert.deepEqual(ownerEmails(), ["owner@example.com", "second@example.com"]);
    assert.equal(isOwner("OWNER@example.com"), true);
    assert.equal(isOwner("someone@example.com"), false);
    assert.equal(isOwner(null), false);
  } finally {
    process.env.CRM_ALLOWED_EMAILS = before;
  }
});

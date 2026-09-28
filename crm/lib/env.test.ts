import assert from "node:assert/strict";
import { test } from "node:test";
import { safeCrmPath, trustedOrigin } from "./env";

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

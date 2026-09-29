"use client";

import { useRef, useState } from "react";
import { regenerateInviteLink } from "../lib/actions";
import { Button } from "./primitives";
import { useClock, useCrm } from "./store";

type Role = "interviewer" | "intern";

/** Copy to the clipboard, falling back to selecting the text when the Clipboard API is blocked. */
async function copy(text: string, input: HTMLInputElement | null) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    input?.select();
    return document.execCommand?.("copy") ?? false;
  }
}

/**
 * The full invite URL with Copy and (unless `copyOnly`) Regenerate. Regenerating asks once, then
 * the old link stops working.
 */
export function InviteLink({ role, copyOnly = false }: { role: Role; copyOnly?: boolean }) {
  const { data, mutate, toast } = useCrm();
  const clock = useClock();
  const [confirming, setConfirming] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const url = data.invites[role].url;
  const expiresAt = role === "interviewer" ? data.invites.interviewer.expiresAt : null;
  const expired = !!expiresAt && !!clock && new Date(expiresAt).getTime() <= clock.nowMs;
  const when = expiresAt
    ? new Date(expiresAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: data.tz })
    : null;

  return (
    <div data-testid={`invite-${role}`} data-expired={expired || undefined}>
      <div className="flex gap-2">
        <input
          ref={input}
          className="field"
          style={{ flex: 1, minWidth: 0, fontSize: 12.5, opacity: expired ? 0.55 : 1 }}
          readOnly
          value={url}
          aria-label={`${role === "interviewer" ? "Interviewer" : "Intern"} invite link`}
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button
          onClick={async () => {
            if (await copy(url, input.current)) toast("Link copied");
            else toast("Couldn't copy — select the link and copy it by hand", "warn");
          }}
          disabled={expired}
          data-testid={`copy-${role}-invite`}
        >
          Copy
        </Button>
        {!copyOnly && !confirming && (
          <Button onClick={() => setConfirming(true)} data-testid={`regenerate-${role}-invite`}>
            Regenerate
          </Button>
        )}
      </div>
      {!copyOnly && (
        <p style={{ fontSize: 12, color: expired ? "var(--highlight)" : "var(--muted)", marginTop: 6 }}>
          {role === "intern"
            ? "Never expires. Anyone with it can add themselves as a candidate."
            : expired
              ? `Expired ${when}. Regenerate to invite more interviewers.`
              : `Expires ${when ?? "in 7 days"}. Anyone with it can join as an interviewer.`}
        </p>
      )}
      {confirming && (
        <div className="flex flex-wrap items-center gap-2" style={{ marginTop: 8 }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>The current link will stop working.</span>
          <Button
            variant="primary"
            data-testid={`confirm-regenerate-${role}`}
            onClick={async () => {
              setConfirming(false);
              await mutate(null, () => regenerateInviteLink(role), "New link ready — the old one no longer works");
            }}
          >
            Make a new link
          </Button>
          <Button onClick={() => setConfirming(false)}>Cancel</Button>
        </div>
      )}
    </div>
  );
}

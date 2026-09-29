import Link from "next/link";
import { devAuthEnabled } from "../lib/env";
import { inviteValid } from "../lib/invites";
import type { InviteRole } from "../lib/invite-token";
import { SIGN_IN_ERRORS } from "../lib/sign-in-errors";
import { JoinForm } from "./JoinForm";

const COPY: Record<InviteRole, { title: string; blurb: string }> = {
  interviewer: { title: "Join as an interviewer", blurb: "Tell us who you are. We'll email you a link to finish signing in." },
  intern: { title: "Join as an intern", blurb: "Tell us who you are and where you study. We'll email you a link to finish signing in." },
};

/** /crm/join/<role>/<token>: the form if the invite is current, otherwise one plain sentence. */
export async function JoinScreen({ role, token }: { role: InviteRole; token: string }) {
  const valid = await inviteValid(role, token);
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="card w-full max-w-[400px]" data-testid="join-screen" data-valid={valid}>
        <div className="brand">
          <span className="mark wordmark" role="img" aria-label="fomo" />
          <span className="sep" aria-hidden />
          <span style={{ fontWeight: 500, color: "var(--muted)" }}>Intern CRM</span>
        </div>
        {valid ? (
          <>
            <h1 className="mt-8 text-[22px] font-bold tracking-[-0.01em]">{COPY[role].title}</h1>
            <p className="mt-1 text-(--muted)">{devAuthEnabled() ? "Local mode: you'll be signed in straight away." : COPY[role].blurb}</p>
            <JoinForm role={role} token={token} devMode={devAuthEnabled()} />
          </>
        ) : (
          <>
            <h1 className="mt-8 text-[22px] font-bold tracking-[-0.01em]">Invite expired</h1>
            <p className="mt-1" role="alert" data-testid="invite-expired">
              {SIGN_IN_ERRORS.invite}
            </p>
            <p className="mt-4 text-(--muted)">
              Already in the CRM?{" "}
              <Link className="link" href="/crm/sign-in">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}

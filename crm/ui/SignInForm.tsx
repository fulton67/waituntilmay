"use client";

import { useActionState, useState } from "react";
import { requestSignIn, verifyCode, type SignInState } from "../lib/auth-actions";

/** "Check your inbox" plus the 6-digit code fallback for when the link opens somewhere else. */
export function CheckInbox({ email, onChangeEmail }: { email: string; onChangeEmail: () => void }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(verifyCode, { status: "sent", email });
  return (
    <div className="mt-6 space-y-3" role="status" data-testid="check-inbox">
      <div className="rounded-2xl bg-(--card-2) p-4">
        <p className="font-medium">Check your inbox</p>
        <p className="mt-1 text-(--muted)">
          We sent a sign-in link and a 6-digit code to <b className="text-(--ink)">{email}</b>. Open the link, or type the code here.
        </p>
      </div>
      <form action={action} className="space-y-3">
        <input type="hidden" name="email" value={email} />
        <label className="block">
          <span className="mb-1.5 block font-medium">6-digit code</span>
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={12}
            required
            placeholder="123456"
            className="field"
            style={{ letterSpacing: "0.2em", fontVariantNumeric: "tabular-nums" }}
          />
        </label>
        {state.message && (
          <p className="text-(--highlight)" role="alert" data-testid="code-error">
            {state.message}
          </p>
        )}
        <button type="submit" disabled={pending} className="btn-black w-full justify-center disabled:opacity-60">
          {pending ? "Checking…" : "Sign in with code"}
        </button>
      </form>
      <button type="button" className="link" onClick={onChangeEmail}>
        Wrong email? Change it
      </button>
    </div>
  );
}

export function SignInForm({ devMode, errorMessage, errorReason }: { devMode: boolean; errorMessage: string | null; errorReason: string | null }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(requestSignIn, {
    status: errorMessage ? "error" : "idle",
    message: errorMessage ?? undefined,
  });
  // Bumped by "Change it" so the form comes back with the email still editable.
  const [editing, setEditing] = useState(0);
  const [shownFor, setShownFor] = useState<SignInState | null>(null);

  if (state.status === "sent" && state.email && shownFor !== state) {
    return <CheckInbox email={state.email} onChangeEmail={() => {
          setShownFor(state);
          setEditing((n) => n + 1);
        }} />;
  }

  return (
    <form action={action} className="mt-6 space-y-3" key={editing}>
      <label className="block">
        <span className="mb-1.5 block font-medium">Email</span>
        <input name="email" type="email" required autoComplete="email" defaultValue={state.email} placeholder="you@example.com" className="field" />
      </label>
      {state.status === "error" && state.message && (
        <p className="text-(--highlight)" role="alert" data-reason={errorReason ?? undefined} data-testid="sign-in-error">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-black w-full justify-center disabled:opacity-60">
        {pending ? "One moment…" : devMode ? "Sign in" : "Email me a sign-in link"}
      </button>
    </form>
  );
}

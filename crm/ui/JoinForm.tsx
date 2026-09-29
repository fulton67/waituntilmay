"use client";

import { useActionState, useState } from "react";
import { requestJoin, type SignInState } from "../lib/auth-actions";
import type { InviteRole } from "../lib/invite-token";
import { CheckInbox } from "./SignInForm";

const FIELDS: Record<InviteRole, { name: string; label: string; type?: string; autoComplete: string; placeholder: string }[]> = {
  interviewer: [
    { name: "name", label: "Your name", autoComplete: "name", placeholder: "Alex Kim" },
    { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@example.com" },
  ],
  intern: [
    { name: "name", label: "Your name", autoComplete: "name", placeholder: "Alex Kim" },
    { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@school.edu" },
    { name: "school", label: "School", autoComplete: "organization", placeholder: "Cooper Union" },
    { name: "major", label: "Major", autoComplete: "off", placeholder: "Architecture" },
  ],
};

/** One screen: the fields, then "check your inbox" with the code fallback. */
export function JoinForm({ role, token, devMode }: { role: InviteRole; token: string; devMode: boolean }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(requestJoin.bind(null, role, token), { status: "idle" });
  const [values, setValues] = useState<Record<string, string>>({});
  const [shownFor, setShownFor] = useState<SignInState | null>(null);

  if (state.status === "sent" && state.email && shownFor !== state) {
    return <CheckInbox email={state.email} onChangeEmail={() => setShownFor(state)} />;
  }

  return (
    <form action={action} className="mt-6 space-y-3" data-testid="join-form">
      {FIELDS[role].map((f) => (
        <label key={f.name} className="block">
          <span className="mb-1.5 block font-medium">{f.label}</span>
          <input
            name={f.name}
            type={f.type ?? "text"}
            required
            autoComplete={f.autoComplete}
            placeholder={f.placeholder}
            className="field"
            value={values[f.name] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
          />
        </label>
      ))}
      {state.status === "error" && state.message && (
        <p className="text-(--highlight)" role="alert" data-testid="join-error">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-black w-full justify-center disabled:opacity-60">
        {pending ? "One moment…" : devMode ? "Join" : "Email me a sign-in link"}
      </button>
    </form>
  );
}

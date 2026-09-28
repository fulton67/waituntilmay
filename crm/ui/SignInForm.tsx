"use client";

import { useActionState } from "react";
import { requestSignIn, type SignInState } from "../lib/auth-actions";

export function SignInForm({
  devMode,
  denied,
  errorMessage,
  errorReason,
}: {
  devMode: boolean;
  denied: boolean;
  errorMessage: string | null;
  errorReason: string | null;
}) {
  const [state, action, pending] = useActionState<SignInState, FormData>(requestSignIn, {
    status: denied ? "denied" : errorMessage ? "error" : "idle",
    message: errorMessage ?? undefined,
  });

  if (state.status === "sent") {
    return (
      <div className="mt-6 rounded-2xl bg-(--card-2) p-4" role="status">
        <p className="font-medium">Check your inbox</p>
        <p className="mt-1 text-(--muted)">We sent a sign-in link to {state.email}.</p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 space-y-3">
      <label className="block">
        <span className="mb-1.5 block font-medium">Work email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state.email}
          placeholder="you@fomo.com"
          className="field"
        />
      </label>
      {state.status === "denied" && (
        <p className="font-medium text-(--highlight)" role="alert">
          Ask Naim for access.
        </p>
      )}
      {state.status === "error" && state.message && (
        <p className="text-(--highlight)" role="alert" data-reason={errorReason ?? undefined} data-testid="sign-in-error">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn-black w-full justify-center disabled:opacity-60"
      >
        {pending ? "One moment…" : devMode ? "Sign in" : "Send magic link"}
      </button>
    </form>
  );
}

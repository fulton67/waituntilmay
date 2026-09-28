"use client";

import { useActionState } from "react";
import { requestSignIn, type SignInState } from "../lib/auth-actions";

export function SignInForm({ devMode, denied, linkError }: { devMode: boolean; denied: boolean; linkError: boolean }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(requestSignIn, {
    status: denied ? "denied" : linkError ? "error" : "idle",
    message: linkError ? "That link has expired. Request a new one." : undefined,
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
          className="h-11 w-full rounded-xl border border-(--line) bg-(--card) px-3.5 outline-none focus:border-(--brand)"
        />
      </label>
      {state.status === "denied" && (
        <p className="font-medium text-(--highlight)" role="alert">
          Ask Naim for access.
        </p>
      )}
      {state.status === "error" && state.message && (
        <p className="text-(--highlight)" role="alert">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-11 w-full rounded-xl bg-(--brand) font-bold text-white transition-opacity disabled:opacity-60"
      >
        {pending ? "One moment…" : devMode ? "Sign in" : "Send magic link"}
      </button>
    </form>
  );
}

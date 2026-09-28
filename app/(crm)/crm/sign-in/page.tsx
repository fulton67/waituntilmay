import type { Metadata } from "next";
import { devAuthEnabled } from "@/crm/lib/env";
import { signInErrorMessage } from "@/crm/lib/sign-in-errors";
import { SignInForm } from "@/crm/ui/SignInForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-[400px] rounded-[22px] border border-(--line) bg-(--card) p-8 shadow-(--shadow)">
        <div className="flex items-center gap-3">
          <span className="crm-mark crm-wordmark" role="img" aria-label="fomo" />
          <span className="h-5 w-px bg-(--line)" />
          <span className="font-medium text-(--muted)">Intern CRM</span>
        </div>
        <h1 className="mt-8 text-[22px] font-bold tracking-[-0.01em]">Sign in</h1>
        <p className="mt-1 text-(--muted)">
          {devAuthEnabled()
            ? "Local mode: allowlisted emails sign in directly."
            : "We'll email you a magic link. Only invited interviewers can sign in."}
        </p>
        <SignInForm devMode={devAuthEnabled()} denied={sp.denied === "1"} errorMessage={signInErrorMessage(sp.error)} errorReason={sp.error ?? null} />
      </div>
    </main>
  );
}

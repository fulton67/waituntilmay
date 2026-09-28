"use client";

import Link from "next/link";
import { useState } from "react";
import { addInterviewer, removeInterviewer, resetDemoData, updateMyName } from "../lib/actions";
import { signOut } from "../lib/auth-actions";
import { Avatar, Button, Card, Field, inputClass } from "./primitives";
import { useCrm, useTheme } from "./store";

export function SettingsView({ allowlist }: { allowlist: string[] }) {
  const { data, mutate } = useCrm();
  const [theme, toggleTheme] = useTheme();
  const [name, setName] = useState(data.me.name);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [viewAs, setViewAs] = useState(data.candidates[0]?.id ?? "");

  return (
    <div className="grid grid-cols-1 gap-4 min-[1000px]:grid-cols-2">
      <Card title="You">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = name.trim();
            if (!v || v === data.me.name) return;
            mutate(
              (d) => ({
                ...d,
                me: { ...d.me, name: v },
                interviewers: d.interviewers.map((i) => (i.id === d.me.id ? { ...i, name: v } : i)),
              }),
              () => updateMyName(v),
              "Name updated",
            );
          }}
        >
          <Field label="Display name">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </Field>
          <Button type="submit" variant="primary">
            Save
          </Button>
        </form>
        <p className="mt-3 text-[13px] text-(--muted)">Signed in as {data.me.email}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={toggleTheme}>{theme === "dark" ? "Use light theme" : "Use dark theme"}</Button>
          <form action={signOut}>
            <Button type="submit" variant="ghost">
              Sign out
            </Button>
          </form>
        </div>
      </Card>

      <Card title="Interviewers">
        <ul className="space-y-2">
          {data.interviewers.map((i) => {
            const invited = allowlist.includes(i.email.toLowerCase());
            return (
              <li key={i.id} className="flex items-center gap-3">
                <Avatar name={i.name} color={i.color} size={30} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {i.name}
                    {i.id === data.me.id && <span className="text-(--muted)"> · you</span>}
                  </p>
                  <p className="truncate text-[13px] text-(--muted)">
                    {i.email}
                    {!invited && " · not on the allowlist"}
                  </p>
                </div>
                {i.id !== data.me.id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      mutate((d) => ({ ...d, interviewers: d.interviewers.filter((x) => x.id !== i.id) }), () => removeInterviewer(i.id), `Removed ${i.name}`)
                    }
                  >
                    Remove
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        <form
          className="mt-4 grid grid-cols-1 items-end gap-2 border-t border-(--line) pt-4 sm:grid-cols-[1fr_1.3fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            const input = { name: newName.trim(), email: newEmail.trim().toLowerCase() };
            if (!input.name || !input.email) return;
            setNewName("");
            setNewEmail("");
            mutate(null, () => addInterviewer(input), `Added ${input.name}`);
          }}
        >
          <Field label="Name">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Email">
            <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={inputClass} />
          </Field>
          <Button type="submit">Add</Button>
        </form>
        <p className="mt-2 text-[13px] text-(--muted)">New interviewers also need their email in CRM_ALLOWED_EMAILS to sign in.</p>
      </Card>

      <Card title="View as intern">
        <p className="mb-3 text-(--muted)">See exactly what an intern sees on their page: their brief, assignments and interviews, nothing else.</p>
        <div className="flex gap-2">
          <select aria-label="Intern to view as" value={viewAs} onChange={(e) => setViewAs(e.target.value)} className="h-10 min-w-0 flex-1 rounded-xl border border-(--line) bg-(--card) px-3">
            {data.candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Link
            href={`/crm/me?as=${viewAs}`}
            className="inline-flex h-10 items-center rounded-xl bg-(--brand) px-4 font-bold text-white"
            data-testid="view-as"
          >
            View
          </Link>
        </div>
      </Card>

      {data.devTools && (
        <Card title="Demo data" className="min-[1000px]:col-span-2">
          <p className="mb-3 text-(--muted)">
            Wipes candidates, interviews, notes, areas and activity, then reloads crm/seed.json shifted to today. Development only.
          </p>
          {confirmReset ? (
            <div className="flex gap-2">
              <Button
                variant="primary"
                data-testid="confirm-reset"
                onClick={async () => {
                  setConfirmReset(false);
                  await mutate(null, () => resetDemoData(), "Demo data reset");
                }}
              >
                Yes, reset everything
              </Button>
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button onClick={() => setConfirmReset(true)}>Reset demo data</Button>
          )}
        </Card>
      )}
    </div>
  );
}

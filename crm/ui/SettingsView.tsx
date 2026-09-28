"use client";

import Link from "next/link";
import { useState } from "react";
import { addInterviewer, removeInterviewer, resetDemoData, updateMyName } from "../lib/actions";
import { signOut } from "../lib/auth-actions";
import { Avatar, Button } from "./primitives";
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
    <div data-testid="settings">
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          const v = name.trim();
          if (!v || v === data.me.name) return;
          mutate(
            (d) => ({ ...d, me: { ...d.me, name: v }, interviewers: d.interviewers.map((i) => (i.id === d.me.id ? { ...i, name: v } : i)) }),
            () => updateMyName(v),
            "Name updated",
          );
        }}
      >
        <label className="wide">
          Your display name
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} aria-label="Display name" />
        </label>
        <div className="r" style={{ justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "var(--muted)", alignSelf: "center" }}>Signed in as {data.me.email}</span>
          <Button variant="primary" type="submit">
            Save
          </Button>
        </div>
      </form>

      <h4 style={{ margin: "18px 0 6px", fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Interviewers</h4>
      <div className="settings-list">
        {data.interviewers.map((i) => {
          const invited = allowlist.includes(i.email.toLowerCase());
          return (
            <div key={i.id} className="it">
              <Avatar name={i.name} color={i.color} size={26} />
              <span style={{ minWidth: 0 }}>
                <b className="one-line" style={{ display: "block" }}>
                  {i.name}
                  {i.id === data.me.id && <span style={{ color: "var(--muted)", fontWeight: 400 }}> · you</span>}
                </b>
                <small className="one-line" style={{ display: "block", color: "var(--muted)" }}>
                  {i.email}
                  {!invited && " · not on the allowlist"}
                </small>
              </span>
              {i.id !== data.me.id && (
                <button type="button" onClick={() => mutate((d) => ({ ...d, interviewers: d.interviewers.filter((x) => x.id !== i.id) }), () => removeInterviewer(i.id), `Removed ${i.name}`)}>
                  Remove
                </button>
              )}
            </div>
          );
        })}
      </div>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          const input = { name: newName.trim(), email: newEmail.trim().toLowerCase() };
          if (!input.name || !input.email) return;
          setNewName("");
          setNewEmail("");
          mutate(null, () => addInterviewer(input), `Added ${input.name}`);
        }}
      >
        <label>
          Name
          <input className="field" aria-label="New interviewer name" value={newName} onChange={(e) => setNewName(e.target.value)} />
        </label>
        <label>
          Email
          <input className="field" type="email" aria-label="New interviewer email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
        </label>
        <div className="r" style={{ justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "var(--muted)", alignSelf: "center" }}>They also need to be in CRM_ALLOWED_EMAILS to sign in.</span>
          <Button type="submit">Add interviewer</Button>
        </div>
      </form>

      <h4 style={{ margin: "18px 0 6px", fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>View as intern</h4>
      <div className="flex gap-2">
        <select aria-label="Intern to view as" value={viewAs} onChange={(e) => setViewAs(e.target.value)} className="field" style={{ flex: 1, minWidth: 0 }}>
          {data.candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Link href={`/crm/me?as=${viewAs}`} className="btn-accent" style={{ display: "inline-flex", alignItems: "center" }} data-testid="view-as">
          View
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2" style={{ marginTop: 18 }}>
        <Button onClick={toggleTheme}>{theme === "dark" ? "Use light theme" : "Use dark theme"}</Button>
        <form action={signOut}>
          <Button type="submit">Sign out</Button>
        </form>
        {data.devTools &&
          (confirmReset ? (
            <>
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
              <Button onClick={() => setConfirmReset(false)}>Cancel</Button>
            </>
          ) : (
            <Button onClick={() => setConfirmReset(true)}>Reset demo data</Button>
          ))}
      </div>
    </div>
  );
}

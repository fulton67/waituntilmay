"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteAllData, removeInterviewer, resetDemoData, updateInterviewerEmail, updateMyName } from "../lib/actions";
import { signOut } from "../lib/auth-actions";
import { InviteLink } from "./InviteLink";
import { Avatar, Button, InlineField } from "./primitives";
import { useCrm, useTheme } from "./store";

const H4: React.CSSProperties = { margin: "18px 0 6px", fontSize: 12, fontWeight: 700, color: "var(--muted)" };

/** Interviewer-only (it lives inside the interviewer app). */
export function SettingsView() {
  const { data, mutate } = useCrm();
  const [theme, toggleTheme] = useTheme();
  const [name, setName] = useState(data.me.name);
  const [confirmReset, setConfirmReset] = useState(false);
  const [viewAs, setViewAs] = useState(data.candidates[0]?.id ?? "");
  const [typed, setTyped] = useState("");

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

      <h4 style={H4}>Invite links</h4>
      <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 8px" }}>
        People join with these; after that they sign in with just their email. Regenerating a link turns the old one off.
      </p>
      <div className="flex flex-col gap-3" data-testid="invites">
        <div>
          <b style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Interviewers</b>
          <InviteLink role="interviewer" />
        </div>
        <div>
          <b style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Interns</b>
          <InviteLink role="intern" />
        </div>
      </div>

      <h4 style={H4}>Interviewers</h4>
      <div className="settings-list" data-testid="interviewer-list">
        {data.interviewers
          .filter((i) => !i.removed)
          .map((i) => {
            const owner = data.owners.includes(i.email.toLowerCase());
            const me = i.id === data.me.id;
            return (
              <div key={i.id} className="it" data-testid="interviewer-row" data-email={i.email}>
                <Avatar name={i.name} color={i.color} size={26} />
                <span style={{ minWidth: 0, flex: 1 }}>
                  <b className="one-line" style={{ display: "block" }}>
                    {i.name}
                    {me && <span style={{ color: "var(--muted)", fontWeight: 400 }}> · you</span>}
                    {owner && <span style={{ color: "var(--muted)", fontWeight: 400 }}> · owner</span>}
                  </b>
                  {owner || me ? (
                    <small className="one-line" style={{ display: "block", color: "var(--muted)" }}>
                      {i.email}
                    </small>
                  ) : (
                    <small style={{ display: "block", color: "var(--muted)" }}>
                      <InlineField
                        label={`${i.name}'s email`}
                        type="email"
                        value={i.email}
                        validate={(v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "Enter a valid email")}
                        onSave={(v) =>
                          mutate(
                            (d) => ({ ...d, interviewers: d.interviewers.map((x) => (x.id === i.id ? { ...x, email: v.toLowerCase() } : x)) }),
                            () => updateInterviewerEmail(i.id, v),
                            "Email updated — they sign in with the new one now",
                          )
                        }
                      />
                    </small>
                  )}
                </span>
                {!owner && !me && (
                  <button
                    type="button"
                    data-testid="remove-interviewer"
                    onClick={() =>
                      mutate(
                        (d) => ({ ...d, interviewers: d.interviewers.map((x) => (x.id === i.id ? { ...x, removed: true } : x)) }),
                        () => removeInterviewer(i.id),
                        `Removed ${i.name} — they're signed out`,
                      )
                    }
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}
      </div>

      <h4 style={H4}>View as intern</h4>
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

      <div className="danger" data-testid="danger-zone">
        <h4>Danger zone</h4>
        <p>
          Delete all data: every candidate, interview, note, area, task, session, report and activity item. Interviewers and settings stay; the current campaign
          keeps only its name. This can&apos;t be undone. Type DELETE to confirm.
        </p>
        <div className="flex gap-2">
          <input className="field" style={{ maxWidth: 180 }} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="DELETE" aria-label="Type DELETE to confirm" />
          <button
            type="button"
            className="btn-danger"
            disabled={typed !== "DELETE"}
            data-testid="delete-all"
            onClick={async () => {
              const res = await mutate(null, () => deleteAllData(typed), "All data deleted");
              if (res.ok) setTyped("");
            }}
          >
            Delete all data
          </button>
        </div>
      </div>
    </div>
  );
}

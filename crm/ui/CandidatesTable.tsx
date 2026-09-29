"use client";

import { useMemo, useState } from "react";
import { createCandidate } from "../lib/actions";
import { colorFor } from "../lib/colors";
import { tierOf } from "../lib/ranking";
import { formatDay, formatDuration } from "../lib/time";
import { EMPTY_RESUME, STATUS_LABEL, type Candidate, type Status } from "../lib/types";
import { JoinedChip, TierChip } from "./bits";
import { candidateRows, type Row } from "./derive";
import { Avatar, Button, Icon, Modal, StatusPill, cx } from "./primitives";
import { useClock, useCrm } from "./store";

type Tab = "all" | Status;
const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: STATUS_LABEL.new },
  { value: "inprocess", label: STATUS_LABEL.inprocess },
  { value: "queued", label: STATUS_LABEL.queued },
  { value: "awaiting", label: STATUS_LABEL.awaiting },
  { value: "decided", label: STATUS_LABEL.decided },
];

function matches(row: Row, q: string) {
  if (!q) return true;
  const c = row.candidate;
  const hay = [c.name, c.school, c.major, c.program, ...c.skills.map((s) => s.skill), ...(c.resumeJson?.skills ?? [])].join(" ").toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

export function CandidatesTable({ initialQuery = "", title = "Candidates" }: { initialQuery?: string; title?: string }) {
  const { data, openCandidate } = useCrm();
  const clock = useClock();
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState(initialQuery);
  const [areaFilter, setAreaFilter] = useState("all");
  const [creating, setCreating] = useState(false);

  const rows = useMemo(() => candidateRows(data, clock && clock.today === data.today ? clock.nowMin : null), [data, clock]);
  const searched = rows.filter((r) => matches(r, q) && (areaFilter === "all" || r.candidate.areaIds.includes(areaFilter)));
  const visible = searched.filter((r) => tab === "all" || r.candidate.status === tab);
  const interviewerById = new Map(data.interviewers.map((i) => [i.id, i]));

  return (
    <section className="card reveal" data-testid="candidates-card">
      <div className="card-head">
        <h2>{title}</h2>
        <div className="tools">
          <label className="search" style={{ boxShadow: "none", background: "var(--card-2)", width: 220 }}>
            <Icon name="search" size={15} className="flex-none text-(--muted)" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, school, skill…" aria-label="Filter candidates" />
          </label>
          <select aria-label="Area or goal" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="pill-btn">
            <option value="all">All areas & goals</option>
            <optgroup label="Areas">
              {data.areas
                .filter((a) => a.kind === "area")
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Goals">
              {data.areas
                .filter((a) => a.kind === "goal")
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </optgroup>
          </select>
          <button type="button" className="btn-black" onClick={() => setCreating(true)}>
            <Icon name="plus" /> New candidate
          </button>
        </div>
      </div>

      <div role="tablist" aria-label="Status" className="tabs" style={{ marginTop: 14 }}>
        {TABS.map((t) => {
          const count = searched.filter((r) => t.value === "all" || r.candidate.status === t.value).length;
          return (
            <button key={t.value} role="tab" type="button" aria-selected={tab === t.value} onClick={() => setTab(t.value)} className={tab === t.value ? "on" : undefined}>
              <span className="one-line">{t.label}</span>
              <span className={cx("n", t.value !== "all" && t.value)}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="tbl-wrap">
        <table data-testid="candidates-table">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>ID</th>
              <th>Best at</th>
              <th>Status</th>
              <th>Area</th>
              <th>Interviewer</th>
              <th>Next interview</th>
              <th>Time spent</th>
              <th>Fit</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const c = r.candidate;
              const top = c.skills[0];
              const person = r.interviewerId ? interviewerById.get(r.interviewerId) : undefined;
              return (
                <tr key={c.id} className="row" onClick={() => openCandidate(c.id)} data-testid="candidate-row">
                  <td style={{ maxWidth: 260 }}>
                    <div className="who-cell">
                      <Avatar name={c.name} color={colorFor(c.id)} size={30} />
                      <span style={{ minWidth: 0 }}>
                        <span className="nm one-line">
                          {c.name}
                          <TierChip tier={tierOf(c, data.settings)} />
                          <JoinedChip show={c.selfJoined} />
                        </span>
                        <span className="sub one-line">{[c.school, c.major].filter(Boolean).join(" · ") || "—"}</span>
                      </span>
                    </div>
                  </td>
                  <td style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>#{String(c.seq).padStart(4, "0")}</td>
                  <td style={{ maxWidth: 190 }}>
                    {top ? (
                      <span className="one-line" style={{ display: "block" }}>
                        {top.skill} <span style={{ color: "var(--muted)" }}>{top.score}</span>
                      </span>
                    ) : (
                      <span style={{ color: "var(--muted)" }}>—</span>
                    )}
                  </td>
                  <td>
                    <StatusPill status={c.status} />
                  </td>
                  <td style={{ maxWidth: 160 }}>
                    <span className="one-line" style={{ display: "block" }}>
                      {r.areaName ?? "—"}
                    </span>
                  </td>
                  <td style={{ maxWidth: 150 }}>
                    {person ? (
                      <span className="who-cell">
                        <Avatar name={person.name} color={person.color} size={22} className="mini" />
                        <span className="one-line">{person.name}</span>
                      </span>
                    ) : (
                      <span style={{ color: "var(--muted)" }}>—</span>
                    )}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{r.next ? `${formatDay(r.next.date)}, ${r.next.startTime}` : <span style={{ color: "var(--muted)" }}>—</span>}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDuration(r.spent)}</td>
                  <td className="fit">{c.fit.toFixed(1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!visible.length && (
          <div className="empty">
            {data.candidates.length ? (
              "No candidates match."
            ) : (
              <>
                No candidates yet.{" "}
                <button type="button" className="link" onClick={() => setCreating(true)}>
                  Add the first one
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {creating && <NewCandidateModal onClose={() => setCreating(false)} />}
    </section>
  );
}

function NewCandidateModal({ onClose }: { onClose: () => void }) {
  const { mutate, openCandidate } = useCrm();
  const [error, setError] = useState<string | null>(null);

  async function submit(form: FormData) {
    const get = (k: string) => String(form.get(k) ?? "");
    const input = {
      name: get("name"),
      school: get("school"),
      major: get("major"),
      program: get("program"),
      email: get("email"),
      instagram: get("instagram"),
      portfolio: get("portfolio"),
      summary: get("summary"),
    };
    if (!input.name.trim()) return setError("Name is required");
    const temp: Candidate = {
      id: crypto.randomUUID(),
      seq: 0,
      name: input.name.trim(),
      school: input.school,
      major: input.major,
      program: input.program,
      email: input.email,
      instagramHandle: input.instagram.replace(/^@/, ""),
      portfolioUrl: input.portfolio,
      phone: null,
      status: "new",
      fit: 5,
      tierOverride: null,
      resumeJson: { ...EMPTY_RESUME, summary: input.summary },
      resumeFileUrl: null,
      createdAt: new Date().toISOString(),
      selfJoined: false,
      skills: [],
      areaIds: [],
    };
    onClose();
    const res = await mutate((d) => ({ ...d, candidates: [...d.candidates, temp] }), () => createCandidate(input), `Added ${temp.name}`);
    if (res.ok && res.data) openCandidate(res.data.id);
  }

  return (
    <Modal title="New candidate" onClose={onClose}>
      <form action={submit} className="form" data-testid="new-candidate-form">
        <label className="wide">
          Name
          <input name="name" required autoFocus className="field" />
        </label>
        <label>
          School
          <input name="school" className="field" />
        </label>
        <label>
          Major
          <input name="major" className="field" />
        </label>
        <label>
          Degree / year
          <input name="program" placeholder="BFA, junior" className="field" />
        </label>
        <label>
          Email
          <input name="email" type="email" className="field" />
        </label>
        <label>
          Instagram
          <input name="instagram" placeholder="handle" className="field" />
        </label>
        <label>
          Portfolio
          <input name="portfolio" placeholder="site.com" className="field" />
        </label>
        <label className="wide">
          One-line summary
          <input name="summary" className="field" />
        </label>
        {error && (
          <p className="late" style={{ gridColumn: "1/-1" }}>
            {error}
          </p>
        )}
        <div className="r">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit">
            Create candidate
          </Button>
        </div>
      </form>
    </Modal>
  );
}

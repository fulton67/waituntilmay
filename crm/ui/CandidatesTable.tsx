"use client";

import { useMemo, useState } from "react";
import { createCandidate } from "../lib/actions";
import { formatDay, formatDuration } from "../lib/time";
import { EMPTY_RESUME, STATUS_LABEL, type Candidate, type Status } from "../lib/types";
import { candidateRows, type Row } from "./derive";
import { poolFloor, onScale, tierOf } from "../lib/ranking";
import { TierChip } from "./bits";
import { colorFor } from "../lib/colors";
import { Avatar, Button, Card, Field, Icon, Modal, StatusPill, cx, inputClass } from "./primitives";
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
  const hay = [c.name, c.school, c.major, c.program, ...c.skills.map((s) => s.skill), ...(c.resumeJson?.skills ?? [])]
    .join(" ")
    .toLowerCase();
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
  const floor = poolFloor(data.candidates, data.interviews);

  return (
    <Card
      title={title}
      className="crm-reveal"
      bodyClassName="pb-2"
      action={
        <Button variant="primary" className="crm-cta" onClick={() => setCreating(true)}>
          <Icon name="plus" size={16} /> New candidate
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-3 px-5 pb-3">
        <div role="tablist" aria-label="Status" className="crm-scroll flex gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const count = searched.filter((r) => t.value === "all" || r.candidate.status === t.value).length;
            return (
              <button
                key={t.value}
                role="tab"
                type="button"
                aria-selected={tab === t.value}
                onClick={() => setTab(t.value)}
                className={cx(
                  "inline-flex h-8 flex-none items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium",
                  tab === t.value ? "bg-(--ink) text-(--canvas)" : "text-(--muted) hover:bg-(--card-2) hover:text-(--ink)",
                )}
              >
                {t.label}
                <span className="tabular-nums opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <div className="relative">
            <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--muted)" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, school, skill…"
              aria-label="Filter candidates"
              className="h-9 w-[220px] rounded-xl border border-(--line) bg-(--card) pl-9 pr-3 text-[13px] outline-none placeholder:text-(--muted) focus:border-(--brand)"
            />
          </div>
          <select
            aria-label="Area or goal"
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="h-9 rounded-xl border border-(--line) bg-(--card) px-2 text-[13px]"
          >
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
        </div>
      </div>

      <div className="crm-scroll overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse text-left" data-testid="candidates-table">
          <thead>
            <tr className="border-y border-(--line) text-[12px] font-medium text-(--muted)">
              <th className="py-2.5 pl-5 pr-3 font-medium">Candidate</th>
              <th className="px-3 font-medium">ID</th>
              <th className="px-3 font-medium">Best at</th>
              <th className="px-3 font-medium">Status</th>
              <th className="px-3 font-medium">Area</th>
              <th className="px-3 font-medium">Interviewer</th>
              <th className="px-3 font-medium">Next interview</th>
              <th className="px-3 font-medium">Time spent</th>
              <th className="py-2.5 pl-3 pr-5 font-medium">Fit</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const c = r.candidate;
              const top = c.skills[0];
              const person = r.interviewerId ? interviewerById.get(r.interviewerId) : undefined;
              return (
                <tr
                  key={c.id}
                  onClick={() => openCandidate(c.id)}
                  className="cursor-pointer border-b border-(--line) last:border-0 hover:bg-(--card-2)"
                  data-testid="candidate-row"
                >
                  <td className="py-3 pl-5 pr-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} color={colorFor(c.id)} size={34} />
                      <div className="min-w-0">
                        <span className="flex items-center gap-1.5">
                        <button
                          type="button"
                          className="block max-w-[200px] truncate text-left font-bold hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCandidate(c.id);
                          }}
                        >
                          {c.name}
                        </button>
                        <TierChip tier={tierOf(c, data.settings)} />
                        </span>
                        <div className="max-w-[240px] truncate text-[13px] text-(--muted)">
                          {[c.school, c.major].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 tabular-nums text-(--muted)">#{String(c.seq).padStart(4, "0")}</td>
                  <td className="px-3">
                    {top ? (
                      <span className="inline-flex max-w-[200px] items-center gap-2">
                        <span className="truncate">{top.skill}</span>
                        <span className="text-[12px] tabular-nums text-(--muted)">{top.score}</span>
                      </span>
                    ) : (
                      <span className="text-(--muted)">—</span>
                    )}
                  </td>
                  <td className="px-3">
                    <StatusPill status={c.status} />
                  </td>
                  <td className="max-w-[170px] truncate px-3">{r.areaName ?? <span className="text-(--muted)">—</span>}</td>
                  <td className="px-3">
                    {person ? (
                      <span className="inline-flex items-center gap-2">
                        <Avatar name={person.name} color={person.color} size={22} />
                        <span className="truncate">{person.name}</span>
                      </span>
                    ) : (
                      <span className="text-(--muted)">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3">
                    {r.next ? (
                      `${formatDay(r.next.date)}, ${r.next.startTime}`
                    ) : (
                      <span className="text-(--muted)">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 tabular-nums">{formatDuration(r.spent)}</td>
                  <td className="py-3 pl-3 pr-5">
                    <span className="flex items-center gap-2">
                      <span className="w-8 font-bold tabular-nums">{c.fit.toFixed(1)}</span>
                      <span className="crm-bar w-16">
                        <span style={{ width: `${onScale(c.fit, floor)}%` }} />
                      </span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!visible.length && <p className="py-8 text-center text-(--muted)">No candidates match.</p>}
      </div>
      {creating && <NewCandidateModal onClose={() => setCreating(false)} />}
    </Card>
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
    const tempId = crypto.randomUUID();
    const temp: Candidate = {
      id: tempId,
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
      skills: [],
      areaIds: [],
    };
    onClose();
    const res = await mutate((d) => ({ ...d, candidates: [...d.candidates, temp] }), () => createCandidate(input), `Added ${temp.name}`);
    if (res.ok && res.data) {
      openCandidate(res.data.id);
    }
  }

  return (
    <Modal title="New candidate" onClose={onClose}>
      <form action={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="new-candidate-form">
        <div className="sm:col-span-2">
          <Field label="Name">
            <input name="name" required autoFocus className={inputClass} />
          </Field>
        </div>
        <Field label="School">
          <input name="school" className={inputClass} />
        </Field>
        <Field label="Major">
          <input name="major" className={inputClass} />
        </Field>
        <Field label="Degree / year">
          <input name="program" placeholder="BFA, junior" className={inputClass} />
        </Field>
        <Field label="Email">
          <input name="email" type="email" className={inputClass} />
        </Field>
        <Field label="Instagram">
          <input name="instagram" placeholder="handle" className={inputClass} />
        </Field>
        <Field label="Portfolio">
          <input name="portfolio" placeholder="site.com" className={inputClass} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="One-line summary">
            <input name="summary" className={inputClass} />
          </Field>
        </div>
        {error && <p className="text-(--highlight) sm:col-span-2">{error}</p>}
        <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit">
            Create candidate
          </Button>
        </div>
      </form>
    </Modal>
  );
}

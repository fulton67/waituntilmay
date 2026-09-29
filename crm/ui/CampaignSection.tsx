"use client";

import { useState } from "react";
import { updateCampaign } from "../lib/actions";
import { colorFor } from "../lib/colors";
import { tierOf, weekOf } from "../lib/ranking";
import { formatDay } from "../lib/time";
import type { Campaign, Candidate, Task } from "../lib/types";
import { TierChip, WeekStrip } from "./bits";
import { InviteLink } from "./InviteLink";
import { Avatar, Button, Modal } from "./primitives";
import { useCrm } from "./store";
import { TaskCard } from "./Tasks";

const isOpen = (t: Task) => t.status !== "done";

export function CampaignSection() {
  const { data, openAssign, openPanel } = useCrm();
  const [day, setDay] = useState(data.today);
  const [editing, setEditing] = useState(false);
  const k = data.campaign;

  if (!k) {
    return (
      <section className="card reveal">
        <h2>Campaign</h2>
        <p className="empty">No current campaign. Run the seed or add one to the campaigns table.</p>
      </section>
    );
  }

  const week = weekOf(day);
  const tasksFor = (candidateId: string | null) =>
    data.tasks.filter((t) => t.candidateId === candidateId && (t.day === day || (day === data.today && isOpen(t) && t.day < data.today)));
  const rows = data.candidates.filter((c) => tierOf(c, data.settings) !== "bench" || data.tasks.some((t) => t.candidateId === c.id));
  const unassigned = tasksFor(null);

  return (
    <section className="card reveal" data-testid="campaign-card">
      <div className="camp-head">
        <div style={{ minWidth: 0 }}>
          <h2 className="wrap-any">{k.name}</h2>
          {k.brief ? (
            <p className="brief wrap-any">{k.brief}</p>
          ) : (
            <p className="brief" style={{ color: "var(--muted)" }}>
              No brief yet.{" "}
              <button type="button" className="link" onClick={() => setEditing(true)}>
                Write one
              </button>
            </p>
          )}
          {k.goal && <span className="goal">{k.goal}</span>}
          <div className="targets">
            <span style={{ background: "transparent", paddingLeft: 0, color: "var(--muted)" }}>
              {formatDay(k.startDate)} – {formatDay(k.endDate)}
              {k.targets.length ? " · targets" : " · no target schools yet"}
            </span>
            {k.targets.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <div style={{ marginTop: 12, maxWidth: 520 }} data-testid="campaign-intern-invite">
            <span style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Intern invite link — send it to new interns</span>
            <InviteLink role="intern" copyOnly />
          </div>
        </div>
        <div className="tools" style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Button onClick={() => setEditing(true)}>Edit brief</Button>
          <Button onClick={() => openPanel("daylog", { day })} data-testid="open-daylog">
            Day log
          </Button>
          <Button variant="primary" onClick={() => openAssign({ day })} data-testid="assign-task">
            Assign task
          </Button>
        </div>
      </div>

      <div className="card-head" style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 15 }}>
          Assignments · <span style={{ color: "var(--muted)", fontWeight: 500 }}>{day === data.today ? "today" : formatDay(day)}</span>
        </h2>
        <WeekStrip label="Assignment day" days={week} selected={day} today={data.today} hasDot={(d) => data.tasks.some((t) => t.day === d && isOpen(t))} onPick={setDay} />
      </div>

      <div className="assign" data-testid="assignments">
        {rows.map((c) => (
          <InternRow key={c.id} candidate={c} tasks={tasksFor(c.id)} />
        ))}
        {!rows.length && <div className="assign-empty">No candidates yet — add one in the table below, then assign them a task.</div>}
        <div className="arow" data-testid="unassigned-row">
          <div className="who" style={{ cursor: "default" }}>
            <span className="mini" style={{ width: 32, height: 32, background: "var(--card-2)", color: "var(--muted)" }}>
              ?
            </span>
            <span style={{ minWidth: 0 }}>
              <b>Unassigned</b>
              <small>{unassigned.filter(isOpen).length} open</small>
            </span>
          </div>
          <div className="tasks">
            {unassigned.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
            {!unassigned.length && <div className="assign-empty">Nothing unassigned for this day.</div>}
          </div>
        </div>
      </div>
      {editing && <EditBrief campaign={k} onClose={() => setEditing(false)} />}
    </section>
  );
}

function InternRow({ candidate: c, tasks }: { candidate: Candidate; tasks: Task[] }) {
  const { data, openCandidate } = useCrm();
  const openCount = data.tasks.filter((t) => t.candidateId === c.id && isOpen(t)).length;
  return (
    <div className="arow" data-testid="intern-row" data-candidate={c.id}>
      <div className="who" role="button" tabIndex={0} onClick={() => openCandidate(c.id, "assignments")} onKeyDown={(e) => e.key === "Enter" && openCandidate(c.id, "assignments")}>
        <Avatar name={c.name} color={colorFor(c.id)} size={32} className="mini" />
        <span style={{ minWidth: 0 }}>
          <b className="one-line">
            {c.name}
            <TierChip tier={tierOf(c, data.settings)} />
          </b>
          <small className="one-line">
            {c.skills[0]?.skill ?? "No skills yet"} · {openCount} open
          </small>
        </span>
      </div>
      <div className="tasks">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} />
        ))}
        {!tasks.length && <div className="assign-empty">Nothing for this day.</div>}
      </div>
    </div>
  );
}

function EditBrief({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const { mutate } = useCrm();
  const [name, setName] = useState(campaign.name);
  const [goal, setGoal] = useState(campaign.goal);
  const [brief, setBrief] = useState(campaign.brief);
  const [targets, setTargets] = useState(campaign.targets.join(", "));
  return (
    <Modal title="Edit brief" onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          const input = { name: name.trim(), goal: goal.trim(), brief: brief.trim(), targets: targets.split(",").map((t) => t.trim()).filter(Boolean) };
          onClose();
          mutate((d) => ({ ...d, campaign: d.campaign && { ...d.campaign, ...input } }), () => updateCampaign(campaign.id, input), "Brief updated");
        }}
      >
        <label className="wide">
          Campaign name
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="wide">
          Goal
          <input className="field" value={goal} onChange={(e) => setGoal(e.target.value)} />
        </label>
        <label className="wide">
          Brief
          <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={5} />
        </label>
        <label className="wide">
          Target schools (comma-separated)
          <input className="field" value={targets} onChange={(e) => setTargets(e.target.value)} />
        </label>
        <div className="r">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit">
            Save brief
          </Button>
        </div>
      </form>
    </Modal>
  );
}

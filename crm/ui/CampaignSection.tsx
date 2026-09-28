"use client";

import { useState } from "react";
import { updateCampaign } from "../lib/actions";
import { colorFor } from "../lib/colors";
import { tierOf, weekOf } from "../lib/ranking";
import { formatDay } from "../lib/time";
import type { Campaign, Candidate, Task } from "../lib/types";
import { TierChip, WeekStrip } from "./bits";
import { Avatar, Button, Card, Field, Icon, Modal, inputClass } from "./primitives";
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
      <Card title="Campaign">
        <p className="text-(--muted)">No current campaign. Run the seed or add one to the campaigns table.</p>
      </Card>
    );
  }

  const week = weekOf(day);
  const tasksFor = (candidateId: string | null) =>
    data.tasks.filter(
      (t) => t.candidateId === candidateId && (t.day === day || (day === data.today && isOpen(t) && t.day < data.today)),
    );
  const rows = data.candidates.filter((c) => tierOf(c, data.settings) !== "bench" || data.tasks.some((t) => t.candidateId === c.id));
  const unassigned = tasksFor(null);

  return (
    <Card
      className="crm-reveal"
      title={
        <span className="flex flex-wrap items-center gap-2">
          {k.name}
          {k.goal && <span className="rounded-full bg-(--brand) px-2.5 py-0.5 text-[12px] font-bold text-white">{k.goal}</span>}
        </span>
      }
      action={
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setEditing(true)}>Edit brief</Button>
          <Button onClick={() => openPanel("daylog", day)} data-testid="open-daylog">
            Day log
          </Button>
          <Button variant="primary" className="crm-cta" onClick={() => openAssign({ day })} data-testid="assign-task">
            <Icon name="plus" size={16} /> Assign task
          </Button>
        </div>
      }
    >
      <p className="max-w-[860px] leading-relaxed">{k.brief}</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[13px] text-(--muted)">
          {formatDay(k.startDate)} – {formatDay(k.endDate)} · targets
        </span>
        {k.targets.map((t) => (
          <span key={t} className="rounded-full border border-(--line) bg-(--card-2) px-2.5 py-0.5 text-[12px] font-medium">
            {t}
          </span>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-(--line) pt-4">
        <h3 className="font-bold">
          Assignments · <span className="font-medium text-(--muted)">{day === data.today ? "today" : formatDay(day)}</span>
        </h3>
        <WeekStrip
          label="Assignment day"
          days={week}
          selected={day}
          today={data.today}
          hasDot={(d) => data.tasks.some((t) => t.day === d && isOpen(t))}
          onPick={setDay}
        />
      </div>

      <div className="mt-3 space-y-3" data-testid="assignments">
        {rows.map((c) => (
          <InternRow key={c.id} candidate={c} tasks={tasksFor(c.id)} onAssign={() => openAssign({ candidateId: c.id, day })} />
        ))}
        <div className="rounded-2xl bg-(--card-2) p-3" data-testid="unassigned-row">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-bold">
              Unassigned <span className="font-medium text-(--muted)">· {unassigned.filter(isOpen).length}</span>
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 min-[1100px]:grid-cols-2">
            {unassigned.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
            {!unassigned.length && <p className="text-[13px] text-(--muted)">Nothing unassigned for this day.</p>}
          </div>
        </div>
      </div>
      {editing && <EditBrief campaign={k} onClose={() => setEditing(false)} />}
    </Card>
  );
}

function InternRow({ candidate: c, tasks, onAssign }: { candidate: Candidate; tasks: Task[]; onAssign: () => void }) {
  const { data } = useCrm();
  const openCount = data.tasks.filter((t) => t.candidateId === c.id && isOpen(t)).length;
  return (
    <div className="grid grid-cols-1 gap-3 rounded-2xl border border-(--line) p-3 min-[900px]:grid-cols-[220px_1fr]" data-testid="intern-row" data-candidate={c.id}>
      <div className="flex items-start gap-2.5">
        <Avatar name={c.name} color={colorFor(c.id)} size={32} />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-bold">
            <span className="truncate">{c.name}</span>
            <TierChip tier={tierOf(c, data.settings)} />
          </p>
          <p className="truncate text-[12px] text-(--muted)">{c.skills[0]?.skill ?? "No skills yet"}</p>
          <p className="text-[12px] text-(--muted)">
            {openCount} open ·{" "}
            <button type="button" onClick={onAssign} className="font-medium text-(--brand)">
              assign
            </button>
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 min-[1100px]:grid-cols-2">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} />
        ))}
        {!tasks.length && <p className="self-center text-[13px] text-(--muted)">Nothing for this day.</p>}
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
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const input = { name: name.trim(), goal: goal.trim(), brief: brief.trim(), targets: targets.split(",").map((t) => t.trim()).filter(Boolean) };
          onClose();
          mutate((d) => ({ ...d, campaign: d.campaign && { ...d.campaign, ...input } }), () => updateCampaign(campaign.id, input), "Brief updated");
        }}
      >
        <Field label="Campaign name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Goal">
          <input value={goal} onChange={(e) => setGoal(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Brief">
          <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={5} className={`${inputClass} h-auto py-2`} />
        </Field>
        <Field label="Target schools (comma-separated)">
          <input value={targets} onChange={(e) => setTargets(e.target.value)} className={inputClass} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit">
            Save brief
          </Button>
        </div>
      </form>
    </Modal>
  );
}

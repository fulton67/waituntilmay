"use client";

import { useState } from "react";
import { createTask, deleteTask, setTaskStatus, updateTask } from "../lib/actions";
import { firstName, fmtLogged, sessionMinutes, suggestAssignee, tierOf } from "../lib/ranking";
import { formatDay } from "../lib/time";
import type { Area, Candidate, CrmData, Task, TaskStatus } from "../lib/types";
import { TaskStatusButton } from "./bits";
import { Button, Field, Modal, Segmented, cx, inputClass } from "./primitives";
import { useClock, useCrm, type AssignTarget } from "./store";

/** Candidates a task in `area` may go to: benched people only take small jobs. */
export function eligibleFor(area: Area | undefined, data: CrmData): Candidate[] {
  return data.candidates.filter((c) => tierOf(c, data.settings) !== "bench" || !area || area.kind === "goal" || area.level === "small");
}

export function taskTime(task: Task, data: Pick<CrmData, "sessions">, nowMs: number) {
  const sessions = data.sessions.filter((s) => s.taskId === task.id);
  const live = sessions.find((s) => !s.endedAt);
  return { live, liveMinutes: live ? sessionMinutes(live, nowMs) : 0, minutes: sessions.reduce((m, s) => m + sessionMinutes(s, nowMs), 0) };
}

export function Chip2({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "warn" | "brand" }) {
  return (
    <span
      className={cx(
        "inline-flex h-5 items-center whitespace-nowrap rounded-full px-2 text-[11px] font-medium",
        tone === "plain" && "bg-(--card-2) text-(--muted)",
        tone === "warn" && "border border-(--highlight) text-(--highlight)",
        tone === "brand" && "bg-(--brand) text-white",
      )}
    >
      {children}
    </span>
  );
}

export function TaskCard({ task, showAssignee = true }: { task: Task; showAssignee?: boolean }) {
  const { data, mutate, toast } = useCrm();
  const clock = useClock();
  const [confirm, setConfirm] = useState(false);
  const area = data.areas.find((a) => a.id === task.areaId);
  const overdue = task.status !== "done" && task.day < data.today;
  const time = taskTime(task, data, clock?.nowMs ?? Date.parse(data.today));
  const patch = (p: Partial<Task>) => (d: CrmData) => ({ ...d, tasks: d.tasks.map((t) => (t.id === task.id ? { ...t, ...p } : t)) });

  const setStatus = (status: TaskStatus) =>
    mutate(patch({ status, completedAt: status === "done" ? new Date().toISOString() : null }), () => setTaskStatus(task.id, status));
  const assignTo = (candidateId: string | null) =>
    mutate(patch({ candidateId }), () => updateTask(task.id, { candidateId }), candidateId ? `Assigned to ${firstName(data.candidates.find((c) => c.id === candidateId)?.name ?? "")}` : "Unassigned");

  return (
    <div className="flex gap-3 rounded-2xl border border-(--line) bg-(--card) p-3" data-testid="task-card" data-task-id={task.id} data-status={task.status}>
      <TaskStatusButton status={task.status} onChange={setStatus} />
      <div className="min-w-0 flex-1">
        <p className={cx("font-medium", task.status === "done" && "text-(--muted) line-through")}>{task.title}</p>
        {task.detail && <p className="mt-0.5 text-[13px] text-(--muted)">{task.detail}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Chip2>{task.kind === "interview" ? "Interview prep" : "Work"}</Chip2>
          {area && <Chip2>{area.name}</Chip2>}
          <Chip2>{formatDay(task.day)}</Chip2>
          {overdue && <Chip2 tone="warn">Overdue</Chip2>}
          {time.live ? (
            <span className="text-[12px] font-bold text-(--highlight)" data-testid="task-live" suppressHydrationWarning>
              ● on it · {time.liveMinutes} min
            </span>
          ) : time.minutes ? (
            <span className="text-[12px] text-(--muted)">{fmtLogged(time.minutes)} logged</span>
          ) : null}
        </div>
        {showAssignee && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              aria-label={`Assignee for ${task.title}`}
              value={task.candidateId ?? ""}
              onChange={(e) => assignTo(e.target.value || null)}
              className="h-7 max-w-[180px] rounded-lg border border-(--line) bg-(--card) px-1.5 text-[12px]"
            >
              <option value="">Unassigned</option>
              {eligibleFor(area, data).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {!task.candidateId && (
              <Button
                size="sm"
                className="h-7 px-2.5 text-[12px]"
                onClick={() => {
                  const s = suggestAssignee(area, data.candidates, data.settings);
                  if (s.pick) assignTo(s.pick.id);
                  else toast(s.message, "warn");
                }}
              >
                Suggest
              </Button>
            )}
            {confirm ? (
              <>
                <Button size="sm" className="h-7 px-2.5 text-[12px]" onClick={() => mutate((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== task.id) }), () => deleteTask(task.id), "Task removed")}>
                  Remove
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-[12px]" onClick={() => setConfirm(false)}>
                  Keep
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" className="ml-auto h-7 px-2 text-[12px]" onClick={() => setConfirm(true)}>
                Remove…
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function AssignModal() {
  const { data, assign, closeAssign } = useCrm();
  if (!assign) return null;
  return <AssignForm key={JSON.stringify(assign)} target={assign} onClose={closeAssign} data={data} />;
}

function AssignForm({ target, onClose, data }: { target: AssignTarget; onClose: () => void; data: CrmData }) {
  const { mutate } = useCrm();
  const existing = target.taskId ? data.tasks.find((t) => t.id === target.taskId) : undefined;
  const [title, setTitle] = useState(existing?.title ?? "");
  const [detail, setDetail] = useState(existing?.detail ?? "");
  const [kind, setKind] = useState<Task["kind"]>(existing?.kind ?? "work");
  const [day, setDay] = useState(existing?.day ?? target.day ?? data.today);
  const [areaId, setAreaId] = useState(existing?.areaId ?? target.areaId ?? "");
  const [candidateId, setCandidateId] = useState(target.candidateId ?? existing?.candidateId ?? "");
  const [hint, setHint] = useState<string | null>(null);
  const area = data.areas.find((a) => a.id === areaId);

  const submit = async () => {
    if (!title.trim()) return setHint("Give the task a title.");
    const input = { title: title.trim(), detail: detail.trim(), kind, day, areaId: areaId || null, candidateId: candidateId || null };
    onClose();
    if (existing) {
      await mutate((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === existing.id ? { ...t, ...input } : t)) }), () => updateTask(existing.id, input), "Task updated");
    } else {
      const temp: Task = { id: crypto.randomUUID(), campaignId: data.campaign?.id ?? "", status: "todo", completedAt: null, ...input };
      await mutate((d) => ({ ...d, tasks: [...d.tasks, temp] }), () => createTask(input), input.candidateId ? "Task assigned" : "Task added");
    }
  };

  return (
    <Modal title={existing ? "Edit task" : "Assign task"} onClose={onClose}>
      <form
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        data-testid="assign-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="sm:col-span-2">
          <Field label="Title">
            <input aria-label="Title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus className={inputClass} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Detail">
            <input aria-label="Detail" value={detail} onChange={(e) => setDetail(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <div>
          <span className="mb-1 block text-[13px] font-medium text-(--muted)">Kind</span>
          <Segmented<Task["kind"]>
            label="Kind"
            value={kind}
            onChange={setKind}
            options={[
              { value: "work", label: "Work" },
              { value: "interview", label: "Interview prep" },
            ]}
          />
        </div>
        <Field label="Day">
          <input aria-label="Day" type="date" value={day} onChange={(e) => setDay(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Area">
          <select aria-label="Area" value={areaId} onChange={(e) => setAreaId(e.target.value)} className={inputClass}>
            <option value="">No area</option>
            {data.areas
              .filter((a) => a.kind === "area")
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.level === "small" ? " (small job)" : ""}
                </option>
              ))}
          </select>
        </Field>
        <div>
          <Field label="Assignee">
            <select aria-label="Assignee" value={candidateId} onChange={(e) => setCandidateId(e.target.value)} className={inputClass}>
              <option value="">Unassigned</option>
              {eligibleFor(area, data).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <button
            type="button"
            className="mt-1 text-[13px] font-medium text-(--brand)"
            data-testid="suggest-by-skill"
            onClick={() => {
              const s = suggestAssignee(area, data.candidates, data.settings);
              if (s.pick) setCandidateId(s.pick.id);
              setHint(s.message);
            }}
          >
            Suggest by skill
          </button>
        </div>
        {hint && (
          <p className="text-[13px] text-(--muted) sm:col-span-2" data-testid="assign-hint">
            {hint}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit">
            {existing ? "Save" : "Assign task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

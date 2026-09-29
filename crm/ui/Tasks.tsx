"use client";

import { useState } from "react";
import { clockIn, clockOut, createTask, deleteTask, setTaskStatus, updateTask } from "../lib/actions";
import { firstName, fmtLogged, sessionMinutes, suggestAssignee, tierOf } from "../lib/ranking";
import { formatDay } from "../lib/time";
import type { Area, Candidate, CrmData, Task, TaskStatus } from "../lib/types";
import { TaskStatusButton } from "./bits";
import { Button, Modal, Segmented, cx } from "./primitives";
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

/** .task card. `clock` adds clock in/out (the drawer's Assignments tab). */
export function TaskCard({ task, showAssignee = true, clock = false }: { task: Task; showAssignee?: boolean; clock?: boolean }) {
  const { data, mutate, toast } = useCrm();
  const now = useClock();
  const [confirm, setConfirm] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const area = data.areas.find((a) => a.id === task.areaId);
  const overdue = task.status !== "done" && task.day < data.today;
  const time = taskTime(task, data, now?.nowMs ?? 0);
  const patch = (p: Partial<Task>) => (d: CrmData) => ({ ...d, tasks: d.tasks.map((t) => (t.id === task.id ? { ...t, ...p } : t)) });

  const setStatus = (status: TaskStatus) =>
    mutate(patch({ status, completedAt: status === "done" ? new Date().toISOString() : null }), () => setTaskStatus(task.id, status));
  const assignTo = (candidateId: string | null) =>
    mutate(
      patch({ candidateId }),
      () => updateTask(task.id, { candidateId }),
      candidateId ? `Assigned to ${firstName(data.candidates.find((c) => c.id === candidateId)?.name ?? "")}` : "Unassigned",
    );

  return (
    <div
      className={cx("task", task.status === "done" && "done", !task.candidateId && "unassigned", time.live && "live")}
      data-testid="task-card"
      data-task-id={task.id}
      data-status={task.status}
    >
      <TaskStatusButton status={task.status} onChange={setStatus} />
      <div className="t" style={{ minWidth: 0 }}>
        <b className="wrap-any">{task.title}</b>
        {task.detail && <small className="wrap-any">{task.detail}</small>}
        <div className="meta">
          <span className={cx("kind", task.kind)}>{task.kind === "interview" ? "Interview prep" : "Work"}</span>
          {area && <span className="one-line">{area.name}</span>}
          <span>{formatDay(task.day)}</span>
          {overdue && <span className="late">Overdue</span>}
          {time.live ? (
            <span className="livechip" data-testid="task-live" suppressHydrationWarning>
              ● on it · {time.liveMinutes} min
            </span>
          ) : time.minutes ? (
            <span className="logged">{fmtLogged(time.minutes)} logged</span>
          ) : null}
        </div>
      </div>
      <div className="act">
        {clock && task.candidateId && task.status !== "done" &&
          (time.live ? (
            <button type="button" className="btn-ghost sm" onClick={() => setClockingOut(true)} data-testid="drawer-clock-out">
              Clock out
            </button>
          ) : (
            <button type="button" className="btn-accent sm" onClick={() => mutate(null, () => clockIn(task.id), `Clocked in on "${task.title}"`)} data-testid="drawer-clock-in">
              Clock in
            </button>
          ))}
        {showAssignee && (
          <select aria-label={`Assignee for ${task.title}`} value={task.candidateId ?? ""} onChange={(e) => assignTo(e.target.value || null)} className="mini-sel">
            <option value="">Unassigned</option>
            {eligibleFor(area, data).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        {showAssignee && !task.candidateId && (
          <button
            type="button"
            onClick={() => {
              const s = suggestAssignee(area, data.candidates, data.settings);
              if (s.pick) assignTo(s.pick.id);
              else toast(s.message, "warn");
            }}
          >
            Suggest
          </button>
        )}
        {showAssignee &&
          (confirm ? (
            <>
              <button type="button" onClick={() => mutate((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== task.id) }), () => deleteTask(task.id), "Task removed")}>
                Confirm remove
              </button>
              <button type="button" onClick={() => setConfirm(false)}>
                Keep
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirm(true)}>
              Remove
            </button>
          ))}
      </div>
      {clockingOut && time.live && (
        <ClockOutModal
          minutes={time.liveMinutes}
          taskTitle={task.title}
          onClose={() => setClockingOut(false)}
          onSubmit={(note, done) => {
            setClockingOut(false);
            mutate(null, () => clockOut({ note, done, candidateId: task.candidateId! }), done ? "Clocked out and marked done" : "Clocked out");
          }}
        />
      )}
    </div>
  );
}

export function ClockOutModal({
  minutes,
  taskTitle,
  onClose,
  onSubmit,
}: {
  minutes: number;
  taskTitle: string;
  onClose: () => void;
  onSubmit: (note: string, done: boolean) => void;
}) {
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  return (
    <Modal title="Clock out" onClose={onClose}>
      <form
        className="composer"
        data-testid="clock-out-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (note.trim()) onSubmit(note.trim(), done);
        }}
      >
        <p style={{ color: "var(--muted)", fontSize: 13 }}>
          {minutes} min on <b style={{ color: "var(--ink)" }}>{taskTitle}</b> so far.
        </p>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} required autoFocus aria-label="What did you get done?" placeholder="What did you get done?" />
        <label className="flex items-center gap-2" style={{ fontSize: 13 }}>
          <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} /> Mark the task done
        </label>
        <div className="r">
          <Button onClick={onClose}>Keep working</Button>
          <Button variant="primary" type="submit" disabled={!note.trim()}>
            Clock out
          </Button>
        </div>
      </form>
    </Modal>
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
        className="form"
        data-testid="assign-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="wide">
          Title
          <input className="field" aria-label="Title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </label>
        <label className="wide">
          Detail
          <input className="field" aria-label="Detail" value={detail} onChange={(e) => setDetail(e.target.value)} />
        </label>
        <label>
          Kind
          <Segmented<Task["kind"]>
            label="Kind"
            value={kind}
            onChange={setKind}
            options={[
              { value: "work", label: "Work" },
              { value: "interview", label: "Interview prep" },
            ]}
          />
        </label>
        <label>
          Day
          <input className="field" aria-label="Day" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </label>
        <label>
          Area
          <select className="field" aria-label="Area" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
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
        </label>
        <label>
          Assignee
          <select className="field" aria-label="Assignee" value={candidateId} onChange={(e) => setCandidateId(e.target.value)}>
            <option value="">Unassigned</option>
            {eligibleFor(area, data).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="link"
            style={{ alignSelf: "flex-start" }}
            data-testid="suggest-by-skill"
            onClick={() => {
              const s = suggestAssignee(area, data.candidates, data.settings);
              if (s.pick) setCandidateId(s.pick.id);
              setHint(s.message);
            }}
          >
            Suggest by skill
          </button>
        </label>
        {hint && (
          <p className="wide wrap-any" style={{ gridColumn: "1/-1", fontSize: 12.5, color: "var(--muted)", margin: 0 }} data-testid="assign-hint">
            {hint}
          </p>
        )}
        <div className="r">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit">
            {existing ? "Save" : "Assign task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

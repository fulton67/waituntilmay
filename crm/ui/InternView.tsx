"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { clockIn, clockOut, setTaskStatus, submitReport } from "../lib/actions";
import { signOut } from "../lib/auth-actions";
import { dayOf, firstName, fmtLogged, sessionMinutes, weekOf } from "../lib/ranking";
import { formatDay } from "../lib/time";
import { INTERVIEW_TYPE_LABEL, type ActionResult, type InternData, type Task, type TaskStatus } from "../lib/types";
import { TaskStatusButton } from "./bits";
import { Avatar, Button, Icon, Modal, cx } from "./primitives";
import { useClock, useTheme } from "./store";
import { Chip2 } from "./Tasks";

const timeOf = (iso: string, tz: string) => new Date(iso).toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" });

/**
 * What an intern sees. Also rendered for interviewers via "View as" (read-only). Everything in
 * `data` was filtered server-side to this intern's own rows.
 */
export function InternView({ data }: { data: InternData }) {
  const clock = useClock();
  const [theme, toggleTheme] = useTheme();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ text: string; warn: boolean } | null>(null);
  const [clockingOut, setClockingOut] = useState(false);
  const readOnly = data.viewer === "interviewer";
  // Before the clock mounts (SSR), open sessions read as 0 min; the live value takes over on hydrate.
  const nowMs = clock?.nowMs ?? 0;
  const today = data.today;
  const open = data.sessions.find((s) => !s.endedAt) ?? null;
  const openTask = open ? data.tasks.find((t) => t.id === open.taskId) : undefined;
  const todaySessions = data.sessions.filter((s) => dayOf(s.startedAt, data.tz) === today);
  const minutesToday = todaySessions.reduce((m, s) => m + sessionMinutes(s, nowMs), 0);
  const todays = data.tasks.filter((t) => t.day === today || (t.status !== "done" && t.day < today));
  const later = data.tasks.filter((t) => t.day > today && weekOf(today).includes(t.day));
  const finishedToday = data.tasks.filter((t) => t.completedAt && dayOf(t.completedAt, data.tz) === today);
  const report = data.reports.find((r) => r.day === today);
  const upcoming = data.interviews.filter((iv) => iv.date >= today);

  const run = (fn: () => Promise<ActionResult<unknown>>, ok?: string) =>
    start(async () => {
      const res = await fn();
      setMessage(res.ok ? (ok ? { text: ok, warn: false } : null) : { text: res.error, warn: true });
    });

  return (
    <div className="mx-auto max-w-[880px] px-4 pb-16 pt-5" data-testid="intern-view" data-intern={data.intern.id}>
      <header className="flex items-center gap-3">
        <span className="crm-mark crm-wordmark" role="img" aria-label="fomo" />
        <span className="h-5 w-px bg-(--line)" />
        <span className="font-medium text-(--muted)">Intern CRM</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={toggleTheme}
            data-testid="theme-toggle"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            className="grid size-10 place-items-center rounded-xl text-(--muted) hover:bg-(--card-2) hover:text-(--ink)"
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} />
          </button>
          {readOnly ? (
            <Link href="/crm" className="inline-flex h-9 items-center rounded-xl border border-(--line) bg-(--card) px-3 text-[13px] font-bold">
              Back to CRM
            </Link>
          ) : (
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          )}
        </div>
      </header>

      {readOnly && (
        <p className="mt-4 rounded-2xl border border-(--line) bg-(--card-2) px-4 py-3 text-[13px]">
          Viewing as <span className="font-bold">{data.intern.name}</span> — exactly what they see. Buttons are read-only here.
        </p>
      )}

      <h1 className="mt-8 text-[30px] font-bold tracking-[-0.02em]">Hi {firstName(data.intern.name)}</h1>

      {data.campaign && (
        <section className="crm-focal mt-4 rounded-[22px] p-6" data-testid="intern-campaign">
          <p className="crm-sub text-[13px] font-medium">Current campaign</p>
          <h2 className="mt-1 text-[22px] font-bold">{data.campaign.name}</h2>
          <p className="crm-sub mt-2 max-w-[640px] leading-relaxed">{data.campaign.brief}</p>
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {data.campaign.goal && <span className="rounded-full bg-white px-2.5 py-0.5 text-[12px] font-bold text-[#516AF6]">{data.campaign.goal}</span>}
            {data.campaign.targets.map((t) => (
              <span key={t} className="rounded-full border border-white/40 px-2.5 py-0.5 text-[12px] font-medium">
                {t}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Clock card */}
      <section className="mt-4 flex flex-wrap items-center gap-4 rounded-[22px] border border-(--line) bg-(--card) p-5" data-testid="clock-card">
        {open ? (
          <>
            <span className="size-2.5 flex-none rounded-full bg-(--highlight)" aria-hidden />
            <div className="min-w-0 flex-1" suppressHydrationWarning>
              <p className="font-bold">You&apos;re clocked in · {openTask?.title}</p>
              <p className="text-[13px] text-(--muted)">
                since {timeOf(open.startedAt, data.tz)} · <span data-testid="clock-minutes">{sessionMinutes(open, nowMs)} min</span> · {fmtLogged(minutesToday)} today
              </p>
            </div>
            <Button variant="primary" disabled={readOnly || pending} onClick={() => setClockingOut(true)} data-testid="clock-out">
              Clock out
            </Button>
          </>
        ) : (
          <div className="flex-1">
            <p className="font-bold">Not clocked in</p>
            <p className="text-[13px] text-(--muted)">
              Pick a task and clock in{minutesToday ? ` · ${fmtLogged(minutesToday)} today` : ""}.
            </p>
          </div>
        )}
      </section>

      {message && (
        <p className={cx("mt-3 rounded-xl px-4 py-2.5 text-[13px] font-medium", message.warn ? "border border-(--highlight) text-(--highlight)" : "bg-(--card-2)")} role={message.warn ? "alert" : "status"}>
          {message.text}
        </p>
      )}

      <Section title="Your assignments today">
        <TaskList tasks={todays} data={data} openTaskId={open?.taskId} readOnly={readOnly} pending={pending} run={run} onClockOut={() => setClockingOut(true)} />
        {later.length > 0 && (
          <>
            <h3 className="mb-2 mt-5 font-medium text-(--muted)">Later this week</h3>
            <TaskList tasks={later} data={data} openTaskId={open?.taskId} readOnly={readOnly} pending={pending} run={run} onClockOut={() => setClockingOut(true)} />
          </>
        )}
      </Section>

      <Section title="Your interviews">
        <ul className="space-y-2" data-testid="intern-interviews">
          {upcoming.map((iv) => {
            const prep = data.tasks.filter((t) => t.kind === "interview" && t.day === iv.date);
            return (
              <li key={iv.id} className="rounded-2xl border border-(--line) bg-(--card) p-4" data-interview-id={iv.id}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-bold">
                    {formatDay(iv.date)}, {iv.startTime}–{iv.endTime}
                  </span>
                  <span className="text-(--muted)">{INTERVIEW_TYPE_LABEL[iv.type]}</span>
                  <span className="ml-auto inline-flex items-center gap-1.5 text-[13px]">
                    <Avatar name={iv.interviewer.name} color={iv.interviewer.color} size={22} /> {iv.interviewer.name}
                  </span>
                </div>
                {iv.location && <p className="mt-1 text-[13px] text-(--muted)">{iv.location}</p>}
                {prep.map((t) => (
                  <p key={t.id} className="mt-2 text-[13px]">
                    <span className="font-bold">Prepare:</span> {t.title}
                  </p>
                ))}
              </li>
            );
          })}
          {!upcoming.length && <li className="text-(--muted)">No interviews coming up.</li>}
        </ul>
      </Section>

      <Section title="End your day">
        <div className="rounded-[22px] border border-(--line) bg-(--card) p-5" data-testid="end-day">
          <ul className="space-y-2">
            {todaySessions.map((s) => (
              <li key={s.id} className="grid grid-cols-[96px_1fr_auto] gap-3 text-[13px]" suppressHydrationWarning>
                <span className="tabular-nums text-(--muted)">
                  {timeOf(s.startedAt, data.tz)}–{s.endedAt ? timeOf(s.endedAt, data.tz) : "now"}
                </span>
                <span>
                  <span className="font-medium">{data.tasks.find((t) => t.id === s.taskId)?.title}</span>
                  {s.note && <span className="block text-(--muted)">{s.note}</span>}
                </span>
                <span className="tabular-nums">{fmtLogged(sessionMinutes(s, nowMs))}</span>
              </li>
            ))}
            {!todaySessions.length && <li className="text-[13px] text-(--muted)">No time logged today yet.</li>}
          </ul>
          {finishedToday.length > 0 && <p className="mt-3 text-[13px]">Finished today: {finishedToday.map((t) => t.title).join(", ")}</p>}
          <ReportForm key={report?.submittedAt ?? "new"} initial={report?.summary ?? ""} submitted={!!report} disabled={readOnly || pending} onSubmit={(text) => run(() => submitReport(text), "Report submitted — you're clocked out. Nice work.")} />
        </div>
      </Section>

      {data.areas.length > 0 && (
        <Section title="You're attached to">
          <div className="flex flex-wrap gap-1.5">
            {data.areas.map((a) => (
              <span key={a.id} className="rounded-full border border-(--line) bg-(--card) px-3 py-1 text-[13px] font-medium" title={a.description}>
                {a.name}
                <span className="ml-1.5 text-[11px] text-(--muted)">{a.kind === "goal" ? "goal" : "area"}</span>
              </span>
            ))}
          </div>
        </Section>
      )}

      {clockingOut && open && (
        <ClockOutModal
          minutes={sessionMinutes(open, nowMs)}
          taskTitle={openTask?.title ?? "your task"}
          onClose={() => setClockingOut(false)}
          onSubmit={(note, done) => {
            setClockingOut(false);
            run(() => clockOut({ note, done }), done ? "Clocked out and marked done." : "Clocked out.");
          }}
        />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[17px] font-bold">{title}</h2>
      {children}
    </section>
  );
}

function TaskList({
  tasks,
  data,
  openTaskId,
  readOnly,
  pending,
  run,
  onClockOut,
}: {
  tasks: Task[];
  data: InternData;
  openTaskId?: string;
  readOnly: boolean;
  pending: boolean;
  run: (fn: () => Promise<ActionResult<unknown>>, ok?: string) => void;
  onClockOut: () => void;
}) {
  if (!tasks.length) return <p className="text-(--muted)">Nothing assigned. Check back soon.</p>;
  return (
    <ul className="space-y-2" data-testid="intern-tasks">
      {tasks.map((t) => {
        const active = t.id === openTaskId;
        return (
          <li key={t.id} className={cx("flex gap-3 rounded-2xl border bg-(--card) p-4", active ? "border-(--brand)" : "border-(--line)")} data-testid="intern-task" data-task-id={t.id} data-status={t.status}>
            <TaskStatusButton status={t.status} disabled={readOnly || pending} onChange={(s: TaskStatus) => run(() => setTaskStatus(t.id, s))} />
            <div className="min-w-0 flex-1">
              <p className={cx("font-medium", t.status === "done" && "text-(--muted) line-through")}>{t.title}</p>
              {t.detail && <p className="mt-0.5 text-[13px] text-(--muted)">{t.detail}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Chip2>{t.kind === "interview" ? "Interview prep" : "Work"}</Chip2>
                <Chip2>{formatDay(t.day)}</Chip2>
                {t.status !== "done" && t.day < data.today && <Chip2 tone="warn">Overdue</Chip2>}
              </div>
            </div>
            {t.status !== "done" &&
              (active ? (
                <Button size="sm" disabled={readOnly || pending} onClick={onClockOut}>
                  Clock out
                </Button>
              ) : (
                <Button size="sm" variant="primary" disabled={readOnly || pending} onClick={() => run(() => clockIn(t.id), `Clocked in on "${t.title}".`)} data-testid="clock-in">
                  Clock in
                </Button>
              ))}
          </li>
        );
      })}
    </ul>
  );
}

function ReportForm({ initial, submitted, disabled, onSubmit }: { initial: string; submitted: boolean; disabled: boolean; onSubmit: (text: string) => void }) {
  const [text, setText] = useState(initial);
  return (
    <form
      className="mt-4 border-t border-(--line) pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSubmit(text.trim());
      }}
    >
      <label className="block">
        <span className="mb-1.5 block font-medium">What did you accomplish today?</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          aria-label="What did you accomplish today?"
          className="w-full rounded-xl border border-(--line) bg-(--card) p-3 outline-none focus:border-(--brand)"
        />
      </label>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-[12px] text-(--muted)">{submitted ? "Submitted — you can edit and resubmit." : "Submitting also clocks you out."}</span>
        <Button type="submit" variant="primary" disabled={disabled || !text.trim()} data-testid="submit-report">
          {submitted ? "Resubmit report" : "Submit report"}
        </Button>
      </div>
    </form>
  );
}

function ClockOutModal({
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
        className="space-y-3"
        data-testid="clock-out-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (note.trim()) onSubmit(note.trim(), done);
        }}
      >
        <p className="text-(--muted)">
          {minutes} min on <span className="font-bold text-(--ink)">{taskTitle}</span> so far.
        </p>
        <label className="block">
          <span className="mb-1.5 block font-medium">What did you get done?</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            required
            autoFocus
            aria-label="What did you get done?"
            className="w-full rounded-xl border border-(--line) bg-(--card) p-3 outline-none focus:border-(--brand)"
          />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} className="size-4 accent-(--brand)" />
          Mark the task done
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onClose}>Keep working</Button>
          <Button variant="primary" type="submit" disabled={!note.trim()}>
            Clock out
          </Button>
        </div>
      </form>
    </Modal>
  );
}

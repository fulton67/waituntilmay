"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { clockIn, clockOut, setTaskStatus, submitReport } from "../lib/actions";
import { signOut } from "../lib/auth-actions";
import { dayOf, firstName, fmtLogged, sessionMinutes, weekOf } from "../lib/ranking";
import { formatDay } from "../lib/time";
import { INTERVIEW_TYPE_LABEL, type ActionResult, type InternData, type Task, type TaskStatus } from "../lib/types";
import { TaskStatusButton } from "./bits";
import { Avatar, Icon, cx } from "./primitives";
import { useClock, useTheme } from "./store";
import { ClockOutModal } from "./Tasks";

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
    <div className="content" style={{ maxWidth: 920, margin: "0 auto", padding: "28px 24px 48px" }} data-testid="intern-view" data-intern={data.intern.id}>
      <header className="top">
        <div className="brand">
          <span className="mark wordmark" role="img" aria-label="fomo" />
          <span className="sep" aria-hidden />
          <h1>
            Intern CRM <span>Today, {formatDay(today, "long")}</span>
          </h1>
        </div>
        <div className="actions">
          <button
            type="button"
            className="icon-btn"
            title="Light / dark"
            onClick={toggleTheme}
            data-testid="theme-toggle"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} />
          </button>
          {readOnly ? (
            <Link href="/crm" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center" }}>
              Back to CRM
            </Link>
          ) : (
            <form action={signOut}>
              <button type="submit" className="btn-ghost">
                Sign out
              </button>
            </form>
          )}
        </div>
      </header>

      {readOnly && (
        <div className="intern-banner">
          <span>
            Viewing as <b>{data.intern.name}</b> — exactly what they see. Buttons are read-only here.
          </span>
          <Link href="/crm">Exit</Link>
        </div>
      )}

      <h1 style={{ margin: "6px 4px 0", fontSize: 26, fontWeight: 700, letterSpacing: "-.02em" }}>Hi {firstName(data.intern.name)}</h1>

      {data.campaign && (
        <section className="card hero" data-testid="intern-campaign">
          <h2 className="wrap-any">{data.campaign.name}</h2>
          <p className="wrap-any">{data.campaign.brief}</p>
          {data.campaign.goal && <span className="goal">{data.campaign.goal}</span>}
          <div className="targets">
            {data.campaign.targets.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </section>
      )}

      <section className={cx("card nowcard", open && "on")} data-testid="clock-card">
        <div className="card-head">
          <div style={{ minWidth: 0 }} suppressHydrationWarning>
            {open ? (
              <>
                <h2 className="wrap-any">You&apos;re clocked in · {openTask?.title}</h2>
                <div className="sub">
                  since {timeOf(open.startedAt, data.tz)} · <span data-testid="clock-minutes">{sessionMinutes(open, nowMs)} min</span> · {fmtLogged(minutesToday)} today
                </div>
              </>
            ) : (
              <>
                <h2>Not clocked in</h2>
                <div className="sub">Pick a task and clock in{minutesToday ? ` · ${fmtLogged(minutesToday)} today` : ""}.</div>
              </>
            )}
          </div>
          {open && (
            <button type="button" className="btn-accent" disabled={readOnly || pending} onClick={() => setClockingOut(true)} data-testid="clock-out">
              Clock out
            </button>
          )}
        </div>
      </section>

      {message && (
        <div className="banner" role={message.warn ? "alert" : "status"} style={message.warn ? { color: "var(--hi)", fontWeight: 700 } : undefined}>
          {message.text}
        </div>
      )}

      <div className="two">
        <section className="card">
          <h2>Your assignments today</h2>
          <TaskList tasks={todays} data={data} openTaskId={open?.taskId} readOnly={readOnly} pending={pending} run={run} onClockOut={() => setClockingOut(true)} />
          {later.length > 0 && (
            <>
              <h4 style={{ margin: "16px 0 8px", fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Later this week</h4>
              <TaskList tasks={later} data={data} openTaskId={open?.taskId} readOnly={readOnly} pending={pending} run={run} onClockOut={() => setClockingOut(true)} />
            </>
          )}
        </section>

        <section className="card">
          <h2>Your interviews</h2>
          <div data-testid="intern-interviews" style={{ marginTop: 10 }}>
            {upcoming.map((iv) => {
              const prep = data.tasks.filter((t) => t.kind === "interview" && t.day === iv.date);
              const [wd, md] = formatDay(iv.date).split(", ");
              return (
                <div key={iv.id} className="my-iv" data-interview-id={iv.id}>
                  <div className="d">
                    {wd}
                    <b>{md}</b>
                  </div>
                  <div className="x" style={{ minWidth: 0 }}>
                    <b className="one-line" style={{ display: "block" }}>
                      {INTERVIEW_TYPE_LABEL[iv.type]} · {iv.startTime}–{iv.endTime}
                    </b>
                    <small className="flex items-center gap-1.5">
                      <Avatar name={iv.interviewer.name} color={iv.interviewer.color} size={18} /> with {iv.interviewer.name}
                      {iv.location ? ` · ${iv.location}` : ""}
                    </small>
                    {prep.map((t) => (
                      <span key={t.id} className="prep wrap-any">
                        Prepare: {t.title}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
            {!upcoming.length && <div className="empty">No interviews coming up.</div>}
          </div>
        </section>
      </div>

      <section className="card">
        <h2>End your day</h2>
        <div className="eod" style={{ marginTop: 12 }} data-testid="end-day">
          <div className="eod-list">
            {todaySessions.map((s) => (
              <div key={s.id} suppressHydrationWarning>
                <b>{fmtLogged(sessionMinutes(s, nowMs))}</b>
                {data.tasks.find((t) => t.id === s.taskId)?.title}
                <small className="wrap-any">
                  {timeOf(s.startedAt, data.tz)}–{s.endedAt ? timeOf(s.endedAt, data.tz) : "now"}
                  {s.note ? ` · ${s.note}` : ""}
                </small>
              </div>
            ))}
            {!todaySessions.length && <div style={{ color: "var(--muted)" }}>No time logged today yet.</div>}
          </div>
          {finishedToday.length > 0 && <div className="eod-done">Finished today: {finishedToday.map((t) => t.title).join(", ")}</div>}
        </div>
        <ReportForm
          key={report?.submittedAt ?? "new"}
          initial={report?.summary ?? ""}
          submitted={!!report}
          disabled={readOnly || pending}
          onSubmit={(text) => run(() => submitReport(text), "Report submitted — you're clocked out. Nice work.")}
        />
      </section>

      {data.areas.length > 0 && (
        <section className="card">
          <h2>You&apos;re attached to</h2>
          <div className="chips" style={{ marginTop: 10 }}>
            {data.areas.map((a) => (
              <span key={a.id} className={cx("chip", a.kind === "goal" ? "goal" : "area")} title={a.description}>
                {a.name}
              </span>
            ))}
          </div>
        </section>
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
  if (!tasks.length) return <div className="assign-empty">Nothing assigned. Check back soon.</div>;
  return (
    <div className="tasks" style={{ marginTop: 10 }} data-testid="intern-tasks">
      {tasks.map((t) => {
        const active = t.id === openTaskId;
        return (
          <div key={t.id} className={cx("task", t.status === "done" && "done", active && "live")} data-testid="intern-task" data-task-id={t.id} data-status={t.status}>
            <TaskStatusButton status={t.status} disabled={readOnly || pending} onChange={(s: TaskStatus) => run(() => setTaskStatus(t.id, s))} />
            <div className="t" style={{ minWidth: 0 }}>
              <b className="wrap-any">{t.title}</b>
              {t.detail && <small className="wrap-any">{t.detail}</small>}
              <div className="meta">
                <span className={cx("kind", t.kind)}>{t.kind === "interview" ? "Interview prep" : "Work"}</span>
                <span>{formatDay(t.day)}</span>
                {t.status !== "done" && t.day < data.today && <span className="late">Overdue</span>}
              </div>
            </div>
            <div className="act">
              {t.status !== "done" &&
                (active ? (
                  <button type="button" className="btn-ghost sm" disabled={readOnly || pending} onClick={onClockOut}>
                    Clock out
                  </button>
                ) : (
                  <button type="button" className="btn-accent sm" disabled={readOnly || pending} onClick={() => run(() => clockIn(t.id), `Clocked in on "${t.title}".`)} data-testid="clock-in">
                    Clock in
                  </button>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReportForm({ initial, submitted, disabled, onSubmit }: { initial: string; submitted: boolean; disabled: boolean; onSubmit: (text: string) => void }) {
  const [text, setText] = useState(initial);
  return (
    <form
      className="composer"
      style={{ marginTop: 12 }}
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSubmit(text.trim());
      }}
    >
      <textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="What did you accomplish today?" placeholder="What did you accomplish today?" />
      <div className="r" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{submitted ? "Submitted — you can edit and resubmit." : "Submitting also clocks you out."}</span>
        <button type="submit" className="btn-accent" disabled={disabled || !text.trim()} data-testid="submit-report">
          {submitted ? "Resubmit report" : "Submit report"}
        </button>
      </div>
    </form>
  );
}

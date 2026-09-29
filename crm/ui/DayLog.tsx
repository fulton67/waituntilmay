"use client";

import { useState } from "react";
import { colorFor } from "../lib/colors";
import { dayStats, firstName, fmtLogged, narrative, sessionMinutes, weekOf } from "../lib/ranking";
import { addDays, daysBetween, formatDay } from "../lib/time";
import { WeekStrip } from "./bits";
import { Avatar, Icon } from "./primitives";
import { useClock, useCrm } from "./store";

const timeOf = (iso: string, tz: string) => new Date(iso).toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" });

/** The campaign's running record, generated from sessions, tasks and reports — never hand-written. */
export function DayLog({ initialDay }: { initialDay?: string }) {
  const { data } = useCrm();
  const clock = useClock();
  const [day, setDay] = useState(initialDay ?? data.today);
  // Before the clock mounts (SSR), open sessions read as 0 min; the live value takes over on hydrate.
  const nowMs = clock?.nowMs ?? 0;
  const stats = dayStats(day, data, data.tz, nowMs);
  const title = (id: string) => data.tasks.find((t) => t.id === id)?.title ?? "a task";
  const text = narrative(stats, data.campaign, title);
  const k = data.campaign;
  const soFar = k ? Array.from({ length: Math.max(0, daysBetween(k.startDate, data.today)) + 1 }, (_, i) => addDays(k.startDate, i)).reverse() : [];

  return (
    <div data-testid="daylog">
      <div className="card-head" style={{ marginBottom: 14 }}>
        <div className="flex items-center gap-1.5">
          <button type="button" className="pill-btn sq" aria-label="Previous week" onClick={() => setDay(addDays(day, -7))}>
            <Icon name="left" />
          </button>
          <WeekStrip label="Day" days={weekOf(day)} selected={day} today={data.today} hasDot={(d) => dayStats(d, data, data.tz, nowMs).totals.minutes > 0} onPick={setDay} />
          <button type="button" className="pill-btn sq" aria-label="Next week" onClick={() => setDay(addDays(day, 7))}>
            <Icon name="right" />
          </button>
        </div>
        <a href={`/crm/api/timesheet?day=${day}`} className="pill-btn" data-testid="timesheet-csv">
          <Icon name="file" /> Timesheet CSV
        </a>
      </div>

      <div className="stat-row">
        {[
          ["Time logged", fmtLogged(stats.totals.minutes)],
          ["Tasks worked", String(stats.totals.tasksWorked)],
          ["Finished", String(stats.totals.finished)],
          ["Reports in", `${stats.totals.reports} of ${stats.totals.interns}`],
        ].map(([label, value]) => (
          <div key={label}>
            <b data-testid={`daylog-${label.toLowerCase().replace(/ /g, "-")}`}>{value}</b>
            <small>{label}</small>
          </div>
        ))}
      </div>

      <p className="narr wrap-any" data-testid="narrative">
        {text}
      </p>

      {stats.interns
        .filter((i) => i.sessions.length || i.report || i.finished.length)
        .map((i) => (
          <div key={i.candidate.id} className="dl" data-testid="daylog-intern" data-candidate={i.candidate.id}>
            <div className="who">
              <Avatar name={i.candidate.name} color={colorFor(i.candidate.id)} size={32} className="mini" />
              <span style={{ minWidth: 0 }}>
                <b className="one-line">{i.candidate.name}</b>
                <small>{fmtLogged(i.minutes)} logged</small>
              </span>
            </div>
            <div style={{ minWidth: 0 }}>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {i.sessions.map((s) => (
                  <li key={s.id} className="dl-task">
                    <em suppressHydrationWarning>{fmtLogged(sessionMinutes(s, nowMs))}</em>
                    <span style={{ minWidth: 0 }}>
                      <b className="wrap-any">{title(s.taskId)}</b>
                      <small className="wrap-any" suppressHydrationWarning>
                        {timeOf(s.startedAt, data.tz)}–{s.endedAt ? timeOf(s.endedAt, data.tz) : "now"}
                        {s.note ? ` · ${s.note}` : !s.endedAt ? " · still clocked in" : ""}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
              {i.finished.length > 0 && <div className="eod-done">Finished: {i.finished.map((t) => t.title).join(", ")}</div>}
              <div className="dl-report wrap-any">
                <b>{firstName(i.candidate.name)}&apos;s report</b>
                {i.report ? i.report.summary : <span style={{ color: "var(--muted)" }}>No report yet</span>}
              </div>
            </div>
          </div>
        ))}

      {k && (
        <div style={{ marginTop: 18 }}>
          <div className="rk-group" style={{ marginTop: 0 }}>
            <b>Campaign so far</b>
          </div>
          {soFar.map((d) => {
            const s = dayStats(d, data, data.tz, nowMs).totals;
            return (
              <div key={d} className="hist" role="button" tabIndex={0} onClick={() => setDay(d)} onKeyDown={(e) => e.key === "Enter" && setDay(d)} data-testid="history-row">
                <b>
                  Day {daysBetween(k.startDate, d) + 1} · {formatDay(d)}
                </b>
                <span className="one-line" style={{ color: "var(--muted)" }}>
                  {fmtLogged(s.minutes)} logged · {s.finished} finished · {s.reports} report{s.reports === 1 ? "" : "s"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

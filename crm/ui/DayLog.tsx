"use client";

import { useState } from "react";
import { colorFor } from "../lib/colors";
import { dayStats, firstName, fmtLogged, narrative, sessionMinutes, weekOf } from "../lib/ranking";
import { addDays, daysBetween, formatDay } from "../lib/time";
import { WeekStrip } from "./bits";
import { Avatar, Button, Icon } from "./primitives";
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
    <div className="space-y-4" data-testid="daylog">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" aria-label="Previous week" onClick={() => setDay(addDays(day, -7))}>
            <Icon name="left" size={16} />
          </Button>
          <WeekStrip
            label="Day"
            days={weekOf(day)}
            selected={day}
            today={data.today}
            hasDot={(d) => dayStats(d, data, data.tz, nowMs).totals.minutes > 0}
            onPick={setDay}
          />
          <Button variant="ghost" size="sm" aria-label="Next week" onClick={() => setDay(addDays(day, 7))}>
            <Icon name="right" size={16} />
          </Button>
        </div>
        <a
          href={`/crm/api/timesheet?day=${day}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-(--line) bg-(--card) px-3 text-[13px] font-bold hover:bg-(--card-2)"
          data-testid="timesheet-csv"
        >
          <Icon name="file" size={14} /> Timesheet CSV
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 min-[700px]:grid-cols-4">
        {[
          ["Time logged", fmtLogged(stats.totals.minutes)],
          ["Tasks worked", String(stats.totals.tasksWorked)],
          ["Finished", String(stats.totals.finished)],
          ["Reports in", `${stats.totals.reports} of ${stats.totals.interns}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-(--line) bg-(--card) p-4">
            <p className="text-[13px] text-(--muted)">{label}</p>
            <p className="mt-1 text-[26px] font-bold tabular-nums tracking-[-0.02em]" data-testid={`daylog-${label.toLowerCase().replace(/ /g, "-")}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <p className="rounded-2xl border border-(--line) bg-(--card) p-4 leading-relaxed" data-testid="narrative">
        {text}
      </p>

      <div className="space-y-3">
        {stats.interns
          .filter((i) => i.sessions.length || i.report || i.finished.length)
          .map((i) => (
            <div key={i.candidate.id} className="rounded-2xl border border-(--line) bg-(--card) p-4" data-testid="daylog-intern" data-candidate={i.candidate.id}>
              <div className="flex items-center gap-2.5">
                <Avatar name={i.candidate.name} color={colorFor(i.candidate.id)} size={28} />
                <p className="flex-1 font-bold">{i.candidate.name}</p>
                <span className="text-[13px] font-bold tabular-nums">{fmtLogged(i.minutes)}</span>
              </div>
              <ul className="mt-3 space-y-2">
                {i.sessions.map((s) => (
                  <li key={s.id} className="grid grid-cols-[92px_1fr_auto] gap-3 text-[13px]">
                    <span className="tabular-nums text-(--muted)" suppressHydrationWarning>
                      {timeOf(s.startedAt, data.tz)}–{s.endedAt ? timeOf(s.endedAt, data.tz) : "now"}
                    </span>
                    <span className="min-w-0">
                      <span className="font-medium">{title(s.taskId)}</span>
                      {s.note ? <span className="block text-(--muted)">{s.note}</span> : !s.endedAt && <span className="block text-(--highlight)">Still clocked in</span>}
                    </span>
                    <span className="tabular-nums">{fmtLogged(sessionMinutes(s, nowMs))}</span>
                  </li>
                ))}
              </ul>
              {i.finished.length > 0 && <p className="mt-2 text-[13px]">Finished: {i.finished.map((t) => t.title).join(", ")}</p>}
              <p className="mt-3 rounded-xl bg-(--card-2) p-3 text-[13px]">
                {i.report ? (
                  <>
                    <span className="font-bold">{firstName(i.candidate.name)}&apos;s report: </span>
                    {i.report.summary}
                  </>
                ) : (
                  <span className="text-(--muted)">No report yet</span>
                )}
              </p>
            </div>
          ))}
      </div>

      {k && (
        <div className="rounded-2xl border border-(--line) bg-(--card) p-4">
          <h3 className="mb-2 font-bold">Campaign so far</h3>
          <ul className="divide-y divide-(--line)">
            {soFar.map((d) => {
              const s = dayStats(d, data, data.tz, nowMs).totals;
              return (
                <li key={d}>
                  <button type="button" onClick={() => setDay(d)} className="flex w-full items-center gap-3 py-2 text-left text-[13px] hover:text-(--brand)">
                    <span className="w-[120px] font-medium">
                      Day {daysBetween(k.startDate, d) + 1} · {formatDay(d)}
                    </span>
                    <span className="flex-1 text-(--muted)">
                      {fmtLogged(s.minutes)} logged · {s.finished} finished · {s.reports} report{s.reports === 1 ? "" : "s"}
                    </span>
                    <Icon name="right" size={14} className="text-(--muted)" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

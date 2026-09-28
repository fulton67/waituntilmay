"use client";

import { useState } from "react";
import { initials, textOn } from "../lib/colors";
import { lanes, weekOf } from "../lib/ranking";
import { interviewPhase } from "../lib/rules";
import { blockGeometry, scheduleWindow } from "../lib/schedule";
import { addDays, formatDay, fromMin } from "../lib/time";
import { INTERVIEW_TYPE_LABEL, type Interview } from "../lib/types";
import { WeekStrip } from "./bits";
import { Avatar, Button, Card, Icon, Segmented, cx, typeStyle } from "./primitives";
import { useClock, useCrm } from "./store";

type Mode = "day" | "week";
const LABEL_W = 136;

function HourAxis({ win }: { win: { start: number; end: number } }) {
  const hours: number[] = [];
  for (let m = win.start; m <= win.end; m += 60) hours.push(m);
  return (
    <div className="flex">
      <div className="flex-none" style={{ width: LABEL_W }} />
      <div className="relative h-6 flex-1">
        {hours.map((m) => (
          <span key={m} className="absolute -translate-x-1/2 text-[12px] text-(--muted)" style={{ left: `${((m - win.start) / (win.end - win.start)) * 100}%` }}>
            {fromMin(m)}
          </span>
        ))}
      </div>
    </div>
  );
}

function HourLines({ win }: { win: { start: number; end: number } }) {
  const lines: number[] = [];
  for (let m = win.start; m <= win.end; m += 60) lines.push(m);
  return (
    <>
      {lines.map((m) => (
        <span key={m} className="absolute inset-y-0 w-px bg-(--line) opacity-60" style={{ left: `${((m - win.start) / (win.end - win.start)) * 100}%` }} />
      ))}
    </>
  );
}

export function Schedule({ tall = false }: { tall?: boolean }) {
  const { data, openCandidate } = useCrm();
  const clock = useClock();
  const [mode, setMode] = useState<Mode>("day");
  const [day, setDay] = useState(data.today);
  const [who, setWho] = useState<string>("all");

  const today = clock?.today ?? data.today;
  const nowMin = clock?.nowMin ?? null;
  const people = who === "all" ? data.interviewers : data.interviewers.filter((i) => i.id === who);
  const visible = data.interviews.filter((iv) => people.some((p) => p.id === iv.interviewerId));
  const week = weekOf(day);
  const candidateById = new Map(data.candidates.map((c) => [c.id, c]));
  const interviewerById = new Map(data.interviewers.map((i) => [i.id, i]));

  const dayInterviews = visible.filter((iv) => iv.date === day);
  const weekInterviews = visible.filter((iv) => week.includes(iv.date));
  const win = scheduleWindow(mode === "day" ? dayInterviews : weekInterviews);
  const nowLeft = nowMin != null && nowMin >= win.start && nowMin <= win.end ? ((nowMin - win.start) / (win.end - win.start)) * 100 : null;

  const block = (iv: Interview, style: React.CSSProperties, compact: boolean) => {
    const g = blockGeometry(iv, win);
    const live = nowMin != null && interviewPhase(iv, today, nowMin) === "live";
    const cand = candidateById.get(iv.candidateId);
    const person = interviewerById.get(iv.interviewerId);
    return (
      <button
        key={iv.id}
        type="button"
        data-testid="schedule-block"
        data-interview-id={iv.id}
        data-live={live || undefined}
        onClick={() => openCandidate(iv.candidateId, "interviews")}
        className={cx(
          "absolute overflow-hidden rounded-xl px-2 text-left transition-[filter] hover:brightness-95",
          compact ? "py-0.5" : "py-1.5",
          live && "outline outline-2 outline-offset-2 outline-(--highlight)",
        )}
        style={{ left: `${g.left}%`, width: `${g.width}%`, ...typeStyle(iv.type), ...style }}
        title={`${cand?.name} · ${INTERVIEW_TYPE_LABEL[iv.type]} · ${iv.startTime}–${iv.endTime} · ${person?.name ?? ""}`}
      >
        <span className="flex items-center gap-1 truncate text-[12px] font-bold">
          {live && <span className="size-1.5 flex-none rounded-full bg-(--highlight)" aria-label="Live" />}
          {compact && person && (
            <span
              className="grid size-4 flex-none place-items-center rounded-full text-[8px] font-bold"
              style={{ background: person.color, color: textOn(person.color) }}
              data-testid="interviewer-chip"
            >
              {initials(person.name)}
            </span>
          )}
          <span className="truncate">{cand?.name ?? "Candidate"}</span>
        </span>
        {!compact && (
          <span className="block truncate text-[12px] opacity-80">
            {INTERVIEW_TYPE_LABEL[iv.type]} · {iv.startTime}
          </span>
        )}
      </button>
    );
  };

  return (
    <Card
      title="Schedule"
      className="crm-reveal flex flex-col"
      bodyClassName="flex-1 pb-4"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<Mode>
            label="Schedule mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: "day", label: "Day" },
              { value: "week", label: "Week" },
            ]}
          />
          <div className="flex items-center">
            <Button variant="ghost" size="sm" aria-label={mode === "day" ? "Previous day" : "Previous week"} onClick={() => setDay(addDays(day, mode === "day" ? -1 : -7))}>
              <Icon name="left" size={16} />
            </Button>
            <span className="min-w-[112px] text-center text-[13px] font-medium" data-testid="schedule-day">
              {mode === "day" ? formatDay(day) : `${formatDay(week[0])} – ${formatDay(week[6]).split(", ")[1]}`}
            </span>
            <Button variant="ghost" size="sm" aria-label={mode === "day" ? "Next day" : "Next week"} onClick={() => setDay(addDays(day, mode === "day" ? 1 : 7))}>
              <Icon name="right" size={16} />
            </Button>
            {day !== today && (
              <Button variant="ghost" size="sm" onClick={() => setDay(today)}>
                Today
              </Button>
            )}
          </div>
          <select
            aria-label="Interviewer"
            value={who}
            onChange={(e) => setWho(e.target.value)}
            className="h-8 rounded-lg border border-(--line) bg-(--card) px-2 text-[13px]"
          >
            <option value="all">All interviewers</option>
            {data.interviewers.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>
      }
    >
      <div className="mb-3">
        <WeekStrip
          label="Week"
          days={week}
          selected={mode === "day" ? day : null}
          today={today}
          hasDot={(d) => visible.some((iv) => iv.date === d)}
          onPick={(d) => {
            setDay(d);
            setMode("day");
          }}
        />
      </div>
      <div className="crm-scroll -mx-5 overflow-x-auto px-5">
        <div className="min-w-[760px]">
          <HourAxis win={win} />
          {mode === "day" ? (
            <div className="relative">
              {people.map((person) => (
                <div key={person.id} className={cx("flex items-center border-t border-(--line)", tall ? "h-[76px]" : "h-[64px]")}>
                  <div className="flex flex-none items-center gap-2 pr-3" style={{ width: LABEL_W }}>
                    <Avatar name={person.name} color={person.color} size={26} />
                    <span className="truncate font-medium">{person.name}</span>
                  </div>
                  <div className="relative h-full flex-1" data-testid="schedule-track" data-interviewer={person.id}>
                    <HourLines win={win} />
                    {dayInterviews.filter((iv) => iv.interviewerId === person.id).map((iv) => block(iv, { top: 8, bottom: 8 }, false))}
                  </div>
                </div>
              ))}
              {day === today && nowLeft != null && (
                <div className="pointer-events-none absolute inset-y-0 right-0" style={{ left: LABEL_W }} aria-hidden>
                  <div className="absolute inset-y-0 w-0.5 bg-(--highlight)" style={{ left: `${nowLeft}%` }} data-testid="now-line">
                    <span className="absolute -left-[3px] -top-1 size-2 rounded-full bg-(--highlight)" />
                  </div>
                </div>
              )}
              {!dayInterviews.length && <p className="border-t border-(--line) py-4 text-center text-(--muted)">No interviews on {formatDay(day)}.</p>}
            </div>
          ) : (
            <div data-testid="schedule-week">
              {week.map((d) => {
                const packed = lanes(weekInterviews.filter((iv) => iv.date === d));
                const laneCount = Math.max(1, ...packed.map((p) => p.lane + 1));
                const LANE = 30;
                return (
                  <div
                    key={d}
                    className={cx("flex border-t border-(--line)", d === today && "bg-(--card-2)")}
                    style={{ height: laneCount * LANE + 12 }}
                    data-testid="schedule-week-row"
                    data-day={d}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setDay(d);
                        setMode("day");
                      }}
                      className={cx("flex flex-none items-center gap-1 pl-2 pr-3 text-left", d === today ? "font-bold" : "font-medium")}
                      style={{ width: LABEL_W }}
                    >
                      {formatDay(d)}
                    </button>
                    <div className="relative flex-1">
                      <HourLines win={win} />
                      {packed.map(({ item, lane }) => block(item, { top: 6 + lane * LANE, height: LANE - 4 }, true))}
                      {d === today && nowLeft != null && (
                        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-(--highlight)" style={{ left: `${nowLeft}%` }} data-testid="now-line" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

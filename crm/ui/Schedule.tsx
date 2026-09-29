"use client";

import { useState } from "react";
import { initials, textOn, colorFor } from "../lib/colors";
import { firstName, lanes, weekOf } from "../lib/ranking";
import { interviewPhase } from "../lib/rules";
import { blockGeometry, scheduleWindow } from "../lib/schedule";
import { addDays, formatDay, fromMin } from "../lib/time";
import { INTERVIEW_TYPE_LABEL, type Interview } from "../lib/types";
import { WeekStrip } from "./bits";
import { Icon, Modal, Segmented, TYPE_TINT, cx } from "./primitives";
import { ScheduleForm } from "./RecordTabs";
import { useClock, useCrm } from "./store";

type Mode = "day" | "week";
const LABEL_W = 104; // prototype: .axis / .srow grid-template-columns:104px 1fr
const LANE_H = 66; // .lane height
const BLK_TOP = 8; // .blk top
const BLK_H = 50; // .blk height
const LANE_STEP = BLK_H + 4; // stacked sub-rows in week mode

export function Schedule() {
  const { data, openCandidate } = useCrm();
  const clock = useClock();
  const [mode, setMode] = useState<Mode>("day");
  const [day, setDay] = useState(data.today);
  const [who, setWho] = useState<string>("all");
  const [scheduling, setScheduling] = useState(false);

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
  const hours: number[] = [];
  for (let m = win.start; m < win.end; m += 60) hours.push(m);
  const laneGrid = { backgroundSize: `calc(100% / ${hours.length}) 100%` };
  const nowPct = nowMin != null && nowMin >= win.start && nowMin <= win.end ? (nowMin - win.start) / (win.end - win.start) : null;

  const block = (iv: Interview, top: number, compact: boolean) => {
    const g = blockGeometry(iv, win);
    const phase = nowMin == null ? "upcoming" : interviewPhase(iv, today, nowMin);
    const cand = candidateById.get(iv.candidateId);
    const person = interviewerById.get(iv.interviewerId);
    const name = cand?.name ?? "Candidate";
    return (
      <button
        key={iv.id}
        type="button"
        data-testid="schedule-block"
        data-interview-id={iv.id}
        data-live={phase === "live" || undefined}
        onClick={() => openCandidate(iv.candidateId, "interviews")}
        className={cx("blk", TYPE_TINT[iv.type], phase === "live" && "live", phase === "past" && "past")}
        style={{ left: `${g.left}%`, width: `${g.width}%`, top }}
        title={`${name} · ${INTERVIEW_TYPE_LABEL[iv.type]} · ${iv.startTime}–${iv.endTime}${person ? ` · ${person.name}` : ""}`}
      >
        {compact && person ? (
          <span className="iv-av" style={{ background: person.color, color: textOn(person.color) }} data-testid="interviewer-chip">
            {initials(person.name)}
          </span>
        ) : (
          <span className="av" style={{ background: colorFor(iv.candidateId), color: textOn(colorFor(iv.candidateId)) }}>
            {initials(name)}
          </span>
        )}
        <span className="t">
          <b className="full">{name}</b>
          <b className="short">{firstName(name)}</b>
          <small>{INTERVIEW_TYPE_LABEL[iv.type]}</small>
        </span>
        <span className="time">{iv.startTime}</span>
      </button>
    );
  };

  return (
    <section className="card reveal" data-testid="schedule-card">
      <div className="card-head">
        <h2>Schedule</h2>
        <div className="tools">
          <Segmented<Mode>
            label="Schedule mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: "day", label: "Day" },
              { value: "week", label: "Week" },
            ]}
          />
          <button type="button" className="pill-btn sq prev" aria-label={mode === "day" ? "Previous day" : "Previous week"} onClick={() => setDay(addDays(day, mode === "day" ? -1 : -7))}>
            <Icon name="left" />
          </button>
          <span className="one-line" style={{ fontSize: 13, fontWeight: 500, minWidth: 96, textAlign: "center" }} data-testid="schedule-day">
            {mode === "day" ? formatDay(day) : `${formatDay(week[0])} – ${formatDay(week[6]).split(", ")[1]}`}
          </span>
          <button type="button" className="pill-btn sq next" aria-label={mode === "day" ? "Next day" : "Next week"} onClick={() => setDay(addDays(day, mode === "day" ? 1 : 7))}>
            <Icon name="right" />
          </button>
          {day !== today && (
            <button type="button" className="pill-btn" onClick={() => setDay(today)}>
              Today
            </button>
          )}
          <select aria-label="Interviewer" value={who} onChange={(e) => setWho(e.target.value)} className="pill-btn">
            <option value="all">All interviewers</option>
            {data.interviewers.filter((i) => !i.removed || i.id === who).map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
          <button type="button" className="btn-accent" onClick={() => setScheduling(true)} data-testid="open-schedule-form">
            + Schedule
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
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

      <div className="sched-wrap">
        <div className="sched">
          <div className="axis">
            <span />
            <div className="ticks">
              {hours.map((m) => (
                <span key={m}>{fromMin(m)}</span>
              ))}
            </div>
          </div>

          {mode === "day" ? (
            <>
              {people.map((person) => {
                const mine = dayInterviews.filter((iv) => iv.interviewerId === person.id);
                return (
                  <div key={person.id} className="srow">
                    <div className="who one-line">
                      {person.name}
                      <small>{mine.length ? `${mine.length} interview${mine.length === 1 ? "" : "s"}` : "Free"}</small>
                    </div>
                    <div className="lane" style={laneGrid} data-testid="schedule-track" data-interviewer={person.id}>
                      {mine.map((iv) => block(iv, BLK_TOP, false))}
                    </div>
                  </div>
                );
              })}
              {!dayInterviews.length && <div className="empty">No interviews on {formatDay(day)}.</div>}
              {day === today && nowPct != null && (
                <div className="now" style={{ left: `calc((100% - ${LABEL_W}px) * ${nowPct})` }} data-testid="now-line" />
              )}
            </>
          ) : (
            <div data-testid="schedule-week">
              {week.map((d) => {
                const packed = lanes(weekInterviews.filter((iv) => iv.date === d));
                const laneCount = Math.max(1, ...packed.map((p) => p.lane + 1));
                const height = Math.max(LANE_H, BLK_TOP * 2 + BLK_H + (laneCount - 1) * LANE_STEP);
                return (
                  <div key={d} className={cx("srow", d === today && "today")} data-testid="schedule-week-row" data-day={d}>
                    <button
                      type="button"
                      className="who one-line text-left"
                      onClick={() => {
                        setDay(d);
                        setMode("day");
                      }}
                    >
                      {formatDay(d).split(",")[0]}
                      <small>{formatDay(d).split(", ")[1]}</small>
                    </button>
                    <div className="lane" style={{ ...laneGrid, height, position: "relative" }}>
                      {packed.map(({ item, lane }) => block(item, BLK_TOP + lane * LANE_STEP, true))}
                      {d === today && nowPct != null && (
                        <div
                          className="now"
                          style={{ top: 0, marginLeft: 0, left: `${nowPct * 100}%` }}
                          data-testid="now-line"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {scheduling && (
        <Modal title="Schedule an interview" onClose={() => setScheduling(false)}>
          <ScheduleForm candidate={data.candidates[0]} bare onDone={() => setScheduling(false)} defaultDate={day} />
        </Modal>
      )}
    </section>
  );
}

"use client";

import { useState } from "react";
import { interviewPhase } from "../lib/rules";
import { blockGeometry, scheduleWindow } from "../lib/schedule";
import { addDays, formatDay, fromMin } from "../lib/time";
import { INTERVIEW_TYPE_LABEL } from "../lib/types";
import { Avatar, Button, Card, Icon, Segmented, cx, typeStyle } from "./primitives";
import { useClock, useCrm } from "./store";

export function Schedule({ tall = false }: { tall?: boolean }) {
  const { data, openCandidate } = useCrm();
  const clock = useClock();
  const [offset, setOffset] = useState(0);
  const [who, setWho] = useState<string>("all");

  const day = addDays(data.today, offset);
  const people = who === "all" ? data.interviewers : data.interviewers.filter((i) => i.id === who);
  const dayInterviews = data.interviews.filter((iv) => iv.date === day && people.some((p) => p.id === iv.interviewerId));
  const win = scheduleWindow(dayInterviews);
  const hours: number[] = [];
  for (let m = win.start; m <= win.end; m += 60) hours.push(m);
  const candidateById = new Map(data.candidates.map((c) => [c.id, c]));

  const isToday = clock ? day === clock.today : day === data.today;
  const nowMin = clock?.nowMin ?? null;
  const nowLeft =
    isToday && nowMin != null && nowMin >= win.start && nowMin <= win.end ? ((nowMin - win.start) / (win.end - win.start)) * 100 : null;

  return (
    <Card
      title="Schedule"
      className="flex flex-col"
      bodyClassName="flex-1 pb-4"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Day"
            value={offset === 0 ? "today" : offset === 1 ? "tomorrow" : "other"}
            options={[
              { value: "today", label: "Today" },
              { value: "tomorrow", label: "Tomorrow" },
            ]}
            onChange={(v) => setOffset(v === "today" ? 0 : 1)}
          />
          <div className="flex items-center">
            <Button variant="ghost" size="sm" aria-label="Previous day" onClick={() => setOffset((o) => o - 1)}>
              <Icon name="left" size={16} />
            </Button>
            <span className="min-w-[92px] text-center text-[13px] font-medium" data-testid="schedule-day">
              {formatDay(day)}
            </span>
            <Button variant="ghost" size="sm" aria-label="Next day" onClick={() => setOffset((o) => o + 1)}>
              <Icon name="right" size={16} />
            </Button>
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
      <div className="crm-scroll -mx-5 overflow-x-auto px-5">
        <div className="min-w-[760px]">
          {/* Hour axis */}
          <div className="flex">
            <div className="w-[136px] flex-none" />
            <div className="relative h-6 flex-1">
              {hours.map((m) => (
                <span
                  key={m}
                  className="absolute -translate-x-1/2 text-[12px] text-(--muted)"
                  style={{ left: `${((m - win.start) / (win.end - win.start)) * 100}%` }}
                >
                  {fromMin(m)}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            {people.map((person) => {
              const mine = dayInterviews.filter((iv) => iv.interviewerId === person.id);
              return (
                <div key={person.id} className={cx("flex items-center border-t border-(--line)", tall ? "h-[76px]" : "h-[64px]")}>
                  <div className="flex w-[136px] flex-none items-center gap-2 pr-3">
                    <Avatar name={person.name} color={person.color} size={26} />
                    <span className="truncate font-medium">{person.name}</span>
                  </div>
                  <div className="relative h-full flex-1" data-testid="schedule-track" data-interviewer={person.id}>
                    {hours.map((m) => (
                      <span
                        key={m}
                        className="absolute inset-y-0 w-px bg-(--line) opacity-60"
                        style={{ left: `${((m - win.start) / (win.end - win.start)) * 100}%` }}
                      />
                    ))}
                    {mine.map((iv) => {
                      const g = blockGeometry(iv, win);
                      const live = nowMin != null && isToday && interviewPhase(iv, day, nowMin) === "live";
                      const cand = candidateById.get(iv.candidateId);
                      return (
                        <button
                          key={iv.id}
                          type="button"
                          data-testid="schedule-block"
                          data-interview-id={iv.id}
                          data-live={live || undefined}
                          onClick={() => openCandidate(iv.candidateId, "interviews")}
                          className={cx(
                            "absolute inset-y-2 overflow-hidden rounded-xl px-2.5 py-1.5 text-left transition-[filter] hover:brightness-95",
                            live && "outline outline-2 outline-offset-2 outline-(--highlight)",
                          )}
                          style={{ left: `${g.left}%`, width: `${g.width}%`, ...typeStyle(iv.type) }}
                          title={`${cand?.name} · ${INTERVIEW_TYPE_LABEL[iv.type]} · ${iv.startTime}–${iv.endTime}`}
                        >
                          <span className="flex items-center gap-1.5 truncate text-[13px] font-bold">
                            {live && <span className="size-1.5 flex-none rounded-full bg-(--highlight)" aria-label="Live" />}
                            <span className="truncate">{cand?.name ?? "Candidate"}</span>
                          </span>
                          <span className="block truncate text-[12px] opacity-80">
                            {INTERVIEW_TYPE_LABEL[iv.type]} · {iv.startTime}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {nowLeft != null && (
              <div className="pointer-events-none absolute inset-y-0 left-[136px] right-0" aria-hidden>
                <div className="absolute inset-y-0 w-0.5 bg-(--highlight)" style={{ left: `${nowLeft}%` }} data-testid="now-line">
                  <span className="absolute -left-[3px] -top-1 size-2 rounded-full bg-(--highlight)" />
                </div>
              </div>
            )}
          </div>
          {!dayInterviews.length && (
            <p className="border-t border-(--line) py-4 text-center text-(--muted)">No interviews on {formatDay(day)}.</p>
          )}
        </div>
      </div>
    </Card>
  );
}

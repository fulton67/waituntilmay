"use client";

import { onScale } from "../lib/ranking";
import { formatDay } from "../lib/time";
import { TASK_STATUS_LABEL, type TaskStatus, type Tier } from "../lib/types";
import { cx } from "./primitives";

/** .tier chip: priority = brand, bench = pale; standard isn't shown. */
export function TierChip({ tier }: { tier: Tier; className?: string }) {
  if (tier === "standard") return null;
  return (
    <span className={cx("tier", tier)} data-tier={tier}>
      {tier === "priority" ? "Priority" : "Bench"}
    </span>
  );
}

const NEXT: Record<TaskStatus, TaskStatus> = { todo: "doing", doing: "done", done: "todo" };

/** .task .chk — cycles to-do → in progress (half-filled) → done (filled). */
export function TaskStatusButton({ status, onChange, disabled }: { status: TaskStatus; onChange: (next: TaskStatus) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(NEXT[status]);
      }}
      aria-label={`Status: ${TASK_STATUS_LABEL[status]}. Change to ${TASK_STATUS_LABEL[NEXT[status]]}`}
      title={TASK_STATUS_LABEL[status]}
      data-status={status}
      data-testid="task-status"
      className={cx("chk", status === "doing" && "doing", status === "done" && "done")}
    >
      {status === "done" ? "✓" : ""}
    </button>
  );
}

/**
 * .strip on the floor→10 axis: fill to the fit, a .dot per interview score, the .avg marker at the
 * fit, and a hollow .base dot at the baseline until the first score.
 */
export function ScoreStrip({ scores, fit, baseline, floor }: { scores: number[]; fit: number; baseline: number; floor: number; tier?: Tier }) {
  return (
    <span className="strip" data-testid="score-strip">
      <span className="fill" style={{ width: `${onScale(fit, floor)}%` }} />
      {!scores.length && <span className="base" style={{ left: `${onScale(baseline, floor)}%` }} title={`Baseline ${baseline}`} />}
      {scores.map((s, i) => (
        <span key={i} className="dot" style={{ left: `${onScale(s, floor)}%` }} title={`${s}/10`} />
      ))}
      <span className="avg" style={{ left: `${onScale(fit, floor)}%` }} title={`Fit ${fit}`} />
    </span>
  );
}

export function Delta({ value }: { value: number | null }) {
  if (value == null) return <span className="d none">·</span>;
  if (value === 0) return <span className="d flat">·</span>;
  return <span className={cx("d", value > 0 ? "up" : "down")}>{value > 0 ? `↑${value}` : `↓${Math.abs(value)}`}</span>;
}

/** .weekstrip: Mon–Sun with the date, a dot when the day has something, today underlined. */
export function WeekStrip({
  days,
  selected,
  today,
  hasDot,
  onPick,
  label,
}: {
  days: string[];
  selected: string | null;
  today: string;
  hasDot: (d: string) => boolean;
  onPick: (d: string) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="weekstrip" data-testid="week-strip">
      {days.map((d) => {
        const wd = formatDay(d).split(",")[0];
        return (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={d === selected}
            aria-label={formatDay(d, "long")}
            onClick={() => onPick(d)}
            className={cx(d === selected && "on", d === today && "today")}
          >
            {wd}
            <b>{Number(d.slice(8))}</b>
            <i className={hasDot(d) ? undefined : "off"} />
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { onScale } from "../lib/ranking";
import { formatDay } from "../lib/time";
import { TASK_STATUS_LABEL, type TaskStatus, type Tier } from "../lib/types";
import { cx } from "./primitives";

/** Priority = brand on white; bench = pale tint (navy in dark); standard isn't shown. */
export function TierChip({ tier, className }: { tier: Tier; className?: string }) {
  if (tier === "standard") return null;
  return (
    <span
      data-tier={tier}
      className={cx(
        "inline-flex h-5 flex-none items-center rounded-full px-2 text-[11px] font-bold",
        tier === "priority" ? "bg-(--brand) text-white" : "bg-(--bench-chip) text-(--bench-chip-ink)",
        className,
      )}
    >
      {tier === "priority" ? "Priority" : "Bench"}
    </span>
  );
}

const NEXT: Record<TaskStatus, TaskStatus> = { todo: "doing", doing: "done", done: "todo" };

/** Cycles to-do → in progress → done: empty, half-filled, filled. */
export function TaskStatusButton({
  status,
  onChange,
  disabled,
}: {
  status: TaskStatus;
  onChange: (next: TaskStatus) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(NEXT[status])}
      aria-label={`Status: ${TASK_STATUS_LABEL[status]}. Change to ${TASK_STATUS_LABEL[NEXT[status]]}`}
      title={TASK_STATUS_LABEL[status]}
      data-status={status}
      data-testid="task-status"
      className="grid size-6 flex-none place-items-center rounded-full disabled:opacity-50"
    >
      <svg width={20} height={20} viewBox="0 0 20 20" aria-hidden>
        <circle cx={10} cy={10} r={8} fill="none" stroke="var(--brand)" strokeWidth={2} />
        {status === "doing" && <path d="M10 2 A8 8 0 0 1 10 18 Z" fill="var(--brand)" />}
        {status === "done" && <circle cx={10} cy={10} r={8} fill="var(--brand)" />}
        {status === "done" && <path d="M6.5 10.2l2.3 2.3 4.7-4.9" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
    </button>
  );
}

const tierFill: Record<Tier, string> = { priority: "var(--brand)", standard: "var(--fill-standard)", bench: "var(--line-2)" };

/** Horizontal bar of a fit on the floor→10 axis, coloured by tier. */
export function FitBar({ fit, floor, tier }: { fit: number; floor: number; tier: Tier }) {
  return (
    <span className="relative block h-2 flex-1 overflow-hidden rounded-full bg-(--card-2)" role="meter" aria-valuenow={fit} aria-valuemin={floor} aria-valuemax={10}>
      <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${onScale(fit, floor)}%`, background: tierFill[tier] }} />
    </span>
  );
}

/**
 * Track on the floor→10 axis: fill to the fit, one dot per interview score, a thick marker at
 * the fit/average, and a hollow dot at the baseline until the first score.
 */
export function ScoreStrip({ scores, fit, baseline, floor, tier }: { scores: number[]; fit: number; baseline: number; floor: number; tier: Tier }) {
  return (
    <span className="relative block h-5 min-w-[140px] flex-1" data-testid="score-strip">
      <span className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-(--card-2)" />
      <span
        className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full"
        style={{ width: `${onScale(fit, floor)}%`, background: tierFill[tier], opacity: 0.55 }}
      />
      {!scores.length && (
        <span
          className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-(--muted) bg-(--card)"
          style={{ left: `${onScale(baseline, floor)}%` }}
          title={`Baseline ${baseline}`}
        />
      )}
      {scores.map((s, i) => (
        <span
          key={i}
          className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--brand) ring-2 ring-(--card)"
          style={{ left: `${onScale(s, floor)}%` }}
          title={`${s}/10`}
        />
      ))}
      <span className="absolute top-1/2 h-4 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--ink)" style={{ left: `${onScale(fit, floor)}%` }} title={`Fit ${fit}`} />
    </span>
  );
}

/** Axis labels under bars: floor, midpoint, 10. */
export function Axis({ floor, className }: { floor: number; className?: string }) {
  const mid = Math.round(((floor + 10) / 2) * 10) / 10;
  return (
    <div className={cx("flex justify-between text-[11px] tabular-nums text-(--muted)", className)} aria-hidden>
      <span>{floor}</span>
      <span>{mid}</span>
      <span>10</span>
    </div>
  );
}

export function Delta({ value }: { value: number | null }) {
  if (value == null || value === 0) return <span className="text-[12px] text-(--muted)">·</span>;
  return (
    <span className={cx("text-[12px] font-bold tabular-nums", value > 0 ? "text-(--brand)" : "text-(--highlight)")}>
      {value > 0 ? "↑" : "↓"}
      {Math.abs(value)}
    </span>
  );
}

/** Mon–Sun strip: date, a dot when the day has something, today underlined. */
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
    <div role="tablist" aria-label={label} className="crm-scroll flex gap-1 overflow-x-auto" data-testid="week-strip">
      {days.map((d) => {
        const [wd, , day] = formatDay(d).split(" ");
        const active = d === selected;
        return (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onPick(d)}
            className={cx(
              "relative flex h-12 w-11 flex-none flex-col items-center justify-center rounded-xl text-[12px]",
              active ? "bg-(--ink) text-(--canvas)" : "text-(--muted) hover:bg-(--card-2) hover:text-(--ink)",
            )}
          >
            <span className="font-medium">{wd.replace(",", "")}</span>
            <span className={cx("font-bold tabular-nums", d === today && "underline decoration-2 underline-offset-2")}>{day ?? d.slice(8)}</span>
            {hasDot(d) && <span className={cx("absolute bottom-1 size-1 rounded-full", active ? "bg-(--canvas)" : "bg-(--brand)")} />}
          </button>
        );
      })}
    </div>
  );
}

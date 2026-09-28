"use client";

import { useMemo, useState } from "react";
import { updateTask } from "../lib/actions";
import { boardSummary, firstName, fitDelta, fmtLogged, poolFloor, proposals, ranked, scoredInterviews, tierOf, type Proposal } from "../lib/ranking";
import { Axis, Delta, FitBar } from "./bits";
import { kpis } from "./derive";
import { Button, Icon, cx } from "./primitives";
import { useClock, useCrm } from "./store";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[13px]">
      <span className="crm-sub">{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}

const cardCls = "crm-reveal min-w-0 rounded-[22px] border border-(--line) bg-(--card) p-5";

export function KpiCards() {
  const { data, openPanel } = useCrm();
  const clock = useClock();
  const k = kpis(data, clock && clock.today === data.today ? clock.nowMin : null);

  return (
    <div className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-2 min-[1280px]:grid-cols-[1fr_1fr_1.55fr_1.1fr]">
      <section className={`${cardCls} crm-focal border-transparent`} style={{ ["--i" as string]: 0 }} data-testid="kpi-interviews">
        <h2 className="text-[17px] font-bold">Interviews today</h2>
        <div className="mt-3 flex items-end gap-3">
          <span className="crm-kpi">{k.today}</span>
          <span className="crm-sub mb-1 font-medium">+{k.tomorrow} tomorrow</span>
        </div>
        <div className="mt-4 space-y-1.5">
          <Stat label="In progress" value={k.inProgress} />
          <Stat label="Still to come" value={k.toCome} />
          <Stat label="Finished" value={k.finished} />
          <Stat label="Need scheduling" value={k.needScheduling} />
          <Stat label="Awaiting decision" value={k.awaiting} />
        </div>
      </section>
      <NextUpCard />
      <LeaderboardCard />
      <section className={cardCls} style={{ ["--i" as string]: 3 }}>
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-bold">Open areas</h2>
          <button type="button" onClick={() => openPanel("areas")} className="text-[13px] font-medium text-(--brand)">
            Manage
          </button>
        </div>
        <div className="mt-3 flex items-end gap-2">
          <span className="crm-kpi">{k.areaCounts.filter((a) => a.area.kind === "area").length}</span>
          <span className="mb-1 text-(--muted)">areas · {k.areaCounts.filter((a) => a.area.kind === "goal").length} goals</span>
        </div>
        <ul className="mt-4 space-y-1.5">
          {k.areaCounts
            .filter((a) => a.area.kind === "area")
            .map(({ area, count }) => (
              <li key={area.id} className="flex items-center justify-between gap-2 text-[13px]">
                <span className="truncate font-medium">
                  {area.name}
                  {area.level === "small" && <span className="ml-1.5 text-[11px] font-medium text-(--muted)">small job</span>}
                </span>
                <span className="rounded-full bg-(--card-2) px-2 py-0.5 text-[12px] font-medium tabular-nums">{count}</span>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}

// ─── Next up ───────────────────────────────────────────────────────────────

const DOT: Record<Proposal["priority"], string> = { 1: "var(--highlight)", 2: "var(--brand)", 3: "var(--glow)" };

function NextUpCard() {
  const { data, mutate, openCandidate, openAssign } = useCrm();
  const clock = useClock();
  const [expanded, setExpanded] = useState(false);

  const { list, summary } = useMemo(() => {
    if (!clock) return { list: [] as Proposal[], summary: null };
    const board = { ...data };
    return {
      list: proposals(board, { today: clock.today, nowMin: clock.nowMin, nowMs: clock.nowMs, tz: data.tz }),
      summary: boardSummary(board, clock.today, data.tz, clock.nowMs),
    };
  }, [data, clock]);

  const act = (p: Proposal) => {
    const a = p.action;
    if (a.type === "assign") {
      const who = data.candidates.find((c) => c.id === a.candidateId);
      mutate(
        (d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === a.taskId ? { ...t, candidateId: a.candidateId } : t)) }),
        () => updateTask(a.taskId, { candidateId: a.candidateId }),
        who ? `Assigned to ${firstName(who.name)}` : undefined,
      );
    } else if (a.type === "openAssign") openAssign({ taskId: a.taskId, candidateId: a.candidateId });
    else openCandidate(a.candidateId, a.tab);
  };

  const shown = expanded ? list : list.slice(0, 5);
  return (
    <section className={cardCls} style={{ ["--i" as string]: 1 }} data-testid="next-up">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-bold">Next up</h2>
        <span className="rounded-full bg-(--card-2) px-2 py-0.5 text-[12px] font-bold tabular-nums" data-testid="next-up-count">
          {list.length}
        </span>
      </div>
      <p className="mt-1 text-[13px] text-(--muted)" suppressHydrationWarning>
        {summary
          ? `${summary.clockedIn} clocked in · ${fmtLogged(summary.minutesToday)} logged today · ${summary.openTasks} open task${summary.openTasks === 1 ? "" : "s"}`
          : " "}
      </p>
      {clock && !list.length && <p className="mt-6 text-center text-(--muted)">Nothing waiting. Everyone has work and it&apos;s moving.</p>}
      <ul className="mt-3 space-y-3">
        {shown.map((p) => (
          <li key={p.id} className="flex items-start gap-2.5" data-testid="proposal" data-priority={p.priority}>
            <span className="mt-1.5 size-2 flex-none rounded-full" style={{ background: DOT[p.priority] }} aria-label={`Priority ${p.priority}`} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-snug">{p.text}</p>
              <Button size="sm" className="mt-1 h-7 max-w-full px-2.5 text-[12px]" onClick={() => act(p)}>
                <span className="truncate">{p.action.label}</span>
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {list.length > 5 && (
        <button type="button" onClick={() => setExpanded(!expanded)} className="mt-2 text-[13px] font-medium text-(--brand)">
          {expanded ? "Show fewer" : `+${list.length - 5} more`}
        </button>
      )}
    </section>
  );
}

// ─── Fit rankings leaderboard ──────────────────────────────────────────────

function LeaderboardCard() {
  const { data, openPanel } = useCrm();
  const floor = poolFloor(data.candidates, data.interviews);
  const rows = ranked(data.candidates);
  const scoredCount = data.candidates.filter((c) => scoredInterviews(c.id, data.interviews).length).length;
  const benched = data.candidates.filter((c) => tierOf(c, data.settings) === "bench").length;

  return (
    <section
      className={cx(cardCls, "cursor-pointer transition-colors hover:border-(--brand)")}
      style={{ ["--i" as string]: 2 }}
      onClick={() => openPanel("rankings")}
      data-testid="leaderboard"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-[17px] font-bold">Fit rankings</h2>
          <p className="mt-0.5 text-[13px] text-(--muted)">
            {scoredCount} scored · {benched} benched · ↑↓ since last interview
          </p>
        </div>
        <button
          type="button"
          aria-label="Open rankings & tiers"
          onClick={(e) => {
            e.stopPropagation();
            openPanel("rankings");
          }}
          className="grid size-8 place-items-center rounded-xl text-(--muted) hover:bg-(--card-2) hover:text-(--ink)"
        >
          <Icon name="right" size={16} />
        </button>
      </div>
      <ol className="mt-3 space-y-1.5" data-testid="leaderboard-rows">
        {rows.map((c, i) => (
          <li key={c.id} className="grid grid-cols-[18px_64px_1fr_30px_30px] items-center gap-2 text-[13px]" data-candidate={c.id}>
            <span className="tabular-nums text-(--muted)">{i + 1}</span>
            <span className="truncate font-medium">{firstName(c.name)}</span>
            <FitBar fit={c.fit} floor={floor} tier={tierOf(c, data.settings)} />
            <span className="text-right font-bold tabular-nums">{c.fit.toFixed(1)}</span>
            <span className="text-right">
              <Delta value={fitDelta(c, data.interviews)} />
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-1 grid grid-cols-[18px_64px_1fr_30px_30px] gap-2">
        <span />
        <span />
        <Axis floor={floor} />
      </div>
    </section>
  );
}

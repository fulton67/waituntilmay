"use client";

import { useMemo } from "react";
import { dismissProposal, restoreProposal, updateTask } from "../lib/actions";
import { boardSummary, firstName, proposals, type Proposal } from "../lib/ranking";
import { cx } from "./primitives";
import { useClock, useCrm } from "./store";

/** Urgency → the prototype's dot classes (.p3 = highlight, .p2 = brand, default = line-2). */
export const DOT_CLASS: Record<Proposal["priority"], string> = { 1: "p3", 2: "p2", 3: "p1" };
const GROUPS: { priority: Proposal["priority"]; title: string }[] = [
  { priority: 1, title: "Do now" },
  { priority: 2, title: "Today" },
  { priority: 3, title: "When you get to it" },
];

/** Current proposals, split into visible and dismissed-for-today by their stable keys. */
export function useProposals() {
  const { data } = useCrm();
  const clock = useClock();
  return useMemo(() => {
    if (!clock) return { visible: [] as Proposal[], dismissed: [] as Proposal[], summary: null, ready: false };
    const all = proposals(data, { today: clock.today, nowMin: clock.nowMin, nowMs: clock.nowMs, tz: data.tz });
    const hidden = new Set(data.dismissed);
    return {
      visible: all.filter((p) => !hidden.has(p.id)),
      dismissed: all.filter((p) => hidden.has(p.id)),
      summary: boardSummary(data, clock.today, data.tz, clock.nowMs),
      ready: true,
    };
  }, [data, clock]);
}

export function useProposalActions() {
  const { data, mutate, openCandidate, openAssign, closePanel } = useCrm();
  const run = (p: Proposal) => {
    const a = p.action;
    if (a.type === "assign") {
      const who = data.candidates.find((c) => c.id === a.candidateId);
      mutate(
        (d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === a.taskId ? { ...t, candidateId: a.candidateId } : t)) }),
        () => updateTask(a.taskId, { candidateId: a.candidateId }),
        who ? `Assigned to ${firstName(who.name)}` : undefined,
      );
    } else if (a.type === "openAssign") {
      closePanel();
      openAssign({ taskId: a.taskId, candidateId: a.candidateId });
    } else {
      closePanel();
      openCandidate(a.candidateId, a.tab);
    }
  };
  const dismiss = (key: string) => mutate((d) => ({ ...d, dismissed: [...d.dismissed, key] }), () => dismissProposal(key), "Dismissed for today");
  const restore = (key: string) => mutate((d) => ({ ...d, dismissed: d.dismissed.filter((k) => k !== key) }), () => restoreProposal(key), "Restored");
  return { run, dismiss, restore };
}

/** .nx-row: the whole row runs its action; × dismisses it for today. */
export function NextUpRow({ p }: { p: Proposal }) {
  const { run, dismiss } = useProposalActions();
  return (
    <div
      className={cx("nx-row", DOT_CLASS[p.priority])}
      style={{ gridTemplateColumns: "8px 1fr auto auto" }}
      role="button"
      tabIndex={0}
      onClick={() => run(p)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          run(p);
        }
      }}
      data-testid="proposal"
      data-key={p.id}
      data-priority={p.priority}
    >
      <i aria-label={`Priority ${p.priority}`} />
      <span className="wrap-any">{p.text}</span>
      <span className="link" title={p.action.label}>
        {p.action.label}
      </span>
      <button
        type="button"
        className="x"
        aria-label={`Dismiss for today: ${p.text}`}
        title="Dismiss for today"
        onClick={(e) => {
          e.stopPropagation();
          dismiss(p.id);
        }}
        data-testid="dismiss"
      >
        ×
      </button>
    </div>
  );
}

/** The Next up drawer: Do now / Today / When you get to it, then what was dismissed today. */
export function NextUpPanel() {
  const { visible, dismissed, ready } = useProposals();
  const { restore } = useProposalActions();
  if (!ready) return null;
  return (
    <div data-testid="nextup-panel">
      {GROUPS.map((g) => {
        const rows = visible.filter((p) => p.priority === g.priority);
        return (
          <section key={g.priority} data-testid={`nextup-group-${g.priority}`}>
            <div className="rk-group">
              <b>{g.title}</b>
              <span>{rows.length}</span>
            </div>
            <div className="nx">
              {rows.map((p) => (
                <NextUpRow key={p.id} p={p} />
              ))}
              {!rows.length && <div className="assign-empty">Nothing here.</div>}
            </div>
          </section>
        );
      })}
      <section data-testid="nextup-dismissed">
        <div className="rk-group">
          <b>Dismissed today</b>
          <span>{dismissed.length} · back tomorrow if still true</span>
        </div>
        {dismissed.map((p) => (
          <div key={p.id} className="hist" style={{ cursor: "default" }} data-key={p.id}>
            <span className="wrap-any" style={{ color: "var(--muted)" }}>
              {p.text}
            </span>
            <button type="button" className="link" onClick={() => restore(p.id)} data-testid="restore">
              Restore
            </button>
          </div>
        ))}
        {!dismissed.length && <div className="assign-empty">Nothing dismissed.</div>}
      </section>
    </div>
  );
}

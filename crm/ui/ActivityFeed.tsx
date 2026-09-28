"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { relativeTime } from "../lib/time";
import type { ActivityItem } from "../lib/types";
import { cx } from "./primitives";
import { useCrm } from "./store";

/** Relative times re-render each minute, and only after mount so SSR and client agree. */
function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);
  return now;
}

/** .feed of .ev rows; the 3px .bar is coloured by kind (.k-note, .k-task, …). */
export function ActivityList({ items, onPick }: { items: ActivityItem[]; onPick?: () => void }) {
  const { openCandidate } = useCrm();
  const now = useNow();
  if (!items.length) return <p className="empty">Nothing yet.</p>;
  return (
    <div className="feed" data-testid="activity-list">
      {items.map((a) => {
        const open = a.candidateId
          ? () => {
              onPick?.();
              openCandidate(
                a.candidateId!,
                a.kind === "time" ? "interviews" : a.kind === "task" || a.kind === "clock" || a.kind === "report" ? "assignments" : "notes",
              );
            }
          : undefined;
        return (
          <div
            key={a.id}
            className={cx("ev", `k-${a.kind}`)}
            data-kind={a.kind}
            role={open ? "button" : undefined}
            tabIndex={open ? 0 : undefined}
            style={open ? { cursor: "pointer" } : undefined}
            onClick={open}
            onKeyDown={open ? (e) => e.key === "Enter" && open() : undefined}
          >
            <span className="bar" />
            <span style={{ minWidth: 0 }}>
              <b className="one-line">{a.title}</b>
              <small className="one-line" style={{ display: "block" }}>
                {a.subtitle}
              </small>
            </span>
            <span className="when" suppressHydrationWarning>
              {now ? relativeTime(a.createdAt, now) : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ActivityCard() {
  const { data } = useCrm();
  return (
    <section className="card reveal" data-testid="activity-card">
      <div className="card-head">
        <h2>Recent activity</h2>
        <Link href="/crm/activity" className="link">
          See all
        </Link>
      </div>
      <ActivityList items={data.activity.slice(0, 8)} />
    </section>
  );
}

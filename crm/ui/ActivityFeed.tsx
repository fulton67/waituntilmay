"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { relativeTime } from "../lib/time";
import type { ActivityItem, ActivityKind } from "../lib/types";
import { Card } from "./primitives";
import { useCrm } from "./store";

/** Left-rule colour per kind, all inside the blue family. */
const RULE: Record<ActivityKind, string> = {
  awaiting: "var(--highlight)",
  note: "var(--brand)",
  new: "var(--glow)",
  time: "#7C8CF8",
  status: "var(--ink)",
  area: "#C4CDFB",
  task: "var(--brand)",
  clock: "#7C8CF8",
  report: "var(--glow)",
};

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

export function ActivityList({ items, onPick }: { items: ActivityItem[]; onPick?: () => void }) {
  const { openCandidate } = useCrm();
  const now = useNow();
  if (!items.length) return <p className="py-6 text-center text-(--muted)">Nothing yet.</p>;
  return (
    <ul className="space-y-1.5" data-testid="activity-list">
      {items.map((a) => {
        const body = (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{a.title}</span>
              <span className="block truncate text-[13px] text-(--muted)">{a.subtitle}</span>
            </span>
            <span className="flex-none text-[12px] text-(--muted)" suppressHydrationWarning>
              {now ? relativeTime(a.createdAt, now) : ""}
            </span>
          </>
        );
        const cls = "flex w-full items-start gap-3 rounded-xl border-l-[3px] bg-(--card-2) py-2.5 pl-3 pr-3 text-left";
        return (
          <li key={a.id} data-kind={a.kind}>
            {a.candidateId ? (
              <button
                type="button"
                className={`${cls} hover:brightness-[0.98]`}
                style={{ borderLeftColor: RULE[a.kind] }}
                onClick={() => {
                  onPick?.();
                  openCandidate(
                    a.candidateId!,
                    a.kind === "time" ? "interviews" : a.kind === "task" || a.kind === "clock" || a.kind === "report" ? "assignments" : "notes",
                  );
                }}
              >
                {body}
              </button>
            ) : (
              <div className={cls} style={{ borderLeftColor: RULE[a.kind] }}>
                {body}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function ActivityCard() {
  const { data } = useCrm();
  return (
    <Card
      className="crm-reveal"
      title="Recent activity"
      action={
        <Link href="/crm/activity" className="text-[13px] font-medium text-(--brand)">
          See all
        </Link>
      }
    >
      <ActivityList items={data.activity.slice(0, 8)} />
    </Card>
  );
}

"use client";

import Link from "next/link";
import { kpis } from "./derive";
import { Avatar } from "./primitives";
import { useClock, useCrm } from "./store";

function Sparkline({ values }: { values: number[] }) {
  const w = 160;
  const h = 44;
  if (values.length < 2) return <svg width={w} height={h} aria-hidden />;
  const min = Math.min(...values) - 4;
  const max = Math.max(...values) + 4;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - ((v - min) / (max - min || 1)) * h] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-label="Average fit over time" role="img" className="overflow-visible">
      <path d={`${line} L${w},${h} L0,${h} Z`} fill="var(--glow)" opacity={0.35} />
      <path d={line} fill="none" stroke="var(--brand)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[13px]">
      <span className="crm-sub">{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}

const cardCls = "min-w-0 rounded-[22px] border border-(--line) bg-(--card) p-5";

export function KpiCards() {
  const { data } = useCrm();
  const clock = useClock();
  const k = kpis(data, clock && clock.today === data.today ? clock.nowMin : null);

  return (
    <div className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-2 min-[1200px]:grid-cols-[1fr_1fr_1fr_1.25fr]">
      <section className={`${cardCls} crm-focal border-transparent`} data-testid="kpi-interviews">
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

      <section className={cardCls}>
        <h2 className="text-[17px] font-bold">Interviewer load</h2>
        <div className="mt-3 flex items-end gap-2">
          <span className="crm-kpi">{k.avgLoad}%</span>
          <span className="mb-1 text-(--muted)">today + tomorrow</span>
        </div>
        <ul className="mt-4 space-y-2.5">
          {k.load.map(({ person, pct }) => (
            <li key={person.id} className="flex items-center gap-2">
              <Avatar name={person.name} color={person.color} size={20} />
              <span className="w-[72px] truncate text-[13px] font-medium">{person.name}</span>
              <span className="crm-bar flex-1" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${person.name} load`}>
                <span style={{ width: `${pct}%` }} />
              </span>
              <span className="w-9 text-right text-[12px] tabular-nums text-(--muted)">{pct}%</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={cardCls}>
        <h2 className="text-[17px] font-bold">Average fit</h2>
        <div className="mt-3 flex items-end gap-2">
          <span className="crm-kpi">{k.avgFit}</span>
          <span className="mb-1 text-(--muted)">of 100</span>
        </div>
        <div className="mt-5">
          <Sparkline values={k.fitTrend} />
        </div>
        <p className="mt-2 text-[13px] text-(--muted)">
          Across {data.candidates.length} candidate{data.candidates.length === 1 ? "" : "s"}
        </p>
      </section>

      <section className={cardCls}>
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-bold">Open areas</h2>
          <Link href="/crm/areas" className="text-[13px] font-medium text-(--brand)">
            Manage
          </Link>
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
                <span className="truncate font-medium">{area.name}</span>
                <span className="rounded-full bg-(--card-2) px-2 py-0.5 text-[12px] font-medium tabular-nums">{count}</span>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}

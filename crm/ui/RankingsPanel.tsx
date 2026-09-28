"use client";

import Link from "next/link";
import { useState } from "react";
import { updateCandidate, updateSettings } from "../lib/actions";
import { colorFor } from "../lib/colors";
import { baselineFit, fitDelta, poolFloor, ranked, round1, scoredInterviews, tierOf } from "../lib/ranking";
import { TIER_LABEL, type Candidate, type Tier } from "../lib/types";
import { Axis, Delta, ScoreStrip, TierChip } from "./bits";
import { patchCandidate } from "./CandidateRecord";
import { Avatar, Segmented, cx } from "./primitives";
import { useCrm } from "./store";

export function TierControl({ candidate }: { candidate: Candidate }) {
  const { data, mutate } = useCrm();
  const tier = tierOf(candidate, data.settings);
  const set = (t: Tier | null) =>
    mutate(patchCandidate(candidate.id, (x) => ({ ...x, tierOverride: t })), () => updateCandidate(candidate.id, { tierOverride: t }));
  return (
    <span className="inline-flex items-center gap-1.5">
      <Segmented<Tier>
        label={`Tier for ${candidate.name}`}
        value={tier}
        onChange={(t) => set(t)}
        options={(["priority", "standard", "bench"] as const).map((t) => ({ value: t, label: TIER_LABEL[t] }))}
      />
      {candidate.tierOverride && (
        <button type="button" onClick={() => set(null)} className="text-[12px] font-medium text-(--brand)" title="Back to the automatic tier">
          auto
        </button>
      )}
    </span>
  );
}

function FitSelect({ candidate }: { candidate: Candidate }) {
  const { mutate } = useCrm();
  const options = [...new Set([...Array.from({ length: 10 }, (_, i) => i + 1), candidate.fit])].sort((a, b) => b - a);
  return (
    <select
      aria-label={`Fit for ${candidate.name}`}
      value={candidate.fit}
      onChange={(e) => {
        const fit = round1(Number(e.target.value));
        mutate(patchCandidate(candidate.id, (x) => ({ ...x, fit, tierOverride: null })), () => updateCandidate(candidate.id, { fit }));
      }}
      className="h-8 rounded-lg border border-(--line) bg-(--card) px-1.5 font-bold tabular-nums"
    >
      {options.map((v) => (
        <option key={v} value={v}>
          {v % 1 ? v.toFixed(1) : v}
        </option>
      ))}
    </select>
  );
}

function Thresholds() {
  const { data, mutate } = useCrm();
  const [p, setP] = useState(String(data.settings.priorityAt));
  const [b, setB] = useState(String(data.settings.benchAt));
  const commit = () => {
    const priorityAt = Number(p);
    const benchAt = Number(b);
    if (priorityAt === data.settings.priorityAt && benchAt === data.settings.benchAt) return;
    mutate((d) => ({ ...d, settings: { priorityAt, benchAt } }), () => updateSettings({ priorityAt, benchAt })).then((r) => {
      if (!r.ok) {
        setP(String(data.settings.priorityAt));
        setB(String(data.settings.benchAt));
      }
    });
  };
  const num = "h-8 w-12 rounded-lg border border-(--line) bg-(--card) text-center font-bold tabular-nums";
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-[13px]">
      Priority at <input aria-label="Priority at" inputMode="numeric" value={p} onChange={(e) => setP(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && commit()} className={num} /> and up ·
      Bench at <input aria-label="Bench at" inputMode="numeric" value={b} onChange={(e) => setB(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && commit()} className={num} /> and below · out of 10
    </p>
  );
}

export function RankingsPanel() {
  const { data, closePanel } = useCrm();
  const s = data.settings;
  const floor = poolFloor(data.candidates, data.interviews);
  const all = ranked(data.candidates);
  const rank = new Map(all.map((c, i) => [c.id, i + 1]));
  const groups: { tier: Tier; title: string; sub: string }[] = [
    { tier: "priority", title: `Priority · ${s.priorityAt} and up`, sub: "Schedule next rounds, core roles" },
    { tier: "standard", title: `Standard · ${s.benchAt + 1}–${s.priorityAt - 1}`, sub: "Between · keep interviewing" },
    { tier: "bench", title: `Bench · ${s.benchAt} and below`, sub: "No new interviews, small jobs only" },
  ];

  return (
    <div className="space-y-5" data-testid="rankings-panel">
      <Thresholds />
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-(--muted)">
        <li className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-(--brand)" /> one scored interview
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="h-3.5 w-[3px] rounded-full bg-(--ink)" /> fit / average
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border-2 border-(--muted)" /> baseline until the first score
        </li>
        <li>↑↓ change from the last interview</li>
      </ul>

      {groups.map((g) => {
        const rows = all.filter((c) => tierOf(c, s) === g.tier);
        return (
          <section key={g.tier} data-testid={`tier-${g.tier}`}>
            <div className="mb-2 flex items-baseline justify-between gap-3 border-b border-(--line) pb-2">
              <h3 className="font-bold">
                {g.title} <span className="font-medium text-(--muted)">· {rows.length}</span>
              </h3>
              <span className="text-[12px] text-(--muted)">{g.sub}</span>
            </div>
            {!rows.length && <p className="py-2 text-[13px] text-(--muted)">Nobody here.</p>}
            <ul className="space-y-3">
              {rows.map((c) => {
                const scored = scoredInterviews(c.id, data.interviews);
                return (
                  <li key={c.id} className="grid grid-cols-[22px_1fr] items-center gap-x-2 gap-y-2 min-[700px]:grid-cols-[22px_minmax(0,1.3fr)_minmax(140px,1fr)_auto_auto]" data-testid="ranking-row" data-candidate={c.id}>
                    <span className="tabular-nums text-(--muted)">{rank.get(c.id)}</span>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar name={c.name} color={colorFor(c.id)} size={30} />
                      <div className="min-w-0">
                        <Link href={`/crm/candidates/${c.id}`} onClick={closePanel} className="flex items-center gap-1.5 font-bold hover:underline">
                          <span className="truncate">{c.name}</span>
                          {c.tierOverride && <TierChip tier={c.tierOverride} />}
                        </Link>
                        <p className="truncate text-[12px] text-(--muted)">
                          {[c.school, c.major].filter(Boolean).join(" · ")}
                          {scored.length ? ` · ${scored.length} scored: ${scored.map((x) => `${x.score}/10`).join(", ")}` : " · not scored yet"}
                        </p>
                      </div>
                    </div>
                    <span className="col-span-2 min-[700px]:col-span-1">
                      <ScoreStrip scores={scored.map((x) => x.score!)} fit={c.fit} baseline={baselineFit(c, data.interviews)} floor={floor} tier={g.tier} />
                    </span>
                    <span className="col-start-2 flex items-center gap-2 min-[700px]:col-start-auto">
                      <span className="flex flex-col items-center">
                        <FitSelect candidate={c} />
                        <Delta value={fitDelta(c, data.interviews)} />
                      </span>
                      <span className="text-[12px] tabular-nums text-(--muted)">
                        #{rank.get(c.id)} of {all.length}
                      </span>
                    </span>
                    <span className={cx("col-start-2 min-[700px]:col-start-auto")}>
                      <TierControl candidate={c} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <div className="grid grid-cols-[22px_1fr] gap-2 min-[700px]:grid-cols-[22px_minmax(0,1.3fr)_minmax(140px,1fr)_auto_auto]">
        <span />
        <span className="hidden min-[700px]:block" />
        <Axis floor={floor} className="col-span-1" />
      </div>
    </div>
  );
}

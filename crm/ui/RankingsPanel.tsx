"use client";

import { useState } from "react";
import { updateCandidate, updateSettings } from "../lib/actions";
import { colorFor } from "../lib/colors";
import { baselineFit, fitDelta, poolFloor, ranked, round1, scoredInterviews, tierOf } from "../lib/ranking";
import { TIER_LABEL, type Candidate, type Tier } from "../lib/types";
import { Delta, ScoreStrip, TierChip } from "./bits";
import { patchCandidate } from "./CandidateRecord";
import { Avatar, Segmented } from "./primitives";
import { useCrm } from "./store";

/** .tierctl: Priority / Standard / Bench, plus "auto" when overridden. */
export function TierControl({ candidate }: { candidate: Candidate }) {
  const { data, mutate } = useCrm();
  const tier = tierOf(candidate, data.settings);
  const set = (t: Tier | null) => mutate(patchCandidate(candidate.id, (x) => ({ ...x, tierOverride: t })), () => updateCandidate(candidate.id, { tierOverride: t }));
  return (
    <span className="inline-flex items-center gap-1.5">
      <Segmented<Tier>
        className="tierctl"
        label={`Tier for ${candidate.name}`}
        value={tier}
        onChange={(t) => set(t)}
        options={(["priority", "standard", "bench"] as const).map((t) => ({ value: t, label: TIER_LABEL[t] }))}
      />
      {candidate.tierOverride && (
        <button type="button" className="link" style={{ fontSize: 11.5 }} onClick={() => set(null)} title="Back to the automatic tier">
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
      className="inline fitsel"
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
  return (
    <div className="thresholds">
      <span>
        Priority at{" "}
        <input aria-label="Priority at" inputMode="numeric" value={p} onChange={(e) => setP(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && commit()} /> and up
      </span>
      <span>
        Bench at <input aria-label="Bench at" inputMode="numeric" value={b} onChange={(e) => setB(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && commit()} /> and
        below
      </span>
      <span>out of 10</span>
    </div>
  );
}

export function RankingsPanel() {
  const { data, openCandidate, closePanel } = useCrm();
  const s = data.settings;
  const floor = poolFloor(data.candidates, data.interviews);
  const mid = Math.round(((floor + 10) / 2) * 10) / 10;
  const all = ranked(data.candidates);
  const rank = new Map(all.map((c, i) => [c.id, i + 1]));
  const groups: { tier: Tier; title: string; sub: string }[] = [
    { tier: "priority", title: `Priority · ${s.priorityAt} and up`, sub: "Schedule next rounds, core roles" },
    { tier: "standard", title: `Standard · ${s.benchAt + 1}–${s.priorityAt - 1}`, sub: "Between · keep interviewing" },
    { tier: "bench", title: `Bench · ${s.benchAt} and below`, sub: "No new interviews, small jobs only" },
  ];

  return (
    <div data-testid="rankings-panel">
      <Thresholds />
      <div className="legend">
        <span>
          <i className="dot" /> one scored interview
        </span>
        <span>
          <i className="avg" /> fit / average
        </span>
        <span>
          <i className="base" /> baseline until the first score
        </span>
        <span>↑↓ change from the last interview</span>
      </div>

      {groups.map((g) => {
        const rows = all.filter((c) => tierOf(c, s) === g.tier);
        return (
          <section key={g.tier} data-testid={`tier-${g.tier}`}>
            <div className={`rk-group ${g.tier}`}>
              <b>{g.title}</b>
              <span>
                {rows.length} · {g.sub}
              </span>
            </div>
            {!rows.length && <div className="empty" style={{ padding: "10px 0" }}>Nobody here.</div>}
            {rows.map((c) => {
              const scored = scoredInterviews(c.id, data.interviews);
              return (
                <div key={c.id} className={`rk ${g.tier}`} data-testid="ranking-row" data-candidate={c.id}>
                  <span className="n">{rank.get(c.id)}</span>
                  <Avatar name={c.name} color={colorFor(c.id)} size={30} />
                  <div className="who">
                    <span
                      className="nm"
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        closePanel();
                        openCandidate(c.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          closePanel();
                          openCandidate(c.id);
                        }
                      }}
                    >
                      <span className="one-line" style={{ display: "block" }}>
                        {c.name}
                        {c.tierOverride && <TierChip tier={c.tierOverride} />}
                      </span>
                      <small className="one-line">
                        {[c.school, c.major].filter(Boolean).join(" · ")}
                        {scored.length ? ` · ${scored.length} scored: ${scored.map((x) => `${x.score}/10`).join(", ")}` : " · not scored yet"}
                      </small>
                    </span>
                    <ScoreStrip scores={scored.map((x) => x.score!)} fit={c.fit} baseline={baselineFit(c, data.interviews)} floor={floor} />
                  </div>
                  <span className="f">
                    <FitSelect candidate={c} />
                    <Delta value={fitDelta(c, data.interviews)} />
                  </span>
                  <span className="p">
                    #{rank.get(c.id)} of {all.length}
                  </span>
                  <TierControl candidate={c} />
                </div>
              );
            })}
          </section>
        );
      })}
      <div className="rk head" aria-hidden>
        <span />
        <span />
        <div className="s">
          <span>{floor}</span>
          <span>{mid}</span>
          <span>10</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { initials } from "../lib/colors";
import { firstName, fitDelta, fmtLogged, onScale, poolFloor, ranked, scoredInterviews, tierOf } from "../lib/ranking";
import { kpis } from "./derive";
import { Icon, cx } from "./primitives";
import { goToSection } from "./Shell";
import { NextUpRow, useProposals } from "./NextUp";
import { useClock, useCrm } from "./store";

export function Delta({ value }: { value: number | null }) {
  if (value == null) return <span className="d none">·</span>;
  if (value === 0) return <span className="d flat">·</span>;
  return <span className={cx("d", value > 0 ? "up" : "down")}>{value > 0 ? `↑${value}` : `↓${Math.abs(value)}`}</span>;
}

export function KpiCards() {
  return (
    <div className="kpis">
      <InterviewsCard />
      <NextUpCard />
      <LeaderboardCard />
      <OpenAreasCard />
    </div>
  );
}

// ─── Interviews today (the one focal card) ─────────────────────────────────

function InterviewsCard() {
  const { data } = useCrm();
  const clock = useClock();
  const k = kpis(data, clock && clock.today === data.today ? clock.nowMin : null);
  return (
    <section
      className="card kpi wash reveal"
      role="button"
      tabIndex={0}
      aria-label="Interviews today — go to the schedule"
      style={{ cursor: "pointer" }}
      onClick={() => goToSection("schedule")}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && goToSection("schedule")}
      data-testid="kpi-interviews"
    >
      <div className="big">
        {k.today} <small className="up">+{k.tomorrow} tomorrow</small>
      </div>
      <div className="label">Interviews today</div>
      <div className="rows">
        {(
          [
            ["In progress", k.inProgress],
            ["Still to come", k.toCome],
            ["Finished", k.finished],
            ["Need scheduling", k.needScheduling],
            ["Awaiting decision", k.awaiting],
          ] as const
        ).map(([label, n]) => (
          <div key={label}>
            <span className="one-line">{label}</span>
            <b>{n}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Next up ───────────────────────────────────────────────────────────────

function NextUpCard() {
  const { openPanel } = useCrm();
  const { visible, summary, ready } = useProposals();
  const openDrawer = () => openPanel("nextup");
  return (
    <section className="card kpi nextup reveal" data-testid="next-up">
      <div className="card-head">
        <div>
          <h2 role="button" tabIndex={0} onClick={openDrawer} onKeyDown={(e) => e.key === "Enter" && openDrawer()} data-testid="next-up-title">
            Next up
          </h2>
          <div className="sub" suppressHydrationWarning>
            {summary
              ? `${summary.clockedIn} clocked in · ${fmtLogged(summary.minutesToday)} logged today · ${summary.openTasks} open task${summary.openTasks === 1 ? "" : "s"}`
              : " "}
          </div>
        </div>
        <span className="count" role="button" tabIndex={0} onClick={openDrawer} onKeyDown={(e) => e.key === "Enter" && openDrawer()} aria-label="Open Next up" data-testid="next-up-count">
          {visible.length}
        </span>
      </div>
      {ready && !visible.length && <p className="empty">Nothing waiting. Everyone has work and it&apos;s moving.</p>}
      <div className="nx">
        {visible.slice(0, 5).map((p) => (
          <NextUpRow key={p.id} p={p} />
        ))}
      </div>
      {visible.length > 5 && (
        <button type="button" className="link" style={{ marginTop: 8, alignSelf: "flex-start" }} onClick={openDrawer}>
          +{visible.length - 5} more
        </button>
      )}
    </section>
  );
}

// ─── Fit rankings leaderboard ──────────────────────────────────────────────

function LeaderboardCard() {
  const { data, openPanel, openCandidate } = useCrm();
  const floor = poolFloor(data.candidates, data.interviews);
  const rows = ranked(data.candidates);
  const scoredCount = data.candidates.filter((c) => scoredInterviews(c.id, data.interviews).length).length;
  const benched = data.candidates.filter((c) => tierOf(c, data.settings) === "bench").length;
  const mid = Math.round(((floor + 10) / 2) * 10) / 10;

  return (
    <section className="card kpi rank reveal" onClick={() => openPanel("rankings")} data-testid="leaderboard">
      <div className="card-head">
        <div>
          <h2>Fit rankings</h2>
          <div className="sub">
            {scoredCount} scored · {benched} benched · ↑↓ since last interview
          </div>
        </div>
        <button
          type="button"
          className="open-btn"
          aria-label="Open rankings & tiers"
          onClick={(e) => {
            e.stopPropagation();
            openPanel("rankings");
          }}
        >
          <Icon name="right" />
        </button>
      </div>
      {!rows.length && <p className="empty">No candidates yet.</p>}
      <div className="lb" data-testid="leaderboard-rows" style={rows.length ? undefined : { display: "none" }}>
        {rows.map((c, i) => (
          <div
            key={c.id}
            className={cx("lb-row", tierOf(c, data.settings))}
            data-candidate={c.id}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              openCandidate(c.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                openCandidate(c.id);
              }
            }}
          >
            <span className="r">{i + 1}</span>
            <span className="nm">{firstName(c.name)}</span>
            <span className="track">
              <i style={{ width: `${onScale(c.fit, floor)}%` }} />
            </span>
            <span className="v">{c.fit.toFixed(1)}</span>
            <Delta value={fitDelta(c, data.interviews)} />
          </div>
        ))}
        <div className="lb-row scale" aria-hidden>
          <span />
          <span />
          <span className="s">
            <span>{floor}</span>
            <span>{mid}</span>
            <span>10</span>
          </span>
          <span />
          <span />
        </div>
      </div>
    </section>
  );
}

// ─── Open areas ────────────────────────────────────────────────────────────

function OpenAreasCard() {
  const { data, openPanel } = useCrm();
  const counts = data.areas.map((a) => ({ area: a, count: data.candidates.filter((c) => c.areaIds.includes(a.id)).length }));
  const areas = counts.filter((a) => a.area.kind === "area").sort((a, b) => b.count - a.count || a.area.name.localeCompare(b.area.name));
  const shown = areas.slice(0, 3);
  return (
    <section className="card kpi reveal" data-testid="open-areas">
      <div className="card-head">
        <div>
          <h2>Open areas</h2>
          <div className="sub" style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            {areas.length} areas · {counts.length - areas.length} goals
          </div>
        </div>
        <button type="button" className="open-btn" aria-label="Open areas & goals" onClick={() => openPanel("areas")}>
          <Icon name="right" />
        </button>
      </div>
      {!areas.length && (
        <p className="empty">
          No areas yet.{" "}
          <button type="button" className="link" onClick={() => openPanel("areas")}>
            Create one
          </button>
        </p>
      )}
      <div className="promo">
        {shown.map(({ area, count }) => (
          <div
            key={area.id}
            className="row"
            role="button"
            tabIndex={0}
            data-area={area.id}
            onClick={() => openPanel("areas", { areaId: area.id })}
            onKeyDown={(e) => e.key === "Enter" && openPanel("areas", { areaId: area.id })}
          >
            <span className="thumb">{initials(area.name)}</span>
            <span className="txt" style={{ minWidth: 0 }}>
              <b className="one-line">{area.name}</b>
              <small className="one-line" style={{ display: "block" }}>
                {area.level === "small" ? "Small job" : area.description || "Core role"}
              </small>
            </span>
            <span className="count">{count}</span>
          </div>
        ))}
      </div>
      {areas.length > shown.length && (
        <button type="button" className="link" style={{ marginTop: 10, alignSelf: "flex-start" }} onClick={() => openPanel("areas")}>
          +{areas.length - shown.length} more
        </button>
      )}
    </section>
  );
}

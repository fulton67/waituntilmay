"use client";

import { useEffect } from "react";
import { AreasView } from "./AreasView";
import { DayLog } from "./DayLog";
import { Icon, Modal } from "./primitives";
import { RankingsPanel } from "./RankingsPanel";
import { SettingsView } from "./SettingsView";
import { useCrm } from "./store";

const TITLE = { rankings: "Rankings & tiers", areas: "Areas & goals", daylog: "Day log", settings: "Settings" } as const;
const SUB = {
  rankings: "Fit on a 1–10 scale, grouped by tier",
  areas: "Jobs, small jobs and goals, with who's attached",
  daylog: "The campaign's running record, from sessions, tasks and reports",
  settings: "",
} as const;

/** .drawer panels for Areas & goals, Rankings & tiers and the Day log; Settings is a .modal. */
export function Panels() {
  const { panel, closePanel, data } = useCrm();
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closePanel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel, closePanel]);
  if (!panel) return null;
  if (panel.name === "settings") {
    return (
      <Modal title="Settings" onClose={closePanel}>
        <SettingsView allowlist={data.allowlist} />
      </Modal>
    );
  }
  return (
    <>
      <div className="scrim on" onClick={closePanel} />
      <aside role="dialog" aria-modal aria-label={TITLE[panel.name]} data-testid={`panel-${panel.name}`} className="drawer on">
        <div className="d-head">
          <div style={{ minWidth: 0 }}>
            <h3>{TITLE[panel.name]}</h3>
            <p>{SUB[panel.name]}</p>
          </div>
          <button type="button" className="open-btn close" onClick={closePanel} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        <div className="d-main" style={{ flex: 1, overflow: "auto" }}>
          {panel.name === "rankings" && <RankingsPanel />}
          {panel.name === "areas" && <AreasView focusAreaId={panel.areaId} />}
          {panel.name === "daylog" && <DayLog initialDay={panel.day} />}
        </div>
      </aside>
    </>
  );
}

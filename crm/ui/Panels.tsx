"use client";

import { useEffect } from "react";
import { AreasView } from "./AreasView";
import { DayLog } from "./DayLog";
import { Button, Icon, Modal } from "./primitives";
import { SettingsView } from "./SettingsView";
import { RankingsPanel } from "./RankingsPanel";
import { useCrm } from "./store";

const TITLE = { rankings: "Rankings & tiers", areas: "Areas & goals", daylog: "Day log", settings: "Settings" } as const;

/** Right-side drawers for Areas & goals, Rankings & tiers and the Day log; Settings opens as a modal. */
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
      <Modal title="Settings" onClose={closePanel} wide>
        <SettingsView allowlist={data.allowlist} />
      </Modal>
    );
  }
  return (
    <div className="fixed inset-0 z-40">
      <div className="crm-backdrop absolute inset-0 bg-[rgba(11,9,31,0.35)]" onClick={closePanel} />
      <aside
        role="dialog"
        aria-modal
        aria-label={TITLE[panel.name]}
        data-testid={`panel-${panel.name}`}
        className="crm-drawer absolute inset-y-0 right-0 flex w-full flex-col border-l border-(--line) bg-(--canvas) shadow-(--shadow) min-[900px]:w-[min(880px,92vw)]"
      >
        <header className="flex items-center justify-between gap-3 px-5 py-4 min-[900px]:px-7">
          <h2 className="text-[20px] font-bold tracking-[-0.01em]">{TITLE[panel.name]}</h2>
          <Button variant="ghost" size="sm" onClick={closePanel} aria-label="Close">
            <Icon name="x" size={16} />
          </Button>
        </header>
        <div className="crm-scroll flex-1 overflow-y-auto px-5 pb-10 min-[900px]:px-7">
          {panel.name === "rankings" && (
            <div className="rounded-[22px] border border-(--line) bg-(--card) p-5">
              <RankingsPanel />
            </div>
          )}
          {panel.name === "areas" && <AreasView />}
          {panel.name === "daylog" && <DayLog initialDay={panel.day} />}
        </div>
      </aside>
    </div>
  );
}

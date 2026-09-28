"use client";

import { useEffect, useRef, useState } from "react";
import { attachArea, createArea, deleteArea, detachArea, updateArea } from "../lib/actions";
import { colorFor } from "../lib/colors";
import { tierOf } from "../lib/ranking";
import type { Area } from "../lib/types";
import { patchCandidate } from "./CandidateRecord";
import { Avatar, Button, InlineField, Segmented, cx } from "./primitives";
import { useCrm } from "./store";

/** Areas & goals drawer: every area/goal with its people, attach/remove, create new. */
export function AreasView({ focusAreaId }: { focusAreaId?: string }) {
  const { data } = useCrm();
  const listRef = useRef<HTMLDivElement>(null);

  // Opened from an Open areas row: scroll to that area and pulse it once.
  useEffect(() => {
    if (!focusAreaId) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-area="${focusAreaId}"]`);
    if (!el) return;
    el.scrollIntoView({ block: "center" });
    el.classList.add("focus");
    const t = window.setTimeout(() => el.classList.remove("focus"), 1300);
    return () => window.clearTimeout(t);
  }, [focusAreaId]);

  return (
    <div ref={listRef}>
      <NewAreaForm />
      {(["area", "goal"] as const).map((kind) => (
        <section key={kind} style={{ marginTop: 18 }}>
          <div className="rk-group" style={{ marginTop: 0 }}>
            <b>{kind === "area" ? "Areas" : "Goals"}</b>
            <span>{kind === "area" ? "Jobs we hire into; small jobs stay open to benched candidates" : "Outcomes a candidate could help with"}</span>
          </div>
          <div className="areas-list">
            {data.areas
              .filter((a) => a.kind === kind)
              .map((a) => (
                <AreaCard key={a.id} area={a} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function NewAreaForm() {
  const { mutate } = useCrm();
  const [kind, setKind] = useState<"area" | "small" | "goal">("area");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const submit = async () => {
    if (!name.trim()) return;
    const temp: Area = {
      id: crypto.randomUUID(),
      kind: kind === "goal" ? "goal" : "area",
      level: kind === "goal" ? null : kind === "small" ? "small" : "core",
      name: name.trim(),
      description: description.trim(),
    };
    setName("");
    setDescription("");
    await mutate(
      (d) => ({ ...d, areas: [...d.areas, temp] }),
      () => createArea({ kind: temp.kind, level: temp.level, name: temp.name, description: temp.description }),
      `Created ${temp.name}`,
    );
  };

  return (
    <form
      className="form"
      style={{ background: "var(--card-2)", borderRadius: 14, padding: "12px 14px" }}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      data-testid="new-area-form"
    >
      <label className="wide">
        Kind
        <Segmented
          label="Kind"
          value={kind}
          onChange={setKind}
          options={[
            { value: "area", label: "Area" },
            { value: "small", label: "Small job" },
            { value: "goal", label: "Goal" },
          ]}
        />
      </label>
      <label>
        Name
        <input className="field" aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === "goal" ? "Merch drop" : "Web & creative dev"} />
      </label>
      <label>
        Description
        <input className="field" aria-label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="One line" />
      </label>
      <div className="r">
        <Button variant="primary" type="submit" disabled={!name.trim()}>
          Create
        </Button>
      </div>
    </form>
  );
}

function AreaCard({ area }: { area: Area }) {
  const { data, mutate, openCandidate, closePanel } = useCrm();
  const [confirm, setConfirm] = useState(false);
  const attached = data.candidates.filter((c) => c.areaIds.includes(area.id));
  // Benched candidates can only join small jobs (goals are unaffected).
  const others = data.candidates.filter(
    (c) => !c.areaIds.includes(area.id) && (area.kind === "goal" || area.level === "small" || tierOf(c, data.settings) !== "bench"),
  );
  const patchArea = (p: Partial<Area>) => mutate((d) => ({ ...d, areas: d.areas.map((a) => (a.id === area.id ? { ...a, ...p } : a)) }), () => updateArea(area.id, p));

  return (
    <div className="area-card" data-testid="area-card" data-area={area.id}>
      <div className="h">
        <div style={{ minWidth: 0, flex: 1 }}>
          <InlineField label="Area name" value={area.name} onSave={(v) => v && patchArea({ name: v })} inputClassName="txt font-bold" className="attr" />
          <small>
            <InlineField label="Description" value={area.description} placeholder="Add a description" onSave={(v) => patchArea({ description: v })} className="attr" />
          </small>
        </div>
        {area.level === "small" && <span className="small-tag">small job</span>}
        <span className="status new">{attached.length}</span>
      </div>
      <div className="members">
        {attached.map((c) => (
          <span
            key={c.id}
            className="person"
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
            <Avatar name={c.name} color={colorFor(c.id)} size={22} />
            <span className="one-line">{c.name}</span>
            <button
              type="button"
              aria-label={`Remove ${c.name}`}
              style={{ opacity: 0.6, fontSize: 14, lineHeight: 1 }}
              onClick={(e) => {
                e.stopPropagation();
                mutate(patchCandidate(c.id, (x) => ({ ...x, areaIds: x.areaIds.filter((id) => id !== area.id) })), () => detachArea(c.id, area.id));
              }}
            >
              ×
            </button>
          </span>
        ))}
        {!attached.length && <span className="assign-empty">No candidates yet.</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2" style={{ marginTop: 10 }}>
        {others.length > 0 && (
          <select
            aria-label={`Add candidate to ${area.name}`}
            value=""
            className="inline"
            onChange={(e) => {
              const id = e.target.value;
              if (id) mutate(patchCandidate(id, (x) => ({ ...x, areaIds: [...x.areaIds, area.id] })), () => attachArea(id, area.id));
            }}
          >
            <option value="">+ Attach candidate</option>
            {others.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <span className={cx("ml-auto flex gap-1.5")}>
          {confirm ? (
            <>
              <Button size="sm" onClick={() => mutate((d) => ({ ...d, areas: d.areas.filter((a) => a.id !== area.id) }), () => deleteArea(area.id), `Deleted ${area.name}`)}>
                Delete
              </Button>
              <Button size="sm" onClick={() => setConfirm(false)}>
                Keep
              </Button>
            </>
          ) : (
            <button type="button" className="link" style={{ color: "var(--muted)" }} onClick={() => setConfirm(true)}>
              Delete…
            </button>
          )}
        </span>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { attachArea, createArea, deleteArea, detachArea, updateArea } from "../lib/actions";
import { colorFor } from "../lib/colors";
import type { Area, AreaKind } from "../lib/types";
import { patchCandidate } from "./CandidateRecord";
import { Avatar, Button, Card, Chip, Field, InlineField, Segmented, inputClass } from "./primitives";
import { useCrm } from "./store";

export function AreasView() {
  const { data } = useCrm();
  return (
    <div className="space-y-4">
      <NewAreaForm />
      {(["area", "goal"] as const).map((kind) => (
        <section key={kind}>
          <h2 className="mb-3 mt-6 text-[17px] font-bold">{kind === "area" ? "Areas" : "Goals"}</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 min-[1300px]:grid-cols-3">
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
  const [kind, setKind] = useState<AreaKind>("area");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const submit = async () => {
    if (!name.trim()) return;
    const temp: Area = { id: crypto.randomUUID(), kind, name: name.trim(), description: description.trim() };
    setName("");
    setDescription("");
    await mutate((d) => ({ ...d, areas: [...d.areas, temp] }), () => createArea({ kind, name: temp.name, description: temp.description }), `Created ${temp.name}`);
  };

  return (
    <Card title="Areas & goals">
      <p className="mb-4 max-w-[640px] text-(--muted)">Areas are the jobs and roles we hire into. Goals are outcomes a candidate could help with.</p>
      <form
        className="grid grid-cols-1 items-end gap-3 md:grid-cols-[auto_1fr_1.4fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Segmented
          label="Kind"
          value={kind}
          onChange={setKind}
          options={[
            { value: "area", label: "Area" },
            { value: "goal", label: "Goal" },
          ]}
        />
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === "area" ? "Web & creative dev" : "Merch drop"} className={inputClass} />
        </Field>
        <Field label="Description">
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="One line" className={inputClass} />
        </Field>
        <Button type="submit" variant="primary" disabled={!name.trim()}>
          Create
        </Button>
      </form>
    </Card>
  );
}

function AreaCard({ area }: { area: Area }) {
  const { data, mutate } = useCrm();
  const [confirm, setConfirm] = useState(false);
  const attached = data.candidates.filter((c) => c.areaIds.includes(area.id));
  const others = data.candidates.filter((c) => !c.areaIds.includes(area.id));
  const patchArea = (p: Partial<Area>) => mutate((d) => ({ ...d, areas: d.areas.map((a) => (a.id === area.id ? { ...a, ...p } : a)) }), () => updateArea(area.id, p));

  return (
    <section className="flex min-w-0 flex-col rounded-[22px] border border-(--line) bg-(--card) p-5" data-testid="area-card">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <InlineField label="Area name" value={area.name} onSave={(v) => v && patchArea({ name: v })} className="text-[17px] font-bold" />
          <InlineField label="Description" value={area.description} placeholder="Add a description" onSave={(v) => patchArea({ description: v })} className="mt-0.5 text-(--muted)" />
        </div>
        <span className="rounded-full bg-(--card-2) px-2 py-0.5 text-[12px] font-medium tabular-nums">{attached.length}</span>
      </div>

      <div className="mt-4 flex flex-1 flex-wrap content-start gap-1.5">
        {attached.map((c) => (
          <Chip
            key={c.id}
            removeLabel={`Remove ${c.name}`}
            onRemove={() =>
              mutate(patchCandidate(c.id, (x) => ({ ...x, areaIds: x.areaIds.filter((id) => id !== area.id) })), () => detachArea(c.id, area.id))
            }
          >
            <span className="inline-flex items-center gap-1.5">
              <Avatar name={c.name} color={colorFor(c.id)} size={18} />
              {c.name}
            </span>
          </Chip>
        ))}
        {!attached.length && <p className="text-[13px] text-(--muted)">No candidates yet.</p>}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-(--line) pt-3">
        {others.length > 0 && (
          <select
            aria-label={`Add candidate to ${area.name}`}
            value=""
            onChange={(e) => {
              const id = e.target.value;
              if (id) mutate(patchCandidate(id, (x) => ({ ...x, areaIds: [...x.areaIds, area.id] })), () => attachArea(id, area.id));
            }}
            className="h-8 min-w-0 flex-1 rounded-lg border border-(--line) bg-(--card) px-2 text-[13px]"
          >
            <option value="">+ Add candidate</option>
            {others.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        {confirm ? (
          <>
            <Button size="sm" onClick={() => mutate((d) => ({ ...d, areas: d.areas.filter((a) => a.id !== area.id) }), () => deleteArea(area.id), `Deleted ${area.name}`)}>
              Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
              Keep
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setConfirm(true)}>
            Delete…
          </Button>
        )}
      </div>
    </section>
  );
}

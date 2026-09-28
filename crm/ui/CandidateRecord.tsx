"use client";

import Link from "next/link";
import { useState } from "react";
import {
  addSkill,
  attachArea,
  detachArea,
  removeSkill,
  updateCandidate,
  updateSkill,
} from "../lib/actions";
import { colorFor } from "../lib/colors";
import { suggestArea } from "../lib/suggest";
import { interviewAverage, rankMap, scoredInterviews, tierOf } from "../lib/ranking";
import { TierChip } from "./bits";
import { TierControl } from "./RankingsPanel";
import { formatDuration } from "../lib/time";
import { STATUSES, STATUS_LABEL, type AreaKind, type Candidate, type CrmData, type Status } from "../lib/types";
import { candidateInterviews, timeSpent } from "./derive";
import { Avatar, Button, Chip, Icon, InlineField, StatusPill, cx, inputClass } from "./primitives";
import { RecordTabs } from "./RecordTabs";
import { useCrm, type RecordTab } from "./store";

export function patchCandidate(id: string, fn: (c: Candidate) => Candidate) {
  return (d: CrmData): CrmData => ({ ...d, candidates: d.candidates.map((c) => (c.id === id ? fn(c) : c)) });
}

const emailOk = (v: string) => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "Enter a valid email");
const href = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

export function CandidateRecord({
  candidateId,
  initialTab = "notes",
  variant,
}: {
  candidateId: string;
  initialTab?: RecordTab;
  variant: "page" | "drawer";
}) {
  const { data, mutate, closeDrawer } = useCrm();
  const c = data.candidates.find((x) => x.id === candidateId);

  if (!c) {
    return (
      <div className="p-8">
        <p className="text-(--muted)">Loading candidate…</p>
        {variant === "drawer" && (
          <Button className="mt-4" onClick={closeDrawer}>
            Close
          </Button>
        )}
      </div>
    );
  }

  const ivs = candidateInterviews(data, c.id);
  const spent = timeSpent(ivs);
  const logged = ivs.filter((iv) => iv.actualMinutes != null).length;
  const save = (patch: Parameters<typeof updateCandidate>[1]) => {
    const { summary, ...fields } = patch;
    return mutate(
      patchCandidate(c.id, (x) => ({ ...x, ...fields, ...(summary !== undefined ? { resumeJson: { ...x.resumeJson, summary } } : {}) }) as Candidate),
      () => updateCandidate(c.id, patch),
    );
  };

  return (
    <div className={cx(variant === "drawer" ? "p-5 min-[900px]:p-7" : "")} data-testid="candidate-record" data-candidate-id={c.id}>
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start gap-4 rounded-[22px] border border-(--line) bg-(--card) p-5">
        <Avatar name={c.name} color={colorFor(c.id)} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <InlineField
              label="Name"
              value={c.name}
              onSave={(v) => v && save({ name: v })}
              className="text-[22px] font-bold tracking-[-0.01em]"
              inputClassName="h-10 text-[20px] font-bold"
            />
            <span className="tabular-nums text-(--muted)">#{String(c.seq).padStart(4, "0")}</span>
            <StatusPill status={c.status} />
            <TierChip tier={tierOf(c, data.settings)} />
          </div>
          <p className="mt-1 text-(--muted)">{[c.school, c.program].filter(Boolean).join(" · ") || "No school yet"}</p>
          <p className="mt-2 text-[13px]">
            <span className="text-(--muted)">Time with us so far </span>
            <span className="font-bold" data-testid="time-with-us">
              {formatDuration(spent)}
            </span>
            <span className="text-(--muted)">
              {" "}
              · {logged} of {ivs.length} interview{ivs.length === 1 ? "" : "s"} logged
            </span>
          </p>
        </div>
        {variant === "drawer" && (
          <div className="flex items-center gap-1">
            <Link
              href={`/crm/candidates/${c.id}`}
              onClick={closeDrawer}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-[13px] font-bold text-(--muted) hover:bg-(--card-2) hover:text-(--ink)"
            >
              <Icon name="external" size={14} /> Open record
            </Link>
            <Button variant="ghost" size="sm" onClick={closeDrawer} aria-label="Close drawer">
              <Icon name="x" size={16} />
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 min-[1000px]:grid-cols-[340px_minmax(0,1fr)]">
        <Attributes candidate={c} save={save} />
        <RecordTabs candidate={c} initialTab={initialTab} />
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[104px_minmax(0,1fr)] items-center gap-2 py-1.5">
      <span className="text-[13px] font-medium text-(--muted)">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-(--line) pt-4">
      <h3 className="mb-2 font-medium">{title}</h3>
      {children}
    </div>
  );
}

function Attributes({ candidate: c, save }: { candidate: Candidate; save: (p: Parameters<typeof updateCandidate>[1]) => unknown }) {
  const { data, mutate } = useCrm();

  return (
    <aside className="space-y-4 self-start rounded-[22px] border border-(--line) bg-(--card) p-5">
      <div>
        <Row label="Status">
          <select
            aria-label="Status"
            value={c.status}
            onChange={(e) => save({ status: e.target.value as Status })}
            className="h-8 w-full rounded-lg border border-(--line) bg-(--card) px-2"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Email">
          <InlineField
            label="Email"
            type="email"
            value={c.email}
            validate={emailOk}
            onSave={(v) => save({ email: v })}
            display={<a href={`mailto:${c.email}`} className="text-(--brand) hover:underline">{c.email}</a>}
          />
        </Row>
        <Row label="Instagram">
          <InlineField
            label="Instagram"
            value={c.instagramHandle}
            onSave={(v) => save({ instagramHandle: v })}
            display={
              <a
                href={`https://instagram.com/${encodeURIComponent(c.instagramHandle)}`}
                target="_blank"
                rel="noreferrer noopener"
                className="text-(--brand) hover:underline"
              >
                @{c.instagramHandle}
              </a>
            }
          />
        </Row>
        <Row label="Portfolio">
          <InlineField
            label="Portfolio"
            value={c.portfolioUrl}
            onSave={(v) => save({ portfolioUrl: v })}
            display={
              <a href={href(c.portfolioUrl)} target="_blank" rel="noreferrer noopener" className="text-(--brand) hover:underline">
                {c.portfolioUrl.replace(/^https?:\/\//, "")}
              </a>
            }
          />
        </Row>
        <Row label="Phone">
          <InlineField label="Phone" value={c.phone ?? ""} onSave={(v) => save({ phone: v || null })} />
        </Row>
        <Row label="School">
          <InlineField label="School" value={c.school} onSave={(v) => save({ school: v })} />
        </Row>
        <Row label="Major">
          <InlineField label="Major" value={c.major} onSave={(v) => save({ major: v })} />
        </Row>
        <Row label="Degree / year">
          <InlineField label="Degree / year" value={c.program} onSave={(v) => save({ program: v })} />
        </Row>

      </div>

      <FitRow candidate={c} save={save} />
      <Section title="Tier">
        <TierControl candidate={c} />
      </Section>
      <AreaChips candidate={c} kind="area" title="Areas" />
      <AreaChips candidate={c} kind="goal" title="Goals" />
      <Skills candidate={c} />
      <Suggestion
        candidate={c}
        areas={data.areas}
        benched={tierOf(c, data.settings) === "bench"}
        onAttach={(areaId) => attach(mutate, c.id, areaId)}
      />
    </aside>
  );
}

function attach(mutate: ReturnType<typeof useCrm>["mutate"], candidateId: string, areaId: string) {
  return mutate(
    patchCandidate(candidateId, (x) => ({ ...x, areaIds: x.areaIds.includes(areaId) ? x.areaIds : [...x.areaIds, areaId] })),
    () => attachArea(candidateId, areaId),
  );
}

function AreaChips({ candidate: c, kind, title }: { candidate: Candidate; kind: AreaKind; title: string }) {
  const { data, mutate } = useCrm();
  const all = data.areas.filter((a) => a.kind === kind);
  const attached = all.filter((a) => c.areaIds.includes(a.id));
  const benched = tierOf(c, data.settings) === "bench";
  // Benched candidates can only be attached to small jobs (goals are unaffected).
  const available = all.filter((a) => !c.areaIds.includes(a.id) && (kind === "goal" || !benched || a.level === "small"));

  return (
    <Section title={title}>
      <div className="flex flex-wrap items-center gap-1.5" data-testid={`${kind}-chips`}>
        {attached.map((a) => (
          <Chip
            key={a.id}
            removeLabel={`Remove ${a.name}`}
            onRemove={() =>
              mutate(
                patchCandidate(c.id, (x) => ({ ...x, areaIds: x.areaIds.filter((id) => id !== a.id) })),
                () => detachArea(c.id, a.id),
              )
            }
          >
            {a.name}
            {a.level === "small" && <span className="ml-1 text-[11px] text-(--muted)">small</span>}
          </Chip>
        ))}
        {available.length > 0 && (
          <select
            aria-label={`Attach ${kind}`}
            value=""
            onChange={(e) => e.target.value && attach(mutate, c.id, e.target.value)}
            className="h-7 rounded-full border border-dashed border-(--line) bg-transparent px-2 text-[13px] font-medium text-(--muted)"
          >
            <option value="">+ Attach</option>
            {available.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        )}
        {!attached.length && !available.length && <span className="text-[13px] text-(--muted)">None defined yet.</span>}
      </div>
    </Section>
  );
}

function Skills({ candidate: c }: { candidate: Candidate }) {
  const { mutate } = useCrm();
  const [name, setName] = useState("");
  const [score, setScore] = useState("7");
  const scoreOk = (v: string) => (/^\d+$/.test(v) && +v >= 1 && +v <= 10 ? null : "1–10");

  const add = async () => {
    const skill = name.trim();
    const n = Number(score);
    if (!skill || scoreOk(score)) return;
    setName("");
    const temp = { id: crypto.randomUUID(), skill, score: n };
    await mutate(
      patchCandidate(c.id, (x) => ({ ...x, skills: [...x.skills, temp].sort((a, b) => b.score - a.score) })),
      () => addSkill(c.id, { skill, score: n }),
    );
  };

  return (
    <Section title="Best at">
      <ul className="space-y-2.5" data-testid="skills">
        {c.skills.map((s) => (
          <li key={s.id}>
            <div className="flex items-center gap-2">
              <InlineField
                label="Skill name"
                value={s.skill}
                className="flex-1 font-medium"
                onSave={(v) =>
                  v &&
                  mutate(
                    patchCandidate(c.id, (x) => ({ ...x, skills: x.skills.map((k) => (k.id === s.id ? { ...k, skill: v } : k)) })),
                    () => updateSkill(s.id, { skill: v }),
                  )
                }
              />
              <InlineField
                label="Skill score"
                type="number"
                value={String(s.score)}
                validate={scoreOk}
                className="w-12 justify-end tabular-nums text-(--muted)"
                onSave={(v) =>
                  mutate(
                    patchCandidate(c.id, (x) => ({ ...x, skills: x.skills.map((k) => (k.id === s.id ? { ...k, score: +v } : k)) })),
                    () => updateSkill(s.id, { score: +v }),
                  )
                }
              />
              <button
                type="button"
                aria-label={`Remove ${s.skill}`}
                onClick={() =>
                  mutate(patchCandidate(c.id, (x) => ({ ...x, skills: x.skills.filter((k) => k.id !== s.id) })), () => removeSkill(s.id))
                }
                className="grid size-6 place-items-center rounded-full text-(--muted) hover:bg-(--card-2) hover:text-(--ink)"
              >
                <Icon name="x" size={12} />
              </button>
            </div>
            <div className="crm-bar mt-1">
              <span style={{ width: `${s.score * 10}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add a skill" aria-label="New skill" className={`${inputClass} h-9 flex-1`} />
        <input
          value={score}
          onChange={(e) => setScore(e.target.value)}
          inputMode="numeric"
          aria-label="New skill score"
          className={`${inputClass} h-9 !w-16 flex-none text-center`}
        />
        <Button type="submit" size="sm" className="h-9" disabled={!name.trim() || !!scoreOk(score)}>
          Add
        </Button>
      </form>
    </Section>
  );
}

function Suggestion({
  candidate,
  areas,
  benched,
  onAttach,
}: {
  candidate: Candidate;
  areas: CrmData["areas"];
  benched: boolean;
  onAttach: (areaId: string) => void;
}) {
  // Benched candidates get the best small job.
  const best = suggestArea(candidate, areas, benched);
  if (!best) return null;
  const attached = candidate.areaIds.includes(best.id);
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-(--card-2) px-4 py-3" data-testid="suggestion">
      <p className="min-w-0 flex-1 text-[13px]">
        Looks best suited to <span className="font-bold">{best.name}</span>
      </p>
      {attached ? (
        <span className="inline-flex items-center gap-1 text-[13px] font-medium text-(--muted)">
          <Icon name="check" size={14} /> Attached
        </span>
      ) : (
        <Button size="sm" variant="primary" onClick={() => onAttach(best.id)}>
          Attach
        </Button>
      )}
    </div>
  );
}

function FitRow({ candidate: c, save }: { candidate: Candidate; save: (p: Parameters<typeof updateCandidate>[1]) => unknown }) {
  const { data } = useCrm();
  const rank = rankMap(data.candidates).get(c.id);
  const scored = scoredInterviews(c.id, data.interviews);
  const avg = interviewAverage(scored);
  return (
    <div className="border-t border-(--line) pt-4" data-testid="fit-row">
      <div className="flex items-baseline gap-2">
        <span className="text-[40px] font-bold leading-none tracking-[-0.03em] tabular-nums" data-testid="fit-value">
          {c.fit.toFixed(1)}
        </span>
        <span className="text-[13px] text-(--muted)">
          / 10 · #{rank} of {data.candidates.length} · tap a number to set it
        </span>
      </div>
      <div className="mt-3 grid grid-cols-10 gap-1" role="radiogroup" aria-label="Fit">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const on = Math.round(c.fit) === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`Fit ${n}`}
              onClick={() => n !== c.fit && save({ fit: n })}
              className={cx(
                "h-8 rounded-lg text-[13px] font-bold tabular-nums transition-colors",
                on ? "bg-(--brand) text-white" : "bg-(--card-2) text-(--muted) hover:text-(--ink)",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[13px] text-(--muted)" data-testid="fit-average">
        {avg == null ? (
          "No scored interviews yet — scoring one sets the fit to the average."
        ) : (
          <>
            Interviews average <span className="font-bold text-(--ink)">{avg}</span> ({scored.length} scored) ·{" "}
            {avg === c.fit ? (
              "matches"
            ) : (
              <button type="button" onClick={() => save({ fit: avg })} className="font-bold text-(--brand)">
                use {avg}
              </button>
            )}
          </>
        )}
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { addSkill, attachArea, detachArea, removeSkill, updateCandidate, updateSkill } from "../lib/actions";
import { colorFor } from "../lib/colors";
import { interviewAverage, rankMap, scoredInterviews, tierOf } from "../lib/ranking";
import { suggestArea } from "../lib/suggest";
import { formatDuration } from "../lib/time";
import { STATUSES, STATUS_LABEL, type AreaKind, type Candidate, type CrmData, type Status } from "../lib/types";
import { TierChip } from "./bits";
import { candidateInterviews, timeSpent } from "./derive";
import { Avatar, Chip, Icon, InlineField, StatusPill, cx } from "./primitives";
import { TierControl } from "./RankingsPanel";
import { RecordTabs } from "./RecordTabs";
import { useCrm, type RecordTab } from "./store";

export function patchCandidate(id: string, fn: (c: Candidate) => Candidate) {
  return (d: CrmData): CrmData => ({ ...d, candidates: d.candidates.map((c) => (c.id === id ? fn(c) : c)) });
}

const emailOk = (v: string) => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "Enter a valid email");
const href = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

type Save = (p: Parameters<typeof updateCandidate>[1]) => unknown;

/** The candidate record: .d-head + .d-body (290px .d-attrs column, then .d-main tabs). */
export function CandidateRecord({ candidateId, initialTab = "notes", variant }: { candidateId: string; initialTab?: RecordTab; variant: "page" | "drawer" }) {
  const { data, mutate, closeDrawer } = useCrm();
  const c = data.candidates.find((x) => x.id === candidateId);

  if (!c) {
    return (
      <div className="d-head">
        <p>Loading candidate…</p>
        {variant === "drawer" && (
          <button type="button" className="open-btn close" onClick={closeDrawer} aria-label="Close drawer">
            <Icon name="x" />
          </button>
        )}
      </div>
    );
  }

  const ivs = candidateInterviews(data, c.id);
  const spent = timeSpent(ivs);
  const logged = ivs.filter((iv) => iv.actualMinutes != null).length;
  const save: Save = (patch) => {
    const { summary, ...fields } = patch;
    return mutate(
      patchCandidate(c.id, (x) => ({ ...x, ...fields, ...(summary !== undefined ? { resumeJson: { ...x.resumeJson, summary } } : {}) }) as Candidate),
      () => updateCandidate(c.id, patch),
    );
  };

  const body = (
    <>
      <div className="d-head">
        <Avatar name={c.name} color={colorFor(c.id)} size={52} radius="16px" className="avatar" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 className="flex min-w-0 flex-wrap items-center gap-x-2">
            <InlineField label="Name" value={c.name} onSave={(v) => v && save({ name: v })} className="attr min-w-0" inputClassName="txt font-bold" />
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--muted)" }}>#{String(c.seq).padStart(4, "0")}</span>
            <StatusPill status={c.status} />
            <TierChip tier={tierOf(c, data.settings)} />
          </h3>
          <p className="one-line">
            {[c.school, c.program].filter(Boolean).join(" · ") || "No school yet"} · Time with us{" "}
            <b style={{ color: "var(--ink)" }} data-testid="time-with-us">
              {formatDuration(spent)}
            </b>{" "}
            · {logged} of {ivs.length} interview{ivs.length === 1 ? "" : "s"} logged
          </p>
        </div>
        {variant === "drawer" && (
          <>
            <Link href={`/crm/candidates/${c.id}`} onClick={closeDrawer} className="pill-btn" style={{ marginLeft: "auto" }}>
              <Icon name="external" /> Open
            </Link>
            <button type="button" className="open-btn" onClick={closeDrawer} aria-label="Close drawer">
              <Icon name="x" />
            </button>
          </>
        )}
      </div>
      <div className="d-body">
        <Attributes candidate={c} save={save} />
        <div className="d-main">
          <RecordTabs candidate={c} initialTab={initialTab} />
        </div>
      </div>
    </>
  );

  if (variant === "drawer") {
    return (
      <div className="flex min-h-0 flex-1 flex-col" data-testid="candidate-record" data-candidate-id={c.id}>
        {body}
      </div>
    );
  }
  return (
    <section className="card" style={{ padding: 0, overflow: "hidden" }} data-testid="candidate-record" data-candidate-id={c.id}>
      {body}
    </section>
  );
}

function Attr({ k, children, wide }: { k: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cx("attr", wide && "wide")}>
      <span className="k">{k}</span>
      <div className="v">{children}</div>
    </div>
  );
}

function Attributes({ candidate: c, save }: { candidate: Candidate; save: Save }) {
  const { data, mutate } = useCrm();
  const benched = tierOf(c, data.settings) === "bench";

  return (
    <div className="d-attrs" data-testid="attributes">
      <Attr k="Status">
        <select aria-label="Status" value={c.status} onChange={(e) => save({ status: e.target.value as Status })} className="inline">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </Attr>
      <Attr k="Email">
        <InlineField label="Email" type="email" value={c.email} validate={emailOk} onSave={(v) => save({ email: v })} display={<a href={`mailto:${c.email}`}>{c.email}</a>} />
      </Attr>
      <Attr k="Instagram">
        <InlineField
          label="Instagram"
          value={c.instagramHandle}
          onSave={(v) => save({ instagramHandle: v })}
          display={
            <a href={`https://instagram.com/${encodeURIComponent(c.instagramHandle)}`} target="_blank" rel="noreferrer noopener">
              @{c.instagramHandle}
            </a>
          }
        />
      </Attr>
      <Attr k="Portfolio">
        <InlineField
          label="Portfolio"
          value={c.portfolioUrl}
          onSave={(v) => save({ portfolioUrl: v })}
          display={
            <a href={href(c.portfolioUrl)} target="_blank" rel="noreferrer noopener">
              {c.portfolioUrl.replace(/^https?:\/\//, "")}
            </a>
          }
        />
      </Attr>
      <Attr k="Phone">
        <InlineField label="Phone" value={c.phone ?? ""} onSave={(v) => save({ phone: v || null })} />
      </Attr>
      <Attr k="School">
        <InlineField label="School" value={c.school} onSave={(v) => save({ school: v })} />
      </Attr>
      <Attr k="Major">
        <InlineField label="Major" value={c.major} onSave={(v) => save({ major: v })} />
      </Attr>
      <Attr k="Degree / year">
        <InlineField label="Degree / year" value={c.program} onSave={(v) => save({ program: v })} />
      </Attr>
      <FitRow candidate={c} save={save} />
      <Attr k="Tier" wide>
        <TierControl candidate={c} />
      </Attr>
      <AreaChips candidate={c} kind="area" title="Areas" benched={benched} />
      <AreaChips candidate={c} kind="goal" title="Goals" benched={benched} />
      <Skills candidate={c} />
      <Suggestion candidate={c} areas={data.areas} benched={benched} onAttach={(areaId) => attach(mutate, c.id, areaId)} />
    </div>
  );
}

function attach(mutate: ReturnType<typeof useCrm>["mutate"], candidateId: string, areaId: string) {
  return mutate(
    patchCandidate(candidateId, (x) => ({ ...x, areaIds: x.areaIds.includes(areaId) ? x.areaIds : [...x.areaIds, areaId] })),
    () => attachArea(candidateId, areaId),
  );
}

function AreaChips({ candidate: c, kind, title, benched }: { candidate: Candidate; kind: AreaKind; title: string; benched: boolean }) {
  const { data, mutate } = useCrm();
  const all = data.areas.filter((a) => a.kind === kind);
  const attached = all.filter((a) => c.areaIds.includes(a.id));
  // Benched candidates can only be attached to small jobs (goals are unaffected).
  const available = all.filter((a) => !c.areaIds.includes(a.id) && (kind === "goal" || !benched || a.level === "small"));

  return (
    <Attr k={title} wide>
      <div className="chips" data-testid={`${kind}-chips`}>
        {attached.map((a) => (
          <Chip
            key={a.id}
            variant={kind}
            removeLabel={`Remove ${a.name}`}
            onRemove={() => mutate(patchCandidate(c.id, (x) => ({ ...x, areaIds: x.areaIds.filter((id) => id !== a.id) })), () => detachArea(c.id, a.id))}
          >
            {a.name}
            {a.level === "small" && " · small"}
          </Chip>
        ))}
        {available.length > 0 && (
          <select aria-label={`Attach ${kind}`} value="" onChange={(e) => e.target.value && attach(mutate, c.id, e.target.value)} className="chip add">
            <option value="">+ Attach</option>
            {available.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        )}
        {!attached.length && !available.length && <span style={{ color: "var(--muted)", fontSize: 12 }}>None defined yet.</span>}
      </div>
    </Attr>
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
    await mutate(patchCandidate(c.id, (x) => ({ ...x, skills: [...x.skills, temp].sort((a, b) => b.score - a.score) })), () => addSkill(c.id, { skill, score: n }));
  };

  return (
    <Attr k="Best at" wide>
      <div data-testid="skills">
        {c.skills.map((s) => (
          <div key={s.id} className="skill">
            <InlineField
              label="Skill name"
              value={s.skill}
              inputClassName=""
              onSave={(v) =>
                v &&
                mutate(patchCandidate(c.id, (x) => ({ ...x, skills: x.skills.map((k) => (k.id === s.id ? { ...k, skill: v } : k)) })), () => updateSkill(s.id, { skill: v }))
              }
            />
            <InlineField
              label="Skill score"
              type="number"
              value={String(s.score)}
              validate={scoreOk}
              inputClassName="sc"
              onSave={(v) => mutate(patchCandidate(c.id, (x) => ({ ...x, skills: x.skills.map((k) => (k.id === s.id ? { ...k, score: +v } : k)) })), () => updateSkill(s.id, { score: +v }))}
            />
            <button
              type="button"
              className="rm"
              aria-label={`Remove ${s.skill}`}
              onClick={() => mutate(patchCandidate(c.id, (x) => ({ ...x, skills: x.skills.filter((k) => k.id !== s.id) })), () => removeSkill(s.id))}
            >
              ×
            </button>
            <span className="track">
              <i style={{ width: `${s.score * 10}%` }} />
            </span>
          </div>
        ))}
        <form
          className="skill"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="+ Add a skill" aria-label="New skill" />
          <input value={score} onChange={(e) => setScore(e.target.value)} inputMode="numeric" aria-label="New skill score" className="sc" />
          <button type="submit" className="rm" aria-label="Add skill" disabled={!name.trim() || !!scoreOk(score)} style={{ color: "var(--brand)" }}>
            +
          </button>
        </form>
      </div>
    </Attr>
  );
}

function Suggestion({ candidate, areas, benched, onAttach }: { candidate: Candidate; areas: CrmData["areas"]; benched: boolean; onAttach: (areaId: string) => void }) {
  // Benched candidates get the best small job.
  const best = suggestArea(candidate, areas, benched);
  if (!best) return null;
  const attached = candidate.areaIds.includes(best.id);
  return (
    <div className="suggest" data-testid="suggestion">
      <span className="wrap-any">
        Looks best suited to <b>{best.name}</b>
      </span>
      {attached ? <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>✓ Attached</span> : <button type="button" onClick={() => onAttach(best.id)}>Attach</button>}
    </div>
  );
}

function FitRow({ candidate: c, save }: { candidate: Candidate; save: Save }) {
  const { data } = useCrm();
  const rank = rankMap(data.candidates).get(c.id);
  const scored = scoredInterviews(c.id, data.interviews);
  const avg = interviewAverage(scored);
  return (
    <div className="attr wide" data-testid="fit-row">
      <span className="k">Fit</span>
      <div className="v">
        <div className="flex items-baseline gap-2">
          <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1, whiteSpace: "nowrap", flex: "none" }} data-testid="fit-value">
            {c.fit.toFixed(1)}
          </span>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            / 10 · #{rank} of {data.candidates.length} · tap a number to set it
          </span>
        </div>
        <div className="ten" role="radiogroup" aria-label="Fit" style={{ marginTop: 8 }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" role="radio" aria-checked={Math.round(c.fit) === n} aria-label={`Fit ${n}`} className={Math.round(c.fit) === n ? "on" : undefined} onClick={() => n !== c.fit && save({ fit: n })}>
              {n}
            </button>
          ))}
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--muted)" }} data-testid="fit-average">
          {avg == null ? (
            "No scored interviews yet — scoring one sets the fit to the average."
          ) : (
            <>
              Interviews average <b style={{ color: "var(--ink)" }}>{avg}</b> ({scored.length} scored) ·{" "}
              {avg === c.fit ? (
                "matches"
              ) : (
                <button type="button" className="link" onClick={() => save({ fit: avg })}>
                  use {avg}
                </button>
              )}
            </>
          )}
        </p>
      </div>
    </div>
  );
}

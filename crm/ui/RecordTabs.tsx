"use client";

import Link from "next/link";
import { useState } from "react";
import { addNote, cancelInterview, deleteNote, logInterview, scheduleInterview, setResumeFile } from "../lib/actions";
import { firstName, tierOf } from "../lib/ranking";
import { findClash, interviewPhase, plannedMinutes, type Phase } from "../lib/rules";
import { supabaseBrowser } from "../lib/supabase/browser";
import { formatDay, fromMin, relativeTime, toMin } from "../lib/time";
import { INTERVIEW_TYPES, INTERVIEW_TYPE_LABEL, type Candidate, type Interview, type InterviewType } from "../lib/types";
import { candidateInterviews } from "./derive";
import { Button, Icon, Segmented, cx } from "./primitives";
import { useClock, useCrm, type RecordTab } from "./store";
import { TaskCard } from "./Tasks";

export function RecordTabs({ candidate, initialTab }: { candidate: Candidate; initialTab: RecordTab }) {
  const { data } = useCrm();
  const [tab, setTab] = useState<RecordTab>(initialTab);
  const counts = {
    notes: data.notes.filter((n) => n.candidateId === candidate.id).length,
    interviews: candidateInterviews(data, candidate.id).length,
    assignments: data.tasks.filter((t) => t.candidateId === candidate.id && t.status !== "done").length,
  };
  const tabs: { value: RecordTab; label: string; count?: number }[] = [
    { value: "notes", label: "Notes", count: counts.notes },
    { value: "interviews", label: "Interviews", count: counts.interviews },
    { value: "assignments", label: "Assignments", count: counts.assignments },
    { value: "resume", label: "Resume" },
  ];

  return (
    <div>
      <div role="tablist" aria-label="Record" className="d-tabs" style={{ maxWidth: "100%", overflowX: "auto" }}>
        {tabs.map((t) => (
          <button key={t.value} role="tab" type="button" aria-selected={tab === t.value} onClick={() => setTab(t.value)} className={cx(tab === t.value && "on", "whitespace-nowrap")}>
            {t.label}
            {t.count != null && <span style={{ marginLeft: 6, fontSize: 11, color: "var(--muted)" }}>{t.count}</span>}
          </button>
        ))}
      </div>
      {tab === "notes" && <Notes candidate={candidate} />}
      {tab === "interviews" && <Interviews candidate={candidate} />}
      {tab === "assignments" && <Assignments candidate={candidate} />}
      {tab === "resume" && <Resume candidate={candidate} />}
    </div>
  );
}

// ─── Notes ─────────────────────────────────────────────────────────────────

function Notes({ candidate }: { candidate: Candidate }) {
  const { data, mutate } = useCrm();
  const [body, setBody] = useState("");
  const notes = data.notes.filter((n) => n.candidateId === candidate.id);
  const byId = new Map(data.interviewers.map((i) => [i.id, i]));

  const submit = async () => {
    const text = body.trim();
    if (!text) return;
    setBody("");
    const temp = { id: crypto.randomUUID(), candidateId: candidate.id, authorId: data.me.id, body: text, createdAt: new Date().toISOString() };
    const res = await mutate((d) => ({ ...d, notes: [temp, ...d.notes] }), () => addNote(candidate.id, text));
    if (!res.ok) setBody(text);
  };

  return (
    <div>
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          placeholder={`What do you think of ${firstName(candidate.name)}? Visible to all interviewers.`}
          aria-label="New note"
        />
        <div className="r">
          <Button type="submit" variant="primary" disabled={!body.trim()}>
            Add note
          </Button>
        </div>
      </form>
      <div style={{ marginTop: 14 }} data-testid="notes">
        {notes.map((n) => {
          const author = byId.get(n.authorId);
          return (
            <div key={n.id} className="nt" data-testid="note">
              <button
                type="button"
                className="rm"
                aria-label="Delete note"
                title="Delete note"
                onClick={() => mutate((d) => ({ ...d, notes: d.notes.filter((x) => x.id !== n.id) }), () => deleteNote(n.id), "Note deleted")}
              >
                ×
              </button>
              <div className="m" style={{ paddingRight: 20 }}>
                <b>{author?.name ?? "Former interviewer"}</b>
                <span suppressHydrationWarning>{relativeTime(n.createdAt)}</span>
              </div>
              <p className="wrap-any" style={{ whiteSpace: "pre-wrap" }}>
                {n.body}
              </p>
            </div>
          );
        })}
        {!notes.length && <div className="empty">No notes yet.</div>}
      </div>
    </div>
  );
}

// ─── Interviews ────────────────────────────────────────────────────────────

const PHASE_LABEL: Record<Phase, string> = { past: "Done", live: "Live", upcoming: "Upcoming" };

function Interviews({ candidate }: { candidate: Candidate }) {
  const { data } = useCrm();
  const clock = useClock();
  const ivs = candidateInterviews(data, candidate.id).sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  const byId = new Map(data.interviewers.map((i) => [i.id, i]));

  return (
    <div>
      <div data-testid="interviews">
        {ivs.map((iv) => {
          const phase = clock ? interviewPhase(iv, clock.today, clock.nowMin) : iv.date < data.today ? "past" : "upcoming";
          const who = byId.get(iv.interviewerId);
          const [wd, md] = formatDay(iv.date).split(", ");
          return (
            <div key={iv.id} className="iv" data-testid="interview-item" data-phase={phase}>
              <div className="d">
                {wd}
                <b>{md}</b>
              </div>
              <div className="x" style={{ minWidth: 0 }}>
                <span className="one-line" style={{ display: "block", fontWeight: 700 }}>
                  {INTERVIEW_TYPE_LABEL[iv.type]} · {formatDay(iv.date)}, {iv.startTime}–{iv.endTime}
                </span>
                <small className="one-line">
                  {who ? `with ${who.name}` : ""}
                  {iv.location ? ` · ${iv.location}` : ""} · <span style={{ color: phase === "live" ? "var(--hi)" : undefined, fontWeight: phase === "live" ? 700 : 400 }}>{PHASE_LABEL[phase]}</span>
                </small>
              </div>
              {phase === "upcoming" ? <CancelButton interview={iv} /> : <span />}
              {phase !== "upcoming" && <LogRow key={`${iv.id}:${iv.actualMinutes}:${iv.debrief}:${iv.score}`} interview={iv} />}
            </div>
          );
        })}
        {!ivs.length && <div className="empty">No interviews yet.</div>}
      </div>
      <h4 style={{ margin: "16px 0 8px", fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Schedule an interview</h4>
      <ScheduleForm candidate={candidate} />
    </div>
  );
}

function CancelButton({ interview }: { interview: Interview }) {
  const { mutate } = useCrm();
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button type="button" className="rm" onClick={() => setConfirming(true)}>
        Cancel
      </button>
    );
  }
  return (
    <span className="flex gap-2">
      <button
        type="button"
        className="rm"
        style={{ color: "var(--hi)", fontWeight: 700 }}
        onClick={() => mutate((d) => ({ ...d, interviews: d.interviews.filter((x) => x.id !== interview.id) }), () => cancelInterview(interview.id), "Interview cancelled")}
      >
        Confirm cancel
      </button>
      <button type="button" className="rm" onClick={() => setConfirming(false)}>
        Keep
      </button>
    </span>
  );
}

function LogRow({ interview: iv }: { interview: Interview }) {
  const { mutate } = useCrm();
  const [minutes, setMinutes] = useState(iv.actualMinutes != null ? String(iv.actualMinutes) : "");
  const [score, setScore] = useState(iv.score != null ? String(iv.score) : "");
  const [debrief, setDebrief] = useState(iv.debrief ?? "");
  const minutesOk = minutes === "" || (/^\d+$/.test(minutes) && +minutes >= 1 && +minutes <= 600);
  const scoreOk = score === "" || (/^\d+$/.test(score) && +score >= 1 && +score <= 10);
  const dirty = minutes !== (iv.actualMinutes != null ? String(iv.actualMinutes) : "") || debrief !== (iv.debrief ?? "") || score !== (iv.score != null ? String(iv.score) : "");

  const save = () => {
    if (!dirty || !minutesOk || !scoreOk) return;
    const actualMinutes = minutes === "" ? null : Number(minutes);
    const newScore = score === "" ? null : Number(score);
    const scoreChanged = newScore !== iv.score;
    mutate(
      (d) => {
        const current = d.candidates.find((c) => c.id === iv.candidateId);
        const interviews = d.interviews.map((x) =>
          x.id === iv.id ? { ...x, actualMinutes, debrief: debrief || null, score: newScore, fitBefore: newScore == null ? null : (x.fitBefore ?? current?.fit ?? null) } : x,
        );
        // Same rule as the server: fit moves to the average of scored interviews and the override clears.
        const scores = interviews.filter((x) => x.candidateId === iv.candidateId && x.score != null).map((x) => x.score!);
        const candidates =
          scoreChanged && scores.length
            ? d.candidates.map((c) => (c.id === iv.candidateId ? { ...c, fit: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10, tierOverride: null } : c))
            : d.candidates;
        return { ...d, interviews, candidates };
      },
      () => logInterview(iv.id, { actualMinutes, debrief, ...(scoreChanged ? { score: newScore } : {}) }),
      scoreChanged && newScore != null ? "Scored — rankings updated" : "Interview logged",
    );
  };

  return (
    <form
      className="log"
      style={{ gridTemplateColumns: "auto auto 1fr auto" }}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      data-testid="log-row"
    >
      <label className="took" style={!minutesOk ? { outline: "1px solid var(--hi)" } : undefined}>
        took
        <input value={minutes} onChange={(e) => setMinutes(e.target.value)} inputMode="numeric" placeholder={String(plannedMinutes(iv))} aria-label="Minutes it took" />
        min
      </label>
      <label className="took" style={!scoreOk ? { outline: "1px solid var(--hi)" } : undefined}>
        score
        <input value={score} onChange={(e) => setScore(e.target.value)} inputMode="numeric" placeholder="–" aria-label="Score 1–10" style={{ width: 24 }} />
        /10
      </label>
      <input className="txt" value={debrief} onChange={(e) => setDebrief(e.target.value)} placeholder="One line on how it went" aria-label="Debrief" maxLength={280} />
      <Button type="submit" size="sm" disabled={!dirty || !minutesOk || !scoreOk}>
        Save
      </Button>
    </form>
  );
}

function nextHalfHour(nowMin: number | null) {
  if (nowMin == null) return "10:00";
  const m = Math.min(Math.ceil((nowMin + 1) / 30) * 30, 23 * 60);
  return fromMin(m);
}

/** .form scheduler with the overlap check. `bare` = used in the schedule card's modal. */
export function ScheduleForm({ candidate, bare = false, onDone, defaultDate }: { candidate?: Candidate; bare?: boolean; onDone?: () => void; defaultDate?: string }) {
  const { data, mutate } = useCrm();
  const clock = useClock();
  const schedulable = data.candidates.filter((c) => tierOf(c, data.settings) !== "bench");
  const [candidateId, setCandidateId] = useState(candidate && schedulable.some((c) => c.id === candidate.id) ? candidate.id : (schedulable[0]?.id ?? ""));
  const [interviewerId, setInterviewerId] = useState(data.me.id);
  const [date, setDate] = useState(defaultDate ?? data.today);
  const [start, setStart] = useState(() => nextHalfHour(clock?.nowMin ?? null));
  const [length, setLength] = useState<30 | 45 | 60>(45);
  const [type, setType] = useState<InterviewType>("intro");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!candidateId) return setError("Pick a candidate.");
    const end = fromMin(toMin(start) + length);
    // Same rule as the server, checked first so the message is instant.
    const clash = findClash({ interviewerId, date, startTime: start, endTime: end }, data.interviews);
    if (clash) {
      const who = data.interviewers.find((i) => i.id === clash.interviewerId)?.name;
      const cand = data.candidates.find((c) => c.id === clash.candidateId)?.name;
      setError(`${who} already has ${cand} (${INTERVIEW_TYPE_LABEL[clash.type]}) ${clash.startTime}–${clash.endTime} on ${formatDay(date)}.`);
      return;
    }
    const temp: Interview = {
      id: crypto.randomUUID(),
      candidateId,
      interviewerId,
      date,
      startTime: start,
      endTime: end,
      type,
      location: location || null,
      actualMinutes: null,
      score: null,
      fitBefore: null,
      debrief: null,
    };
    const res = await mutate(
      (d) => ({
        ...d,
        interviews: [...d.interviews, temp],
        candidates: d.candidates.map((c) => (c.id === candidateId && c.status === "new" ? { ...c, status: "queued" } : c)),
      }),
      () => scheduleInterview({ candidateId, interviewerId, date, start, length, type, location }),
      "Interview scheduled",
    );
    if (!res.ok) setError(res.error);
    else {
      setLocation("");
      onDone?.();
    }
  };

  const benchedHere = candidate && tierOf(candidate, data.settings) === "bench" && !bare;
  return (
    <form
      className="form"
      style={bare ? undefined : { background: "var(--card-2)", borderRadius: 14, padding: "12px 14px" }}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      data-testid="schedule-form"
    >
      {benchedHere && (
        <p className="late" style={{ gridColumn: "1/-1", margin: 0 }} data-testid="benched-note">
          {firstName(candidate.name)} is benched — change their tier in Rankings first.
        </p>
      )}
      <label>
        Candidate
        <select className="field" aria-label="Candidate" value={candidateId} onChange={(e) => setCandidateId(e.target.value)}>
          {schedulable.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Interviewer
        <select className="field" aria-label="Interviewer" value={interviewerId} onChange={(e) => setInterviewerId(e.target.value)}>
          {data.interviewers.filter((i) => !i.removed || i.id === interviewerId).map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Date
        <input className="field" aria-label="Date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label>
        Start
        <input className="field" aria-label="Start" type="time" required step={300} value={start} onChange={(e) => setStart(e.target.value)} />
      </label>
      <label>
        Length
        <Segmented
          label="Length"
          value={length}
          onChange={setLength}
          options={[
            { value: 30, label: "30 min" },
            { value: 45, label: "45 min" },
            { value: 60, label: "60 min" },
          ]}
        />
      </label>
      <label>
        Type
        <select className="field" aria-label="Type" value={type} onChange={(e) => setType(e.target.value as InterviewType)}>
          {INTERVIEW_TYPES.map((t) => (
            <option key={t} value={t}>
              {INTERVIEW_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </label>
      <label className="wide">
        Location (optional)
        <input className="field" aria-label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Room or call link" />
      </label>
      {error && (
        <p className="late wrap-any" style={{ gridColumn: "1/-1", margin: 0, fontSize: 13 }} role="alert" data-testid="schedule-error">
          {error}
        </p>
      )}
      <div className="r">
        <Button type="submit" variant="primary">
          Schedule
        </Button>
      </div>
    </form>
  );
}

// ─── Assignments ───────────────────────────────────────────────────────────

function Assignments({ candidate }: { candidate: Candidate }) {
  const { data, openAssign, closeDrawer } = useCrm();
  const tasks = data.tasks
    .filter((t) => t.candidateId === candidate.id)
    .sort((a, b) => Number(a.status === "done") - Number(b.status === "done") || a.day.localeCompare(b.day));
  return (
    <div data-testid="record-assignments">
      <div className="flex flex-wrap gap-2" style={{ marginBottom: 12 }}>
        <Button variant="primary" size="sm" onClick={() => openAssign({ candidateId: candidate.id })}>
          Assign task
        </Button>
        <Link href={`/crm/me?as=${candidate.id}`} onClick={closeDrawer} className="btn-ghost sm" style={{ display: "inline-flex", alignItems: "center" }}>
          See it as {firstName(candidate.name)}
        </Link>
      </div>
      <div className="tasks">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} showAssignee={false} clock />
        ))}
      </div>
      {!tasks.length && <div className="empty">No assignments yet.</div>}
    </div>
  );
}

// ─── Resume ────────────────────────────────────────────────────────────────

const MAX_PDF = 10 * 1024 * 1024;

function Resume({ candidate: c }: { candidate: Candidate }) {
  const { data, mutate, toast } = useCrm();
  const [busy, setBusy] = useState(false);
  const r = c.resumeJson;

  async function upload(file: File) {
    if (file.type !== "application/pdf") return toast("Resumes must be PDFs.", "warn");
    if (file.size > MAX_PDF) return toast("That PDF is over 10 MB.", "warn");
    setBusy(true);
    try {
      const path = `${c.id}/${crypto.randomUUID()}.pdf`;
      if (data.storage === "supabase" && data.realtime) {
        const { error } = await supabaseBrowser(data.realtime).storage.from("resumes").upload(path, file, { contentType: "application/pdf", upsert: false });
        if (error) throw new Error(error.message);
      } else {
        const body = new FormData();
        body.set("file", file);
        body.set("path", path);
        const res = await fetch(`/crm/api/resume/${c.id}`, { method: "POST", body });
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Upload failed");
      }
      await mutate(null, () => setResumeFile(c.id, path), "Resume uploaded");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed", "warn");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="resume">
      <div className="suggest" style={{ background: "var(--card-2)", color: "var(--ink)", marginBottom: 14 }}>
        <span className="flex min-w-0 items-center gap-2">
          <Icon name="file" size={16} />
          <span className="one-line">{c.resumeFileUrl ? "Resume PDF on file" : "No PDF uploaded"}</span>
        </span>
        <span className="flex flex-none gap-1.5">
          {c.resumeFileUrl && (
            <a href={`/crm/api/resume/${c.id}`} className="btn-ghost sm" style={{ display: "inline-flex", alignItems: "center", background: "var(--card)" }}>
              Download
            </a>
          )}
          <label className="btn-accent sm" style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
            {busy ? "Uploading…" : c.resumeFileUrl ? "Replace" : "Upload PDF"}
            <input
              type="file"
              accept="application/pdf"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) upload(f);
              }}
            />
          </label>
        </span>
      </div>
      {r.summary && (
        <>
          <h4>Summary</h4>
          <p className="wrap-any">{r.summary}</p>
        </>
      )}
      {r.experience.length > 0 && (
        <>
          <h4>Experience</h4>
          {r.experience.map((e, i) => (
            <div key={i} className="x">
              <b>
                {e.role} · {e.org}
              </b>
              <small>{e.years}</small>
              <ul>
                {e.bullets.map((b, j) => (
                  <li key={j} className="wrap-any">
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
      {r.education.length > 0 && (
        <>
          <h4>Education</h4>
          {r.education.map((e, i) => (
            <div key={i} className="x">
              <b>{e.school}</b>
              <small>
                {e.degree} · {e.years}
              </small>
            </div>
          ))}
        </>
      )}
      {r.skills.length > 0 && (
        <>
          <h4>Skills</h4>
          <div className="sk">
            {r.skills.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </>
      )}
      {!r.summary && !r.experience.length && !r.education.length && !r.skills.length && <p className="empty">No resume details yet. Upload a PDF to keep it on file.</p>}
    </div>
  );
}


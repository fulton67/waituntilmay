"use client";

import { useState } from "react";
import { addNote, cancelInterview, logInterview, scheduleInterview, setResumeFile } from "../lib/actions";
import { findClash, interviewPhase, plannedMinutes, type Phase } from "../lib/rules";
import { supabaseBrowser } from "../lib/supabase/browser";
import { formatDay, fromMin, relativeTime, toMin } from "../lib/time";
import { INTERVIEW_TYPES, INTERVIEW_TYPE_LABEL, type Candidate, type Interview, type InterviewType } from "../lib/types";
import Link from "next/link";
import { firstName, tierOf } from "../lib/ranking";
import { candidateInterviews } from "./derive";
import { TaskCard } from "./Tasks";
import { Avatar, Button, Field, Icon, Segmented, cx, inputClass, typeStyle } from "./primitives";
import { useClock, useCrm, type RecordTab } from "./store";

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
    <section className="min-w-0 rounded-[22px] border border-(--line) bg-(--card)">
      <div role="tablist" aria-label="Record" className="flex gap-1 border-b border-(--line) px-4 pt-3">
        {tabs.map((t) => (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={cx(
              "-mb-px inline-flex h-10 items-center gap-1.5 border-b-2 px-3 font-medium",
              tab === t.value ? "border-(--brand) text-(--ink)" : "border-transparent text-(--muted) hover:text-(--ink)",
            )}
          >
            {t.label}
            {t.count != null && <span className="text-[12px] tabular-nums text-(--muted)">{t.count}</span>}
          </button>
        ))}
      </div>
      <div className="p-5">
        {tab === "notes" && <Notes candidate={candidate} />}
        {tab === "interviews" && <Interviews candidate={candidate} />}
        {tab === "resume" && <Resume candidate={candidate} />}
        {tab === "assignments" && <Assignments candidate={candidate} />}
      </div>
    </section>
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
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="rounded-2xl border border-(--line) bg-(--card-2) p-3"
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          rows={3}
          placeholder={`What do you think of ${candidate.name.split(" ")[0]}?`}
          aria-label="New note"
          className="w-full resize-y bg-transparent outline-none placeholder:text-(--muted)"
        />
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-(--muted)">Visible to all interviewers · Ctrl+Enter to post</span>
          <Button type="submit" variant="primary" size="sm" disabled={!body.trim()}>
            Add note
          </Button>
        </div>
      </form>
      <ul className="mt-4 space-y-3" data-testid="notes">
        {notes.map((n) => {
          const author = byId.get(n.authorId);
          return (
            <li key={n.id} className="flex gap-3">
              <Avatar name={author?.name ?? "?"} color={author?.color ?? "#ACB8F9"} size={30} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px]">
                  <span className="font-bold">{author?.name ?? "Former interviewer"}</span>{" "}
                  <span className="text-(--muted)" suppressHydrationWarning>
                    · {relativeTime(n.createdAt)}
                  </span>
                </p>
                <p className="mt-0.5 whitespace-pre-wrap">{n.body}</p>
              </div>
            </li>
          );
        })}
        {!notes.length && <li className="py-6 text-center text-(--muted)">No notes yet.</li>}
      </ul>
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
    <div className="space-y-5">
      <ul className="space-y-2.5" data-testid="interviews">
        {ivs.map((iv) => {
          const phase = clock ? interviewPhase(iv, clock.today, clock.nowMin) : iv.date < data.today ? "past" : "upcoming";
          const who = byId.get(iv.interviewerId);
          return (
            <li key={iv.id} className="rounded-2xl border border-(--line) p-3" data-testid="interview-item" data-phase={phase}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-lg px-2 py-1 text-[12px] font-bold" style={typeStyle(iv.type)}>
                  {INTERVIEW_TYPE_LABEL[iv.type]}
                </span>
                <span className="font-medium">
                  {formatDay(iv.date)}, {iv.startTime}–{iv.endTime}
                </span>
                {who && (
                  <span className="inline-flex items-center gap-1.5 text-(--muted)">
                    <Avatar name={who.name} color={who.color} size={20} /> {who.name}
                  </span>
                )}
                {iv.location && <span className="truncate text-[13px] text-(--muted)">{iv.location}</span>}
                <span
                  className={cx(
                    "ml-auto rounded-full px-2 py-0.5 text-[12px] font-medium",
                    phase === "live" ? "bg-(--highlight) text-(--highlight-ink)" : "bg-(--card-2) text-(--muted)",
                  )}
                >
                  {PHASE_LABEL[phase]}
                </span>
                {phase === "upcoming" && <CancelButton interview={iv} />}
              </div>
              {phase !== "upcoming" && <LogRow key={`${iv.id}:${iv.actualMinutes}:${iv.debrief}`} interview={iv} />}
            </li>
          );
        })}
        {!ivs.length && <li className="py-4 text-center text-(--muted)">No interviews yet.</li>}
      </ul>
      <ScheduleForm candidate={candidate} />
    </div>
  );
}

function CancelButton({ interview }: { interview: Interview }) {
  const { mutate } = useCrm();
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        Cancel
      </Button>
    );
  }
  return (
    <span className="inline-flex gap-1">
      <Button
        size="sm"
        onClick={() =>
          mutate((d) => ({ ...d, interviews: d.interviews.filter((x) => x.id !== interview.id) }), () => cancelInterview(interview.id), "Interview cancelled")
        }
      >
        Confirm cancel
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Keep
      </Button>
    </span>
  );
}

function LogRow({ interview: iv }: { interview: Interview }) {
  const { mutate } = useCrm();
  const [minutes, setMinutes] = useState(iv.actualMinutes != null ? String(iv.actualMinutes) : "");
  const [score, setScore] = useState(iv.score != null ? String(iv.score) : "");
  const scoreOk = score === "" || (/^\d+$/.test(score) && +score >= 1 && +score <= 10);
  const [debrief, setDebrief] = useState(iv.debrief ?? "");
  const dirty =
    minutes !== (iv.actualMinutes != null ? String(iv.actualMinutes) : "") ||
    debrief !== (iv.debrief ?? "") ||
    score !== (iv.score != null ? String(iv.score) : "");
  const minutesOk = minutes === "" || (/^\d+$/.test(minutes) && +minutes >= 1 && +minutes <= 600);

  const save = () => {
    if (!dirty || !minutesOk || !scoreOk) return;
    const actualMinutes = minutes === "" ? null : Number(minutes);
    const newScore = score === "" ? null : Number(score);
    const scoreChanged = newScore !== iv.score;
    mutate(
      (d) => {
        const current = d.candidates.find((c) => c.id === iv.candidateId);
        const interviews = d.interviews.map((x) =>
          x.id === iv.id
            ? { ...x, actualMinutes, debrief: debrief || null, score: newScore, fitBefore: newScore == null ? null : (x.fitBefore ?? current?.fit ?? null) }
            : x,
        );
        // Same rule as the server: fit moves to the average of scored interviews and the override clears.
        const scores = interviews.filter((x) => x.candidateId === iv.candidateId && x.score != null).map((x) => x.score!);
        const candidates =
          scoreChanged && scores.length
            ? d.candidates.map((c) =>
                c.id === iv.candidateId ? { ...c, fit: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10, tierOverride: null } : c,
              )
            : d.candidates;
        return { ...d, interviews, candidates };
      },
      () => logInterview(iv.id, { actualMinutes, debrief, ...(scoreChanged ? { score: newScore } : {}) }),
      scoreChanged && newScore != null ? "Scored — rankings updated" : "Interview logged",
    );
  };

  return (
    <form
      className="mt-3 flex flex-wrap items-center gap-2 border-t border-(--line) pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      data-testid="log-row"
    >
      <label className="inline-flex items-center gap-2 text-[13px] text-(--muted)">
        took
        <input
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          inputMode="numeric"
          placeholder={String(plannedMinutes(iv))}
          aria-label="Minutes it took"
          className={cx(inputClass, "h-8 w-16 text-center text-(--ink)", !minutesOk && "border-(--highlight)")}
        />
        min
      </label>
      <label className="inline-flex items-center gap-2 text-[13px] text-(--muted)">
        score
        <input
          value={score}
          onChange={(e) => setScore(e.target.value)}
          inputMode="numeric"
          placeholder="1–10"
          aria-label="Score 1–10"
          className={cx(inputClass, "h-8 w-14 text-center text-(--ink)", !scoreOk && "border-(--highlight)")}
        />
      </label>
      <input
        value={debrief}
        onChange={(e) => setDebrief(e.target.value)}
        placeholder="One line on how it went"
        aria-label="Debrief"
        maxLength={280}
        className={cx(inputClass, "h-8 min-w-[180px] flex-1")}
      />
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

export function ScheduleForm({ candidate }: { candidate: Candidate }) {
  const { data, mutate } = useCrm();
  const clock = useClock();
  const schedulable = data.candidates.filter((c) => tierOf(c, data.settings) !== "bench");
  const [candidateId, setCandidateId] = useState(schedulable.some((c) => c.id === candidate.id) ? candidate.id : (schedulable[0]?.id ?? ""));
  const [interviewerId, setInterviewerId] = useState(data.me.id);
  const [date, setDate] = useState(data.today);
  const [start, setStart] = useState(() => nextHalfHour(clock?.nowMin ?? null));
  const [length, setLength] = useState<30 | 45 | 60>(45);
  const [type, setType] = useState<InterviewType>("intro");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const end = fromMin(toMin(start) + length);
    // Same rule as the server, checked first so the message is instant.
    const clash = findClash({ interviewerId, date, startTime: start, endTime: end }, data.interviews);
    if (clash) {
      const who = data.interviewers.find((i) => i.id === clash.interviewerId)?.name;
      const cand = data.candidates.find((c) => c.id === clash.candidateId)?.name;
      const msg = `${who} already has ${cand} (${INTERVIEW_TYPE_LABEL[clash.type]}) ${clash.startTime}–${clash.endTime} on ${formatDay(date)}.`;
      setError(msg);
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
    else setLocation("");
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="rounded-2xl bg-(--card-2) p-4"
      data-testid="schedule-form"
    >
      <h3 className="mb-3 font-bold">Schedule an interview</h3>
      {tierOf(candidate, data.settings) === "bench" && (
        <p className="mb-3 text-[13px] text-(--highlight)" data-testid="benched-note">
          {firstName(candidate.name)} is benched — change their tier in Rankings first.
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Candidate">
          <select aria-label="Candidate" value={candidateId} onChange={(e) => setCandidateId(e.target.value)} className={inputClass}>
            {schedulable.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Interviewer">
          <select aria-label="Interviewer" value={interviewerId} onChange={(e) => setInterviewerId(e.target.value)} className={inputClass}>
            {data.interviewers.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input aria-label="Date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Start">
          <input aria-label="Start" type="time" required step={300} value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} />
        </Field>
        <div>
          <span className="mb-1 block text-[13px] font-medium text-(--muted)">Length</span>
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
        </div>
        <Field label="Type">
          <select aria-label="Type" value={type} onChange={(e) => setType(e.target.value as InterviewType)} className={inputClass}>
            {INTERVIEW_TYPES.map((t) => (
              <option key={t} value={t}>
                {INTERVIEW_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Location (optional)">
            <input aria-label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Room or call link" className={inputClass} />
          </Field>
        </div>
      </div>
      {error && (
        <p className="mt-3 font-medium text-(--highlight)" role="alert" data-testid="schedule-error">
          {error}
        </p>
      )}
      <div className="mt-4 flex justify-end">
        <Button type="submit" variant="primary">
          Schedule
        </Button>
      </div>
    </form>
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
        const { error } = await supabaseBrowser(data.realtime)
          .storage.from("resumes")
          .upload(path, file, { contentType: "application/pdf", upsert: false });
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-(--card-2) p-3">
        <Icon name="file" className="text-(--muted)" />
        <span className="flex-1 font-medium">{c.resumeFileUrl ? "Resume PDF on file" : "No PDF uploaded"}</span>
        {c.resumeFileUrl && (
          <a
            href={`/crm/api/resume/${c.id}`}
            className="inline-flex h-8 items-center rounded-xl border border-(--line) bg-(--card) px-3 text-[13px] font-bold hover:bg-(--card-2)"
          >
            Download
          </a>
        )}
        <label className="inline-flex h-8 cursor-pointer items-center rounded-xl bg-(--brand) px-3 text-[13px] font-bold text-white">
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
        {c.resumeFileUrl && (
          <Button variant="ghost" size="sm" onClick={() => mutate(null, () => setResumeFile(c.id, null), "Resume removed")}>
            Remove
          </Button>
        )}
      </div>

      {r.summary && <p className="text-[15px] leading-relaxed">{r.summary}</p>}

      {r.experience.length > 0 && (
        <div>
          <h3 className="mb-2 font-bold">Experience</h3>
          <ul className="space-y-3">
            {r.experience.map((e, i) => (
              <li key={i}>
                <p className="font-medium">
                  {e.role} · {e.org}
                </p>
                <p className="text-[13px] text-(--muted)">{e.years}</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {e.bullets.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}

      {r.education.length > 0 && (
        <div>
          <h3 className="mb-2 font-bold">Education</h3>
          <ul className="space-y-1.5">
            {r.education.map((e, i) => (
              <li key={i}>
                <span className="font-medium">{e.school}</span> <span className="text-(--muted)">· {e.degree} · {e.years}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {r.skills.length > 0 && (
        <div>
          <h3 className="mb-2 font-bold">Skills</h3>
          <div className="flex flex-wrap gap-1.5">
            {r.skills.map((s) => (
              <span key={s} className="rounded-full bg-(--card-2) px-3 py-1 text-[13px] font-medium">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {!r.summary && !r.experience.length && !r.education.length && !r.skills.length && (
        <p className="text-(--muted)">No resume details yet. Upload a PDF to keep it on file.</p>
      )}
    </div>
  );
}

function Assignments({ candidate }: { candidate: Candidate }) {
  const { data, openAssign, closeDrawer } = useCrm();
  const tasks = data.tasks
    .filter((t) => t.candidateId === candidate.id)
    .sort((a, b) => Number(a.status === "done") - Number(b.status === "done") || a.day.localeCompare(b.day));
  return (
    <div className="space-y-3" data-testid="record-assignments">
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="sm" onClick={() => openAssign({ candidateId: candidate.id })}>
          Assign task
        </Button>
        <Link
          href={`/crm/me?as=${candidate.id}`}
          onClick={closeDrawer}
          className="inline-flex h-8 items-center rounded-xl border border-(--line) bg-(--card) px-3 text-[13px] font-bold hover:bg-(--card-2)"
        >
          See it as {firstName(candidate.name)}
        </Link>
      </div>
      {tasks.map((t) => (
        <TaskCard key={t.id} task={t} showAssignee={false} />
      ))}
      {!tasks.length && <p className="py-4 text-center text-(--muted)">No assignments yet.</p>}
    </div>
  );
}

"use client";

/**
 * /mosh-lab/filters - every ffmpeg video filter, in plain English.
 *
 * The problem this solves is not that ffmpeg has no documentation. It is that
 * the documentation is written for someone who already knows: `lagfun` is
 * "slowly update darker pixels", which is true and tells you nothing about
 * the comet tail you get. So every filter here leads with a plain name and one
 * sentence about what it does to the picture, and the ffmpeg name sits beside
 * it small and grey - there when you need to type it, out of the way when you
 * are deciding.
 *
 * Three rules the page keeps:
 *
 *   * the list is grouped by what a filter does, not by its name. Colour,
 *     blur, warp, time, edges, glitch, crop, and then everything else.
 *     Alphabetical order is only useful if you already know the word.
 *   * a slider says what its two ends mean in words - "sharp" to
 *     "unreadable" - not just the numbers. The numbers are still there.
 *   * every filter shows a before/after thumbnail from frame 100 of a Journey
 *     version at the filter's own defaults, so you can see it before you add
 *     it. Built once by scripts/build_filter_thumbs.py.
 *
 * `hand: false` is shown as a `rough` badge: that filter's words came out of
 * the ffmpeg help automatically and have not been read by a person.
 *
 * The Output command panel is the real thing - the ffmpeg line this chain
 * means, with only the options that were actually changed, ready to paste.
 */

import { useEffect, useMemo, useState } from "react";

import "./filter-book.css";

type Opt = {
  flag: string;
  plain: string;
  hint: string;
  ends: [string, string] | null;
  type: string;
  min: number | null;
  max: number | null;
  default: string | null;
  values?: { name: string; value: number; help: string }[];
  aliases?: string[];
  ffmpeg_help: string;
  hand: boolean;
};

type Filt = {
  name: string;
  plain: string;
  group: string;
  what: string;
  hand: boolean;
  group_guessed: boolean;
  inputs: number | string;
  outputs: number | string;
  timeline: boolean;
  ffmpeg_help: string;
  options: Opt[];
};

type Book = {
  generated: string;
  ffmpeg: string;
  groups: string[];
  counts: Record<string, number>;
  filters: Filt[];
};

type ThumbIndex = { ok: string[]; failed: Record<string, string> };

/** One filter in the chain, with only the options the user moved. */
type Step = { id: number; name: string; set: Record<string, string> };

const THUMBS = "/mosh-lab/filter-thumbs";

/** A range small enough to drag is a slider; anything else is a number box. */
function sliderable(o: Opt): boolean {
  if (o.min === null || o.max === null) return false;
  if (o.values && o.values.length) return false;
  const span = o.max - o.min;
  return Number.isFinite(span) && span > 0 && span <= 1e4
    && Math.abs(o.min) < 1e6 && Math.abs(o.max) < 1e6;
}

function step(o: Opt): number {
  if (o.type === "int" || o.type === "int64") return 1;
  const span = (o.max ?? 1) - (o.min ?? 0);
  const s = span / 200;
  return s >= 1 ? 1 : Number(s.toPrecision(1));
}

function isBool(o: Opt): boolean {
  return o.type === "boolean";
}

/** The value a control should start at. */
function initial(o: Opt): string {
  if (o.default !== null && o.default !== undefined && o.default !== "")
    return o.default;
  if (o.min !== null) return String(o.min);
  return "";
}

/** Escape a filter-graph value: commas, colons and quotes end an argument. */
function esc(v: string): string {
  return /[,:='[\]\\;\s]/.test(v) ? `'${v.replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")}'` : v;
}

function stepString(s: Step, book: Book): string {
  const f = book.filters.find((x) => x.name === s.name);
  const args = Object.entries(s.set)
    .filter(([flag, v]) => {
      const o = f?.options.find((x) => x.flag === flag);
      return v !== "" && v !== (o?.default ?? "\u0000");
    })
    .map(([flag, v]) => `${flag}=${esc(v)}`);
  return args.length ? `${s.name}=${args.join(":")}` : s.name;
}

export default function FilterBook() {
  const [book, setBook] = useState<Book | null>(null);
  const [thumbs, setThumbs] = useState<ThumbIndex | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [handOnly, setHandOnly] = useState(false);
  const [chain, setChain] = useState<Step[]>([]);
  const [nextId, setNextId] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Both files land before anything renders, deliberately. Rendering the
  // list first and the thumbnail index second asked the browser for all 396
  // pictures, and the 140 filters that cannot have one - every hardware
  // variant, every source filter - answered 404 before the index arrived to
  // say so. The index is small; waiting for it costs nothing and saves 140
  // requests. A missing index is not an error: the names and the sentences
  // are the page, so it falls back to trying every thumbnail and letting the
  // ones that are not there quietly remove themselves.
  useEffect(() => {
    let live = true;
    (async () => {
      const [fb, ti] = await Promise.allSettled([
        fetch("/api/filters").then((r) => {
          if (!r.ok) throw new Error(`/api/filters ${r.status}`);
          return r.json() as Promise<Book>;
        }),
        fetch(`${THUMBS}/index.json`).then((r) =>
          r.ok ? (r.json() as Promise<ThumbIndex>) : null),
      ]);
      if (!live) return;
      setThumbs(ti.status === "fulfilled" ? ti.value : null);
      if (fb.status === "fulfilled") setBook(fb.value);
      else setErr(String(fb.reason));
    })();
    return () => { live = false; };
  }, []);

  const shown = useMemo(() => {
    if (!book) return [];
    const needle = q.trim().toLowerCase();
    return book.filters.filter((f) => {
      if (handOnly && !f.hand) return false;
      if (!needle) return true;
      return f.plain.toLowerCase().includes(needle)
        || f.name.toLowerCase().includes(needle)
        || f.what.toLowerCase().includes(needle)
        || f.group.toLowerCase().includes(needle);
    });
  }, [book, q, handOnly]);

  // Hand-written first inside each group, then the rough ones, each run
  // alphabetical. A group that opened on `allrgb` and `allyuv` buried the
  // filters somebody actually described under two that nobody had read.
  const byGroup = useMemo(() => {
    const m = new Map<string, Filt[]>();
    for (const f of shown) {
      const a = m.get(f.group) ?? [];
      a.push(f);
      m.set(f.group, a);
    }
    for (const a of m.values()) {
      a.sort((x, y) => (x.hand === y.hand
        ? x.plain.localeCompare(y.plain)
        : (x.hand ? -1 : 1)));
    }
    return m;
  }, [shown]);

  const command = useMemo(() => {
    if (!book || chain.length === 0) return "";
    const graph = chain.map((s) => stepString(s, book)).join(",");
    return `ffmpeg -i in.mp4 -vf "${graph}" -c:a copy out.mp4`;
  }, [book, chain]);

  const multiInput = useMemo(
    () => chain.filter((s) => {
      const f = book?.filters.find((x) => x.name === s.name);
      return f && f.inputs !== 1;
    }),
    [book, chain]);

  function add(f: Filt) {
    setChain((c) => [...c, { id: nextId, name: f.name, set: {} }]);
    setNextId((n) => n + 1);
    setOpen(f.name);
  }

  function setOpt(id: number, flag: string, v: string) {
    setChain((c) => c.map((s) =>
      s.id === id ? { ...s, set: { ...s.set, [flag]: v } } : s));
  }

  function clearOpt(id: number, flag: string) {
    setChain((c) => c.map((s) => {
      if (s.id !== id) return s;
      const set = { ...s.set };
      delete set[flag];
      return { ...s, set };
    }));
  }

  if (err) {
    return (
      <main className="fb-root">
        <p className="fb-err">{err}</p>
      </main>
    );
  }
  if (!book) {
    return <main className="fb-root"><p className="fb-dim">loading&hellip;</p></main>;
  }

  const hasThumb = (n: string) =>
    thumbs ? thumbs.ok.includes(n) : true;

  return (
    <main className="fb-root">
      <header className="fb-head">
        <div className="fb-title">
          <h1>Filters, in plain English</h1>
          <p className="fb-dim">
            {book.counts.filters} video filters in this build.{" "}
            <b>{book.counts.hand}</b> written out by hand;{" "}
            {book.counts.auto} generated from the ffmpeg help and marked{" "}
            <span className="fb-rough">rough</span>.{" "}
            {book.counts.options_hand} of {book.counts.options} option labels
            are hand-written.
          </p>
        </div>
        <div className="fb-tools">
          <input className="fb-search" placeholder="what do you want it to do?"
                 value={q} onChange={(e) => setQ(e.target.value)} />
          <button aria-pressed={handOnly} onClick={() => setHandOnly((v) => !v)}>
            {handOnly ? "hand-written only" : "everything"}
          </button>
        </div>
      </header>

      {chain.length > 0 && (
        <section className="fb-chain">
          <div className="fb-chain-head">
            <h2>The chain</h2>
            <button onClick={() => setChain([])}>clear</button>
          </div>
          {chain.map((s, i) => {
            const f = book.filters.find((x) => x.name === s.name)!;
            const hand = f.options.filter((o) => o.hand);
            const rough = f.options.filter((o) => !o.hand);
            return (
              <article key={s.id} className="fb-step">
                <div className="fb-step-head">
                  <span className="fb-step-n">{i + 1}</span>
                  <span className="fb-name">{f.plain}</span>
                  <code className="fb-ff">{f.name}</code>
                  {f.inputs !== 1 && (
                    <span className="fb-warn" title="A chain with this in it
                      cannot be written with -vf; use -filter_complex and give
                      it that many inputs.">
                      needs {String(f.inputs)} inputs
                    </span>
                  )}
                  <button className="fb-x"
                          onClick={() => setChain((c) =>
                            c.filter((x) => x.id !== s.id))}>remove</button>
                </div>
                {hand.length > 0 && (
                  <div className="fb-opts">
                    {hand.map((o) => (
                      <Control key={o.flag} o={o} step={s}
                               onSet={(v) => setOpt(s.id, o.flag, v)}
                               onClear={() => clearOpt(s.id, o.flag)} />
                    ))}
                  </div>
                )}
                {rough.length > 0 && (
                  <details className="fb-rest">
                    <summary>
                      {rough.length} more option{rough.length === 1 ? "" : "s"},
                      described from the ffmpeg help{" "}
                      <span className="fb-rough">rough</span>
                    </summary>
                    <div className="fb-opts">
                      {rough.map((o) => (
                        <Control key={o.flag} o={o} step={s}
                                 onSet={(v) => setOpt(s.id, o.flag, v)}
                                 onClear={() => clearOpt(s.id, o.flag)} />
                      ))}
                    </div>
                  </details>
                )}
              </article>
            );
          })}

          <div className="fb-out">
            <div className="fb-out-head">
              <h3>Output command</h3>
              <button onClick={() => {
                navigator.clipboard?.writeText(command);
                setCopied(true);
                setTimeout(() => setCopied(false), 1400);
              }}>{copied ? "copied" : "copy"}</button>
            </div>
            <pre>{command}</pre>
            {multiInput.length > 0 && (
              <p className="fb-dim">
                {multiInput.map((s) => s.name).join(", ")}{" "}
                {multiInput.length === 1 ? "takes" : "take"} more than one
                input, so this chain needs <code>-filter_complex</code> with
                that many <code>-i</code> flags rather than{" "}
                <code>-vf</code>.
              </p>
            )}
            <p className="fb-dim">
              Only options you changed are in the line; everything else stays
              at the filter&rsquo;s own default.
            </p>
          </div>
        </section>
      )}

      {book.groups.map((g) => {
        const fs = byGroup.get(g);
        if (!fs || fs.length === 0) return null;
        return (
          <section key={g} className="fb-group">
            <h2>{g} <span className="fb-dim">{fs.length}</span></h2>
            <div className="fb-grid">
              {fs.map((f) => (
                <article key={f.name}
                         className={"fb-card" + (f.hand ? "" : " fb-card-auto")}>
                  {hasThumb(f.name) && (
                    <img className="fb-thumb" loading="lazy" alt=""
                         src={`${THUMBS}/${f.name}.webp`}
                         onError={(e) => {
                           (e.currentTarget as HTMLImageElement).style.display
                             = "none";
                         }} />
                  )}
                  <div className="fb-card-head">
                    <h3 className="fb-name">{f.plain}</h3>
                    <code className="fb-ff">{f.name}</code>
                    {!f.hand && <span className="fb-rough">rough</span>}
                  </div>
                  <p className="fb-what">{f.what}</p>
                  <div className="fb-card-foot">
                    <button onClick={() => add(f)}>add to chain</button>
                    <button className="fb-link"
                            onClick={() => setOpen(open === f.name
                              ? null : f.name)}>
                      {open === f.name ? "hide" : `${f.options.length} options`}
                    </button>
                  </div>
                  {open === f.name && (
                    <ul className="fb-peek">
                      {f.options.map((o) => (
                        <li key={o.flag}>
                          <span className="fb-opt-name">{o.plain}</span>
                          <code className="fb-ff" title={o.ffmpeg_help}>
                            {o.flag}
                          </code>
                          {!o.hand && <span className="fb-rough">rough</span>}
                          <span className="fb-dim">{o.hint}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </section>
        );
      })}

      <footer className="fb-foot fb-dim">
        <p>
          Built from {book.ffmpeg} on {book.generated}. Rebuild the words with
          {" "}<code>scripts/build_filter_plain.py</code> and the pictures with
          {" "}<code>scripts/build_filter_thumbs.py</code>;
          {" "}<code>config/ffmpeg-filters.plain.json</code> is the copy to
          edit and the generator keeps whatever is already hand-written in it.
        </p>
        {thumbs && (
          <p>
            {thumbs.ok.length} filters have a before/after thumbnail.{" "}
            {Object.keys(thumbs.failed).length} do not - mostly the
            hardware-only ones and the ones that need a real lookup table or
            displacement map rather than a second copy of the clip.
          </p>
        )}
      </footer>
    </main>
  );
}

/**
 * One option.
 *
 * The plain label is what you read; the ffmpeg flag sits beside it in grey
 * and carries the raw help on hover, so the thing you would have to look up
 * is one hover away rather than in another window. A slider is captioned with
 * what its two ends mean in words, because "0.5" is not an answer to "how
 * blurry".
 */
function Control({ o, step: s, onSet, onClear }: {
  o: Opt; step: Step; onSet: (v: string) => void; onClear: () => void;
}) {
  const touched = o.flag in s.set;
  const value = touched ? s.set[o.flag] : initial(o);

  const label = (
    <span className="fb-opt-label">
      <span className="fb-opt-name">{o.plain}</span>
      <code className="fb-ff" title={`-${o.flag}: ${o.ffmpeg_help}`}>
        {o.flag}
      </code>
      {!o.hand && <span className="fb-rough">rough</span>}
      {touched && (
        <button className="fb-link" onClick={onClear}>reset</button>
      )}
    </span>
  );

  if (o.values && o.values.length) {
    return (
      <label className="fb-opt">
        {label}
        <select value={value} onChange={(e) => onSet(e.target.value)}>
          {o.values.map((v) => (
            <option key={v.name} value={v.name}>
              {v.name}{v.help ? ` - ${v.help}` : ""}
            </option>
          ))}
        </select>
        <span className="fb-dim">{o.hint}</span>
      </label>
    );
  }

  if (isBool(o)) {
    return (
      <label className="fb-opt fb-opt-bool">
        {label}
        <input type="checkbox"
               checked={value === "true" || value === "1"}
               onChange={(e) => onSet(e.target.checked ? "true" : "false")} />
        <span className="fb-dim">{o.hint}</span>
      </label>
    );
  }

  if (sliderable(o)) {
    return (
      <label className="fb-opt">
        {label}
        <span className="fb-slider">
          <input type="range" min={o.min!} max={o.max!} step={step(o)}
                 value={Number(value) || 0}
                 onChange={(e) => onSet(e.target.value)} />
          <b>{value}</b>
        </span>
        <span className="fb-ends">
          <i>{o.ends ? o.ends[0] : String(o.min)}</i>
          <i>{o.ends ? o.ends[1] : String(o.max)}</i>
        </span>
        <span className="fb-dim">{o.hint}</span>
      </label>
    );
  }

  return (
    <label className="fb-opt">
      {label}
      <input type="text" value={value} placeholder={o.default ?? ""}
             onChange={(e) => onSet(e.target.value)} />
      <span className="fb-dim">{o.hint}</span>
    </label>
  );
}

"use client";
/**
 * Grid planner (POST_GRID §3): a three-column preview of the feed, newest at top left, each post shown at its 1080 x 1080 centre
 * crop. Every tile is the kit's own render.html (same template code as the editor, the server PNG and brand/post.py), so what
 * is planned is what exports. Rhythm rules and Fill 9 come from kit/templates/rhythm.js through the hidden api frame.
 * The grid lives in localStorage and round-trips as grid.json. Clicking a tile opens it in the editor (/brand/ostad/make)
 * as a draft with the same id; edits there come back here on the next visit.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import css from "./grid.module.css";

const KIT = "/brand/ostad/kit";
const STORE = "ostad-grid-v1";
const MAKE_STORE = "ostad-make-drafts-v1";
const MAKE_CURRENT = "ostad-make-current-v1";
type Slots = Record<string, unknown>;
type Post = { id: string; template: string; slots: Slots; status?: string; note?: string; intake?: string };
type GridDoc = { name: string; size: "4x5"; accent: string; posts: Post[] };
type Warn = { rule: string; at: number[]; msg: string };
type Photo = { image: string; src: string; kind?: string; what?: string };
type IndexRow = { id: string; name: string };
type Draft = { id: string; name: string; size: string; accent: string; slides: { template: string; slots: Slots }[]; active: number; caption: string; seed: number; updated: number };
type IntakeItem = { id: string; row?: number; category?: string; what?: string; date?: string; procedure_name?: string | null; procedure?: string; area?: string; product?: string | null; brand?: string | null;
  missing: string[]; answers: Record<string, string>; status: string; template: string; patient?: string; before_row?: number; after_row?: number; days_between?: number; angle?: string };
type Intake = { available: boolean; generated?: string; scanned?: number; kept?: number; counts?: Record<string, number>; pairs?: IntakeItem[]; needsInfo?: IntakeItem[]; drafts?: IntakeItem[]; error?: string };
type OKApi = { rhythm: (p: Post[]) => Warn[]; fill9: (t: string, o: { products: Photo[]; pairs: { id: string; slots: Slots }[] }) => Post[]; kindOf: (p: Post) => string; defaults: (id: string) => Slots };

const uid = () => "g" + Math.random().toString(36).slice(2, 9);
const img = (row?: number) => (row ? `/api/brand/ostad/intake/img?row=${row}` : undefined);
const locked = (p: Post) => p.template === "before-after" && !(String(p.slots.patient_consent) === "yes" && String(p.slots.approved_by_ostad) === "yes");
function load(): GridDoc | null { try { const v = JSON.parse(localStorage.getItem(STORE) || "null"); return v && Array.isArray(v.posts) ? v : null; } catch { return null; } }
function save(d: GridDoc) { try { localStorage.setItem(STORE, JSON.stringify(d)); } catch {} }
function download(blob: Blob, name: string) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
// a draft from an intake item: template + what is known; nothing guessed (procedure / time since stay empty when unknown)
function fromIntake(it: IntakeItem): Post {
  const a = it.answers || {};
  if (it.before_row) return { id: uid(), template: "before-after", intake: it.id, status: "needs approval", note: `${it.patient}: consent unknown; photos ${it.days_between} days apart`,
    slots: { before: img(it.before_row), after: img(it.after_row), meta: a.procedure || it.procedure_name || "", label: [it.area, it.angle].filter(Boolean).join(", "), since: a["time since treatment"] || "", ticks: "6", patient_consent: a.consent === "yes" ? "yes" : "no", approved_by_ostad: "no" } };
  const t = it.template; const s: Slots = {};
  if (t === "product") Object.assign(s, { variant: "photo", image: img(it.row), meta: "Skincare", name: a["which product"] || it.product || it.brand || "", ink: "dark" });
  else if (t === "procedure") Object.assign(s, { image: img(it.row), meta: a.procedure || it.procedure_name || "", name: a.procedure || it.procedure_name || "", fact: "" });
  else if (t === "ruled") Object.assign(s, { image: img(it.row) });
  else if (t === "notice") Object.assign(s, { headline: "", meta: (it.date || "").slice(0, 10).replace(/-/g, ".") });
  else if (t === "graphic") Object.assign(s, { variant: "ring", image: img(it.row) });
  return { id: uid(), template: t, slots: s, intake: it.id, status: it.missing.length ? "needs info" : "draft", note: it.what?.slice(0, 120) };
}

export default function Grid() {
  const router = useRouter();
  const api = useRef<HTMLIFrameElement>(null);
  const [ok, setOk] = useState<OKApi | null>(null);
  const [doc, setDoc] = useState<GridDoc | null>(null);
  const [index, setIndex] = useState<IndexRow[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [intake, setIntake] = useState<Intake | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [topics, setTopics] = useState("product: Advanced LUMA Cream | Made to order\nnotice: Closed for Thanksgiving | 2026.11.26.Thu\nprocedure: Fraxel Dual | Two wavelengths: texture and pigment\ngraphic: 17 | Years in a row on Castle Connolly's Top Doctors list\ndiagram: What is in Nia-C+\nstatement: Skin cancer is the most common cancer.");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [boxW, setBoxW] = useState(900);
  const gridBox = useRef<HTMLDivElement>(null);
  const [cat, setCat] = useState("product");

  useEffect(() => {
    const t = setInterval(() => { const w = api.current?.contentWindow as (Window & { OK?: OKApi; __ready?: boolean }) | null; if (w?.__ready && w.OK) { setOk(() => w.OK!); clearInterval(t); } }, 50);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    (async () => {
      setIndex(await (await fetch(`${KIT}/templates/index.json`)).json());
      setPhotos(await (await fetch(`${KIT}/templates/photos/photos.json`)).json());
      const demo: GridDoc = await (await fetch(`${KIT}/templates/grid/demo.grid.json`)).json();
      queueMicrotask(() => setDoc(load() || demo));
    })().catch((e) => setNote(`Kit failed to load: ${e}`));
    fetch("/api/brand/ostad/intake?limit=60").then((r) => r.json()).then(setIntake).catch(() => setIntake({ available: false }));
  }, []);
  // pull back edits made in the editor (drafts with the same id)
  useEffect(() => {
    if (!doc) return;
    try {
      const drafts: Draft[] = JSON.parse(localStorage.getItem(MAKE_STORE) || "[]");
      let changed = false;
      const posts = doc.posts.map((p) => { const d = drafts.find((x) => x.id === p.id); if (d && d.slides[0] && JSON.stringify(d.slides[0].slots) !== JSON.stringify(p.slots)) { changed = true; return { ...p, template: d.slides[0].template, slots: d.slides[0].slots }; } return p; });
      if (changed) queueMicrotask(() => setDoc({ ...doc, posts }));
    } catch {}
    // run once per load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc === null]);
  useEffect(() => { if (doc) save(doc); }, [doc]);
  useEffect(() => { const el = gridBox.current; if (!el) return; setBoxW(el.clientWidth); const ro = new ResizeObserver(([e]) => setBoxW(e.contentRect.width)); ro.observe(el); return () => ro.disconnect(); }, []);

  const warns = useMemo(() => (ok && doc ? ok.rhythm(doc.posts) : []), [ok, doc]);
  const flagged = useMemo(() => new Set(warns.flatMap((w) => w.at)), [warns]);
  const set = useCallback((fn: (p: Post[]) => Post[]) => setDoc((d) => (d ? { ...d, posts: fn(d.posts) } : d)), []);
  const products = photos.filter((p) => p.kind === "product");

  const openInEditor = (p: Post) => {
    try {
      const drafts: Draft[] = JSON.parse(localStorage.getItem(MAKE_STORE) || "[]");
      const d: Draft = { id: p.id, name: `Grid · ${p.template}`, size: "4x5", accent: doc?.accent || "accent-1", slides: [{ template: p.template, slots: p.slots }], active: 0, caption: "", seed: 0, updated: 0 };
      localStorage.setItem(MAKE_STORE, JSON.stringify([...drafts.filter((x) => x.id !== p.id), d])); localStorage.setItem(MAKE_CURRENT, p.id);
    } catch {}
    router.push("/brand/ostad/make");
  };
  const add = (template: string) => set((ps) => [{ id: uid(), template, slots: ok ? ok.defaults(template) : {}, status: "draft" }, ...ps]);
  const addSaved = (id: string) => {
    try { const d = (JSON.parse(localStorage.getItem(MAKE_STORE) || "[]") as Draft[]).find((x) => x.id === id); if (d) set((ps) => [{ id: uid(), template: d.slides[0].template, slots: d.slides[0].slots, status: "draft" }, ...ps]); } catch {}
  };
  const savedDrafts: Draft[] = (() => { try { return typeof window === "undefined" ? [] : JSON.parse(localStorage.getItem(MAKE_STORE) || "[]"); } catch { return []; } })();
  const fill = () => {
    if (!ok) return;
    const pairs = (intake?.pairs || []).slice(0, 4).map((p) => ({ id: p.id, slots: fromIntake(p).slots }));
    set(() => ok.fill9(topics, { products, pairs }));
    setNote("Filled 9 drafts that pass the rhythm check. Before/after drafts stay locked until consent and approval are yes.");
  };
  const exportJson = () => doc && download(new Blob([JSON.stringify(doc, null, 1)], { type: "application/json" }), "grid.json");
  const importJson = async (f?: File | null) => { if (!f) return; try { const d = JSON.parse(await f.text()); if (Array.isArray(d.posts)) setDoc(d); else setNote("Not a grid.json"); } catch (e) { setNote(`Import failed: ${e}`); } };
  const exportAll = async () => {
    if (!doc) return; setBusy(true); setNote("");
    try {
      const JSZip = (await import("jszip")).default; const zip = new JSZip(); const skipped: string[] = [];
      const order = [...doc.posts].reverse(); // posting order: bottom right first
      for (let i = 0; i < order.length; i++) {
        const p = order[i];
        if (locked(p)) { skipped.push(`#${i + 1} ${p.template} (needs consent + approval)`); continue; }
        const r = await fetch("/api/brand/ostad/render", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spec: { size: doc.size || "4x5", accent: doc.accent, slides: [{ template: p.template, slots: p.slots }] }, format: "png" }) });
        if (!r.ok) { const j = await r.json().catch(() => ({ error: r.statusText })); skipped.push(`#${i + 1} ${p.template}: ${j.error}`); continue; }
        zip.file(`${String(i + 1).padStart(2, "0")}-${p.template}.png`, await r.blob());
      }
      download(await zip.generateAsync({ type: "blob" }), "ostad-grid.zip");
      setNote(`Exported ${order.length - skipped.length} of ${order.length} posts, numbered in posting order (01 = bottom right).${skipped.length ? " Skipped: " + skipped.join("; ") : ""}`);
    } catch (e) { setNote(`Export failed: ${e}`); } finally { setBusy(false); }
  };
  const answer = async (id: string, key: string, value: string) => {
    const r = await fetch("/api/brand/ostad/intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, answers: { [key]: value } }) });
    const j = await r.json(); if (!r.ok) { setNote(j.error); return; }
    setIntake((x) => x && ({ ...x, pairs: x.pairs?.map((p) => (p.id === id ? { ...p, answers: j.answers, status: j.status } : p)), needsInfo: x.needsInfo?.map((p) => (p.id === id ? { ...p, answers: j.answers, status: j.status } : p)) }));
  };
  const loadCat = (c: string) => { setCat(c); fetch(`/api/brand/ostad/intake?limit=60&category=${c}`).then((r) => r.json()).then((j) => setIntake((x) => ({ ...(x || {}), ...j }))); };

  const cell = Math.floor((boxW - 2 * 6) / 3);
  const s = cell / 1080;
  if (!doc) return <section className={css.wrap}><iframe ref={api} src={`${KIT}/templates/render.html`} className={css.api} title="kit" /><p>Loading the grid…</p></section>;
  return (
    <section className={css.wrap} data-testid="grid">
      <iframe ref={api} src={`${KIT}/templates/render.html`} className={css.api} title="kit api" aria-hidden="true" tabIndex={-1} />
      <div className={css.top}>
        <div><p className={css.label}>Plan</p><h1 className={css.h1}>Grid</h1></div>
        <div className={css.row}>
          <select onChange={(e) => { if (e.target.value) add(e.target.value); e.target.value = ""; }} defaultValue="" aria-label="Add post from template" data-testid="add-template">
            <option value="">+ Post from template</option>{index.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {savedDrafts.length > 0 && <select onChange={(e) => { if (e.target.value) addSaved(e.target.value); e.target.value = ""; }} defaultValue="" aria-label="Add saved design">
            <option value="">+ Saved editor design</option>{savedDrafts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>}
          <button onClick={exportJson} data-testid="export-json">Export grid.json</button>
          <label className={css.file}>Import<input type="file" accept="application/json" onChange={(e) => importJson(e.target.files?.[0])} /></label>
          <button onClick={exportAll} disabled={busy} className={css.primary} data-testid="export-all">{busy ? "Rendering…" : "Export all (zip)"}</button>
          <button onClick={async () => setDoc(await (await fetch(`${KIT}/templates/grid/demo.grid.json`)).json())}>Load demo grid</button>
        </div>
      </div>
      {note && <p className={css.note} data-testid="note">{note}</p>}

      <div className={css.cols}>
        <div>
          <div ref={gridBox} className={css.grid} style={{ gridTemplateColumns: `repeat(3, ${cell}px)` }} data-testid="tiles">
            {doc.posts.map((p, i) => {
              const spec = { size: doc.size || "4x5", accent: doc.accent, labelFallback: false, slides: [{ template: p.template, slots: p.slots }] };
              const src = `${KIT}/templates/render.html#spec=${encodeURIComponent(JSON.stringify(spec))}`;
              return (
                <div key={p.id} className={`${css.tile} ${flagged.has(i) ? css.warn : ""} ${drag === i ? css.dragging : ""}`} style={{ width: cell, height: cell }} draggable
                  onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDragEnd={() => setDrag(null)}
                  onDrop={() => { if (drag === null || drag === i) return; set((ps) => { const a = [...ps]; const [m] = a.splice(drag, 1); a.splice(i, 0, m); return a; }); setDrag(null); }}
                  data-testid="tile" data-template={p.template} data-kind={ok?.kindOf(p)}>
                  <iframe src={src} title={`${i + 1}. ${p.template}`} tabIndex={-1} loading="lazy" style={{ width: 1080, height: 1350, transform: `translateY(${-135 * s}px) scale(${s})` }} />
                  <button className={css.hit} onClick={() => openInEditor(p)} aria-label={`Open post ${i + 1} (${p.template}) in the editor`} />
                  <span className={css.badge}>{i + 1} · {p.template}{p.status && p.status !== "draft" ? ` · ${p.status}` : ""}</span>
                  <button className={css.del} onClick={() => set((ps) => ps.filter((x) => x.id !== p.id))} aria-label={`Remove post ${i + 1}`}>×</button>
                </div>
              );
            })}
          </div>
          <p className={css.mute}>Newest at top left. Each tile shows its 1080 × 1080 centre crop of the 1080 × 1350 post. Drag to reorder; click to edit.</p>
        </div>

        <aside className={css.side}>
          <fieldset className={css.box} data-testid="rhythm">
            <legend>Rhythm check</legend>
            {warns.length === 0 ? <p className={css.ok}>Passes: no text tiles touching, no photo runs over two, no template over 3 in 9.</p>
              : <ul className={css.list}>{warns.map((w, k) => <li key={k} data-rule={w.rule}>{w.msg}</li>)}</ul>}
          </fieldset>
          <fieldset className={css.box}>
            <legend>Fill 9</legend>
            <textarea rows={6} value={topics} onChange={(e) => setTopics(e.target.value)} aria-label="Topics, one per line" />
            <div className={css.row}><button onClick={fill} data-testid="fill9">Fill 9</button><span className={css.mute}>prefix a line with product:, notice:, procedure:, graphic:, diagram:, statement:</span></div>
          </fieldset>
          <fieldset className={css.box} data-testid="needs-info">
            <legend>Needs info {intake?.available ? `· ${(intake.pairs?.length || 0)} pairs, ${intake.needsInfo?.length || 0}+ items` : ""}</legend>
            {!intake?.available ? <p className={css.mute}>{intake?.error || "Intake runs locally (the photos stay on this machine)."} </p> : <>
              <p className={css.mute}>From iCloud: {intake.scanned} scanned, {intake.kept} kept ({Object.entries(intake.counts || {}).map(([k, v]) => `${k} ${v}`).join(", ")}). Answers save to brand/intake/intake.json.</p>
              <div className={css.qs}>
                {(intake.pairs || []).slice(0, 24).map((p) => (
                  <div key={p.id} className={css.q}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <div className={css.thumbs}><img src={img(p.before_row)} alt="" /><img src={img(p.after_row)} alt="" /></div>
                    <div><b>{p.patient}</b> · {p.procedure_name || p.procedure} · {p.area} · {p.days_between} days apart
                      {p.missing.map((m) => <label key={m} className={css.qf}>{m}<input defaultValue={p.answers?.[m] || ""} onBlur={(e) => e.target.value !== (p.answers?.[m] || "") && answer(p.id, m, e.target.value)} /></label>)}
                      <button onClick={() => set((ps) => [fromIntake(p), ...ps])}>Add to grid</button></div>
                  </div>
                ))}
                {(intake.needsInfo || []).filter((x) => x.category !== "before-after").slice(0, 24).map((p) => (
                  <div key={p.id} className={css.q}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <div className={css.thumbs}><img src={img(p.row)} alt="" /></div>
                    <div><b>{p.category}</b> · {p.what?.slice(0, 90)}
                      {p.missing.map((m) => <label key={m} className={css.qf}>{m}<input defaultValue={p.answers?.[m] || ""} onBlur={(e) => e.target.value !== (p.answers?.[m] || "") && answer(p.id, m, e.target.value)} /></label>)}</div>
                  </div>
                ))}
              </div>
            </>}
          </fieldset>
          {intake?.available && <fieldset className={css.box} data-testid="drafts">
            <legend>Drafts from photos</legend>
            <div className={css.row}>{Object.keys(intake.counts || {}).map((c) => <button key={c} className={c === cat ? css.on : ""} onClick={() => loadCat(c)}>{c}</button>)}</div>
            <div className={css.tray}>{(intake.drafts || []).filter((d) => d.category === cat).slice(0, 30).map((d) => (
              // eslint-disable-next-line @next/next/no-img-element
              <button key={d.id} className={css.trayItem} title={d.what} onClick={() => set((ps) => [fromIntake(d), ...ps])}><img src={img(d.row)} alt="" /></button>
            ))}</div>
          </fieldset>}
        </aside>
      </div>
    </section>
  );
}

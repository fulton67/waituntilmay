"use client";
/**
 * Ostad post builder (brand/BUILDER.md Phase C).
 * Preview: an iframe of /brand/ostad/kit/templates/render.html, driven through its window.OK, so it is the same template code
 * the server route renders. Drafts live in localStorage. Auto mode is kit/templates/auto.js (rules, no model).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import css from "./make.module.css";

const KIT = "/brand/ostad/kit";
const SIZE_LIST = [["4x5", "4:5 · 1080 × 1350"], ["1x1", "1:1 · 1080 × 1080"], ["9x16", "9:16 · 1080 × 1920"]] as const;
type Size = (typeof SIZE_LIST)[number][0];
type ListItem = { text: string; icon: string };
type SlotValue = string | ListItem[] | undefined;
type Slots = Record<string, SlotValue>;
type Slide = { template: string; slots: Slots };
type Draft = { id: string; name: string; size: Size; accent: string; slides: Slide[]; active: number; caption: string; seed: number; updated: number };
type SlotDef = { key: string; type: "text" | "longtext" | "choice" | "image" | "icon" | "list"; label: string; max?: number; optional: boolean; default?: unknown; options?: string[]; min?: number; itemMax?: number };
type Schema = { template: string; name: string; cluster: string; board_blocks: string[]; sizes: string[]; paginates: string | null; carousel_role: string | null; slots: SlotDef[] };
type IndexRow = { id: string; name: string; cluster: string; board_blocks: string[] };
type Photo = { image: string; src: string; w: number; h: number };
type RenderInfo = { fonts: string; warnings: string[]; pages: number; w: number; h: number };
type AutoOut = { spec: { size: Size; accent: string; slides: Slide[] }; choice: string; candidates: string[] };
type OKApi = {
  render: (spec: unknown) => Promise<RenderInfo>;
  defaults: (id: string) => Slots;
  auto: (caption: string, o: { size: Size; seed: number; photos: string[]; template?: string }) => AutoOut;
  ICONS: Record<string, string>;
  ACCENTS: Record<string, { fill: string; ink: string; text: string }>;
};
const ACCENT_ROLE: Record<string, string> = { "accent-1": "accent-1", "accent-2": "accent-2", signal: "signal", surface: "surface" };
const STORE = "ostad-make-drafts-v1";
const CURRENT = "ostad-make-current-v1";
const PLACEHOLDER: Draft = { id: "", name: "", size: "4x5", accent: "accent-1", slides: [{ template: "single-statement", slots: {} }], active: 0, caption: "", seed: 0, updated: 0 };
const uid = () => Math.random().toString(36).slice(2, 10);

function loadDrafts(): Draft[] {
  try { const v = JSON.parse(localStorage.getItem(STORE) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
function saveDrafts(d: Draft[]): string | null {
  try { localStorage.setItem(STORE, JSON.stringify(d)); return null; } catch (e) { return e instanceof Error ? e.message : "storage full"; }
}
// dropped photos are downscaled to a 1600 px long side and stored as JPEG data URLs (keeps drafts inside localStorage)
async function fileToDataURL(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}
function download(blob: Blob, name: string) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export default function Maker() {
  const frame = useRef<HTMLIFrameElement>(null);
  const stageBox = useRef<HTMLDivElement>(null);
  const [ok, setOk] = useState<OKApi | null>(null);
  const [index, setIndex] = useState<IndexRow[]>([]);
  const [schemas, setSchemas] = useState<Record<string, Schema>>({});
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [palette, setPalette] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [cur, setCur] = useState<string>("");
  const [info, setInfo] = useState<RenderInfo | null>(null);
  const [boxW, setBoxW] = useState(420);
  const [busy, setBusy] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [server, setServer] = useState<boolean | null>(null);
  const [candidates, setCandidates] = useState<string[]>([]);

  // kit data
  useEffect(() => {
    (async () => {
      const idx: IndexRow[] = await (await fetch(`${KIT}/templates/index.json`)).json();
      const sch = Object.fromEntries(await Promise.all(idx.map(async (t) => [t.id, await (await fetch(`${KIT}/templates/${t.id}/slots.json`)).json()] as const)));
      const ph: Photo[] = await (await fetch(`${KIT}/templates/photos/photos.json`)).json();
      const pal = await (await fetch(`${KIT}/palette.json`)).json();
      setIndex(idx); setSchemas(sch); setPhotos(ph);
      setPalette(Object.fromEntries(Object.entries(pal.roles as Record<string, { hex: string }>).map(([k, v]) => [k, v.hex])));
      fetch("/api/brand/ostad/render").then((r) => r.json()).then((j) => setServer(!!j.available)).catch(() => setServer(false));
    })().catch((e) => setNote(`Kit failed to load: ${e}`));
  }, []);
  // iframe api
  const onFrameLoad = useCallback(() => {
    const w = frame.current?.contentWindow as (Window & { OK?: OKApi; __ready?: boolean }) | null;
    const wait = () => (w?.__ready && w.OK ? setOk(() => w.OK!) : setTimeout(wait, 50));
    wait();
  }, []);
  // the iframe can finish loading before hydration (its onLoad is then missed), so also poll once on mount
  useEffect(() => {
    const t = setInterval(() => {
      const w = frame.current?.contentWindow as (Window & { OK?: OKApi; __ready?: boolean }) | null;
      if (w?.__ready && w.OK) { setOk(() => w.OK!); clearInterval(t); }
    }, 50);
    return () => clearInterval(t);
  }, []);
  // drafts: restore once after mount (localStorage is client-only; read in a microtask so the effect body stays sync-free)
  const restored = useRef(false);
  useEffect(() => {
    if (!ok || !index.length || restored.current) return;
    restored.current = true;
    queueMicrotask(() => {
      const d = loadDrafts(); let id = "";
      try { id = localStorage.getItem(CURRENT) || ""; } catch {}
      if (d.length) { setDrafts(d); setCur(d.find((x) => x.id === id) ? id : d[0].id); return; }
      const first: Draft = { id: uid(), name: "Draft 1", size: "4x5", accent: "accent-1", slides: [{ template: "single-statement", slots: ok.defaults("single-statement") }], active: 0, caption: "", seed: 0, updated: Date.now() };
      setDrafts([first]); setCur(first.id);
    });
  }, [ok, index.length]);
  const draft = drafts.find((d) => d.id === cur);
  const update = useCallback((fn: (d: Draft) => Draft) => {
    setDrafts((all) => all.map((d) => (d.id === cur ? { ...fn(d), updated: Date.now() } : d)));
  }, [cur]);
  // autosave every change
  useEffect(() => {
    if (!drafts.length) return;
    const err = saveDrafts(drafts); try { localStorage.setItem(CURRENT, cur); } catch {}
    if (err) queueMicrotask(() => setNote(`Draft not saved: ${err}. Use smaller photos.`));
  }, [drafts, cur]);
  // preview width
  useEffect(() => {
    const el = stageBox.current; if (!el) return;
    setBoxW(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setBoxW(e.contentRect.width)); ro.observe(el); return () => ro.disconnect();
  }, []);
  const spec = useMemo(() => (draft ? { size: draft.size, accent: draft.accent, slides: draft.slides, labelFallback: true } : null), [draft]);
  // live preview (debounced); the iframe holds the same render.html the server opens
  useEffect(() => {
    if (!ok || !spec) return;
    const t = setTimeout(() => { ok.render(spec).then(setInfo).catch((e) => setNote(`Preview failed: ${e}`)); }, 180);
    return () => clearTimeout(t);
  }, [ok, spec]);

  const loading = !draft || !ok;
  const dr: Draft = draft ?? PLACEHOLDER;
  const slide = dr.slides[Math.min(dr.active, dr.slides.length - 1)];
  const schema = schemas[slide.template];
  const setSlot = (key: string, v: SlotValue) => update((d) => ({ ...d, slides: d.slides.map((s, i) => (i === d.active ? { ...s, slots: { ...s.slots, [key]: v } } : s)) }));
  const pickTemplate = (id: string) => update((d) => {
    const old = d.slides[d.active]; const img = Object.entries(old.slots).find(([k, v]) => /image|before|after/.test(k) && typeof v === "string");
    const slots: Slots = { ...ok!.defaults(id) };
    const imgKey = schemas[id]?.slots.find((s) => s.type === "image")?.key;
    if (img && imgKey) slots[imgKey] = img[1];
    return { ...d, slides: d.slides.map((s, i) => (i === d.active ? { template: id, slots } : s)) };
  });
  const w = info?.w || 1080, h = info?.h || 1350, pages = info?.pages || 1;
  const scale = Math.min(1, boxW / w);
  const stageH = pages * h + (pages - 1) * 40;

  async function serverRender(slides: Slide[], format: "png" | "zip", name: string) {
    setBusy(format); setNote("");
    try {
      const r = await fetch("/api/brand/ostad/render", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spec: { size: dr.size, accent: dr.accent, slides }, format, name }) });
      if (!r.ok) { const j = await r.json().catch(() => ({ error: r.statusText })); setNote(j.error || "Render failed"); return; }
      const fonts = r.headers.get("X-Ok-Fonts"); const warn = JSON.parse(decodeURIComponent(r.headers.get("X-Ok-Warnings") || "%5B%5D")) as string[];
      const isZip = (r.headers.get("Content-Type") || "").includes("zip");
      download(await r.blob(), `${name}.${isZip ? "zip" : "png"}`);
      setNote(`Rendered ${r.headers.get("X-Ok-Pages")} page(s) on the server with ${fonts === "adobe" ? "the Adobe fonts" : "FALLBACK fonts"}.${warn.length ? " " + warn.join(" ") : ""}`);
    } catch (e) { setNote(`Render failed: ${e}`); } finally { setBusy(""); }
  }
  const runAuto = (seed: number) => {
    if (!dr.caption.trim()) { setNote("Paste a caption first."); return; }
    const r = ok!.auto(dr.caption, { size: dr.size, seed, photos: photos.map((p) => p.src) });
    setCandidates(r.candidates);
    update((d) => ({ ...d, seed, accent: r.spec.accent, slides: r.spec.slides, active: 0 }));
    setNote(`Auto picked ${r.choice} (${r.candidates.length} candidates; regenerate cycles them).`);
  };
  const newDraft = (from?: Draft) => {
    const d: Draft = from ? { ...JSON.parse(JSON.stringify(from)), id: uid(), name: `${from.name} copy`, updated: Date.now() }
      : { id: uid(), name: `Draft ${drafts.length + 1}`, size: dr.size, accent: "accent-1", slides: [{ template: "single-statement", slots: ok!.defaults("single-statement") }], active: 0, caption: "", seed: 0, updated: Date.now() };
    setDrafts((a) => [...a, d]); setCur(d.id);
  };

  return (
    <section className={css.wrap} data-testid="maker">
      <div className={css.top}>
        <div>
          <p className={css.label}>Make</p>
          <h1 className={css.h1}>Make a post</h1>
        </div>
        {loading ? <p>Loading the kit…</p> : <div className={css.drafts}>
          <select value={cur} onChange={(e) => setCur(e.target.value)} aria-label="Draft" data-testid="draft-select">
            {drafts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input className={css.draftName} value={dr.name} onChange={(e) => update((d) => ({ ...d, name: e.target.value }))} aria-label="Draft name" />
          <button onClick={() => { const err = saveDrafts(drafts); setNote(err ? `Not saved: ${err}` : `Saved “${dr.name}” in this browser.`); }} data-testid="save">Save draft</button>
          <button onClick={() => newDraft(dr)} data-testid="duplicate">Duplicate</button>
          <button onClick={() => newDraft()}>New</button>
        </div>}
      </div>

      <div className={css.cols}>
        <div className={css.controls}>
          {!loading && <>
          <fieldset className={css.box}>
            <legend>Auto</legend>
            <textarea className={css.caption} rows={4} placeholder="Paste an Instagram caption" value={dr.caption} onChange={(e) => update((d) => ({ ...d, caption: e.target.value }))} data-testid="caption" />
            <div className={css.row}>
              <button onClick={() => runAuto(0)} data-testid="auto">Auto</button>
              <button onClick={() => runAuto(dr.seed + 1)} data-testid="regenerate">Regenerate</button>
              {candidates.length > 0 && <span className={css.mute}>{candidates.join(" · ")}</span>}
            </div>
          </fieldset>

          <fieldset className={css.box}>
            <legend>Template</legend>
            <div className={css.picker} data-testid="picker">
              {index.map((t) => (
                <button key={t.id} className={t.id === slide.template ? css.pickOn : css.pick} onClick={() => pickTemplate(t.id)} data-template={t.id} title={`${t.name} · ${t.cluster} · board ${t.board_blocks.join(", ")}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${KIT}/templates/${t.id}/thumb_4x5.png`} alt="" width={86} height={108} />
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className={css.box}>
            <legend>Slides</legend>
            <div className={css.row}>
              {dr.slides.map((s, i) => (
                <span key={i} className={i === dr.active ? css.chipOn : css.chip}>
                  <button onClick={() => update((d) => ({ ...d, active: i }))}>{i + 1}. {schemas[s.template]?.name || s.template}</button>
                  {dr.slides.length > 1 && <button aria-label={`Remove slide ${i + 1}`} onClick={() => update((d) => ({ ...d, slides: d.slides.filter((_, j) => j !== i), active: Math.max(0, Math.min(d.active, d.slides.length - 2)) }))}>×</button>}
                </span>
              ))}
              <button onClick={() => update((d) => ({ ...d, slides: [...d.slides, JSON.parse(JSON.stringify(d.slides[d.active]))], active: d.slides.length }))} data-testid="add-slide" disabled={dr.slides.length >= 20}>+ Slide</button>
            </div>
          </fieldset>

          <fieldset className={css.box}>
            <legend>Accent</legend>
            <div className={css.row}>
              {Object.keys(ok!.ACCENTS).map((a) => (
                <button key={a} className={a === dr.accent ? css.swOn : css.sw} onClick={() => update((d) => ({ ...d, accent: a }))} data-accent={a}>
                  <i style={{ background: palette[ACCENT_ROLE[a]] }} />{a}
                </button>
              ))}
            </div>
          </fieldset>

          {schema && (
            <fieldset className={css.box} data-testid="form">
              <legend>{schema.name} <span className={css.mute}>· {schema.cluster} · board {schema.board_blocks.join(", ")}</span></legend>
              {schema.slots.map((s) => (
                <Field key={s.key} def={s} value={slide.slots[s.key] as SlotValue} set={(v) => setSlot(s.key, v)} photos={photos} icons={ok!.ICONS} />
              ))}
            </fieldset>
          )}
          </>}
        </div>

        <div className={css.previewCol}>
          {!loading && <>
          <div className={css.tabs} role="tablist">
            {SIZE_LIST.map(([s, label]) => (
              <button key={s} role="tab" aria-selected={dr.size === s} className={dr.size === s ? css.tabOn : css.tab} onClick={() => update((d) => ({ ...d, size: s }))} data-size={s}>{label}</button>
            ))}
          </div>
          <div className={css.actions}>
            <button className={css.primary} disabled={!!busy || server === false} onClick={() => serverRender([slide], "png", `ostad-${slide.template}-${dr.size}`)} data-testid="download-png">{busy === "png" ? "Rendering…" : "Download PNG"}</button>
            <button disabled={!!busy || server === false} onClick={() => serverRender(dr.slides, "zip", `ostad-carousel-${dr.size}`)} data-testid="download-zip">{busy === "zip" ? "Rendering…" : `Download carousel (${dr.slides.length})`}</button>
          </div>
          <p className={css.status} data-testid="status">
            {info ? `${info.pages} page${info.pages > 1 ? "s" : ""} · preview fonts: ${info.fonts === "adobe" ? "Adobe" : "fallback (labelled)"}` : "Rendering preview…"}
            {info?.warnings.length ? ` · ${info.warnings.join(" ")}` : ""}
            {server === false ? " · server renderer runs locally only" : ""}
          </p>
          {note && <p className={css.note} data-testid="note">{note}</p>}
          </>}
          <div ref={stageBox} className={css.stageBox} style={{ height: stageH * scale }}>
            <iframe ref={frame} src={`${KIT}/templates/render.html`} onLoad={onFrameLoad} title="Post preview" data-testid="preview"
              className={css.frame} style={{ width: w, height: stageH, transform: `scale(${scale})` }} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ def, value, set, photos, icons }: { def: SlotDef; value: SlotValue; set: (v: SlotValue) => void; photos: Photo[]; icons: Record<string, string> }) {
  const label = <span className={css.flabel}>{def.label}{def.optional ? "" : " *"}{def.max && (def.type === "text" || def.type === "longtext") ? <em>{String(value ?? "").length}/{def.max}</em> : null}</span>;
  if (def.type === "text") return <label className={css.field}>{label}<input value={(value as string) ?? ""} maxLength={def.max} onChange={(e) => set(e.target.value)} data-slot={def.key} /></label>;
  if (def.type === "longtext") return <label className={css.field}>{label}<textarea rows={5} value={(value as string) ?? ""} maxLength={def.max} onChange={(e) => set(e.target.value)} data-slot={def.key} /></label>;
  if (def.type === "choice") return (
    <div className={css.field}>{label}<div className={css.row}>{(def.options || []).map((o) => <button key={o} className={value === o ? css.segOn : css.seg} onClick={() => set(o)}>{o}</button>)}</div></div>
  );
  if (def.type === "icon") return <div className={css.field}>{label}<IconGrid icons={icons} value={value as string} set={set} /></div>;
  if (def.type === "image") return <ImageField label={label} value={value as string | undefined} set={set} photos={photos} slot={def.key} />;
  if (def.type === "list") {
    const items = (Array.isArray(value) ? value : []) as ListItem[]; const min = def.min ?? 1, max = def.max ?? 5;
    const put = (i: number, p: Partial<ListItem>) => set(items.map((it, j) => (j === i ? { ...it, ...p } : it)));
    return (
      <div className={css.field}>{label}
        {items.map((it, i) => (
          <div key={i} className={css.listRow}>
            <select value={it.icon} onChange={(e) => put(i, { icon: e.target.value })} aria-label={`Icon ${i + 1}`}>
              {Object.keys(icons).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className={css.iconPrev} dangerouslySetInnerHTML={{ __html: icons[it.icon] || "" }} />
            <input value={it.text} maxLength={def.itemMax} onChange={(e) => put(i, { text: e.target.value })} aria-label={`Item ${i + 1}`} />
            <button disabled={items.length <= min} onClick={() => set(items.filter((_, j) => j !== i))} aria-label={`Remove item ${i + 1}`}>×</button>
          </div>
        ))}
        <button disabled={items.length >= max} onClick={() => set([...items, { text: "New item", icon: "check" }])}>+ Item ({items.length}/{max})</button>
      </div>
    );
  }
  return null;
}

function IconGrid({ icons, value, set }: { icons: Record<string, string>; value?: string; set: (v: string) => void }) {
  return (
    <div className={css.icons}>
      {Object.entries(icons).map(([n, svg]) => (
        <button key={n} title={n} className={n === value ? css.icoOn : css.ico} onClick={() => set(n)} dangerouslySetInnerHTML={{ __html: svg }} data-icon={n} />
      ))}
    </div>
  );
}

function ImageField({ label, value, set, photos, slot }: { label: React.ReactNode; value?: string; set: (v: SlotValue) => void; photos: Photo[]; slot: string }) {
  const [over, setOver] = useState(false);
  const take = async (f?: File | null) => { if (f && f.type.startsWith("image/")) set(await fileToDataURL(f)); };
  return (
    <div className={css.field}>{label}
      <div className={over ? css.dropOn : css.drop} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]); }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {value ? <img src={value} alt="" /> : <span>Drop a photo · it gets the kit treatment</span>}
        <input type="file" accept="image/*" onChange={(e) => take(e.target.files?.[0])} data-slot={slot} aria-label="Choose photo" />
      </div>
      <div className={css.photos}>
        {photos.map((p) => (
          // eslint-disable-next-line @next/next/no-img-element
          <button key={p.image} className={value === p.src ? css.phOn : css.ph} onClick={() => set(p.src)} title={`Sample: Instagram ${p.image}`}><img src={p.src} alt="" /></button>
        ))}
        {value && <button onClick={() => set(undefined)} className={css.ph}>none</button>}
      </div>
    </div>
  );
}

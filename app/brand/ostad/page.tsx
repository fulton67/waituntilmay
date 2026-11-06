import Image from "next/image";
import css from "./brand.module.css";
import type_ from "./data/type.json";
import page from "./data/page.json";

type Render = (typeof type_.renders)[number];
type Ranked = (typeof type_.display_ranked)[number];
type Img = { src: string; w: number; h: number };
const SIZE_LABEL: Record<string, string> = { "4x5": "4:5", "1x1": "1:1", "9x16": "9:16" };
const TITLE = (s: string) => s.replace(/[_-]/g, " ").replace(/^./, (c) => c.toUpperCase());

function Pic({ img, alt, sizes, caption }: { img: Img; alt: string; sizes: string; caption?: React.ReactNode }) {
  return (
    <figure className={css.plate}>
      <Image src={img.src} alt={alt} width={img.w} height={img.h} sizes={sizes} />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

const CANVASES = ["1080x1350", "1080x1080", "1080x1920"] as const;

function Plate({ r }: { r: Render }) {
  const [w, h] = r.canvas.split("x").map(Number);
  return (
    <figure className={css.plate}>
      <Image src={r.src} alt={`${r.display} on ${r.ground}, ${r.canvas}`} width={w} height={h} sizes="(max-width: 700px) 50vw, 25vw" />
      <figcaption>
        {r.ground === "paper" ? "Paper #f2efed" : `Board ${r.ground.replace("board ", "")}`}
        {r.fonts_loaded ? "" : " · FALLBACK"}
      </figcaption>
    </figure>
  );
}

function Rank({ title, rows }: { title: string; rows: Ranked[] }) {
  return (
    <table className={css.table}>
      <caption>{title}</caption>
      <thead>
        <tr><th>Family</th><th>Class</th><th>Score</th><th>Board</th><th>Fav.</th><th>Instagram</th></tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.family_slug}>
            <td><a href={r.url}>{r.family}</a></td>
            <td>{r.classification.join(" / ")}</td>
            <td>{r.score}</td><td>{r.board}</td><td>{r.favourite}</td><td>{r.instagram}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Page() {
  const { spec, counts, renders } = type_;
  const sizes = spec.canvases["1080x1350"].sizes;
  const roles = Object.entries(spec.roles) as [keyof typeof sizes, (typeof spec.roles)["headline"]][];
  const { make, demo, reel, video, templates, look, icons } = page;
  const chk = make.check;
  return (
    <>
      <nav className={css.nav} aria-label="Sections">
        {["Make", "Demo wall", "Templates", "Look", "Icons", "Type"].map((n) => <a key={n} href={`#${n.toLowerCase().replace(" ", "-")}`}>{n}</a>)}
      </nav>

      <section className={css.section} id="make">
        <p className={css.label}>01 · Make</p>
        <h1 className={css.h1}>Make an on-brand post in the browser.</h1>
        <p className={css.lede}>
          Pick one of {make.templates} templates, or paste a caption and let Auto choose. Fill the slots, drop in a photo, pick from {make.icons} icons,
          then download a PNG or a carousel zip. The preview is the renderer, so what you see is the file you get.
        </p>
        <a className={css.cta} href={make.href}>Open the builder →</a>
        <p className={css.note}>
          Checked in the browser ({chk.browser_ok} template × size pairs) and on the server ({chk.server_ok}, Adobe fonts {chk.server_adobe}).
          Preview and PNG match with a glyph IoU of at least {chk.match.min_glyph_iou.toFixed(2)}; {chk.console_errors} console errors.
          The same renderer runs <code>brand/post.py</code> and the <code>/post</code> command.
        </p>
      </section>

      <section className={css.section} id="demo-wall">
        <p className={css.label}>02 · Demo wall</p>
        <h2 className={css.h2}>Twelve posts from his own recent captions.</h2>
        <p className={css.lede}>
          The {demo.summary.posts} newest captions with usable text, each run through Auto: {demo.summary.template_count} template groups,
          {" "}{demo.summary.pages} pages, four posts per size, {demo.summary.warnings} warnings.
        </p>
        <div className={css.wall}>
          {demo.posts.map((p) => (
            <Pic key={p.n} img={p.pages[0]} alt={`Demo ${p.n}: ${p.template}, ${p.size}`} sizes="(max-width: 700px) 50vw, 25vw"
              caption={<>{String(p.n).padStart(2, "0")} · {TITLE(p.template)} · {SIZE_LABEL[p.size]}{p.pages.length > 1 ? ` · ${p.pages.length} slides` : ""}</>} />
          ))}
        </div>
        <div className={css.reel}>
          <video className={css.video} src={reel.src} poster={reel.poster} width={1080} height={1920} controls muted loop playsInline preload="none" />
          <div>
            <p className={css.label}>Video kit · 10 s demo</p>
            <p>
              His own clip ({reel.clip}, from {reel.start_s} s), graded with the kit LUT at {reel.fps} fps with no zoom. Over it: the lower third, a chip,
              captions cut on in the feed’s band, and the editorial end card dissolved in over 12 frames.
            </p>
            <p className={css.note}>
              The captions use his own words and timings, and they hide the burnt-in ones: {reel.check.passed}/{reel.check.samples} OCR samples read only our line.
              The kit has {video.elements} elements as alpha WebM, ProRes and MP4, and {video.lottie} Lottie files. Guide: <code>brand/kit/video/VIDEO.md</code>.
            </p>
          </div>
        </div>
      </section>

      <section className={css.section} id="templates">
        <p className={css.label}>03 · Templates</p>
        <h2 className={css.h2}>{templates.length} templates, each traced to the board.</h2>
        <p className={css.lede}>
          Every template comes from a layout cluster on the board and the feed. The board blocks beside each one are the layouts it is built from.
        </p>
        {templates.map((t) => (
          <div key={t.id} className={css.trow}>
            <p className={css.label}>{t.name} · {t.cluster}</p>
            <div className={css.tgrid}>
              {Object.entries(t.thumbs).map(([s, img]) => <Pic key={s} img={img as Img} alt={`${t.name}, ${SIZE_LABEL[s]}`} sizes="(max-width: 700px) 33vw, 12vw" caption={SIZE_LABEL[s]} />)}
              {t.board.map((b) => <Pic key={b.id} img={b} alt={`Board block ${b.id}`} sizes="(max-width: 700px) 33vw, 12vw" caption={<span className={css.src}>Board {b.id}</span>} />)}
            </div>
          </div>
        ))}
      </section>

      <section className={css.section} id="look">
        <p className={css.label}>04 · Look</p>
        <h2 className={css.h2}>{look.kept} devices from the board, rebuilt as components.</h2>
        <p className={css.lede}>
          Each device was tagged across {look.board_images} board images and kept if it recurs. Each proof shows the board source beside the kit component
          at the source’s own canvas size, measured with the same estimator.
        </p>
        <div className={css.swatches}>
          {look.palette.map((p) => (
            <div key={p.role} className={css.swatch}>
              <span style={{ background: p.hex }} />
              <p>{p.role}<br /><code>{p.hex}</code> · L* {p.L} · C* {p.C}</p>
            </div>
          ))}
        </div>
        <div className={css.grid2}>
          {look.devices.map((d) => (
            <Pic key={d.device} img={d} alt={`${TITLE(d.device)}: board source and kit rebuild`} sizes="(max-width: 700px) 50vw, 33vw"
              caption={<>{TITLE(d.device)} · {d.images} board images</>} />
          ))}
        </div>
        <p className={css.label}>Photo treatment</p>
        <p className={css.note}>
          The feed → board LUT (<code>brand/kit/treatment.cube</code>): saturation ×{look.treatment_params.saturate}, contrast ×{look.treatment_params.contrast}, lifted blacks, grain at 6%.
        </p>
        <div className={css.grid2}>
          {look.treatment.map((t) => <Pic key={t.name} img={t} alt={`Treatment: ${t.name}`} sizes="(max-width: 700px) 100vw, 33vw" caption={TITLE(t.name)} />)}
        </div>
      </section>

      <section className={css.section} id="icons">
        <p className={css.label}>05 · Icons</p>
        <h2 className={css.h2}>{icons.count} monoline icons, picked by caption keywords.</h2>
        <Pic img={icons.sheet} alt={`Sheet of ${icons.count} icons`} sizes="100vw" />
      </section>

      <section className={css.section} id="type">
        <p className={css.label}>06 · Type</p>
        <h2 className={css.h2}>Neue Haas Grotesk, one family for every role.</h2>
        <p className={css.lede}>
          All {counts.crops} type crops from the board and the feed went through Adobe Fonts visual search ({counts.families} families returned).
          Scored by board coverage, weighted to the four favourites and checked against Instagram, Neue Haas Grotesk won headlines and text.
          Every plate below is set in the activated Adobe fonts.
        </p>

        <table className={css.table}>
          <caption>Roles on a 1080 × 1350 post</caption>
          <thead>
            <tr><th>Role</th><th>Adobe style</th><th>Size / leading</th><th>Tracking</th><th>Measure</th></tr>
          </thead>
          <tbody>
            {roles.map(([role, r]) => (
              <tr key={role}>
                <td>{role}</td>
                <td>{r.adobe_style}{r.uppercase ? ", caps" : ""}</td>
                <td>{sizes[role].font_size_px} / {sizes[role].line_height_px} px</td>
                <td>{r.letter_spacing_em > 0 ? "+" : ""}{r.letter_spacing_em} em</td>
                <td>{r.block_w_pct}% wide</td>
              </tr>
            ))}
          </tbody>
        </table>

        {CANVASES.map((c) => (
          <div key={c} className={css.row}>
            <p className={css.label}>{c.replace("x", " × ")}</p>
            <div className={css.grid}>
              {renders.filter((r) => r.canvas === c && r.file.includes("system_")).map((r) => <Plate key={r.file} r={r} />)}
            </div>
          </div>
        ))}

        <div className={css.row}>
          <p className={css.label}>Losing systems</p>
          <div className={css.grid2}>
            {renders.filter((r) => r.file.includes("losing_")).map((r) => (
              <figure key={r.file} className={css.plate}>
                <Image src={r.src} alt={r.display} width={1080} height={1350} sizes="(max-width: 700px) 50vw, 33vw" />
                <figcaption>{r.display}</figcaption>
              </figure>
            ))}
          </div>
        </div>

        <div className={css.ranks}>
          <Rank title="Headline score" rows={type_.display_ranked} />
          <Rank title="Text score" rows={type_.text_ranked} />
        </div>
        <p className={css.note}>{type_.rule}</p>
      </section>
    </>
  );
}

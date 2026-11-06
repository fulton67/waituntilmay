import Image from "next/image";
import css from "./brand.module.css";
import type_ from "./data/type.json";

type Render = (typeof type_.renders)[number];
type Ranked = (typeof type_.display_ranked)[number];

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
  return (
    <>
      <section className={css.section} id="type">
        <p className={css.label}>01 · Type</p>
        <h1 className={css.h1}>Neue Haas Grotesk, one family for every role.</h1>
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

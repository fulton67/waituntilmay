// Jan 08 reel: the three topic-only animations, drawn from traced 3D-model outlines (brand/scripts/jan08_anatomy_blender.py ->
// jan08_anatomy.py -> public/jan08/anatomy.json; outline difference vs the model render in research/ostad/style/jan08/anatomy_measure.json).
// Nothing is drawn from memory: the structures are the traced paths; the motion (fat shrinking, skin bulging or dropping, gel beads)
// moves those traced points. Every clinical drawing is ostad_check: pending (BEATS.md). Ink pen on a glass plate (LESSONS L5).
//   SkinBelief       the belief: too much gel stretches the skin, sits as a lump, then drifts (skin_crosssection.glb section)
//   VolumeLoss       aging: the cheek fat shrinks, the bone support is lit, the lower face drops (face.glb profile)
//   CheekPlacement   his method: a microcannula path to the cheekbone, gel laid on the bone, the cheek lifts (face.glb midface)
//   LipMigration     migration: gel on the bone stays; too much in a lip spreads past its border (face.glb midface)
//   PillowVsLift     not a golf ball in the mid cheek: the lump is struck, the cheekbone deposit stays (face.glb profile)
import React from "react";
import { useCurrentFrame } from "remotion";
import { Arrow } from "../devices/Arrow";
import { card } from "../components/Ro";
import { D, INK, MUTED, SAND, caps, disp, life, p, vis } from "./look";

export type APath = { id: string; kind: string; label: string; d: string; c: [number, number]; bbox: [number, number, number, number] };
export type AData = { size: number; views: Record<string, { paths: APath[] }> };

/** a traced path's points (every "x,y" pair), its loops kept */
const parse = (d: string) => d.split(/(?=M)/).map((seg) => ({ closed: /Z\s*$/.test(seg), pts: Array.from(seg.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)).map((m) => [+m[1], +m[2]] as [number, number]) }));
/** the same path with every point moved by f (a smooth field, so the outline stays the traced outline, displaced) */
export const deform = (d: string, f: (x: number, y: number) => [number, number]) =>
  parse(d).map((s) => "M" + s.pts.map(([x, y]) => { const [dx, dy] = f(x, y); return `${(x + dx).toFixed(1)},${(y + dy).toFixed(1)}`; }).join(" L") + (s.closed ? " Z" : "")).join(" ");
const gauss = (v: number, c: number, s: number) => Math.exp(-(((v - c) / s) ** 2));

type Ctx = { by: (id: string) => APath | undefined; sc: number; X: (x: number) => number; Y: (y: number) => number };

/** the plate: glass card(28), caps eyebrow, a 44 px title, the drawing fitted to the union of `fit` bboxes, the credit line */
export const Plate: React.FC<{
  data: AData; view: string; s: number; out: number; x: number; y: number; w: number; h: number; eyebrow: string; title: string; fit: string[];
  pad?: number; note?: string; children: (c: Ctx) => React.ReactNode; overlay?: (c: Ctx) => React.ReactNode;
}> = ({ data, view, s, out, x, y, w, h, eyebrow, title, fit, pad = 34, note = "Illustration · traced from a 3D anatomy model", children, overlay }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s, out)) return null;
  const V = data.views[view];
  const by = (id: string) => V.paths.find((q) => q.id === id);
  const bb = fit.map((i) => by(i)!.bbox);
  const x0 = Math.min(...bb.map((b) => b[0])), y0 = Math.min(...bb.map((b) => b[1]));
  const x1 = Math.max(...bb.map((b) => b[0] + b[2])), y1 = Math.max(...bb.map((b) => b[1] + b[3]));
  const head = 132, padB = 58, aw = w - 2 * pad, ah = h - head - padB;
  const sc = Math.min(aw / (x1 - x0), ah / (y1 - y0));
  const ox = pad + (aw - (x1 - x0) * sc) / 2 - x0 * sc, oy = head + (ah - (y1 - y0) * sc) / 2 - y0 * sc;
  const ctx: Ctx = { by, sc, X: (v) => x + ox + v * sc, Y: (v) => y + oy + v * sc };
  return (
    <>
      <div style={{ ...card(28), left: x, top: y, width: w, height: h, ...life(frame, s + 1, out) }}>
        <div style={{ position: "absolute", left: pad, top: 30, ...caps(26, MUTED) }}>{eyebrow}</div>
        <div style={{ position: "absolute", left: pad, top: 66, ...disp(46, INK) }}>{title}</div>
        <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <g transform={`translate(${ox} ${oy}) scale(${sc})`}>{children(ctx)}</g>
        </svg>
        <div style={{ position: "absolute", right: pad, bottom: 22, ...caps(17, MUTED), letterSpacing: "0.06em" }}>{note}</div>
      </div>
      {overlay && <div style={{ position: "absolute", inset: 0, ...life(frame, s + 1, out, 0) }}>{overlay(ctx)}</div>}
    </>
  );
};

/** one traced structure: pen draw-on over 10 f, then a faint fill */
export const Stroke: React.FC<{ d: string; s: number; w?: number; a?: number; fill?: number; dash?: boolean; color?: string; fillColor?: string }> = ({ d, s, w = 3, a = 1, fill = 0.06, dash, color = INK, fillColor = INK }) => {
  const frame = useCurrentFrame();
  const k = p(frame, s, 10, "sweep");
  if (k <= 0) return null;
  return <path d={d} fill={fillColor} fillOpacity={fill * k} stroke={color} strokeOpacity={a} strokeWidth={w} strokeDasharray={dash ? "7 9" : `${k} 1`}
    pathLength={dash ? undefined : 1} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />;
};

/** a label set in caps on the plate, at a point in drawing px (type only: no leader, no box) */
const Label: React.FC<{ c: Ctx; x: number; y: number; s: number; out: number; text: string; anchor?: "start" | "end" | "middle"; color?: string }> = ({ c, x, y, s, out, text, anchor = "start", color = INK }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: c.X(x), top: c.Y(y), transform: `translate(${anchor === "end" ? "-100%" : anchor === "middle" ? "-50%" : "0"}, -50%)`,
      whiteSpace: "nowrap", ...caps(28, color), fontWeight: 600, ...life(frame, s + 1, out, 8) }}>{text}</div>
  );
};

/** a gel deposit: a soft ink lens that swells from 0 */
const Gel: React.FC<{ x: number; y: number; rx: number; ry: number; k: number; o?: number }> = ({ x, y, rx, ry, k, o = 1 }) =>
  k <= 0 ? null : <ellipse cx={x} cy={y} rx={rx * k} ry={ry * k} fill={INK} fillOpacity={0.28 * o} stroke={INK} strokeOpacity={o} strokeWidth={2.4} vectorEffect="non-scaling-stroke" />;

/* ---------------------------------------------------------------- the belief (skin section) ---------------------------------------- */
export const SkinBelief: React.FC<{ data: AData; s: number; out: number; stretch: number; overfilled: number; migrate: number; x: number; y: number; w: number; h: number }> = ({ data, s, out, stretch, overfilled, migrate, x, y, w, h }) => {
  const frame = useCurrentFrame();
  const ks = p(frame, stretch + 1, 20, "sweep"), ko = p(frame, overfilled + 1, 18, "sweep"), km = p(frame, migrate + 1, 30, "sweep");
  const cx = 512, A = 46 * ks + 40 * ko; // bulge height in render px (illustrative)
  const lift = (x: number, y: number): [number, number] => [0, -A * gauss(x, cx, 170) * (y < 560 ? 1 : 0.55)];
  return (
    <Plate data={data} view="section" s={s} out={out} x={x} y={y} w={w} h={h} eyebrow="The belief" title="Filler stretches skin?" fit={["epidermis", "hypodermis"]} pad={30}
      overlay={(c) => <>
        <Label c={c} x={60} y={170} s={stretch} out={out} text="Stretch?" />
        <Label c={c} x={cx} y={170} s={overfilled} out={out} text="Overfilled?" anchor="middle" />
        <Label c={c} x={950} y={170} s={migrate} out={out} text="Migrates?" anchor="end" />
      </>}>
      {({ by }) => {
        const L = (id: string, st: number, fill = 0.05, a = 1) => by(id) && <Stroke key={id} d={deform(by(id)!.d, lift)} s={st} fill={fill} a={a} />;
        return <>
          {L("hypodermis", s + 4, 0.03, 0.5)}
          {by("fat_lobules") && <Stroke d={deform(by("fat_lobules")!.d, lift)} s={s + 8} fill={0.1} a={0.45} fillColor={SAND} />}
          {L("dermis", s + 6, 0.04, 0.7)}
          {L("epidermis", s + 2, 0.08, 1)}
          <Gel x={cx} y={560 - A * 0.5} rx={150} ry={64} k={Math.max(ks * 0.75, ko)} />
          {[0, 1, 2, 3].map((i) => {
            const q = Math.max(0, Math.min(1, km * 1.25 - i * 0.12));
            return q > 0 ? <circle key={i} cx={cx + 150 + q * (120 + i * 70)} cy={570 + q * (60 + 25 * i)} r={14 - i * 2} fill={INK} fillOpacity={0.3} stroke={INK} strokeWidth={2} vectorEffect="non-scaling-stroke" /> : null;
          })}
        </>;
      }}
    </Plate>
  );
};

/* ---------------------------------------------------------------- aging (profile) --------------------------------------------------- */
export const VolumeLoss: React.FC<{ data: AData; s: number; out: number; volume: number; fatty: number; support: number; x: number; y: number; w: number; h: number }> = ({ data, s, out, volume, fatty, support, x, y, w, h }) => {
  const frame = useCurrentFrame();
  const kv = p(frame, volume + 1, 22, "sweep"), kf = p(frame, fatty + 1, 10, "sweep"), kb = p(frame, support + 1, 10, "sweep");
  const sag = (yy: number) => 22 * kv * Math.max(0, Math.min(1, (yy - 420) / 260)) * (yy > 860 ? Math.max(0, 1 - (yy - 860) / 120) : 1);
  return (
    <Plate data={data} view="profile" s={s} out={out} x={x} y={y} w={w} h={h} eyebrow="What aging does" title="Volume and support are lost" fit={["zygomatic_bone_r", "maxilla_r", "mandible", "fat_cheek_r"]}
      overlay={(c) => <>
        <Label c={c} x={300} y={300} s={fatty} out={out} text="Fat" anchor="end" />
        <Label c={c} x={700} y={190} s={support} out={out} text="Support" />
      </>}>
      {({ by }) => {
        const fatK = 1 - 0.3 * kv;
        const shrink = (id: string) => { const q = by(id)!; return deform(q.d, (xx, yy) => [(xx - q.c[0]) * (fatK - 1), (yy - q.bbox[1]) * (fatK - 1)]); };
        return <>
          <Stroke d={by("skin_epidermis")!.d} s={s + 2} fill={0} a={0.25} dash />
          <Stroke d={deform(by("skin_epidermis")!.d, (_x, yy) => [0, sag(yy)])} s={s + 2} fill={0.03} a={0.9} />
          <Stroke d={by("mandible")!.d} s={s + 6} fill={0.04} a={0.4} />
          <Stroke d={by("maxilla_r")!.d} s={s + 8} fill={0.05 + 0.12 * kb} a={0.5 + 0.5 * kb} w={3 + kb} />
          <Stroke d={by("zygomatic_bone_r")!.d} s={s + 10} fill={0.05 + 0.12 * kb} a={0.5 + 0.5 * kb} w={3 + kb} />
          <Stroke d={shrink("fat_cheek_r")} s={s + 12} fill={0.08 + 0.16 * kf} a={0.35 + 0.45 * kf} w={2.2} fillColor={SAND} color={INK} />
          <Stroke d={shrink("fat_sup_jowl_r")} s={s + 14} fill={0.08 + 0.16 * kf} a={0.35 + 0.45 * kf} w={2.2} fillColor={SAND} color={INK} />
        </>;
      }}
    </Plate>
  );
};

/* ---------------------------------------------------------------- his method (midface) --------------------------------------------- */
// gel deposits laid along the cheekbone: points on the traced zygoma's upper-front body (render px, from its bbox), ostad_check pending
const ZYG = (b: APath) => { const [bx, by_, bw, bh] = b.bbox; return [[bx + bw * 0.38, by_ + bh * 0.52], [bx + bw * 0.58, by_ + bh * 0.47], [bx + bw * 0.78, by_ + bh * 0.44]] as [number, number][]; };

export const CheekPlacement: React.FC<{ data: AData; s: number; out: number; cheek: number; lifting: number; diminish: number; x: number; y: number; w: number; h: number }> = ({ data, s, out, cheek, lifting, diminish, x, y, w, h }) => {
  const frame = useCurrentFrame();
  const kl = p(frame, lifting + 1, 18, "sweep"), kd = p(frame, diminish + 1, 18, "sweep");
  return (
    <Plate data={data} view="midface" s={s} out={out} x={x} y={y} w={w} h={h} eyebrow="His method" title="On the cheekbone, by microcannula" fit={["zygomatic_bone_r", "maxilla_r", "mandible", "fat_cheek_r"]}
      overlay={(c) => {
        const z = ZYG(c.by("zygomatic_bone_r")!);
        const entry = { x: c.X(z[0][0] - 190), y: c.Y(z[0][1] + 40) };
        return <>
          <Label c={c} x={z[1][0]} y={z[1][1] - 120} s={cheek + 20} out={out} text="Cheekbone" anchor="middle" />
          {/* the cannula's route: one entry at the side, along the bone (route-trace, ink: a drawing on glass) */}
          <Arrow variant="route-trace" from={entry} via={[{ x: c.X(z[0][0]), y: c.Y(z[0][1]) }, { x: c.X(z[1][0]), y: c.Y(z[1][1]) }]} to={{ x: c.X(z[2][0]), y: c.Y(z[2][1]) }} start={cheek + 1} end={lifting + 4} color={INK} weight={6} />
          {/* lift: the cheek above the deposits rises (straight pointers, up) */}
          {z.map((q, i) => <Arrow key={i} variant="straight-pointer" from={{ x: c.X(q[0]), y: c.Y(q[1] + 150) }} to={{ x: c.X(q[0]), y: c.Y(q[1] + 40) }} start={lifting + 1 + 3 * i} end={diminish - 2} color={INK} weight={6} />)}
          <Label c={c} x={z[2][0] + 40} y={z[2][1] + 120} s={lifting} out={diminish - 2} text="Lift" />
          <Label c={c} x={z[2][0] + 40} y={z[2][1] + 230} s={diminish} out={out} text="Without support: falls" />
        </>;
      }}>
      {({ by }) => {
        const z = ZYG(by("zygomatic_bone_r")!);
        const lift = (xx: number, yy: number): [number, number] => [0, -16 * kl * gauss(xx, z[1][0], 240) * Math.max(0, Math.min(1, (yy - 300) / 200))];
        return <>
          <Stroke d={deform(by("skin_epidermis")!.d, lift)} s={s + 2} fill={0.02} a={0.5} />
          {kd > 0 && <Stroke d={deform(by("skin_epidermis")!.d, (xx, yy) => [0, 20 * kd * gauss(xx, z[1][0], 260) * Math.max(0, Math.min(1, (yy - 300) / 200))])} s={diminish} fill={0} a={0.4 * kd} dash />}
          <Stroke d={by("mandible")!.d} s={s + 6} fill={0.03} a={0.35} />
          <Stroke d={by("maxilla_r")!.d} s={s + 8} fill={0.05} a={0.55} />
          <Stroke d={deform(by("fat_cheek_r")!.d, lift)} s={s + 10} fill={0.12} a={0.45} fillColor={SAND} />
          <Stroke d={by("zygomatic_bone_r")!.d} s={s + 12} fill={0.12} a={1} w={3.6} />
          {z.map((q, i) => <Gel key={i} x={q[0]} y={q[1]} rx={30} ry={18} k={p(frame, cheek + 10 + 8 * i, 10, "sweep")} />)}
        </>;
      }}
    </Plate>
  );
};

/* ---------------------------------------------------------------- migration (midface: lip) ----------------------------------------- */
export const LipMigration: React.FC<{ data: AData; s: number; out: number; wrong?: number; lip: number; x: number; y: number; w: number; h: number }> = ({ data, s, out, wrong, lip, x, y, w, h }) => {
  const frame = useCurrentFrame();
  const kl = p(frame, lip + 1, 12, "sweep"), km = p(frame, lip + 12, 22, "sweep");
  return (
    <Plate data={data} view="midface" s={s} out={out} x={x} y={y} w={w} h={h} eyebrow="Migration" title="Wrong filler, or too much in a lip" fit={["zygomatic_bone_r", "orbicularis_oris_muscle_r", "maxilla_r"]}
      overlay={(c) => {
        const z = ZYG(c.by("zygomatic_bone_r")!), L = c.by("orbicularis_oris_muscle_r")!;
        return <>
          <Label c={c} x={z[0][0] - 20} y={z[0][1] - 110} s={s + 6} out={out} text="No migration seen" />
          <Label c={c} x={L.bbox[0] - 30} y={L.c[1] + 40} s={lip} out={out} text="Too much: spreads" anchor="end" />
        </>;
      }}>
      {({ by }) => {
        const z = ZYG(by("zygomatic_bone_r")!), L = by("orbicularis_oris_muscle_r")!;
        return <>
          <Stroke d={by("maxilla_r")!.d} s={s + 4} fill={0.04} a={0.45} />
          <Stroke d={by("zygomatic_bone_r")!.d} s={s + 4} fill={0.08} a={0.8} />
          <Stroke d={L.d} s={s + 6} fill={0.1} a={0.9} fillColor={SAND} />
          {z.map((q, i) => <Gel key={i} x={q[0]} y={q[1]} rx={30} ry={18} k={p(frame, s + 10 + 4 * i, 10, "sweep")} />)}
          <Gel x={L.c[0]} y={L.c[1] - L.bbox[3] * 0.18} rx={L.bbox[2] * 0.28} ry={L.bbox[3] * 0.16} k={kl * (1 + 0.25 * km)} />
          {[0, 1, 2, 3, 4].map((i) => {
            const a = -2.4 + i * 0.35, r = (L.bbox[3] * 0.25 + 30) + km * (60 + 12 * i);
            return km > 0 ? <circle key={i} cx={L.c[0] + Math.cos(a) * r * 0.9} cy={L.c[1] - L.bbox[3] * 0.18 + Math.sin(a) * r * 0.55} r={9} fill={INK} fillOpacity={0.3 * km} stroke={INK} strokeOpacity={km} strokeWidth={2} vectorEffect="non-scaling-stroke" /> : null;
          })}
        </>;
      }}
    </Plate>
  );
};

/* ---------------------------------------------------------------- pillow vs lift (profile) ------------------------------------------ */
export const PillowVsLift: React.FC<{ data: AData; s: number; out: number; golf: number; awkward: number; x: number; y: number; w: number; h: number }> = ({ data, s, out, golf, awkward, x, y, w, h }) => {
  const frame = useCurrentFrame();
  const kg = p(frame, golf + 1, 16, "sweep"), ka = p(frame, awkward + 1, 8, "sweep");
  return (
    <Plate data={data} view="profile" s={s} out={out} x={x} y={y} w={w} h={h} eyebrow="Not this" title="Golf-size filling, mid cheek" fit={["zygomatic_bone_r", "maxilla_r", "mandible", "fat_cheek_r"]}
      overlay={(c) => {
        const z = c.by("zygomatic_bone_r")!, cx = z.c[0] + 130, cy = z.c[1] + 150;
        return <>
          <Label c={c} x={cx} y={cy + 150} s={awkward} out={out} text="Looks awkward" anchor="middle" />
        </>;
      }}>
      {({ by }) => {
        const z = by("zygomatic_bone_r")!, cx = z.c[0] + 130, cy = z.c[1] + 150; // the mid cheek: below and in front of the traced cheekbone
        return <>
          <Stroke d={deform(by("skin_epidermis")!.d, (xx, yy) => [36 * kg * gauss(yy, cy, 70) * gauss(xx, 900, 260), 0])} s={s + 2} fill={0.03} a={0.85} />
          <Stroke d={by("mandible")!.d} s={s + 6} fill={0.03} a={0.35} />
          <Stroke d={by("maxilla_r")!.d} s={s + 6} fill={0.04} a={0.5} />
          <Stroke d={z.d} s={s + 8} fill={0.08} a={0.8} />
          <Gel x={cx} y={cy} rx={66} ry={66} k={kg} />
          {ka > 0 && <g stroke={INK} strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke">
            <line x1={cx - 70} y1={cy - 70} x2={cx - 70 + 140 * Math.min(1, ka * 2)} y2={cy - 70 + 140 * Math.min(1, ka * 2)} vectorEffect="non-scaling-stroke" />
            {ka > 0.5 && <line x1={cx + 70} y1={cy - 70} x2={cx + 70 - 140 * (ka - 0.5) * 2} y2={cy - 70 + 140 * (ka - 0.5) * 2} vectorEffect="non-scaling-stroke" />}
          </g>}
        </>;
      }}
    </Plate>
  );
};

export { D };

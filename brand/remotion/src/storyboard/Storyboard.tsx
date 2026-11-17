import React from "react";
import { AbsoluteFill } from "remotion";
import { useElza } from "../Fonts";
import { BLUE, Body, CX, Cap, Chip, Crop, Display, Float, FontCtx, FontKey, H, Him, ICE, INK, Label, Lead, MUTE, NAVY, Ring, Room, Source, Thread, W, Win, cd, cub, fit, mapPt } from "./kit";

// Storyboard stills for the Exomind / total skin health YouTube rework (v6 proposal). One still per section at its key word,
// alternatives for the explanatory moments. `id` picks the frame, `font` the type option. Notes, timings and sources per frame:
// brand/edits/exomind-skin/storyboard/STORYBOARD.md. Render: brand/edits/exomind-skin/storyboard/render.sh

export type SBProps = { id: string; font?: FontKey };

// sources (all under public/exomind-skin/, gitignored)
const UNIT = { src: "btl/unit_cut.png", iw: 2400, ih: 1265 }; // BTL licensed unit photo, cut out (prep_cutout.py)
const EXO = { src: "btl/Exomind_PIC_Ba-card-ExoTMS-001_ENNA100.jpg", iw: 1920, ih: 786 }; // BTL licensed card
const NEU = { src: "btl/Exomind_PIC_Ba-card-Neuroplasticity-002_ENNA100.jpg", iw: 1920, ih: 786 }; // BTL licensed card
const APP = { src: "btl/Exomind_PIC_Applicator_0429_ENUS100.jpeg", iw: 8192, ih: 4320 }; // BTL licensed photo
const OCT = (s: number) => ({ src: `sb/oct30_${s}.png`, iw: 1080, ih: 1920 }); // practice, Oct 30
const NOV = (s: number | string) => ({ src: `sb/nov05_${s}.png`, iw: 1080, ih: 1920 }); // practice, Nov 05
const BTLF = (s: number | string) => ({ src: `sb/btl_${s}.png`, iw: 1280, ih: 720 }); // BTL "What is EXOMIND?" film
const MOA = (t: number | string) => ({ src: `sb/moa_${t}.png`, iw: 1920, ih: 1080 }); // BTL "Mechanism of Action" film (licensed), frame at t s
const SKIN = { src: "btl/img/Exomind_PIC_Female-Model5_2363_ENUS100.jpg", iw: 5120, ih: 2700 }; // BTL licensed model portrait
const SKINC: Crop = [2080, 300, 1500, 1500];
const RED = { src: "sb/ostad_redness_cutera_5.jpg", iw: 1800, ih: 1149 }; // drarielostad.com/gallery/conditions/redness
const ROS = { src: "sb/commons_Rosacea_01.jpg", iw: 1200, ih: 793 }; // Wikimedia Commons, CC BY 2.0
const HEAD = { src: "flora/head_A5_calm.png", iw: 2752, ih: 1536 }; // Flora render (AI), approved material (14d)
// BTL card panels, baked labels cropped off (we re-set them in our type)
const P = { before: [25, 91, 603, 520] as Crop, during: [657, 91, 605, 520] as Crop, after: [1292, 91, 603, 520] as Crop };
const N = { before: [25, 91, 603, 520] as Crop, weeks: [659, 91, 604, 520] as Crop, months: [1294, 91, 604, 520] as Crop };

const Disclaimer: React.FC<{ text?: string; y?: number; x?: number; light?: boolean }> = ({ text = "Conceptual depiction of Exomind treatment. Patient results may vary.", y = 1040, x = 175, light }) => (
  <Source x={x} y={y} color={light ? "rgba(255,255,255,.75)" : MUTE}>{text}</Source>
);

// ============ s1  "...helped you understand Exomind" (5.18 s) ============
const F01A = () => {
  const c: Crop = [640, 40, 1320, 1225], b = fit(c, 1000, 118, 820);
  const [px, py] = mapPt(c, b, 1330, 925);
  return (
    <>
      <Room />
      <Float {...UNIT} crop={c} box={b} fadeBottom={16} />
      <Him t="005.6" x={0} />
      <Ring cx={px} cy={py} rx={140} ry={62} rot={-6} color={INK} />
      <Lead pts={[[px + 120, py - 40], [px + 230, py - 120]]} color={INK} />
      <Chip x={px + 230} y={py - 120}>Applicator</Chip>
      <div style={{ position: "absolute", left: 1480, top: 150, width: 300 }}>
        <Label>Exomind</Label>
        <Display size={40} style={{ marginTop: 16 }}>Non-invasive brain stimulation</Display>
        <Body size={19} color={MUTE} style={{ marginTop: 14 }}>Carefully controlled magnetic pulses to targeted areas of the brain.</Body>
      </div>
      <Cap text="Exomind and" said={1} x={CX} />
      <Source right={175}>Unit: BTL product photo (licensed) · wording: drarielostad.com Exomind page</Source>
    </>
  );
};
const F01B = () => {
  const o = OCT(40), c: Crop = [200, 450, 880, 860], b = fit(c, 960, 140, 760);
  const k = b.w / c[2];
  const [x1, y1] = mapPt(c, b, 372, 1092), [x2, y2] = mapPt(c, b, 868, 612);
  return (
    <>
      <Room />
      <Win {...o} crop={c} box={b} />
      <Ring cx={x1} cy={y1} rx={150 * k} ry={84 * k} rot={-20} />
      <Ring cx={x2} cy={y2} rx={92 * k} ry={92 * k} />
      <Lead pts={[[x1 - 130 * k, y1 + 10], [880, y1 + 60]]} />
      <Chip x={880} y={y1 + 60} anchor="r">The applicator, on the head</Chip>
      <Lead pts={[[x2 - 80 * k, y2 + 40 * k], [b.x + 250, y2 + 190]]} />
      <Chip x={b.x + 250} y={y2 + 190} anchor="r">The session, on screen</Chip>
      <div style={{ position: "absolute", left: 175, top: 300, width: 600 }}>
        <Label>In our office</Label>
        <Display size={64} style={{ marginTop: 18 }}>This is Exomind.</Display>
        <Body size={22} color={MUTE} style={{ marginTop: 18, width: 520 }}>Non-invasive brain stimulation: carefully controlled magnetic pulses, about 20 minutes a session.</Body>
      </div>
      <Cap text="Exomind and" said={1} />
      <Source right={175}>Practice footage, Oct 30 (patient consent to confirm) · wording: drarielostad.com Exomind page</Source>
    </>
  );
};
const F01C = () => (
  <>
    <AbsoluteFill style={{ background: NAVY }} />
    <Win {...APP} crop={[256, 0, 7680, 4320]} box={{ x: 0, y: 0, w: W, h: H }} r={0} shadow={false} />
    <div style={{ position: "absolute", left: 760, top: 150, width: 720 }}>
      <Label color="rgba(255,255,255,.7)">Exomind</Label>
      <Display size={72} color="#fff" style={{ marginTop: 18 }}>Non-invasive brain stimulation</Display>
    </div>
    <Cap text="Exomind and" said={1} light />
    <Source right={175} color="rgba(255,255,255,.7)">Applicator: BTL product photo (licensed) · wording: drarielostad.com Exomind page</Source>
  </>
);

// ============ s2  "why we include the mind in our approach to your total skin health" (mind 7.78, approach 8.32, skin 9.6) ============
const NODES = [{ x: 230, label: "the mind" }, { x: 750, label: "our approach" }, { x: 1270, label: "your skin" }];
const NodeImg: React.FC<{ i: number; dim?: boolean; alt?: boolean }> = ({ i, dim, alt }) => {
  const b = { x: NODES[i].x, y: 250, w: 420, h: 420 };
  const inner = i === 0 ? (alt ? <Win {...EXO} crop={[1335, 91, 520, 520]} box={b} /> : <Win {...EXO} crop={[700, 91, 520, 520]} box={b} />)
    : i === 1 ? (alt ? <Win {...NOV("30.3")} crop={[640, 520, 440, 440]} box={b} /> : <Win {...NOV("30.3")} crop={[0, 520, 1080, 1080]} box={b} />)
    : <Win {...SKIN} crop={SKINC} box={b} />;
  return <div style={{ opacity: dim ? 0.42 : 1 }}>{inner}</div>;
};
const threadPts = (a: number, b: number) => [[NODES[a].x + 210, 236], [NODES[a].x + 330, 150], [NODES[b].x + 90, 150], [NODES[b].x + 210, 236]];
const F02A = () => {
  const s1 = threadPts(0, 1), s2 = threadPts(1, 2);
  return (
    <>
      <Room />
      {[0, 1, 2].map((i) => <NodeImg key={i} i={i} dim={i === 2} />)}
      <Thread d={cd(s1)} q={1} />
      <Thread d={cd(s2)} q={0} bead={cub(s1, 1)} />
      {NODES.map((n, i) => <Display key={i} size={46} color={i === 2 ? MUTE : INK} style={{ position: "absolute", left: n.x, top: 700 }}>{n.label}</Display>)}
      <Label style={{ position: "absolute", left: 230, top: 778 }}>Exomind, the mind</Label>
      <Label style={{ position: "absolute", left: 750, top: 778 }}>Dr. Ostad's practice</Label>
      <Label style={{ position: "absolute", left: 1270, top: 778, opacity: 0.5 }}>Total skin health</Label>
      <Cap text="mind in our approach to" said={4} />
      <Source right={175}>Left: BTL card, conceptual depiction (licensed) · centre: practice footage, Nov 05 · right: BTL model photo (licensed)</Source>
    </>
  );
};
const F02B = () => {
  const c = P.during, b = fit(c, 240, 170, 700), k = b.w / c[2];
  const coil = mapPt(c, b, 975, 300), brain = mapPt(c, b, 880, 380), cheek = mapPt(c, b, 800, 560);
  const skin = { x: 1260, y: 470, w: 380, h: 380 };
  const p1 = [coil, [coil[0] - 10, coil[1] + 40], [brain[0] + 30, brain[1] - 20], brain];
  const p2 = [brain, [brain[0] - 120, brain[1] + 120], [cheek[0] - 40, cheek[1]], cheek];
  const p3 = [cheek, [cheek[0] + 260, cheek[1] + 40], [skin.x - 200, skin.y + 190], [skin.x, skin.y + 190]];
  return (
    <>
      <Room />
      <Win {...EXO} crop={c} box={b} />
      <Win {...SKIN} crop={SKINC} box={skin} />
      <Thread d={cd(p1)} q={1} color="#fff" under />
      <Thread d={cd(p2)} q={1} color="#fff" under />
      <Thread d={cd(p3)} q={0.55} color={INK} bead={cub(p3, 0.55)} />
      <Chip x={coil[0] + 120 * k} y={coil[1] - 120 * k} dark>our approach · Exomind</Chip>
      <Chip x={brain[0] - 250 * k} y={brain[1] - 40 * k} dark>the mind</Chip>
      <Label style={{ position: "absolute", left: skin.x, top: skin.y - 44 }}>your skin</Label>
      <Display size={44} style={{ position: "absolute", left: 1260, top: 250, width: 480 }}>From the mind, to your skin</Display>
      <Cap text="mind in our approach to" said={4} />
      <Disclaimer text="Left: BTL card, conceptual depiction of Exomind treatment (licensed) · right: BTL model photo (licensed)" />
    </>
  );
};
const F02C = () => {
  const xs = [175, 690, 1300];
  const words = ["the mind", "our approach", "your skin"];
  const R = 200;
  const imgs = [<Win key={0} {...EXO} crop={[700, 91, 520, 520]} box={{ x: xs[0], y: 230, w: R, h: R }} r={R / 2} />, <Win key={1} {...NOV("30.3")} crop={[0, 520, 1080, 1080]} box={{ x: xs[1], y: 230, w: R, h: R }} r={R / 2} />, <Win key={2} {...BTLF("124.8")} crop={[400, 170, 300, 300]} box={{ x: xs[2], y: 230, w: R, h: R }} r={R / 2} />];
  const a = [[xs[0] + 120, 640], [xs[0] + 260, 760], [xs[1] - 40, 760], [xs[1] + 120, 640]];
  const bb = [[xs[1] + 120, 640], [xs[1] + 300, 760], [xs[2] - 40, 760], [xs[2] + 120, 640]];
  return (
    <>
      <Room />
      {imgs.map((im, i) => <div key={i} style={{ opacity: i === 2 ? 0.45 : 1 }}>{im}</div>)}
      {words.map((w, i) => <Display key={i} size={92} color={i === 2 ? "rgba(42,47,60,.35)" : INK} style={{ position: "absolute", left: xs[i], top: 480, whiteSpace: "nowrap" }}>{w}</Display>)}
      <Thread d={cd(a)} q={1} />
      <Thread d={cd(bb)} q={0} bead={cub(a, 1)} />
      <Cap text="mind in our approach to" said={4} />
      <Source right={175}>Chips: BTL card (licensed) · practice footage Nov 05 · BTL model photo</Source>
    </>
  );
};

// ============ s3  "Your questions are an important part of this conversation" ============
const F03 = () => (
  <>
    <Room />
    <Win {...NOV(12)} crop={[0, 520, 1080, 700]} box={{ x: 420, y: 150, w: 1080, h: 700 }} />
    <Cap text="and I appreciate your" said={2} />
    <Source right={175}>Practice footage, Nov 05: Dr. Ostad and an Exomind patient in the office (consent on file for v4 use; confirm)</Source>
  </>
);

// ============ s4  giveaway / texts ============
const F04 = () => {
  return (
    <>
      <Room />
      <Him t="024.0" />
      <div style={{ position: "absolute", left: 960, top: 300, width: 780 }}>
        <Label>After tonight</Label>
        <Display size={46} color={MUTE} style={{ marginTop: 22 }}>Giveaway winners hear from us by email or phone.</Display>
        <div style={{ height: 1, background: "rgba(42,47,60,.16)", margin: "40px 0" }} />
        <Display size={46}>Check your <span style={{ background: `linear-gradient(transparent 58%, ${ICE} 58%)` }}>text messages</span> after the event.</Display>
      </div>
      <Cap text="Please also check your" said={2} x={CX} />
    </>
  );
};

// ============ s5  booking, the visit ============
const F05 = () => {
  const row = (n: string, text: string, state: 0 | 1 | 2) => (
    <div style={{ display: "flex", gap: 28, alignItems: "baseline", padding: "22px 0", borderTop: "1px solid rgba(42,47,60,.14)", opacity: state === 2 ? 0.32 : 1 }}>
      {/* no numerals: step counters were rejected */}
      <Display size={40} color={state === 0 ? MUTE : INK}>{state === 1 ? <span style={{ background: `linear-gradient(transparent 60%, ${ICE} 60%)` }}>{text}</span> : text}</Display>
    </div>
  );
  return (
    <>
      <Room />
      <Him t="034.0" />
      <div style={{ position: "absolute", left: 960, top: 200, width: 780 }}>
        <Label>Your consultation</Label>
        <Body size={22} color={MUTE} style={{ margin: "14px 0 30px" }}>Reply to our text and we'll find you an appointment.</Body>
        {row("1", "Your goals", 0)}
        {row("2", "Your medical history", 1)}
        <Body size={18} color={MUTE} style={{ margin: "-6px 0 14px 0", width: 620 }}>Why it matters: "Certain medical conditions, implanted devices, or other circumstances may make TMS inappropriate."</Body>
        {row("3", "Is Exomind appropriate for you?", 2)}
      </div>
      <Cap text="review your medical" said={3} x={CX} />
      <Source right={175}>Quoted line: drarielostad.com Exomind page (practice copy, client to approve)</Source>
    </>
  );
};

// ============ s6  "...I'd love to hear about it." ============
// the question most people ask first, answered in the brochure's own words, beside the real session photo
const F06 = () => {
  const ph = { src: "btl/img/Exomind_PIC_Female-Model3_0155_ENUS100.jpg", iw: 8192, ih: 4320 };
  const c: Crop = [1800, 200, 5400, 3700], b = fit(c, 1040, 110, 620);
  return (
    <>
      <Room />
      <Win {...ph} crop={c} box={b} />
      <div style={{ position: "absolute", left: 1040, top: b.y + b.h + 34, width: 640 }}>
        <Label>Questions we hear</Label>
        <Display size={40} style={{ marginTop: 14 }}>Does it hurt?</Display>
        <Body size={21} color={MUTE} style={{ marginTop: 12 }}>"Most patients find the therapy comfortable. Sessions are quick, lasting under 30 minutes."</Body>
      </div>
      <Him t="044.0" />
      <Cap text="I'd love to hear about it." said={5} x={CX} />
      <Source right={175}>Photo: BTL (licensed, model) · answer: BTL Exomind patient brochure, FAQ</Source>
    </>
  );
};

// ============ s7  "...seeing you in the office" ============
const F07 = () => (
  <>
    <Room />
    <Win {...OCT(8)} crop={[470, 240, 610, 900]} box={fit([470, 240, 610, 900], 1100, 110, 560)} />
    <Him t="050.5" />
    <Cap text="seeing you in the office," said={4} x={CX} />
    <Source right={175}>Practice footage, Oct 30: the treatment room (patient consent to confirm)</Source>
  </>
);

// ============ s8  "...this comprehensive approach to total skin health" ============
const F08 = () => {
  const d1 = { x: 960, y: 610, w: 320, h: 240 }, d2 = { x: 1330, y: 610, w: 320, h: 240 };
  return (
    <>
      <Room />
      <Win {...RED} crop={[905, 380, 820, 615]} box={d1} />
      <div style={{ position: "absolute", left: d2.x, top: d2.y, width: d2.w, height: d2.h, borderRadius: 22, background: "rgba(255,255,255,.55)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.7), 0 30px 80px rgba(32,37,50,.14)" }} />
      <Float {...UNIT} crop={[640, 40, 1320, 1225]} box={fit([640, 40, 1320, 1225], d2.x + 60, d2.y + 6, 220)} fadeBottom={14} />
      <Him t="054.5" />
      <div style={{ position: "absolute", left: 960, top: 190, width: 760 }}>
        <Label>Total skin health</Label>
        <Display size={50} italic style={{ marginTop: 20 }}>"The skin is not separate from the person. It is part of a much larger system."</Display>
      </div>
      <Label style={{ position: "absolute", left: d1.x, top: d1.y + d1.h + 18 }}>Dermatology</Label>
      <Label style={{ position: "absolute", left: d2.x, top: d2.y + d2.h + 18 }}>Longevity & wellness · Exomind</Label>
      <Cap text="comprehensive" said={1} x={CX} />
      <Source right={175}>Quote: drarielostad.com Exomind page (practice copy) · photo: Dr. Ostad's gallery (consent to confirm) · unit: BTL (licensed)</Source>
    </>
  );
};

// ============ s9  "...beyond just the sort of classic treatments" ============
const F09 = () => {
  const cb: Crop = [60, 260, 800, 700], ca: Crop = [965, 260, 800, 700];
  const b1 = fit(cb, 930, 300, 330), b2 = fit(ca, 1280, 300, 330);
  const k = b1.w / cb[2];
  const [rx1, ry1] = mapPt(cb, b1, 210, 590), [rx2, ry2] = mapPt(cb, b1, 690, 600);
  const t = [[b2.x + b2.w + 10, b2.y + b2.h / 2], [1700, b2.y + b2.h / 2], [1720, 700], [1640, 760]];
  return (
    <>
      <Room />
      <Win {...RED} crop={cb} box={b1} />
      <Win {...RED} crop={ca} box={b2} />
      <Ring cx={rx1} cy={ry1} rx={95 * k} ry={80 * k} />
      <Ring cx={rx2} cy={ry2} rx={95 * k} ry={80 * k} />
      <Lead pts={[[rx2 + 40, ry2 - 40], [b1.x + b1.w - 20, b1.y - 30]]} />
      <Chip x={b1.x + b1.w - 20} y={b1.y - 30} anchor="r">Redness</Chip>
      <Label style={{ position: "absolute", left: b1.x, top: b1.y + b1.h + 16 }}>Before</Label>
      <Label style={{ position: "absolute", left: b2.x, top: b2.y + b2.h + 16 }}>After laser</Label>
      <div style={{ position: "absolute", left: 930, top: 190 }}><Label>Classic treatment · laser for redness</Label></div>
      <Thread d={cd(t)} q={0.8} bead={cub(t, 0.8)} />
      <Display size={46} italic style={{ position: "absolute", left: 1380, top: 760 }}>beyond</Display>
      <Him t="062.5" />
      <Cap text="skin beyond just the" said={2} x={CX} />
      <Source right={175}>Before/after: Dr. Ostad's gallery, drarielostad.com/gallery/conditions/redness (patient consent to confirm)</Source>
    </>
  );
};

// ============ s10  "...how our emotions improve our skin" (emotions 68.94, skin 70.66) ============
const F10A = () => {
  const c: Crop = [120, 40, 1080, 720], b = fit(c, 940, 170, 640), k = b.w / c[2];
  const [ax, ay] = mapPt(c, b, 770, 400), [nx, ny] = mapPt(c, b, 400, 440);
  return (
    <>
      <Room />
      <Win {...ROS} crop={c} box={b} />
      <Ring cx={ax} cy={ay} rx={250 * k} ry={120 * k} rot={28} />
      <Ring cx={nx} cy={ny} rx={170 * k} ry={140 * k} />
      <Lead pts={[[ax + 150 * k, ay - 90 * k], [b.x + b.w - 30, b.y + 40]]} />
      <Chip x={b.x + b.w - 30} y={b.y + 40} anchor="r">Rosacea</Chip>
      <Him t="066.5" />
      <div style={{ position: "absolute", left: 940, top: b.y + b.h + 34, width: 760 }}>
        <Display size={38}>"Emotional stress is among the factors that may aggravate symptoms."</Display>
        <Body size={18} color={MUTE} style={{ marginTop: 12 }}>Exomind does not directly treat skin conditions.</Body>
      </div>
      <Cap text="improve our skin," said={3} x={CX} />
      <Source right={175}>Lines: drarielostad.com Exomind page (practice copy) · photo: Wikimedia Commons "Rosacea 01", CC BY 2.0</Source>
    </>
  );
};
const F10B = () => {
  const list = ["Psoriasis", "Eczema", "Seborrheic dermatitis", "Acne", "Rosacea", "Hair shedding"];
  return (
    <>
      <Room />
      <Him t="066.5" />
      <div style={{ position: "absolute", left: 960, top: 170, width: 780 }}>
        <Label>The mind and the skin</Label>
        <Display size={44} style={{ marginTop: 18 }}>Skin conditions stress may influence</Display>
        <div style={{ marginTop: 26 }}>
          {list.map((x, i) => (
            <div key={x} style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderTop: "1px solid rgba(42,47,60,.14)" }}>
              <Display size={32} color={x === "Rosacea" ? INK : MUTE}>{x}</Display>
              {x === "Rosacea" && <Label color={BLUE}>"emotional stress"</Label>}
            </div>
          ))}
        </div>
        <Body size={18} color={MUTE} style={{ marginTop: 14 }}>"in susceptible individuals" · Exomind does not directly treat these conditions.</Body>
      </div>
      <Cap text="improve our skin," said={3} x={CX} />
      <Source right={175}>All wording: drarielostad.com Exomind page (practice copy, client to approve)</Source>
    </>
  );
};
const F10C = () => {
  const c: Crop = [560, 160, 1600, 1300], b = fit(c, 900, 120, 860);
  const brain = mapPt(c, b, 1080, 520), cheek = mapPt(c, b, 1430, 1030);
  const p = [brain, [brain[0] - 80, brain[1] + 260], [cheek[0] - 160, cheek[1] - 40], cheek];
  return (
    <>
      <Room />
      <Win {...HEAD} crop={c} box={b} />
      <Thread d={cd(p)} q={1} color="#fff" under bead={cheek} />
      <Chip x={brain[0] + 40} y={brain[1] - 160} dark>emotions</Chip>
      <Chip x={cheek[0] + 40} y={cheek[1] + 60} dark>skin</Chip>
      <Him t="066.5" />
      <Display size={34} style={{ position: "absolute", left: 940, top: b.y + b.h + 24, width: 800 }}>"a bidirectional relationship between the brain and the skin"</Display>
      <Cap text="improve our skin," said={3} x={CX} />
      <Source right={175}>Head: Flora render (AI illustration, labelled on air) · quote: drarielostad.com Exomind page</Source>
    </>
  );
};

// ============ s11  the mechanism, on BTL's licensed cards ============
// Look A: panels pop up beside him (the rosacea pop-up card language), a ring on the exact thing he names
const F11A1 = () => {
  const c = P.during, b = fit(c, 960, 150, 680), k = b.w / c[2];
  const [rx, ry] = mapPt(c, b, 978, 310);
  return (
    <>
      <Room />
      <Win {...EXO} crop={c} box={b} />
      <Ring cx={rx} cy={ry} rx={120 * k} ry={60 * k} />
      <Lead pts={[[rx + 110 * k, ry + 20 * k], [b.x + b.w - 24, ry + 140]]} />
      <Chip x={b.x + b.w - 24} y={ry + 140} anchor="r" dark>Magnetic pulses</Chip>
      <Him t="071.8" />
      <Body size={20} color={MUTE} style={{ position: "absolute", left: 960, top: b.y + b.h + 22, width: 680 }}>Carefully controlled magnetic pulses stimulate targeted areas of the brain.</Body>
      <Cap text="technology that can" said={1} x={CX} />
      <Disclaimer x={CX} text="BTL card: conceptual depiction of Exomind treatment, patient results may vary (licensed) · line: drarielostad.com" />
    </>
  );
};
const F11A2 = () => {
  const b0 = fit(N.before, 960, 250, 300), b1 = fit(N.weeks, 1290, 190, 470), k = b1.w / N.weeks[2];
  const [rx, ry] = mapPt(N.weeks, b1, 860, 410);
  const t = [[b0.x + b0.w + 6, b0.y + b0.h / 2], [b0.x + b0.w + 20, b0.y + b0.h / 2 - 30], [b1.x - 20, b1.y + b1.h / 2 - 30], [b1.x - 6, b1.y + b1.h / 2]];
  return (
    <>
      <Room />
      <div style={{ opacity: 0.6 }}><Win {...NEU} crop={N.before} box={b0} /></div>
      <Win {...NEU} crop={N.weeks} box={b1} />
      <Thread d={cd(t)} q={1} bead={t[3] as [number, number]} />
      <Ring cx={rx} cy={ry} rx={210 * k} ry={120 * k} rot={8} />
      <Label style={{ position: "absolute", left: b0.x, top: b0.y + b0.h + 14 }}>Before</Label>
      <Label style={{ position: "absolute", left: b0.x, top: b0.y + b0.h + 40, letterSpacing: "0.02em", textTransform: "none" }}>Weakened connections</Label>
      <Label color={INK} style={{ position: "absolute", left: b1.x, top: b1.y + b1.h + 14 }}>Two weeks after</Label>
      <Display size={34} style={{ position: "absolute", left: b1.x, top: b1.y + b1.h + 42 }}>Synaptic growth</Display>
      <Him t="071.8" />
      <Cap text="rewire the brain," said={2} x={CX} />
      <Disclaimer x={CX} y={1026} text="BTL card: conceptual depiction of neuroplasticity, patient results may vary (licensed). *Neural networks before training, two weeks and two months after cognitive stimulation, DOI 10.21125/edulearn.2018.0203 (a cognitive-training study, not Exomind data)" />
    </>
  );
};
const F11A3 = () => {
  const f = MOA(76.5), c: Crop = [560, 140, 800, 740], b = fit(c, 1040, 110, 560), k = b.w / c[2];
  const [rx, ry] = mapPt(c, b, 960, 640);
  return (
    <>
      <Room />
      <Win {...f} crop={c} box={b} />
      <Ring cx={rx} cy={ry} rx={250 * k} ry={60 * k} />
      <Lead pts={[[rx + 230 * k, ry - 20 * k], [b.x + b.w + 40, ry - 120]]} />
      <Chip x={b.x + b.w + 40} y={ry - 120}>The synapse</Chip>
      <Him t="071.8" />
      <Body size={20} color={MUTE} style={{ position: "absolute", left: 1040, top: b.y + b.h + 22, width: 620 }}>Where one nerve cell passes its signal to the next.</Body>
      <Cap text="neurotransmitter" said={1} x={CX} />
      <Disclaimer x={CX} text='BTL "Mechanism of Action" film, 1:16 (licensed), conceptual depiction, results may vary · label ours' />
    </>
  );
};
const F11A4 = () => {
  const b0 = fit(P.before, 960, 230, 360), b1 = fit(P.after, 1390, 230, 360);
  const t = [[b0.x + b0.w + 8, b0.y + b0.h / 2], [b0.x + b0.w + 24, b0.y + b0.h / 2 - 34], [b1.x - 24, b1.y + b1.h / 2 - 34], [b1.x - 8, b1.y + b1.h / 2]];
  return (
    <>
      <Room />
      <div style={{ opacity: 0.75 }}><Win {...EXO} crop={P.before} box={b0} /></div>
      <Win {...EXO} crop={P.after} box={b1} />
      <Thread d={cd(t)} q={1} bead={t[3] as [number, number]} />
      <Label style={{ position: "absolute", left: b0.x, top: b0.y + b0.h + 16 }}>Before</Label>
      <Display size={32} color={MUTE} style={{ position: "absolute", left: b0.x, top: b0.y + b0.h + 44 }}>Underactive brain</Display>
      <Label color={INK} style={{ position: "absolute", left: b1.x, top: b1.y + b1.h + 16 }}>After</Label>
      <Display size={32} style={{ position: "absolute", left: b1.x, top: b1.y + b1.h + 44 }}>Improved brain activity</Display>
      <Him t="071.8" />
      <Cap text="focused in flow and" said={2} x={CX} />
      <Disclaimer x={CX} text="BTL card: conceptual depiction of Exomind treatment, patient results may vary (licensed)" />
    </>
  );
};
// Look B: he steps out; the panel holds the frame on its own navy (native 1.15x, edges dissolved into a matched navy field),
// one thread runs from the applicator into the brain, white labels
const F11B = () => {
  const c = P.during, b = fit(c, 610, 150, 700), k = b.w / c[2];
  const coil = mapPt(c, b, 978, 300), pfc = mapPt(c, b, 905, 390);
  const p = [coil, [coil[0] + 10, coil[1] + 60], [pfc[0] + 40, pfc[1] - 30], pfc];
  return (
    <>
      <AbsoluteFill style={{ background: "radial-gradient(60% 70% at 50% 45%, #0e3c86 0%, #0a2457 55%, #071530 100%)" }} />
      <Win {...EXO} crop={c} box={b} r={0} shadow={false} fade="radial-gradient(closest-side, #000 72%, transparent 100%)" />
      <Thread d={cd(p)} q={1} color="#fff" bead={pfc} />
      <Chip x={coil[0] + 150 * k} y={coil[1] - 50} dark>Magnetic pulses</Chip>
      <Chip x={pfc[0] - 200 * k} y={pfc[1] + 120} dark anchor="r">Targeted area of the brain</Chip>
      <div style={{ position: "absolute", left: 175, top: 150, width: 380 }}>
        <Label color="rgba(255,255,255,.65)">How Exomind works</Label>
        <Display size={52} color="#fff" style={{ marginTop: 18 }}>Pulses, then new connections</Display>
      </div>
      <Cap text="actually help create" said={1} light />
      <Disclaimer light text="BTL card: conceptual depiction of Exomind treatment, patient results may vary (licensed) · labels: drarielostad.com" />
    </>
  );
};
// Look C: the real unit floats on the light canvas; a thread leaves the brain on its own screen and opens BTL's "after" panel
const F11C = () => {
  const c: Crop = [640, 40, 1320, 1225], u = fit(c, 120, 140, 700);
  const scr = mapPt(c, u, 1102, 330);
  const b = fit(P.after, 1080, 190, 560);
  const p = [scr, [scr[0] + 220, scr[1] - 120], [b.x - 160, b.y + 140], [b.x - 6, b.y + 200]];
  return (
    <>
      <Room />
      <Float {...UNIT} crop={c} box={u} fadeBottom={18} />
      <Ring cx={scr[0]} cy={scr[1]} rx={78} ry={92} color={INK} />
      <Win {...EXO} crop={P.after} box={b} />
      <Thread d={cd(p)} q={1} bead={p[3] as [number, number]} />
      <Label color={INK} style={{ position: "absolute", left: b.x, top: b.y + b.h + 18 }}>After</Label>
      <Display size={38} style={{ position: "absolute", left: b.x, top: b.y + b.h + 46 }}>Improved brain activity</Display>
      <Cap text="focused in flow and" said={2} />
      <Disclaimer text="Unit photo and card: BTL (licensed), conceptual depiction of Exomind treatment, patient results may vary" />
    </>
  );
};

// Look D: BTL's own Mechanism-of-Action film, three moments in sequence on navy; one bead travels through them on his three verbs
// (create neuroplasticity -> rewire -> neurotransmitter). Wording from the BTL brochure, not ours.
const F11D = () => {
  const ws: { f: string; c: Crop; t: string; l: string }[] = [
    { f: "52", c: [470, 150, 820, 720], t: "Magnetic pulses", l: "Stimulates key areas of the brain involved in emotional regulation" },
    { f: "76.5", c: [550, 150, 820, 720], t: "Neural pathways", l: "By activating neural pathways, it helps restore healthy brain activity" },
    { f: "97", c: [540, 150, 820, 720], t: "Connectivity", l: "And enhances neural connectivity" },
  ];
  const xs = [175, 735, 1295], y = 230, w = 500;
  const bx = ws.map((o, i) => fit(o.c, xs[i], y, w));
  const top = y - 40;
  const d = `M ${xs[0] + 40} ${top} C ${xs[0] + 200} ${top - 70}, ${xs[1] - 120} ${top - 70}, ${xs[1] + w / 2} ${top} S ${xs[2] + 60} ${top - 60}, ${xs[2] + w / 2} ${top}`;
  return (
    <>
      <AbsoluteFill style={{ background: "radial-gradient(70% 80% at 50% 40%, #12305f 0%, #0a1d40 60%, #060f24 100%)" }} />
      <Thread d={d} q={0.62} color="#fff" bead={[xs[1] + w / 2 + 120, top - 34]} />
      {ws.map((o, i) => (
        <React.Fragment key={i}>
          <div style={{ opacity: i === 2 ? 0.45 : 1 }}>
            <Win {...MOA(o.f)} crop={o.c} box={bx[i]} />
            <Label color="rgba(255,255,255,.6)" style={{ position: "absolute", left: xs[i], top: bx[i].y + bx[i].h + 22 }}>{o.t}</Label>
            <Body size={22} color="#fff" style={{ position: "absolute", left: xs[i], top: bx[i].y + bx[i].h + 52, width: w - 20 }}>{o.l}</Body>
          </div>
        </React.Fragment>
      ))}
      <Cap text="rewire the brain," said={2} light />
      <Disclaimer light text='BTL "Mechanism of Action" film 0:52 / 1:16 / 1:37 (licensed), conceptual depiction, results may vary · wording: BTL Exomind brochure' />
    </>
  );
};

// ============ s12  "...help us just feel better ... translate into better skin" (bookend of s2) ============
const F12A = () => {
  const labels = ["the mind", "feel better", "better skin"];
  const s1 = threadPts(0, 1), s2 = threadPts(1, 2);
  return (
    <>
      <Room />
      <NodeImg i={0} alt />
      <NodeImg i={1} alt />
      <NodeImg i={2} />
      <Thread d={cd(s1)} q={1} />
      <Thread d={cd(s2)} q={1} bead={cub(s2, 1)} />
      {NODES.map((n, i) => <Display key={i} size={46} style={{ position: "absolute", left: n.x, top: 700 }}>{labels[i]}</Display>)}
      <Body size={20} color={MUTE} style={{ position: "absolute", left: 750, top: 772 }}>"It quiets my brain." An Exomind patient</Body>
      <Cap text="better skin." said={2} />
      <Source right={175}>Left: BTL card "after", conceptual depiction (licensed) · centre: the patient's own words, practice footage Nov 05 · right: BTL model photo (licensed)</Source>
    </>
  );
};
const F12B = () => {
  const b = { x: 175, y: 120, w: 440, h: 780 };
  return (
    <>
      <Room />
      <Win {...NOV("30.3")} crop={[640, 420, 440, 780]} box={b} />
      <div style={{ position: "absolute", left: 720, top: 300, width: 1000 }}>
        <Label>Her words</Label>
        <Display size={96} style={{ marginTop: 22 }}>"It quiets my brain."</Display>
      </div>
      <Thread d="M720 640 C 900 700, 1180 700, 1360 640" q={1} bead={[1360, 640]} />
      <Display size={40} color={MUTE} style={{ position: "absolute", left: 720, top: 600 }}>feel better</Display>
      <Display size={40} style={{ position: "absolute", left: 1390, top: 600 }}>better skin</Display>
      <Cap text="actually translate into" said={2} x={720} />
      <Source right={175}>The patient's own words, practice footage Nov 05 (consent on file for v4 use; confirm)</Source>
    </>
  );
};

// ============ s13  end ============
const F13 = () => {
  const c: Crop = [640, 40, 1320, 1225];
  return (
    <>
      <Room />
      <Float {...UNIT} crop={c} box={fit(c, 1060, 110, 760)} fadeBottom={18} />
      <div style={{ position: "absolute", left: 175, top: 300, width: 760 }}>
        <Label>Exomind · Dr. Ariel Ostad</Label>
        <Display size={76} style={{ marginTop: 20 }}>Book a consultation</Display>
        <Body size={26} style={{ marginTop: 18 }}>drarielostad.com</Body>
        <div style={{ height: 1, width: 420, background: "rgba(42,47,60,.16)", margin: "40px 0 22px" }} />
        <Body size={20} color={MUTE} style={{ width: 520 }}>About 20 minutes a session. Typically six sessions, one week apart.</Body>
      </div>
      <Source right={175}>Session facts: drarielostad.com Exomind page · unit: BTL product photo (licensed)</Source>
    </>
  );
};

const FRAMES: Record<string, React.FC> = { F01A, F01B, F01C, F02A, F02B, F02C, F03, F04, F05, F06, F07, F08, F09, F10A, F10B, F10C, F11A1, F11A2, F11A3, F11A4, F11B, F11C, F11D, F12A, F12B, F13 };
export const FRAME_IDS = Object.keys(FRAMES);

export const Storyboard: React.FC<SBProps> = ({ id, font = "proposal" }) => {
  useElza(["400 40px cormorant-garamond", "500 40px cormorant-garamond", "400 40px poppins", "500 40px poppins"]);
  const F = FRAMES[id] ?? F01A;
  return (
    <FontCtx.Provider value={font}>
      <AbsoluteFill style={{ background: "#eef2f6", width: W, height: H }}>
        <F />
      </AbsoluteFill>
    </FontCtx.Provider>
  );
};
export { BLUE };

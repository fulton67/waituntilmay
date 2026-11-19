import { Composition, staticFile } from "remotion";
import { TAIL, UndereyeReel, type UEProps } from "./Reel";
import { TAIL2, UndereyeReelV2, type V2Props } from "./ReelV2";
import { TAIL4, UndereyeReelV4, type V4Props } from "./ReelV4";
import { TAIL5, UndereyeReelV5, type V5Props } from "./ReelV5";
import TL5 from "../../timelines/undereye.v5.json";
import TL5b from "../../timelines/undereye.json";
import type { Timeline } from "../timeline/timeline";

// UndereyeReel: 1080x1920, 24 fps (brand/motion/RULES.md). Props are loaded from public/undereye-filler/props.json
// (brand/scripts/undereye_prep.py). NOT FOR POSTING until patient consent = yes.
export const UndereyeRoot: React.FC = () => (
  <>
  {/* v5b: the object beat big (ObjectPairV5b); the working timeline timelines/undereye.json. v5 itself now reads the frozen undereye.v5.json. v5 after Naim's notes on v4b (2026-11-19): props_v5.json (brand/scripts/undereye_prep_v5.py), timeline timelines/undereye.json */}
  <Composition
    id="UndereyeReelV5b"
    component={UndereyeReelV5}
    width={1080}
    height={1920}
    fps={24}
    durationInFrames={240}
    defaultProps={{} as V5Props}
    calculateMetadata={async ({ props }) => {
      const base: V5Props = props.pieces ? props : await (await fetch(staticFile("undereye-filler/props_v5.json"))).json();
      const frames = props.frames ?? (await (await fetch(staticFile("flora/frames.json"))).json());
      const p: V5Props = { ...base, frames, bare: !!props.bare, timeline: props.timeline ?? (TL5b as unknown as Timeline) };
      return { durationInFrames: p.durationInFrames + TAIL5, props: p };
    }}
  />
  {/* v5 after Naim's notes on v4b (2026-11-19): props_v5.json (brand/scripts/undereye_prep_v5.py), timeline timelines/undereye.json */}
  <Composition
    id="UndereyeReelV5"
    component={UndereyeReelV5}
    width={1080}
    height={1920}
    fps={24}
    durationInFrames={240}
    defaultProps={{} as V5Props}
    calculateMetadata={async ({ props }) => {
      const base: V5Props = props.pieces ? props : await (await fetch(staticFile("undereye-filler/props_v5.json"))).json();
      const frames = props.frames ?? (await (await fetch(staticFile("flora/frames.json"))).json());
      const p: V5Props = { ...base, frames, bare: !!props.bare, timeline: props.timeline ?? (TL5 as unknown as Timeline) };
      return { durationInFrames: p.durationInFrames + TAIL5, props: p };
    }}
  />
  {/* v4 after the client's 2026-11-19 notes: props_v4.json (brand/scripts/undereye_prep_v4.py) + the Flora plates' frames.json */}
  <Composition
    id="UndereyeReelV4"
    component={UndereyeReelV4}
    width={1080}
    height={1920}
    fps={24}
    durationInFrames={240}
    defaultProps={{} as V4Props}
    calculateMetadata={async ({ props }) => {
      const base: V4Props = props.pieces ? props : await (await fetch(staticFile("undereye-filler/props_v4.json"))).json();
      const frames = props.frames ?? (await (await fetch(staticFile("flora/frames.json"))).json());
      const p: V4Props = { ...base, frames, bare: !!props.bare };
      return { durationInFrames: p.durationInFrames + TAIL4, props: p };
    }}
  />
  {/* v2 after the user's notes (DECISIONS 15c): props_v2.json from brand/scripts/undereye_prep_v2.py */}
  <Composition
    id="UndereyeReelV2"
    component={UndereyeReelV2}
    width={1080}
    height={1920}
    fps={24}
    durationInFrames={240}
    defaultProps={{} as V2Props}
    calculateMetadata={async ({ props }) => {
      const p: V2Props = props.pieces ? props : { ...(await (await fetch(staticFile("undereye-filler/props_v2.json"))).json()), bare: !!props.bare };
      return { durationInFrames: p.durationInFrames + TAIL2, props: p };
    }}
  />
  <Composition
    id="UndereyeReel"
    component={UndereyeReel}
    width={1080}
    height={1920}
    fps={24}
    durationInFrames={240}
    defaultProps={{} as UEProps}
    calculateMetadata={async ({ props }) => {
      // --props may carry only switches (bare); the edit itself always comes from props.json
      const p: UEProps = props.pieces ? props : { ...(await (await fetch(staticFile("undereye-filler/props.json"))).json()), bare: !!props.bare };
      return { durationInFrames: p.durationInFrames + TAIL, props: p };
    }}
  />
  </>
);

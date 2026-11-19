import { Composition, staticFile } from "remotion";
import { TAIL, UndereyeReel, type UEProps } from "./Reel";
import { TAIL2, UndereyeReelV2, type V2Props } from "./ReelV2";
import { TAIL4, UndereyeReelV4, type V4Props } from "./ReelV4";

// UndereyeReel: 1080x1920, 24 fps (brand/motion/RULES.md). Props are loaded from public/undereye-filler/props.json
// (brand/scripts/undereye_prep.py). NOT FOR POSTING until patient consent = yes.
export const UndereyeRoot: React.FC = () => (
  <>
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

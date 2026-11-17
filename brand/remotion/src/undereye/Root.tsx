import { Composition, staticFile } from "remotion";
import { TAIL, UndereyeReel, type UEProps } from "./Reel";

// UndereyeReel: 1080x1920, 24 fps (brand/motion/RULES.md). Props are loaded from public/undereye-filler/props.json
// (brand/scripts/undereye_prep.py). NOT FOR POSTING until patient consent = yes.
export const UndereyeRoot: React.FC = () => (
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
);

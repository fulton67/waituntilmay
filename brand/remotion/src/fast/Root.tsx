import { Composition, staticFile } from "remotion";
import { FastReel, type FastProps, type FastTimeline } from "./FastReel";

// FAST LANE entry:  npx remotion studio src/fast/index.ts   (make-reel opens it on the reel it just built)
// The reel: --props='{"reel":"<id>"}', else public/fast/current.json {"reel": "<id>"} (make-reel writes it).
const get = async (f: string) => (await fetch(staticFile(f))).json();
export const FastRoot: React.FC = () => (
  <Composition id="FastReel" component={FastReel} width={1080} height={1920} fps={24} durationInFrames={240} defaultProps={{} as FastProps}
    calculateMetadata={async ({ props }) => {
      const reel = props.reel ?? (await get("fast/current.json")).reel;
      const tl: FastTimeline = props.tl ?? (await get(`fast/${reel}/timeline.json`));
      return { durationInFrames: tl.durationInFrames, fps: tl.fps, props: { ...props, reel, tl } };
    }} />
);

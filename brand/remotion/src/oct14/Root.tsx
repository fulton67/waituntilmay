import { Composition, staticFile } from "remotion";
import { LAB_DUR, Oct14Lab, type LabProps } from "./Lab";
import { Oct14Reel, type Oct14Props } from "./Reel";

// Oct14Lab: the devices on placeholder media (1080x1920, 24 fps: brand/motion/RULES.md). Points come from the placeholder's
// points.json, the same schema as the real face track. NOT FOR POSTING until patient consent = yes.
export const Oct14Root: React.FC = () => (
  <>
    <Composition id="Oct14Lab" component={Oct14Lab} width={1080} height={1920} fps={24} durationInFrames={288} defaultProps={{ item: "pip" } as LabProps}
      calculateMetadata={async ({ props }) => ({
        durationInFrames: LAB_DUR[props.item],
        props: { ...props, points: props.points ?? (await (await fetch(staticFile("oct14/placeholder/points.json"))).json()) },
      })} />
    {/* Oct14Reel: the reel. Props from public/oct14/props.json (brand/scripts/oct14_prep.py props); --props='{"bare":true}' = graphics only */}
    <Composition id="Oct14Reel" component={Oct14Reel} width={1080} height={1920} fps={24} durationInFrames={240} defaultProps={{} as Oct14Props}
      calculateMetadata={async ({ props }) => {
        const p: Oct14Props = props.pieces ? props : { ...(await (await fetch(staticFile("oct14/props.json"))).json()), bare: !!props.bare };
        return { durationInFrames: p.durationInFrames + p.tail, props: p };
      }} />
    {/* Oct14ReelV4 (Naim 2026-11-19): v3 with the Flora renders in place of the traced drawings and the footage tone-mapped HLG -> bt709 */}
    <Composition id="Oct14ReelV4" component={Oct14Reel} width={1080} height={1920} fps={24} durationInFrames={240} defaultProps={{} as Oct14Props}
      calculateMetadata={async ({ props }) => {
        const p: Oct14Props = props.pieces ? props : { ...(await (await fetch(staticFile("oct14/props.json"))).json()), bare: !!props.bare,
          flora: await (await fetch(staticFile("flora/frames.json"))).json() };
        return { durationInFrames: p.durationInFrames + p.tail, props: p };
      }} />
  </>
);

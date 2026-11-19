import { Composition, staticFile } from "remotion";
import { LAB_DUR, Oct14Lab, type LabProps } from "./Lab";
import { Oct14Reel, type Oct14Props } from "./Reel";
import { Oct14ReelV5, type Oct14V5Props } from "./ReelV5";
import { Oct14ReelV6, type Oct14V6Props } from "./ReelV6";
import { Oct14ReelV6b, type Oct14V6bProps } from "./ReelV6b";
import { Oct14ReelV6c, type Oct14V6cProps } from "./ReelV6c";

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
    {/* Oct14ReelV5 (client 2026-11-19): technical surgeon's plan, lag-free tracking, nothing over a face (ReelV5.tsx header).
        --props='{"layer":"allowed"|"footage"|"probe"}' renders the check layers */}
    <Composition id="Oct14ReelV5" component={Oct14ReelV5} width={1080} height={1920} fps={24} durationInFrames={240} defaultProps={{} as Oct14V5Props}
      calculateMetadata={async ({ props }) => {
        const j = async (f: string) => (await fetch(staticFile(f))).json();
        const p: Oct14V5Props = props.pieces ? props : { ...(await j("oct14/props.json")), layer: props.layer ?? "all", big: props.big ?? false, flora: await j("flora/frames.json"),
          tracks5: await j("oct14/tracks_v5.json"), lay: await j("oct14/layout_v5.json"), markup: await j("oct14/markup_v5.json"), stills: await j("oct14/stills_v5.json") };
        return { durationInFrames: p.durationInFrames + p.tail, props: p };
      }} />
    {/* Oct14ReelV6 (2026-11-19 round): V5 big + raw colour (toneMapped off), contrast not strike, REAL OBJECTS, timeline-driven beats
        (timelines/oct14.json). Same check layers as V5 */}
    <Composition id="Oct14ReelV6" component={Oct14ReelV6} width={1080} height={1920} fps={24} durationInFrames={240} defaultProps={{} as Oct14V6Props}
      calculateMetadata={async ({ props }) => {
        const j = async (f: string) => (await fetch(staticFile(f))).json();
        const p: Oct14V6Props = props.pieces ? props : { ...(await j("oct14/props.json")), layer: props.layer ?? "all", big: true, flora: await j("flora/frames.json"),
          tracks5: await j("oct14/tracks_v5.json"), lay: await j("oct14/layout_v5.json"), markup: await j("oct14/markup_v5.json"), stills: await j("oct14/stills_v5.json"), tl: (props as { timeline?: Oct14V6Props["tl"] }).timeline ?? props.tl };
        return { durationInFrames: p.durationInFrames + p.tail, props: p };
      }} />
    {/* Oct14ReelV6b: V6 + objects from his own footage at full presence + the source-end freeze guard */}
    <Composition id="Oct14ReelV6b" component={Oct14ReelV6b} width={1080} height={1920} fps={24} durationInFrames={240} defaultProps={{} as Oct14V6bProps}
      calculateMetadata={async ({ props }) => {
        const j = async (f: string) => (await fetch(staticFile(f))).json();
        const p: Oct14V6bProps = props.pieces ? props : { ...(await j("oct14/props.json")), layer: props.layer ?? "all", ...((props as { pass?: string }).pass ? { pass: (props as { pass?: string }).pass } : {}), big: true, flora: await j("flora/frames.json"),
          tracks5: await j("oct14/tracks_v5.json"), lay: await j("oct14/layout_v5.json"), markup: await j("oct14/markup_v5.json"), stills: await j("oct14/stills_v5.json"), tl: (props as { timeline?: Oct14V6bProps["tl"] }).timeline ?? props.tl };
        return { durationInFrames: p.durationInFrames + p.tail, props: p };
      }} />
    {/* Oct14ReelV6c: V6b + the official Evolus syringe photos and gel clips (partner use, Naim 2026-11-19) */}
    <Composition id="Oct14ReelV6c" component={Oct14ReelV6c} width={1080} height={1920} fps={24} durationInFrames={240} defaultProps={{} as Oct14V6cProps}
      calculateMetadata={async ({ props }) => {
        const j = async (f: string) => (await fetch(staticFile(f))).json();
        const p: Oct14V6cProps = props.pieces ? props : { ...(await j("oct14/props.json")), layer: props.layer ?? "all", ...((props as { pass?: string }).pass ? { pass: (props as { pass?: string }).pass } : {}), big: true, flora: await j("flora/frames.json"),
          tracks5: await j("oct14/tracks_v5.json"), lay: await j("oct14/layout_v5.json"), markup: await j("oct14/markup_v5.json"), stills: await j("oct14/stills_v5.json"), tl: (props as { timeline?: Oct14V6cProps["tl"] }).timeline ?? props.tl };
        return { durationInFrames: p.durationInFrames + p.tail, props: p };
      }} />
  </>
);

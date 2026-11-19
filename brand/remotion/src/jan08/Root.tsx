import { Composition, staticFile } from "remotion";
import { Jan08Reel, type Jan08Props } from "./Reel";
import { Jan08ReelV2, type Jan08V2Props } from "./ReelV2";

// Jan08Reel: the filler-fatigue reel. Props: public/jan08/props.json (+ anatomy.json, ba.json); its own entry point so it renders
// without the shared Root.tsx:  npx remotion render src/jan08/index.ts Jan08Reel <out.mp4>
// Jan08ReelV2: round 2 (Naim 2026-11-19): + public/flora/frames.json (Flora plates), public/jan08/clinic/web/credits.json (real cases)
const get = async (f: string) => (await fetch(staticFile(f))).json();
const getOr = async (f: string, d: unknown) => { const r = await fetch(staticFile(f)); return r.ok ? r.json() : d; };
export const Jan08Root: React.FC = () => (
  <>
    <Composition id="Jan08Reel" component={Jan08Reel} width={1080} height={1920} fps={24} durationInFrames={240} defaultProps={{} as Jan08Props}
      calculateMetadata={async ({ props }) => {
        const p: Jan08Props = props.pieces ? props : { ...(await get("jan08/props.json")), anatomy: await get("jan08/anatomy.json"), ba: await get("jan08/ba.json"), audit: !!props.audit };
        return { durationInFrames: p.durationInFrames + p.tail, props: p };
      }} />
    <Composition id="Jan08ReelV2" component={Jan08ReelV2} width={1080} height={1920} fps={24} durationInFrames={240} defaultProps={{} as Jan08V2Props}
      calculateMetadata={async ({ props }) => {
        const p: Jan08V2Props = props.pieces ? props : { ...(await get("jan08/props.json")), ba: await get("jan08/ba.json"), frames: await get("flora/frames.json"),
          web: await getOr("jan08/clinic/web/credits.json", []), audit: !!props.audit };
        return { durationInFrames: p.durationInFrames + p.tail, props: p };
      }} />
  </>
);

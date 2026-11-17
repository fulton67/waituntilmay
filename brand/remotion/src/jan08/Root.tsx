import { Composition, staticFile } from "remotion";
import { Jan08Reel, type Jan08Props } from "./Reel";

// Jan08Reel: the filler-fatigue reel. Props: public/jan08/props.json (+ anatomy.json, ba.json); its own entry point so it renders
// without the shared Root.tsx:  npx remotion render src/jan08/index.ts Jan08Reel <out.mp4>
export const Jan08Root: React.FC = () => (
  <Composition id="Jan08Reel" component={Jan08Reel} width={1080} height={1920} fps={24} durationInFrames={240} defaultProps={{} as Jan08Props}
    calculateMetadata={async ({ props }) => {
      const get = async (f: string) => (await fetch(staticFile(f))).json();
      const p: Jan08Props = props.pieces ? props : { ...(await get("jan08/props.json")), anatomy: await get("jan08/anatomy.json"), ba: await get("jan08/ba.json"), audit: !!props.audit };
      return { durationInFrames: p.durationInFrames + p.tail, props: p };
    }} />
);

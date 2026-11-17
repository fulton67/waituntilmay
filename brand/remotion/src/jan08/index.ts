// Separate entry point for the Jan 08 filler-fatigue reel (the shared Root.tsx is edited by other edits):
//   npx remotion still src/jan08/index.ts Jan08Reel out/x.png --frame=N
//   npx remotion render src/jan08/index.ts Jan08Reel <out.mp4>
import { registerRoot } from "remotion";
import { Jan08Root } from "./Root";
registerRoot(Jan08Root);

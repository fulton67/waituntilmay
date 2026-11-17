// Separate entry point for the Oct 14 injection reel, so it renders without the shared Root.tsx (which other edits change):
//   npx remotion still src/oct14/index.ts Oct14Lab out/x.png --props='{"item":"pip"}' --frame=N
//   npx remotion render src/oct14/index.ts Oct14Reel <out.mp4>
// NOT FOR POSTING until patient consent = yes.
import { registerRoot } from "remotion";
import { Oct14Root } from "./Root";
registerRoot(Oct14Root);

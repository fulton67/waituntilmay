// Separate entry point for the under-eye filler reel, so it renders without the shared Root.tsx (which other edits change):
//   npx remotion still src/undereye/index.ts UndereyeReel out/x.png --frame=N
//   npx remotion render src/undereye/index.ts UndereyeReel <out.mp4>
import { registerRoot } from "remotion";
import { UndereyeRoot } from "./Root";
registerRoot(UndereyeRoot);

// Separate entry point for the AviClear split-slider Story (P0010), so it renders without the shared Root.tsx:
//   python brand/scripts/ba_story_p0010.py            (cuts the aligned pair into public/ba-story, gitignored)
//   npx remotion still src/bastory/index.ts BaStoryP0010 out/x.png --frame=N
//   npx remotion render src/bastory/index.ts BaStoryP0010 <out.mp4> --codec=h264
import { registerRoot } from "remotion";
import { BaStoryRoot } from "./Root";
registerRoot(BaStoryRoot);

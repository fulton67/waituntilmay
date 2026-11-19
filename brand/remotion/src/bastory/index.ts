// Separate entry point for the AviClear split-slider Story (P0010), so it renders without the shared Root.tsx:
//   python brand/scripts/ba_story_p0010.py            (cuts the aligned pair into public/ba-story, gitignored)
//   npx remotion still src/bastory/index.ts BaStoryP0010 out/x.png --frame=N
//   npx remotion render src/bastory/index.ts BaStoryP0010 <raw.mp4> --codec=h264 --crf=12   (BaFeedP0010 for the 4:5 feed)
//   then re-encode to limited-range yuv420p + faststart (ffmpeg line in research/ostad/style/beforeafter_v2/README.md)
import { registerRoot } from "remotion";
import { BaStoryRoot } from "./Root";
registerRoot(BaStoryRoot);

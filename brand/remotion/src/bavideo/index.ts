// Separate entry for the before/after VIDEO reel (P0005, lip filler, 2022-09-20), so it renders without the shared Root.tsx:
//   python -I brand/scripts/ba_video_p0005.py track|build ...   (aligned clips into a public dir OUTSIDE the repo)
//   npx remotion render src/bavideo/index.ts BaVideoStoryP0005 <out.mp4> --public-dir=<pub> --codec=h264 --crf=14 --muted
//   (BaVideoFeedP0005 for the 1080x1350 feed). Patient code only; footage and renders are never committed.
import { registerRoot } from "remotion";
import { BaVideoRoot } from "./Root";
registerRoot(BaVideoRoot);
